"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, SearchIcon, User, MapPin, Phone, Plus, Users, GraduationCap, Eye, MoreHorizontal, Edit, BookOpen, CheckCircle2, ShieldAlert, ArrowLeft, MoreVertical, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ManageRollNumbersModal } from "@/components/teacher/manage-roll-numbers-modal";
import { cn } from "@/lib/utils";

export default function TeacherStudentsPage() {

    const DEFAULT_PROFILE = {
        name: "Prof. S. Praneeth",
        schoolId: "TCH-2026-042",
        teacherId: "TCH-2026-042",
        status: "ACTIVE",
        schoolName: "Spoorthy Concept School"
    };

    const DEFAULT_STUDENTS = [
        { id: "std_1", rollNumber: 1, studentName: "Aarav Sharma", schoolId: "SCH-001", status: "ACTIVE", parentMobile: "+91 99887 76655", gender: "MALE" },
        { id: "std_2", rollNumber: 2, studentName: "Ananya Reddy", schoolId: "SCH-002", status: "ACTIVE", parentMobile: "+91 88776 65544", gender: "FEMALE" },
        { id: "std_3", rollNumber: 3, studentName: "Vihaan Patel", schoolId: "SCH-003", status: "ACTIVE", parentMobile: "+91 77665 54433", gender: "MALE" },
        { id: "std_4", rollNumber: 4, studentName: "Sai Kumar", schoolId: "SCH-004", status: "ACTIVE", parentMobile: "+91 66554 43322", gender: "MALE" },
        { id: "std_5", rollNumber: 5, studentName: "Diya Sen", schoolId: "SCH-005", status: "ACTIVE", parentMobile: "+91 55443 32211", gender: "FEMALE" }
    ];

    const { user, userData } = useAuth();
    const router = useRouter();
    const { classes, sections, classSections, subjectTeachers, selectedYear, branding, loading: masterLoading } = useMasterData();
    const [teacher, setTeacher] = useState<any>(() => {
        if (typeof window === 'undefined') return DEFAULT_PROFILE;
        const cached = localStorage.getItem("teacher_profile_cache");
        return cached ? JSON.parse(cached) : DEFAULT_PROFILE;
    });
    const [loadingTeacher, setLoadingTeacher] = useState(false);
    const [selectedClassKey, setSelectedClassKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem("teacher_selected_class_key") || "" : "");

    const [students, setStudents] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_STUDENTS;
        const classKey = localStorage.getItem("teacher_selected_class_key") || "";
        const cached = localStorage.getItem("teacher_students_cache_" + classKey);
        return cached ? JSON.parse(cached) : DEFAULT_STUDENTS;
    });
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");

    // Modal States
    const [isManageRollsOpen, setIsManageRollsOpen] = useState(false);

    useEffect(() => {
        if (selectedClassKey && typeof window !== 'undefined') {
            localStorage.setItem("teacher_selected_class_key", selectedClassKey);
        }
    }, [selectedClassKey]);

    useEffect(() => {
        if (user && userData?.schoolId) {
            fetchTeacher();
        }
    }, [user, userData]);

    const fetchTeacher = async () => {
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
                if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(tData));

                const authorized = getAuthorizedClasses(tData);
                if (authorized.length > 0) {
                    setSelectedClassKey(prev => {
                        const exists = authorized.some(c => c.key === prev);
                        const next = exists && prev ? prev : authorized[0].key;
                        if (typeof window !== 'undefined') localStorage.setItem("teacher_selected_class_key", next);
                        return next;
                    });
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

        if (typeof window !== 'undefined' && selectedClassKey) {
            localStorage.setItem("teacher_students_cache_" + selectedClassKey, JSON.stringify(combined));
        }
    };

    const authorizedClasses = useMemo(() => getAuthorizedClasses(teacher), [teacher, classSections, subjectTeachers]);
    const currentClassInfo = useMemo(() => authorizedClasses.find(c => c.key === selectedClassKey), [authorizedClasses, selectedClassKey]);

    useEffect(() => {
        if (!currentClassInfo) return;

        const hasCache = typeof window !== 'undefined' && localStorage.getItem("teacher_students_cache_" + selectedClassKey);
        if (!hasCache) {
            setLoadingStudents(true);
        } else {
            // Seed state from cache immediately on selectedClassKey changes
            const cached = localStorage.getItem("teacher_students_cache_" + selectedClassKey);
            if (cached) {
                setStudents(JSON.parse(cached));
                setLoadingStudents(false);
            }
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

    // Statistics
    const stats = useMemo(() => {
        const total = students.length;
        const active = students.filter(s => s.status === "ACTIVE").length;
        const boys = students.filter(s => s.gender?.toLowerCase() === "male").length;
        const girls = students.filter(s => s.gender?.toLowerCase() === "female").length;
        return { total, active, boys, girls };
    }, [students]);

    if (loadingTeacher && !teacher) {
        return <div className="min-h-screen flex items-center justify-center bg-[#070F1E]"><Loader2 className="w-10 h-10 animate-spin text-[#10B981]" /></div>;
    }

    if (authorizedClasses.length === 0) {
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
        <div className="min-h-screen text-[#E6F1FF] bg-[#070F1E] pb-24">
            <div className="md:hidden flex h-16 items-center justify-between px-4 bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40 shrink-0 border-b border-[#10B981]/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-amber-500/40 shadow-md shrink-0 overflow-hidden">
                        <img
                            src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                            alt="Logo"
                            className="w-full h-full object-contain filter drop-shadow-sm"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png";
                            }}
                        />
                    </div>
                    <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                        <SelectTrigger className="flex items-center gap-2 h-9 bg-transparent border border-white/10 px-3 py-1 rounded-xl text-white text-xs font-bold focus:ring-0 shadow-none hover:bg-white/5 transition-colors">
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0b172c] border border-white/10 text-white rounded-2xl">
                            {authorizedClasses.map(c => (
                                <SelectItem key={c.key} value={c.key} className="py-2.5 cursor-pointer focus:bg-white/10 text-xs rounded-xl font-bold">
                                    {classes?.[c.classId]?.name || c.classId} - {sections?.[c.sectionId]?.name || c.sectionId}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Bell className="w-5 h-5 text-white/70" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">4</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#053d2c] text-[#10B981] flex items-center justify-center font-black text-sm border border-[#10B981]/25">
                        {user?.email?.substring(0, 1).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Desktop Header Content */}
            <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-4 p-8">
                <div className="space-y-1 relative pl-4 md:pl-6">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-emerald-500 rounded-r-full" />
                    <h1 className="text-4xl font-display font-bold text-white tracking-tight flex items-center gap-2">Class registry</h1>
                    <p className="text-muted-foreground text-sm">Manage student profiles, parent contacts, and roll numbers.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                        <SelectTrigger className="w-[200px] h-10 bg-[#0A192F]/50 border border-white/10 rounded-xl text-sm font-bold text-[#10B981]">
                            <BookOpen className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {authorizedClasses.map(c => (
                                <SelectItem key={c.key} value={c.key} className="py-2.5 font-bold focus:bg-white/10">{classes?.[c.classId]?.name || c.classId} - {sections?.[c.sectionId]?.name || c.sectionId}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
                {/* Stats Dashboard Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard title="Total Students" value={loadingStudents ? "..." : stats.total} icon={<Users className="w-5 h-5 text-blue-400" />} color="text-blue-500" />
                    <StatCard title="Active Status" value={loadingStudents ? "..." : stats.active} icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} color="text-emerald-500" />
                    <StatCard title="Boys" value={loadingStudents ? "..." : stats.boys} icon={<User className="w-5 h-5 text-cyan-400" />} color="text-cyan-400" />
                    <StatCard title="Girls" value={loadingStudents ? "..." : stats.girls} icon={<User className="w-5 h-5 text-pink-400" />} color="text-pink-400" />
                </div>

                {/* Filters Bar & Action Row */}
                <div className="flex flex-col gap-3">
                    <div className="relative group w-full">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#10B981]" />
                        <Input
                            placeholder="Search student, school ID, or mobile..."
                            className="bg-[#0b172c] border-[#1e293b] pl-11 h-12 rounded-xl focus:ring-0 focus:border-white/20 text-sm font-medium text-white placeholder:text-white/30 shadow-none transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] bg-[#0b172c] border-[#1e293b] rounded-xl h-10 focus:ring-0 shadow-none font-bold text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b172c] border-[#1e293b] text-white rounded-2xl">
                                <SelectItem value="all" className="font-bold text-xs py-2.5 focus:bg-white/10 rounded-xl">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE" className="font-bold text-xs py-2.5 focus:bg-white/10 rounded-xl">Active Only</SelectItem>
                                <SelectItem value="INACTIVE" className="font-bold text-xs py-2.5 focus:bg-white/10 rounded-xl">Inactive Only</SelectItem>
                            </SelectContent>
                        </Select>

                        {isClassTeacher && (
                            <Button
                                variant="outline"
                                className="h-10 border-[#1e293b] bg-[#0b172c] hover:bg-white/5 hover:text-white gap-2 rounded-xl px-4 text-xs font-bold shadow-none text-white"
                                onClick={() => setIsManageRollsOpen(true)}
                            >
                                <GraduationCap className="w-4 h-4 text-[#10B981]" />
                                Manage Rolls
                            </Button>
                        )}
                    </div>
                </div>

                {/* Students List Layout */}
                <div className="space-y-3">
                    {loadingStudents ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-[90px] bg-[#0b172c] rounded-2xl animate-pulse" />
                        ))
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-16 text-white/40 bg-[#0b172c] rounded-2xl border border-[#1e293b]">
                            <GraduationCap className="w-10 h-10 mx-auto text-white/20 mb-3" />
                            <h4 className="font-bold text-white">No Students Found</h4>
                        </div>
                    ) : (
                        filteredStudents.map((s) => (
                            <div key={s.id} className="p-4 bg-[#0b172c] border border-[#1e293b] hover:border-white/10 rounded-2xl flex items-center justify-between transition-all gap-4">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="h-11 w-11 rounded-2xl bg-[#053d2c] flex items-center justify-center text-[#10B981] font-mono font-black text-xs shrink-0">
                                        #{String(s.rollNumber || "NA").padStart(2, '0')}
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                        <span className="text-white text-sm font-black truncate">{s.studentName}</span>
                                        <span className="text-[10px] font-mono text-white/40 truncate tracking-wider mt-0.5">
                                            ID: {s.schoolId || "Pending"}
                                        </span>
                                        
                                        {s.parentMobile && (
                                            <a href={`tel:${s.parentMobile}`} className="flex items-center gap-1.5 text-[10px] font-bold text-[#3B82F6] mt-1.5 hover:underline">
                                                <Phone className="w-3 h-3" /> Call parent: {s.parentMobile}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {s.isPending ? (
                                        <span className="text-[9px] font-black uppercase text-amber-500">PENDING</span>
                                    ) : (
                                        <Badge className={s.status === "ACTIVE" ? "bg-[#053d2c] text-[#10B981] hover:bg-[#053d2c] border-none text-[9px] font-black py-0.5 px-2 tracking-widest rounded-md uppercase" : "bg-red-500/10 text-red-400 hover:bg-red-500/10 border-none text-[9px] font-black py-0.5 px-2 tracking-widest rounded-md uppercase"}>
                                            {s.status}
                                        </Badge>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5 rounded-lg text-white/50">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#0b172c] border border-[#1e293b] text-white p-1 rounded-xl">
                                            <DropdownMenuItem
                                                className="flex items-center gap-2 py-2 px-3 focus:bg-white/5 focus:text-white rounded-lg cursor-pointer"
                                                onClick={() => router.push(`/teacher/students/${s.id}`)}
                                            >
                                                <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                                                <span className="font-bold text-xs">View Profile</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
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
                    onSuccess={() => setIsManageRollsOpen(false)}
                />
            )}
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
    return (
        <div className="bg-[#0b172c] border border-[#1e293b] p-2.5 rounded-xl flex items-center gap-2.5 group hover:border-white/10 transition-all shadow-none">
            <div className="w-7 h-7 rounded-lg bg-[#070F1E] flex items-center justify-center shrink-0 border border-white/5">
                {icon}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[8px] text-white/40 font-black uppercase tracking-wider leading-none truncate">{title}</span>
                <span className="text-sm font-black text-white leading-none mt-1">{value}</span>
            </div>
        </div>
    );
}
