"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, SearchIcon, User, MapPin, Phone, Plus, Users, GraduationCap, Eye, MoreHorizontal, Edit, BookOpen, CheckCircle2, ShieldAlert, ArrowLeft, MoreVertical } from "lucide-react";
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
    };

    const authorizedClasses = useMemo(() => getAuthorizedClasses(teacher), [teacher, classSections, subjectTeachers]);
    const currentClassInfo = useMemo(() => authorizedClasses.find(c => c.key === selectedClassKey), [authorizedClasses, selectedClassKey]);

    useEffect(() => {
        if (!currentClassInfo) return;

        setLoadingStudents(true);
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

    if (loadingTeacher || masterLoading) {
        return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#10B981]" /></div>;
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
        <div className="space-y-6 animate-in fade-in duration-200 p-3 md:p-10 lg:p-12 max-w-[1600px] mx-auto pb-28">

            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-4">
                <div className="space-y-1 relative pl-4 md:pl-6">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-emerald-500 rounded-r-full" />
                    <h1 className="text-2xl md:text-4xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                        Class registry
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm">Manage student profiles, parent contacts, and roll numbers.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    <div className="flex items-center bg-[#0B1524]/60 border border-[#10B981]/20 rounded-xl p-1 backdrop-blur-md w-full md:w-auto">
                        <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                            <SelectTrigger className="w-full md:w-[200px] h-10 bg-transparent border-none shadow-none focus:ring-0 text-sm font-black text-[#10B981]">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-[#10B981]" />
                                    <SelectValue placeholder="Select Class" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#030712] border-white/10 text-white">
                                {authorizedClasses.map(c => (
                                    <SelectItem key={c.key} value={c.key} className="py-2.5 cursor-pointer focus:bg-white/10">
                                        <span className="font-bold">{classes?.[c.classId]?.name || c.classId} - {sections?.[c.sectionId]?.name || c.sectionId}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {isClassTeacher ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase tracking-widest text-[9px] h-10 px-3 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-400" /> Class In-charge
                            </Badge>
                        ) : (
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black uppercase tracking-widest text-[9px] h-10 px-3 flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-400" /> Subject Teacher
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Stats Dashboard (Grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                    title="Total Students"
                    value={loadingStudents ? "..." : stats.total}
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    color="text-blue-400"
                />
                <StatCard
                    title="Active status"
                    value={loadingStudents ? "..." : stats.active}
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    color="text-emerald-400"
                />
                <StatCard
                    title="Boys"
                    value={loadingStudents ? "..." : stats.boys}
                    icon={<User className="w-5 h-5 text-cyan-400" />}
                    color="text-cyan-400"
                />
                <StatCard
                    title="Girls"
                    value={loadingStudents ? "..." : stats.girls}
                    icon={<User className="w-5 h-5 text-pink-400" />}
                    color="text-pink-400"
                />
            </div>

            {/* Filters Bar & Action Row */}
            <div className="bg-[#0A192F]/50 border border-white/10 rounded-[1.5rem] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group max-w-md w-full">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-[#10B981]" />
                    <Input
                        placeholder="Search student, school ID, or mobile..."
                        className="bg-black/30 border-white/5 pl-11 h-11 rounded-xl focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-black/30 border-white/5 rounded-xl h-11 focus:ring-[#10B981]/20 text-xs">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#030712] border-white/10 text-white">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active Only</SelectItem>
                            <SelectItem value="INACTIVE">Inactive Only</SelectItem>
                        </SelectContent>
                    </Select>

                    {isClassTeacher && (
                        <Button
                            variant="outline"
                            className="h-11 border-white/10 bg-white/5 hover:bg-white/10 gap-2 rounded-xl px-5 text-xs font-black"
                            onClick={() => setIsManageRollsOpen(true)}
                        >
                            <GraduationCap className="w-4 h-4 text-[#10B981]" />
                            <span>Manage Rolls</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* 3. Students List Layout (Responsive transformation) */}
            
            {/* ========================================================================= */}
            {/* MOBILE SCREEN (Strictly Optimized for compact, high-density individual cards) */}
            {/* ========================================================================= */}
            <div className="md:hidden block space-y-2">
                {loadingStudents ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                    ))
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-16 text-white/40 bg-white/5 rounded-2xl border border-dashed border-white/5">
                        <GraduationCap className="w-10 h-10 mx-auto text-white/20 mb-3" />
                        <h4 className="font-bold text-white">No Students Found</h4>
                        <p className="text-xs text-white/40 mt-1">Refine your search queries or filter attributes.</p>
                    </div>
                ) : (
                    filteredStudents.map((s) => (
                        <div key={s.id} className="p-3 bg-white/5 border border-white/5 hover:border-[#10B981]/20 rounded-2xl flex items-center justify-between transition-all gap-3 relative min-h-[70px]">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Roll Number Badge */}
                                <div className="h-10 w-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] font-mono font-black text-xs shrink-0 shadow-sm">
                                    #{String(s.rollNumber || "NA").padStart(2, '0')}
                                </div>

                                {/* Avatar Initials */}
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 font-black text-[10px] uppercase shrink-0">
                                    {s.studentName?.substring(0, 2).toUpperCase()}
                                </div>

                                {/* Info Stack */}
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white text-xs font-black truncate leading-tight">{s.studentName}</span>
                                    <span className="text-[9px] uppercase font-mono text-white/30 truncate mt-0.5 tracking-wider">
                                        ID: {s.schoolId || "Pending"}
                                    </span>
                                    
                                    {/* Click to Call dialer trigger for mobile convenience */}
                                    {s.parentMobile && (
                                        <a href={`tel:${s.parentMobile}`} className="flex items-center gap-1 text-[9px] font-bold text-blue-400 mt-1 hover:underline">
                                            <Phone className="w-2.5 h-2.5" /> Call parent: {s.parentMobile}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Right Status Badge & Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {s.isPending ? (
                                    <span className="text-[8px] font-black uppercase text-amber-500">PENDING</span>
                                ) : (
                                    <Badge className={s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold py-0 px-1.5" : "bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold py-0 px-1.5"}>
                                        {s.status}
                                    </Badge>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10 rounded-xl">
                                            <MoreVertical className="w-4 h-4 text-white/50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#0B1524] border border-[#10B981]/20 text-white p-1 rounded-xl">
                                        <DropdownMenuItem
                                            className="flex items-center gap-2 py-2 px-3 focus:bg-[#10B981]/10 focus:text-white rounded-lg cursor-pointer"
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
            <div className="hidden md:block bg-black/20 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl relative">
                <div className="p-0 overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-black text-white/40 border-b border-white/5">
                                <th className="px-8 py-5">Roll</th>
                                <th className="px-6 py-5">Student profile</th>
                                <th className="px-6 py-5">Assigned Class</th>
                                <th className="px-6 py-5">Parent Contact Details</th>
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
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                <GraduationCap className="w-8 h-8 text-white/20" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white">No students enrolled</h3>
                                            <p className="text-muted-foreground text-xs">Verify your filters or search queries.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((s) => (
                                    <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors relative">
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-base font-black text-[#10B981]/80 group-hover:text-[#10B981] transition-colors">
                                                {String(s.rollNumber || "NA").padStart(2, '0')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 font-medium">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#10B981]/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                                                    {s.isPending ? <Plus className="w-5 h-5 text-amber-500" /> : <User className="w-5 h-5 text-[#10B981]" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white text-sm font-black truncate max-w-[180px] group-hover:text-[#10B981] transition-colors">
                                                        {s.studentName}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-white/30 mt-0.5">{s.schoolId || "ID PENDING"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20 py-0.5 px-2.5 rounded-lg font-black text-[9px] tracking-widest">
                                                    {currentClassName}
                                                </Badge>
                                                <Badge variant="outline" className="bg-purple-500/5 text-purple-400 border-purple-500/20 py-0.5 px-2.5 rounded-lg font-black text-[9px] tracking-widest">
                                                    SEC - {currentSectionName}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2 text-xs text-white/80 font-bold">
                                                    <User className="w-3.5 h-3.5 text-white/30" />
                                                    {s.parentName}
                                                </div>
                                                <a href={`tel:${s.parentMobile}`} className="flex items-center gap-2 text-[10px] text-blue-400 hover:underline">
                                                    <Phone className="w-3 h-3 shrink-0" />
                                                    {s.parentMobile}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            {s.isPending ? (
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Pending Add</span>
                                                </div>
                                            ) : (
                                                <Badge className={s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5" : "bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5"}>
                                                    <div className="flex items-center gap-1.5 uppercase tracking-tighter text-[9px] font-black">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === "ACTIVE" ? "bg-emerald-500 shadow-[0_0_8px_#10B981]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
                                                        {s.status}
                                                    </div>
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 hover:bg-white/10 rounded-xl">
                                                        <MoreHorizontal className="w-5 h-5 text-white/50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#030712] border-white/10 text-white min-w-[160px] p-2 rounded-2xl shadow-2xl">
                                                    <DropdownMenuItem
                                                        className="flex items-center gap-3 py-3 px-4 cursor-pointer focus:bg-white/10 rounded-xl"
                                                        onClick={() => router.push(`/teacher/students/${s.id}`)}
                                                    >
                                                        <Eye className="w-4 h-4 text-[#10B981]" />
                                                        <span className="font-semibold text-sm">View Profile</span>
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

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
    return (
        <div className="bg-[#0A192F]/50 border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col justify-between backdrop-blur-xl group hover:border-[#10B981]/25 transition-all shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] md:text-xs text-white/50 uppercase font-black tracking-widest">{title}</span>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    {icon}
                </div>
            </div>
            <div>
                <div className={cn("text-2xl md:text-4xl font-display font-black text-white", color)}>{value}</div>
            </div>
        </div>
    );
}
