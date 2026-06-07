"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, SearchIcon, User, MapPin, Phone, Plus, Users, GraduationCap, Eye, MoreHorizontal, Edit, BookOpen, CheckCircle2, ShieldAlert, ArrowLeft, MoreVertical, CalendarDays, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ManageRollNumbersModal } from "@/components/teacher/manage-roll-numbers-modal";
import { cn } from "@/lib/utils";

export default function TeacherStudentsPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const { classes, sections, classSections, subjectTeachers, selectedYear, loading: masterLoading } = useMasterData();
    const [teacher, setTeacher] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_profile_cache") || "null") : null);
    const [loadingTeacher, setLoadingTeacher] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_profile_cache") : true);
    const [selectedClassKey, setSelectedClassKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem("teacher_students_selected_class_key") || "" : "");

    const [students, setStudents] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const classKey = localStorage.getItem("teacher_students_selected_class_key") || "";
            if (classKey) {
                return JSON.parse(localStorage.getItem(`teacher_students_cache_${classKey}`) || "[]");
            }
        }
        return [];
    });
    const [loadingStudents, setLoadingStudents] = useState(() => {
        if (typeof window !== 'undefined') {
            const classKey = localStorage.getItem("teacher_students_selected_class_key") || "";
            if (classKey && localStorage.getItem(`teacher_students_cache_${classKey}`)) {
                return false;
            }
        }
        return true;
    });

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");

    // Modal States
    const [isManageRollsOpen, setIsManageRollsOpen] = useState(false);

    // Attendance stats states
    const [attendanceToday, setAttendanceToday] = useState<Record<string, 'P' | 'A'>>({});
    const [leavesTodayCount, setLeavesTodayCount] = useState(0);
    const [attendanceMarked, setAttendanceMarked] = useState(false);

    useEffect(() => {
        if (user && userData?.schoolId) {
            fetchTeacher();
        }
    }, [user, userData]);

    const fetchTeacher = async () => {
        setLoadingTeacher(true);
        try {
            let q;
            let snap: any = { empty: true };

            if (userData?.schoolId) {
                q = query(collection(db, "teachers"), where("schoolId", "==", userData.schoolId), limit(1));
                snap = await getDocs(q);
            }

            if (snap.empty && user?.uid) {
                q = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
                snap = await getDocs(q);
            }

            if (!snap.empty) {
                const tData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setTeacher(tData);

                const authorized = getAuthorizedClasses(tData);
                if (authorized.length > 0) {
                    setSelectedClassKey(authorized[0].key);
                }
            }
        } catch (e: any) {
            console.warn("Teacher fetch error:", e.message);
        } finally {
            setLoadingTeacher(false);
        }
    };

    const getAuthorizedClasses = (tProfile: any) => {
        if (!tProfile || !classSections || !subjectTeachers) return [];
        const tId = tProfile.schoolId;
        const tDocId = tProfile.id;
        const set = new Map<string, { classId: string, sectionId: string, key: string, isClassTeacher: boolean }>();

        Object.values(classSections).forEach((cs: any) => {
            const isMatch = (tId && cs.classTeacherId === tId) || (tDocId && cs.classTeacherId === tDocId);
            if (isMatch && cs.isActive !== false) {
                set.set(cs.id, { classId: cs.classId, sectionId: cs.sectionId, key: cs.id, isClassTeacher: true });
            }
        });

        Object.keys(subjectTeachers).forEach(key => {
            const subjectsObj = subjectTeachers[key];
            const teacherIds = Object.values(subjectsObj);
            const isMatch = (tId && teacherIds.includes(tId)) || (tDocId && teacherIds.includes(tDocId));

            if (isMatch) {
                const cs = classSections[key];
                const cId = cs?.classId || key.split('_')[0];
                const sId = cs?.sectionId || key.split('_')[1];

                if (!set.has(key)) {
                    set.set(key, { classId: cId, sectionId: sId, key, isClassTeacher: false });
                }
            }
        });

        return Array.from(set.values());
    };

    const processResults = (approved: any[], pending: any[]) => {
        const filteredApproved = approved.filter((s: any) =>
            !selectedYear || !s.academicYear || s.academicYear === selectedYear
        );
        const filteredPending = pending.filter((p: any) =>
            !selectedYear || !p.academicYear || p.academicYear === selectedYear
        );

        const combined = [...filteredApproved, ...filteredPending];
        combined.sort((a: any, b: any) => (a.rollNumber || Number.MAX_SAFE_INTEGER) - (b.rollNumber || Number.MAX_SAFE_INTEGER));
        setStudents(combined);
        setLoadingStudents(false);
        if (typeof window !== 'undefined' && currentClassInfo) {
            localStorage.setItem(`teacher_students_cache_${currentClassInfo.key}`, JSON.stringify(combined));
        }
    };

    const authorizedClasses = useMemo(() => getAuthorizedClasses(teacher), [teacher, classSections, subjectTeachers]);
    const currentClassInfo = useMemo(() => authorizedClasses.find(c => c.key === selectedClassKey), [authorizedClasses, selectedClassKey]);

    useEffect(() => {
        if (!currentClassInfo) return;

        // Try to load from cache immediately
        if (typeof window !== 'undefined') {
            localStorage.setItem("teacher_students_selected_class_key", currentClassInfo.key);
            const cached = localStorage.getItem(`teacher_students_cache_${currentClassInfo.key}`);
            if (cached) {
                setStudents(JSON.parse(cached));
                setLoadingStudents(false);
            } else {
                setStudents([]);
                setLoadingStudents(true);
            }
        } else {
            setLoadingStudents(true);
        }
        let approvedList: any[] = [];
        let pendingList: any[] = [];

        const q = query(
            collection(db, "students"),
            where("classId", "==", currentClassInfo.classId),
            where("sectionId", "==", currentClassInfo.sectionId)
        );

        const unsubApproved = onSnapshot(q, (snap) => {
            approvedList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processResults(approvedList, pendingList);
        }, (error) => {
            console.error("Approved students sync error:", error);
            setLoadingStudents(false);
        });

        const pendingQ = query(
            collection(db, "student_change_requests"),
            where("classId", "==", currentClassInfo.classId),
            where("sectionId", "==", currentClassInfo.sectionId)
        );

        const unsubPending = onSnapshot(pendingQ, (snap) => {
            pendingList = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((d: any) => d.requestType === "ADD" && d.status === "PENDING")
                .map((data: any) => {
                    return {
                        id: data.id,
                        ...(data.newData || {}),
                        status: "PENDING",
                        requestId: data.id,
                        isPending: true
                    };
                });
            processResults(approvedList, pendingList);
        }, (error) => {
            console.error("Pending requests sync error:", error);
        });

        return () => {
            unsubApproved();
            unsubPending();
        };
    }, [currentClassInfo, selectedYear, isManageRollsOpen]);

    // Listen to Today's Attendance and Leaves
    useEffect(() => {
        if (!currentClassInfo) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const attId = `${todayStr}_${currentClassInfo.classId}_${currentClassInfo.sectionId}`;

        // Listen to Today's Attendance
        const unsubAtt = onSnapshot(doc(db, "attendance_daily", attId), (snap) => {
            if (snap.exists()) {
                setAttendanceToday(snap.data().records || {});
                setAttendanceMarked(true);
            } else {
                setAttendanceToday({});
                setAttendanceMarked(false);
            }
        }, (err) => {
            console.warn("Attendance today sync error:", err);
            setAttendanceToday({});
            setAttendanceMarked(false);
        });

        // Listen to Leaves today for this class
        const lQuery = query(
            collection(db, "student_leaves"),
            where("classId", "==", currentClassInfo.classId),
            where("schoolId", "==", userData.schoolId)
        );
        const unsubLeaves = onSnapshot(lQuery, (snap) => {
            let count = 0;
            snap.docs.forEach(ld => {
                const l = ld.data();
                if (l.status === "APPROVED" && l.schoolId === (userData?.schoolId || "global")) {
                    if (l.fromDate <= todayStr && l.toDate >= todayStr) {
                        if (!l.sectionId || l.sectionId === currentClassInfo.sectionId) {
                            count++;
                        }
                    }
                }
            });
            setLeavesTodayCount(count);
        }, (err) => {
            console.warn("Leaves today sync error:", err);
            setLeavesTodayCount(0);
        });

        return () => {
            unsubAtt();
            unsubLeaves();
        };
    }, [currentClassInfo, userData?.schoolId]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = !searchQuery ||
                (s.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (s.schoolId?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (s.parentMobile || "").includes(searchQuery);
            const matchesStatus = statusFilter === "all" || s.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [students, searchQuery, statusFilter]);

    // Statistics (Students, Present, Absent, Leaves)
    const stats = useMemo(() => {
        const total = students.filter(s => s.status === "ACTIVE").length;
        let present = 0;
        let absent = 0;
        
        if (attendanceMarked) {
            students.forEach(s => {
                if (s.status === "ACTIVE") {
                    const status = attendanceToday[s.id];
                    if (status === 'P') present++;
                    else if (status === 'A') absent++;
                    else present++; // default to present
                }
            });
        }

        return { 
            total: students.length,
            present: attendanceMarked ? present : 0, 
            absent: attendanceMarked ? absent : 0, 
            leaves: leavesTodayCount,
            isMarked: attendanceMarked
        };
    }, [students, attendanceToday, attendanceMarked, leavesTodayCount]);


    if (!loadingTeacher && !masterLoading && authorizedClasses.length === 0) {
        return (
            <div className="p-10 text-center space-y-4 max-w-md mx-auto mt-20 bg-black/20 border border-white/10 rounded-3xl backdrop-blur-xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-lg shadow-red-500/20">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">No Classes Assigned</h2>
                <p className="text-muted-foreground text-sm">You are not currently assigned to any active classes.</p>
            </div>
        );
    }

    const { isClassTeacher } = currentClassInfo || { isClassTeacher: false };
    const currentClassName = classes?.[currentClassInfo?.classId || ""]?.name || "Loading";
    const currentSectionName = sections?.[currentClassInfo?.sectionId || ""]?.name || "";

    return (
        <div className="space-y-3 md:space-y-4 animate-in fade-in duration-200 p-2 sm:p-4 md:p-6 lg:p-8 max-w-[1500px] mx-auto pb-28">

            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2 md:pb-3">
                <div className="hidden md:block space-y-0.5 relative pl-4">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#10B981] to-emerald-500 rounded-r-full" />
                    <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-1.5">
                        Class registry
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-xs">Manage student profiles, parent contacts, and roll numbers.</p>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex-1 sm:flex-initial flex items-center bg-[#0B1524]/60 border border-[#10B981]/20 rounded-lg p-0.5 backdrop-blur-md">
                        <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                            <SelectTrigger className="w-full sm:w-[170px] h-8 bg-transparent border-none shadow-none focus:ring-0 text-[11px] font-black text-[#10B981] px-2">
                                <div className="flex items-center gap-1 min-w-0">
                                    <BookOpen className="w-3 h-3 text-[#10B981] shrink-0" />
                                    <SelectValue placeholder="Select Class" className="truncate" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#030712] border-white/10 text-white">
                                {authorizedClasses.map(c => (
                                    <SelectItem key={c.key} value={c.key} className="py-2 cursor-pointer focus:bg-white/10">
                                        <span className="font-bold text-xs">{classes?.[c.classId]?.name || c.classId} - {sections?.[c.sectionId]?.name || c.sectionId}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isClassTeacher ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase tracking-widest text-[8px] h-8 px-2 flex items-center gap-1 shrink-0 rounded-lg">
                            <ShieldAlert className="w-2.5 h-2.5 text-amber-400" /> In-charge
                        </Badge>
                    ) : (
                        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black uppercase tracking-widest text-[8px] h-8 px-2 flex items-center gap-1 shrink-0 rounded-lg">
                            <Users className="w-2.5 h-2.5 text-blue-400" /> Subject
                        </Badge>
                    )}
                </div>
            </div>

            {/* 2. Stats Dashboard (Grid) */}
            <div className="grid grid-cols-4 gap-1.5 md:gap-4">
                <StatCard
                    title="Total Students"
                    value={loadingStudents ? "..." : stats.total}
                    icon={<Users className="w-4 h-4 text-blue-400" />}
                    color="text-blue-400"
                    borderColor="border-l-blue-500/80"
                    subtext="Enrolled students"
                />
                <StatCard
                    title="Present Today"
                    value={loadingStudents ? "..." : (stats.isMarked ? stats.present : "—")}
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    color="text-emerald-400"
                    borderColor="border-l-emerald-500/80"
                    subtext={stats.isMarked ? "Marked present" : "Not marked"}
                />
                <StatCard
                    title="Absent Today"
                    value={loadingStudents ? "..." : (stats.isMarked ? stats.absent : "—")}
                    icon={<XCircle className="w-4 h-4 text-rose-400" />}
                    color="text-rose-400"
                    borderColor="border-l-rose-500/80"
                    subtext={stats.isMarked ? "Marked absent" : "Not marked"}
                />
                <StatCard
                    title="On Leave"
                    value={loadingStudents ? "..." : stats.leaves}
                    icon={<CalendarDays className="w-4 h-4 text-amber-400" />}
                    color="text-amber-400"
                    borderColor="border-l-amber-500/80"
                    subtext="Leaves today"
                />
            </div>

            {/* Filters Bar & Action Row */}
            <div className="bg-[#0A192F]/30 border border-white/5 rounded-xl p-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative group flex-1 max-w-md w-full">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-[#10B981]" />
                    <Input
                        placeholder="Search student, ID, parent mobile..."
                        className="bg-black/40 border-white/5 pl-8 h-8 rounded-lg focus:ring-[#10B981]/15 focus:border-[#10B981] transition-all text-[11px] placeholder:text-white/20 text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-initial">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[120px] bg-black/40 border-white/5 rounded-lg h-8 focus:ring-[#10B981]/15 text-[11px] px-2.5">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#030712] border-white/10 text-white">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE">Active Only</SelectItem>
                                <SelectItem value="INACTIVE">Inactive Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isClassTeacher && (
                        <Button
                            variant="outline"
                            className="h-8 border-white/5 bg-white/5 hover:bg-white/10 gap-1.5 rounded-lg px-3 text-[11px] font-black uppercase tracking-wider shrink-0"
                            onClick={() => setIsManageRollsOpen(true)}
                        >
                            <GraduationCap className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Manage Rolls</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* 3. Students List Layout (Responsive transformation) */}
            
            {/* ========================================================================= */}
            {/* MOBILE SCREEN (Strictly Optimized for compact, high-density individual cards) */}
            {/* ========================================================================= */}
            <div className="md:hidden block space-y-1.5">
                {((loadingTeacher && !teacher) || masterLoading || (loadingStudents && students.length === 0)) ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
                    ))
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-white/40 bg-white/5 rounded-xl border border-dashed border-white/5">
                        <GraduationCap className="w-8 h-8 mx-auto text-white/20 mb-2" />
                        <h4 className="font-bold text-white text-xs">No Students Found</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">Refine your search queries or filter attributes.</p>
                    </div>
                ) : (
                    filteredStudents.map((s) => (
                        <div key={s.id} className="p-2 bg-[#0B1524]/30 border border-white/5 hover:border-[#10B981]/15 rounded-xl flex items-center justify-between transition-all gap-2.5 relative min-h-[58px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {/* Roll Number Badge */}
                                <div className="h-8 w-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] font-mono font-bold text-[11px] shrink-0 shadow-sm">
                                    #{String(s.rollNumber || "NA").padStart(2, '0')}
                                </div>

                                {/* Info Stack */}
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white text-xs font-bold truncate leading-tight">{s.studentName}</span>
                                    <span className="text-[9px] uppercase font-mono text-white/40 truncate mt-0.5 tracking-wider">
                                        ID: {s.schoolId || "Pending"}
                                    </span>
                                    
                                    {/* Click to Call dialer trigger for mobile convenience */}
                                    {s.parentMobile && (
                                        <a href={`tel:${s.parentMobile}`} className="flex items-center gap-0.5 text-[9px] font-medium text-blue-400 hover:underline mt-0.5">
                                            <Phone className="w-2.5 h-2.5 shrink-0" /> {s.parentMobile}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Right Status Badge & Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {s.isPending ? (
                                    <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">PENDING</span>
                                ) : (
                                    <Badge className={s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold py-0 px-1 rounded" : "bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold py-0 px-1 rounded"}>
                                        {s.status}
                                    </Badge>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-white/10 rounded-lg">
                                            <MoreVertical className="w-3.5 h-3.5 text-white/55" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#0B1524] border border-white/10 text-white p-1 rounded-lg">
                                        <DropdownMenuItem
                                            className="flex items-center gap-1.5 py-1.5 px-2.5 focus:bg-[#10B981]/15 focus:text-white rounded cursor-pointer"
                                            onClick={() => router.push(`/teacher/students/${s.id}`)}
                                        >
                                            <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                                            <span className="font-bold text-xs">Profile</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP & TABLET VIEW (Spacious, high-density data tables)              */}
            {/* ========================================================================= */}
            <div className="hidden md:block bg-[#0A1628]/10 border border-white/5 rounded-xl overflow-hidden backdrop-blur-xl shadow-xl relative">
                <div className="p-0 overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#0B1524]/60 text-[9px] uppercase tracking-wider font-semibold text-white/40 border-b border-white/5">
                                <th className="px-5 py-2.5">Roll</th>
                                <th className="px-4 py-2.5">Student profile</th>
                                <th className="px-4 py-2.5">Assigned Class</th>
                                <th className="px-4 py-2.5">Parent Contact Details</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-5 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {((loadingTeacher && !teacher) || masterLoading || (loadingStudents && students.length === 0)) ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-5 py-6 opacity-10">
                                            <div className="h-8 bg-white rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2">
                                                <GraduationCap className="w-6 h-6 text-white/20" />
                                            </div>
                                            <h3 className="text-sm font-bold text-white">No students enrolled</h3>
                                            <p className="text-muted-foreground text-[11px]">Verify your filters or search queries.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((s) => (
                                    <tr key={s.id} className="group hover:bg-white/[0.015] transition-colors relative">
                                        <td className="px-5 py-2.5">
                                            <span className="font-mono text-xs font-bold text-[#10B981]/90 group-hover:text-[#10B981] transition-colors">
                                                {String(s.rollNumber || "NA").padStart(2, '0')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981]/15 to-emerald-500/15 rounded-lg flex items-center justify-center border border-white/5 shrink-0 group-hover:scale-102 transition-transform">
                                                    {s.isPending ? <Plus className="w-4 h-4 text-amber-500" /> : <User className="w-4 h-4 text-[#10B981]" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white text-xs font-bold truncate max-w-[180px] group-hover:text-[#10B981] transition-colors">
                                                        {s.studentName}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-white/30 mt-0.5">{s.schoolId || "ID PENDING"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/10 py-0.5 px-1.5 rounded font-bold text-[8px] tracking-wider uppercase">
                                                    {currentClassName}
                                                </Badge>
                                                <Badge variant="outline" className="bg-purple-500/5 text-purple-400 border-purple-500/10 py-0.5 px-1.5 rounded font-bold text-[8px] tracking-wider uppercase">
                                                    Sec {currentSectionName}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1 text-[11px] text-white/80 font-bold">
                                                    <User className="w-3 h-3 text-white/30" />
                                                    {s.parentName}
                                                </div>
                                                <a href={`tel:${s.parentMobile}`} className="flex items-center gap-1.5 text-[9.5px] text-blue-400 hover:underline">
                                                    <Phone className="w-2.5 h-2.5 shrink-0" />
                                                    {s.parentMobile}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {s.isPending ? (
                                                <div className="flex items-center gap-1.5 text-amber-500">
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                    <span className="text-[8.5px] font-black uppercase tracking-wider">Pending</span>
                                                </div>
                                            ) : (
                                                <Badge className={s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded" : "bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded"}>
                                                    <div className="flex items-center gap-1 uppercase text-[8.5px] font-black">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === "ACTIVE" ? "bg-emerald-500 shadow-[0_0_6px_#10B981]" : "bg-red-500 shadow-[0_0_6px_#ef4444]"}`} />
                                                        {s.status}
                                                    </div>
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-5 py-2.5 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-7.5 w-7.5 p-0 hover:bg-white/5 rounded-lg">
                                                        <MoreHorizontal className="w-4 h-4 text-white/40" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#030712] border-white/10 text-white min-w-[130px] p-1.5 rounded-xl shadow-2xl">
                                                    <DropdownMenuItem
                                                        className="flex items-center gap-2 py-2 px-3 cursor-pointer focus:bg-white/5 rounded-lg"
                                                        onClick={() => router.push(`/teacher/students/${s.id}`)}
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                                                        <span className="font-semibold text-xs text-white">View Profile</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {isClassTeacher && isManageRollsOpen && (
                <ManageRollNumbersModal
                    classId={currentClassInfo?.classId || ""}
                    sectionId={currentClassInfo?.sectionId || ""}
                    className={currentClassName}
                    sectionName={currentSectionName}
                    students={students.filter(s => !s.isPending)}
                    onClose={() => setIsManageRollsOpen(false)}
                    onSuccess={() => {
                        setIsManageRollsOpen(false);
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ title, value, icon, color, subtext, borderColor }: { title: string, value: string | number, icon: React.ReactNode, color: string, subtext?: string, borderColor: string }) {
    return (
        <div className={cn("bg-[#0A192F]/40 border border-white/5 border-l-[3px] md:border-l-4 p-1.5 xs:p-2.5 md:p-3 rounded-lg md:rounded-xl flex flex-col justify-between backdrop-blur-xl group hover:bg-[#0A192F]/60 transition-all shadow-lg min-w-0", borderColor)}>
            <div className="flex items-center justify-between gap-1 mb-0.5 md:mb-1.5">
                <span className="text-[8px] md:text-[10px] text-white/40 uppercase font-bold tracking-wider truncate">{title}</span>
                <div className="w-5 h-5 md:w-6.5 md:h-6.5 rounded-md bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 hidden xs:flex">
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-3 h-3 md:w-4 md:h-4 text-current" })}
                </div>
            </div>
            <div>
                <div className={cn("text-xs xs:text-sm md:text-xl font-bold font-display leading-tight text-white", color)}>{value}</div>
                {subtext && <div className="text-[7.5px] md:text-[9.5px] text-white/30 font-medium mt-0.5 truncate hidden sm:block">{subtext}</div>}
            </div>
        </div>
    );
}

