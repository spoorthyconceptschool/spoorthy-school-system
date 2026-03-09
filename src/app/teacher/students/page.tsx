"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, SearchIcon, User, MapPin, Phone, Plus, Users, GraduationCap, Eye, MoreHorizontal, Edit, BookOpen, CheckCircle2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ManageRollNumbersModal } from "@/components/teacher/manage-roll-numbers-modal";

export default function TeacherStudentsPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const { classes, sections, classSections, subjectTeachers, selectedYear, loading: masterLoading } = useMasterData();
    const [teacher, setTeacher] = useState<any>(null);
    const [loadingTeacher, setLoadingTeacher] = useState(true);
    const [selectedClassKey, setSelectedClassKey] = useState("");

    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");

    // Modal States
    const [isManageRollsOpen, setIsManageRollsOpen] = useState(false);

    useEffect(() => {
        if (user && userData?.schoolId) {
            fetchTeacher();
        }
    }, [user, userData]);

    const fetchTeacher = async () => {
        setLoadingTeacher(true);
        try {
            // Priority lookup by schoolId, fallback to UID if old records exist
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

        // 1. Classes where I am Class Teacher
        Object.values(classSections).forEach((cs: any) => {
            const isMatch = (tId && cs.classTeacherId === tId) || (tDocId && cs.classTeacherId === tDocId);
            if (isMatch && cs.isActive !== false) {
                set.set(cs.id, { classId: cs.classId, sectionId: cs.sectionId, key: cs.id, isClassTeacher: true });
            }
        });

        // 2. Classes where I teach subjects
        Object.keys(subjectTeachers).forEach(key => {
            const subjectsObj = subjectTeachers[key];
            const teacherIds = Object.values(subjectsObj);
            const isMatch = (tId && teacherIds.includes(tId)) || (tDocId && teacherIds.includes(tDocId));

            if (isMatch) {
                // BUG FIX: Don't split by underscore as IDs often contain them (e.g. CLS_01)
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
        // BUG FIX: Include students with missing academicYear to prevent accidental exclusion
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
    };

    const authorizedClasses = useMemo(() => getAuthorizedClasses(teacher), [teacher, classSections, subjectTeachers]);
    const currentClassInfo = useMemo(() => authorizedClasses.find(c => c.key === selectedClassKey), [authorizedClasses, selectedClassKey]);

    useEffect(() => {
        if (!currentClassInfo) return;

        setLoadingStudents(true);
        let approvedList: any[] = [];
        let pendingList: any[] = [];

        // 1. Listen for Approved Students
        console.log(`[DEBUG] Fetching students for Class: ${currentClassInfo.classId}, Section: ${currentClassInfo.sectionId}`);
        const q = query(
            collection(db, "students"),
            where("classId", "==", currentClassInfo.classId),
            where("sectionId", "==", currentClassInfo.sectionId)
        );

        const unsubApproved = onSnapshot(q, (snap) => {
            approvedList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`[DEBUG] Approved Students for ${currentClassInfo.classId}:`, approvedList.length);
            if (approvedList.length === 0) {
                console.log(`[DEBUG] Query used: classId==${currentClassInfo.classId}, sectionId==${currentClassInfo.sectionId}`);
            }
            processResults(approvedList, pendingList);
        }, (error) => {
            console.error("Approved students sync error:", error);
            setLoadingStudents(false);
        });

        // 2. Listen for Pending Addition Requests
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

    if (loadingTeacher || masterLoading) {
        return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
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
    const currentClassName = classes[currentClassInfo?.classId || ""]?.name || "Loading";
    const currentSectionName = sections[currentClassInfo?.sectionId || ""]?.name || "";

    return (
        <div className="space-y-6 animate-in fade-in duration-200 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24">

            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
                <div className="space-y-1 relative">
                    <div className="absolute -left-4 md:-left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-accent to-emerald-500 rounded-r-full" />
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                        Students
                    </h1>
                    <p className="text-muted-foreground text-sm">View and manage students from your assigned classes.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center bg-black/20 border border-white/10 rounded-xl p-1 backdrop-blur-md">
                        <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                            <SelectTrigger className="w-[180px] h-10 bg-transparent border-none shadow-none focus:ring-0 text-sm font-semibold">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-accent" />
                                    <SelectValue placeholder="Select Class" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {authorizedClasses.map(c => (
                                    <SelectItem key={c.key} value={c.key} className="py-2.5 cursor-pointer focus:bg-white/10">
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-medium">{classes[c.classId]?.name || c.classId} - {sections[c.sectionId]?.name || c.sectionId}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="hidden sm:block">
                        {isClassTeacher ? (
                            <Badge variant="outline" className="h-10 px-4 bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold uppercase tracking-widest text-[10px] gap-2">
                                <ShieldAlert className="w-3.5 h-3.5" /> Class Teacher
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="h-10 px-4 bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold uppercase tracking-widest text-[10px] gap-2">
                                <Users className="w-3.5 h-3.5" /> Subject Teacher
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Total Students"
                    value={loadingStudents ? "..." : stats.total}
                    icon={<Users className="w-5 h-5" />}
                    trend="Loading -"
                />
                <StatCard
                    title="Active Students"
                    value={loadingStudents ? "..." : stats.active}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    trend="Currently Enrolled"
                />
                <StatCard
                    title="Boys"
                    value={loadingStudents ? "..." : stats.boys}
                    icon={<Plus className="w-5 h-5" />}
                    trend="Male students"
                />
                <StatCard
                    title="Girls"
                    value={loadingStudents ? "..." : stats.girls}
                    icon={<Plus className="w-5 h-5 text-pink-500" />}
                    trend="Female students"
                />
            </div>

            {/* 3. Main Content Card */}
            <div className="bg-black/20 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl relative">
                <div className="p-6 md:p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative group max-w-sm w-full">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                        <Input
                            placeholder="Search by student name, ID, or mobile..."
                            className="bg-black/40 border-white/10 pl-11 h-12 rounded-2xl focus:ring-accent/20 focus:border-accent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] bg-black/40 border-white/10 rounded-xl h-12 focus:ring-accent/20">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all">All Students</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {isClassTeacher && (
                            <Button
                                variant="outline"
                                className="h-12 border-white/10 bg-white/5 hover:bg-white/10 gap-2 rounded-xl px-6 font-semibold"
                                onClick={() => setIsManageRollsOpen(true)}
                            >
                                <GraduationCap className="w-4 h-4 text-accent" />
                                <span className="hidden sm:inline">Manage Rolls</span>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="p-0 overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-white/5 text-[11px] uppercase tracking-widest font-black text-muted-foreground border-b border-white/5">
                                <th className="px-8 py-5">Roll</th>
                                <th className="px-6 py-5">Student Info</th>
                                <th className="px-6 py-5">Class & Section</th>
                                <th className="px-6 py-5">Parent Contact</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loadingStudents ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-10 opacity-10">
                                            <div className="h-12 bg-white rounded-2xl w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 max-w-xs mx-auto">
                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                <GraduationCap className="w-10 h-10 text-muted-foreground/30" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">No students found</h3>
                                            <p className="text-muted-foreground text-sm">There are no students currently enrolled in this class.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((s) => (
                                    <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors relative">
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-lg font-bold text-accent/80 group-hover:text-accent transition-colors">
                                                {String(s.rollNumber || "NA").padStart(2, '0')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 font-medium">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
                                                    {s.isPending ? <Plus className="w-5 h-5 text-amber-500" /> : <User className="w-5 h-5 text-accent" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white text-base font-bold tracking-tight group-hover:text-accent transition-colors">
                                                        {s.studentName}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">{s.schoolId || "Pending ID"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20 py-1 px-3 rounded-lg font-black text-[10px] tracking-widest">
                                                    {currentClassName}
                                                </Badge>
                                                <Badge variant="outline" className="bg-purple-500/5 text-purple-400 border-purple-500/20 py-1 px-3 rounded-lg font-black text-[10px] tracking-widest">
                                                    SEC - {currentSectionName}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {s.parentName}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-white/60 transition-colors">
                                                    <Phone className="w-3 h-3" />
                                                    {s.parentMobile}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            {s.isPending ? (
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Approval</span>
                                                </div>
                                            ) : (
                                                <Badge className={s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3" : "bg-red-500/10 text-red-400 border border-red-500/20 px-3"}>
                                                    <div className="flex items-center gap-1.5 uppercase tracking-tighter text-[9px] font-black">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === "ACTIVE" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`} />
                                                        {s.status}
                                                    </div>
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 hover:bg-white/10 rounded-xl">
                                                        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white min-w-[160px] p-2 rounded-2xl shadow-2xl">
                                                    <DropdownMenuItem
                                                        className="flex items-center gap-3 py-3 px-4 cursor-pointer focus:bg-white/10 rounded-xl"
                                                        onClick={() => router.push(`/teacher/students/${s.id}`)}
                                                    >
                                                        <Eye className="w-4 h-4 text-accent" />
                                                        <span className="font-semibold text-sm">View Profile</span>
                                                    </DropdownMenuItem>
                                                    {isClassTeacher && !s.isPending && (
                                                        <DropdownMenuItem
                                                            className="flex items-center gap-3 py-3 px-4 cursor-pointer focus:bg-white/10 rounded-xl text-amber-400"
                                                        // Future: Edit Modal
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                            <span className="font-semibold text-sm">Edit Student</span>
                                                        </DropdownMenuItem>
                                                    )}
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
            {isClassTeacher && (
                <ManageRollNumbersModal
                    classId={currentClassInfo?.classId || ""}
                    sectionId={currentClassInfo?.sectionId || ""}
                    className={currentClassName}
                    sectionName={currentSectionName}
                    students={students.filter(s => !s.isPending)}
                    onClose={() => setIsManageRollsOpen(false)}
                    onSuccess={() => {
                        setIsManageRollsOpen(false);
                        // Refresh will happen via onSnapshot
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string | number, icon: React.ReactNode, trend: string }) {
    return (
        <div className="bg-black/20 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between backdrop-blur-xl group hover:border-accent/40 transition-all shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{trend}</span>
            </div>
            <div>
                <h3 className="text-muted-foreground text-xs uppercase font-black tracking-widest mb-1">{title}</h3>
                <div className="text-4xl font-display font-black text-white group-hover:text-accent transition-colors">{value}</div>
            </div>
        </div>
    );
}
