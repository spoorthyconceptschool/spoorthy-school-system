"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
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
    const { user } = useAuth();
    const router = useRouter();
    const { classes, sections, classSections, subjectTeachers, selectedYear } = useMasterData();
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
        if (user) {
            fetchTeacher();
        }
    }, [user]);

    const fetchTeacher = async () => {
        setLoadingTeacher(true);
        try {
            const q = query(collection(db, "teachers"), where("uid", "==", user!.uid), limit(1));
            const snap = await getDocs(q);
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
                const [cId, sId] = key.split('_');
                if (!set.has(key)) {
                    set.set(key, { classId: cId, sectionId: sId, key, isClassTeacher: false });
                }
            }
        });

        return Array.from(set.values());
    };

    const authorizedClasses = useMemo(() => getAuthorizedClasses(teacher), [teacher, classSections, subjectTeachers]);
    const currentClassInfo = useMemo(() => authorizedClasses.find(c => c.key === selectedClassKey), [authorizedClasses, selectedClassKey]);

    useEffect(() => {
        if (!currentClassInfo || !selectedYear) return;

        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                // Fetch all students for the class to allow client-side status filtering
                const q = query(
                    collection(db, "students"),
                    where("classId", "==", currentClassInfo.classId),
                    where("sectionId", "==", currentClassInfo.sectionId),
                    where("academicYear", "==", selectedYear)
                );

                const snap = await getDocs(q);
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by roll number if available
                list.sort((a: any, b: any) => (a.rollNumber || Number.MAX_SAFE_INTEGER) - (b.rollNumber || Number.MAX_SAFE_INTEGER));
                setStudents(list);
            } catch (error) {
                console.error("Failed to fetch students:", error);
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchStudents();
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

    if (loadingTeacher) {
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
                            <Badge variant="outline" className="h-10 px-4 bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold uppercase tracking-widest text-[10px] gap-2">
                                <User className="w-3.5 h-3.5" /> Subject Teacher
                            </Badge>
                        )}
                    </div>

                    {isClassTeacher && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setIsManageRollsOpen(true)}
                                variant="outline"
                                className="h-10 px-4 bg-white/5 border-white/10 hover:bg-white/10 text-white font-medium"
                            >
                                <Users className="w-4 h-4 mr-2" /> Manage Rolls
                            </Button>
                            <Button
                                onClick={() => router.push(`/teacher/students/add?classId=${currentClassInfo?.classId}&sectionId=${currentClassInfo?.sectionId}`)}
                                className="bg-accent hover:bg-accent/90 text-black font-bold h-10 px-5 rounded-xl transition-all shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Student
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isManageRollsOpen && (
                <ManageRollNumbersModal
                    students={students}
                    classId={currentClassInfo?.classId || ""}
                    sectionId={currentClassInfo?.sectionId || ""}
                    className={currentClassName}
                    sectionName={currentSectionName}
                    onClose={() => setIsManageRollsOpen(false)}
                    onSuccess={() => setIsManageRollsOpen(false)}
                />
            )}

            {/* 2. Statistics Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Students"
                    value={loadingStudents ? "-" : stats.total}
                    icon={<Users className="w-5 h-5 text-accent" />}
                    trend={`${currentClassName} - ${currentSectionName}`}
                />
                <StatCard
                    title="Active Students"
                    value={loadingStudents ? "-" : stats.active}
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    trend="Currently Enrolled"
                />
                <StatCard
                    title="Boys"
                    value={loadingStudents ? "-" : stats.boys}
                    icon={<User className="w-5 h-5 text-blue-400" />}
                    trend="Male students"
                />
                <StatCard
                    title="Girls"
                    value={loadingStudents ? "-" : stats.girls}
                    icon={<User className="w-5 h-5 text-pink-400" />}
                    trend="Female students"
                />
            </div>

            {/* Main Content Area */}
            <div className="bg-black/20 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col">

                {/* 3. Professional Search and Filters */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md group">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                        <Input
                            placeholder="Search by student name, ID, or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 w-full bg-black/40 border-white/10 rounded-xl focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[140px] h-10 bg-black/40 border-white/10 rounded-xl text-xs font-semibold focus:ring-0">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 4/5/6/7. Student Table Redesign & Empty State */}
                <div className="overflow-x-auto min-h-[400px]">
                    {loadingStudents ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                            <p className="text-sm text-muted-foreground animate-pulse">Loading students framework...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-80 space-y-5 text-center px-4">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                                <GraduationCap className="w-10 h-10 text-white/20" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white">No students found</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    {searchQuery
                                        ? "No students match your search criteria. Try adjusting your filters."
                                        : "There are no students currently enrolled in this class."}
                                </p>
                            </div>
                            {isClassTeacher && !searchQuery && (
                                <Button
                                    onClick={() => router.push(`/teacher/students/add?classId=${currentClassInfo?.classId}&sectionId=${currentClassInfo?.sectionId}`)}
                                    className="bg-white text-black hover:bg-white/90"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add First Student
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16">Roll</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Placement</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map((s, i) => (
                                    <tr
                                        key={s.id}
                                        className={`group hover:bg-white/[0.03] transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-transparent' : 'bg-black/20'}`}
                                        onClick={() => router.push(`/teacher/students/${s.schoolId}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-mono font-medium text-white/50">{s.rollNumber || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-sm shrink-0 uppercase font-bold text-accent text-sm">
                                                    {s.studentName?.charAt(0) || <User size={16} className="text-white/40" />}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm text-white group-hover:text-accent transition-colors truncate">{s.studentName}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5">ID: {s.schoolId}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-white/90">{currentClassName}</span>
                                                <span className="text-[10px] text-white/50 mt-0.5">Sec {currentSectionName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-white/80 truncate max-w-[150px]">{s.parentName || 'N/A'}</span>
                                                <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-mono">
                                                    <Phone size={10} className="shrink-0" />
                                                    {s.parentMobile}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge className={s.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold tracking-wider text-[9px] uppercase shadow-sm" : "bg-red-500/10 text-red-400 border-red-500/20 font-bold tracking-wider text-[9px] uppercase shadow-sm"}>
                                                {s.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 rounded-lg text-white/60 hover:text-white relative group"
                                                    onClick={() => router.push(`/teacher/students/${s.schoolId}`)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span className="sr-only">View</span>
                                                </Button>

                                                {isClassTeacher && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-8 h-8 rounded-lg text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/teacher/students/${s.schoolId}?edit=true`);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-white/50 hover:text-white">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1.5">
                                                        <DropdownMenuItem onClick={() => router.push(`/teacher/students/${s.schoolId}`)} className="text-xs text-white/90 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer py-2">
                                                            <Eye className="w-3.5 h-3.5 mr-2" /> View Full Profile
                                                        </DropdownMenuItem>
                                                        {isClassTeacher && (
                                                            <DropdownMenuItem onClick={() => router.push(`/teacher/students/${s.schoolId}?edit=true`)} className="text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg cursor-pointer py-2 mt-1">
                                                                <Edit className="w-3.5 h-3.5 mr-2" /> Request Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string | number, icon: React.ReactNode, trend: string }) {
    return (
        <div className="bg-black/20 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                {icon}
            </div>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    {icon}
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
            </div>
            <div className="space-y-1">
                <p className="text-3xl font-display font-bold text-white tracking-tight">{value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{trend}</p>
            </div>
        </div>
    );
}
