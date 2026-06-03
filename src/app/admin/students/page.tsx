"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, limit, orderBy, getDocs, where, doc, updateDoc, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { Filter, Search as SearchIcon, Plus, Download, IndianRupee, Users, MoreHorizontal, MoreVertical, ArrowUpDown, User, Key, Trash2, CreditCard, Loader2, CheckCircle2, MapPin, Phone, BookOpen, RefreshCw, ArrowRight, Lock, GraduationCap, Clock, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StudentImportModal } from "@/components/admin/student-import-modal";
import { DataTable } from "@/components/ui/data-table";
import { StudentExportModal } from "@/components/admin/student-export-modal";
import { FeeSlipGenerator } from "@/components/admin/fee-slip-generator";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";

interface Student {
    id: string;
    schoolId: string;
    studentName: string;
    parentName: string;
    parentMobile: string;
    className: string;
    sectionName: string;
    villageName: string;
    status: string;
    villageId: string;
    classId: string;
    uid: string;
    recoveryPassword?: string;
    studentDocId?: string;
    dateOfBirth?: string;
    gender?: string;
    transportRequired?: boolean;
}


import { StudentApprovalsManager } from "@/components/admin/student-approvals-manager";

const DEFAULT_STUDENTS = [
    {
        id: "SHS1001",
        schoolId: "SHS1001",
        studentName: "Aarav Sharma",
        parentName: "Vikram Sharma",
        parentMobile: "9876543210",
        className: "Class 1",
        sectionName: "A",
        villageName: "Miyapur",
        status: "ACTIVE",
        villageId: "VIL_001",
        classId: "CLS_04",
        uid: "uid_aarav_1001"
    },
    {
        id: "SHS1002",
        schoolId: "SHS1002",
        studentName: "Aadhya Reddy",
        parentName: "Somesh Reddy",
        parentMobile: "9100060001",
        className: "Class 2",
        sectionName: "B",
        villageName: "Bachupally",
        status: "ACTIVE",
        villageId: "VIL_002",
        classId: "CLS_05",
        uid: "uid_aadhya_1002"
    }
];

export default function StudentsPage() {
    const router = useRouter();
    const { user, role, isAdmin } = useAuth();
    const { villages: villagesData, classes: classesData, loading: masterLoading, selectedYear } = useMasterData();
    const STUDENT_CACHE_KEY = `spoorthy_students_cache_${selectedYear}`;
    const [students, setStudents] = useState<Student[]>(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            const cached = localStorage.getItem(STUDENT_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch (e) {}
            }
        }
        return DEFAULT_STUDENTS;
    });
    const [localLoading, setLocalLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"directory" | "approvals">("directory");

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [villageFilter, setVillageFilter] = useState("all");
    const [classFilter, setClassFilter] = useState("all");
    const [sectionFilter, setSectionFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"createdAt" | "schoolId">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Unified loading state
    const isTableLoading = (masterLoading && students.length === 0) || localLoading;

    // Watchdog for master data
    useEffect(() => {
        if (masterLoading) {
            const t = setTimeout(() => {
                // If master data is still loading after 5s, we might already have local data or cache.
                // We'll proceed with localLoading only.
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [masterLoading]);

    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name || "Unknown Class", order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resetUser, setResetUser] = useState<{ uid: string, schoolId: string, name: string, role: string } | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [pendingStudents, setPendingStudents] = useState<Student[]>([]);

    // Unified list of students (Real-time + Optimistic)
    const allStudents = useMemo(() => {
        // Create a map of real students by schoolId for fast lookup
        const realSchoolIds = new Set(students.map(s => s.schoolId));
        // Filter out pending students that have already been synchronized by onSnapshot
        const filteredPending = pendingStudents.filter(ps => !realSchoolIds.has(ps.schoolId));
        return [...filteredPending, ...students];
    }, [students, pendingStudents]);


    // Loading Watchdog
    useEffect(() => {
        let watchdog: any;
        if (localLoading) {
            watchdog = setTimeout(() => {
                if (localLoading) {
                    console.warn("[Watchdog] Student fetch taking too long (>10s), forcing loading to false.");
                    setLocalLoading(false);
                }
            }, 10000);
        }
        return () => clearTimeout(watchdog);
    }, [localLoading]);

    // 1. Unified Real-time Listener (onSnapshot)
    useEffect(() => {
        if (!user || !selectedYear) return;

        setLocalLoading(true);
        console.log(`[StudentsPage] Subscribing to students for ${selectedYear}`);

        let baseConstraints: any[] = [
            where("academicYear", "==", selectedYear),
        ];

        if (statusFilter !== "all") baseConstraints.push(where("status", "==", statusFilter));
        if (classFilter !== "all") baseConstraints.push(where("classId", "==", classFilter));
        if (villageFilter !== "all") baseConstraints.push(where("villageId", "==", villageFilter));
        if (sectionFilter !== "all") baseConstraints.push(where("sectionId", "==", sectionFilter));

        // Sorting Logic
        // If searching, we use keyword search (no order possible without specific index)
        if (searchQuery.trim()) {
            const qNormalized = searchQuery.trim().toLowerCase();
            baseConstraints.push(where("keywords", "array-contains", qNormalized));
        } else {
            baseConstraints.push(orderBy(sortBy, sortOrder));
        }

        // Limit for safety/performance
        baseConstraints.push(limit(100));

        const q = query(collection(db, "students"), ...baseConstraints);
        // Use onSnapshot for real-time reactivity as requested
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                studentDocId: doc.id
            })) as Student[];
            setStudents(list);
            setLocalLoading(false);
            
            // Clean up pending students that are now in the real list
            if (list.length > 0) {
                const incomingIds = new Set(list.map(s => s.schoolId));
                setPendingStudents(prev => prev.filter(ps => !incomingIds.has(ps.schoolId)));
            }

            if (statusFilter === "ACTIVE" && classFilter === "all" && villageFilter === "all" && sectionFilter === "all" && !searchQuery) {
                localStorage.setItem(STUDENT_CACHE_KEY, JSON.stringify(list.slice(0, 50))); // Cache first 50 for instant feel
            }
        }, (error: any) => {
            console.error("Directory Stream Error:", error);
            setLocalLoading(false);
            // Check if it's an index error (often contains a link or failed-precondition)
            const isIndexError = error.message?.toLowerCase().includes("index") || error.code === "failed-precondition";
            toast({
                title: isIndexError ? "Sync Initializing" : "Live Sync Error",
                description: isIndexError ? "Building database optimizations. Ready in 2-3 mins." : "Database busy. Try again later.",
                type: isIndexError ? "info" : "error"
            });
        });

        return () => unsubscribe();
    }, [user, selectedYear, statusFilter, classFilter, villageFilter, sectionFilter, searchQuery, sortBy, sortOrder]);

    const sections = useMemo(() => {
        if (classFilter === "all" || !classesData?.[classFilter]) return [];
        const cls = classesData[classFilter];
        return Object.values(cls.sections || {}).map((s: any) => ({
            id: s.id,
            name: s.name || "A"
        }));
    }, [classFilter, classesData]);

    const classLabel = classFilter === "all" ? "All Classes" : (classes.find(c => c.id === classFilter)?.name || "Class");
    const villageLabel = villageFilter === "all" ? "All Villages" : (villages.find(v => v.id === villageFilter)?.name || "Village");
    const statusLabel = statusFilter === "all" ? "All Status" : (statusFilter === "ACTIVE" ? "Active" : "Inactive");
    const sortLabel = sortBy === "createdAt" 
        ? (sortOrder === "desc" ? "Newest First" : "Oldest First") 
        : (sortOrder === "asc" ? "ID (Low to High)" : "ID (High to Low)");

    return (
        <div className="space-y-4 md:space-y-6 w-full pb-20 px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-1 md:px-0">
                <div className="space-y-0.5 md:space-y-1">
                    <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent leading-tight flex items-center gap-3">
                        Student Center
                    </h1>
                    <div className="flex items-center gap-1 mt-3">
                        <button
                            onClick={() => setActiveTab("directory")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                                activeTab === "directory" 
                                    ? "border-cyan-400 text-cyan-400" 
                                    : "border-transparent text-white/50 hover:text-white"
                            )}
                        >
                            <Users size={12} className="shrink-0" />
                            DIRECTORY
                        </button>
                        <button
                            onClick={() => setActiveTab("approvals")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                                activeTab === "approvals" 
                                    ? "border-cyan-400 text-cyan-400" 
                                    : "border-transparent text-white/50 hover:text-white"
                            )}
                        >
                            <CheckCircle2 size={12} className="shrink-0" />
                            APPROVALS
                        </button>
                    </div>
                </div>

                {activeTab === "directory" && (
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        <StudentExportModal students={students}>
                            <Button variant="outline" className="h-8 gap-1.5 border-white/20 bg-transparent text-white/80 hover:bg-white/5 hover:text-white rounded-lg text-xs transition-all font-medium px-3">
                                <FileText size={13} className="shrink-0 text-white/70" /> Reports & Export
                            </Button>
                        </StudentExportModal>
                        {isAdmin && (
                            <>
                                <StudentImportModal onSuccess={() => { window.location.reload(); }}>
                                    <Button variant="outline" className="h-8 gap-1.5 border-emerald-500/30 bg-transparent text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs transition-all font-medium px-3">
                                        <FileSpreadsheet size={13} className="shrink-0 text-emerald-400" /> Bulk Import
                                    </Button>
                                </StudentImportModal>
                                <AddStudentModal 
                                    onSuccess={(finalData) => {
                                        if (finalData?.schoolId) {
                                            setPendingStudents(prev => prev.map(ps => 
                                                (ps.schoolId === "PENDING..." && ps.studentName === finalData.studentName) 
                                                ? { ...ps, ...finalData } : ps
                                            ));
                                        }
                                    }} 
                                    onOptimisticUpdate={(newStudent) => {
                                        setPendingStudents(prev => [newStudent, ...prev]);
                                    }}
                                >
                                    <Button className="h-8 gap-1.5 bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90 rounded-lg text-xs font-bold px-3">
                                        <Plus size={13} className="shrink-0 animate-pulse" /> Add Student
                                    </Button>
                                </AddStudentModal>
                            </>
                        )}
                    </div>
                )}
            </div>

            {activeTab === "directory" ? (
                <>
                    {/* Search & Filter Funnel controls */}
                    <div className="flex items-center gap-2 mt-4">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                            <Input
                                placeholder="Search name, ID, or mobile..."
                                className="pl-9 h-9 bg-[#0B1524]/60 border-white/5 rounded-lg focus:ring-cyan-500/30 text-xs text-white placeholder-white/30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 bg-[#0B1524]/60 border border-white/5 rounded-lg text-white/50 hover:text-white shrink-0"
                        >
                            <Filter size={14} />
                        </Button>
                    </div>

                    {/* Filter Pills row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-fit h-7 bg-[#0B1524]/60 border border-white/5 rounded-lg text-[9px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <Filter size={10} className="text-[#64FFDA]" />
                                    <SelectValue>{statusLabel}</SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white text-xs">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Class Filter */}
                        <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setSectionFilter("all"); }}>
                            <SelectTrigger className="w-fit h-7 bg-[#0B1524]/60 border border-white/5 rounded-lg text-[9px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <GraduationCap size={10} className="text-cyan-400" />
                                    <SelectValue>{classLabel}</SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white text-xs">
                                <SelectItem value="all">All Classes</SelectItem>
                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Village Filter */}
                        <Select value={villageFilter} onValueChange={setVillageFilter}>
                            <SelectTrigger className="w-fit h-7 bg-[#0B1524]/60 border border-white/5 rounded-lg text-[9px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={10} className="text-violet-400" />
                                    <SelectValue>{villageLabel}</SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white text-xs">
                                <SelectItem value="all">All Villages</SelectItem>
                                {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Sort Filter */}
                        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
                            const [field, order] = val.split('-');
                            setSortBy(field as "createdAt" | "schoolId");
                            setSortOrder(order as "asc" | "desc");
                        }}>
                            <SelectTrigger className="w-fit h-7 bg-[#0B1524]/60 border border-white/5 rounded-lg text-[9px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <ArrowUpDown size={10} className="text-amber-400" />
                                    <SelectValue>{sortLabel}</SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white text-xs">
                                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                                <SelectItem value="schoolId-asc">ID (Low to High)</SelectItem>
                                <SelectItem value="schoolId-desc">ID (High to Low)</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Reset Filter Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("ACTIVE");
                                setClassFilter("all");
                                setVillageFilter("all");
                                setSectionFilter("all");
                                setSortBy("createdAt");
                                setSortOrder("desc");
                            }}
                            className="h-7 bg-[#0B1524]/60 border border-white/5 hover:bg-white/10 rounded-lg text-[9px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0"
                        >
                            Reset
                        </Button>
                    </div>

                    {/* List View Container */}
                    <div className="relative min-h-[300px] mt-4">
                        {isTableLoading ? (
                            <div className="h-48 w-full flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#64FFDA] animate-spin mb-4" />
                                <p className="text-xs text-white/30 uppercase tracking-widest animate-pulse font-mono">Loading students...</p>
                            </div>
                        ) : allStudents.length === 0 ? (
                            <div className="h-48 w-full flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                                <Users className="w-8 h-8 text-white/20 mb-2" />
                                <p className="text-xs text-white/40 uppercase tracking-widest font-mono">No students found</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                                <div className="divide-y divide-white/[0.04]">
                                    {allStudents.map((s, idx) => {
                                        const pending = s.recoveryPassword || s.parentMobile;
                                        const isFemale = s.gender?.toLowerCase() === "female" || s.gender?.toLowerCase() === "f";
                                        return (
                                            <div 
                                                key={s.schoolId} 
                                                onClick={() => router.push(`/admin/students/${s.schoolId}`)}
                                                className="flex items-center justify-between py-2.5 px-3 sm:px-4 bg-white/[0.01] hover:bg-white/[0.04] transition-all cursor-pointer gap-2 relative group"
                                            >
                                                {/* Col 1: Student info with Avatar */}
                                                <div className="flex items-center gap-2 w-[30%] min-w-0">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-[10px] sm:text-xs text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">
                                                            {s.studentName}
                                                        </span>
                                                        <span className="text-[8px] sm:text-[9px] text-white/40 tracking-wider mt-0.5 font-mono">
                                                            ID: {s.schoolId}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Col 2: Class & Location */}
                                                <div className="flex flex-col w-[20%] min-w-0">
                                                    <span className="bg-[#00E5FF]/10 text-[#00E5FF] px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase border border-[#00E5FF]/20 w-fit leading-none">
                                                        {s.className}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-white/50 mt-1 truncate">
                                                        <MapPin size={9} className="text-white/30 shrink-0" />
                                                        <span className="truncate">{s.villageName}</span>
                                                    </div>
                                                </div>

                                                {/* Col 3: Parent details */}
                                                <div className="flex flex-col w-[22%] min-w-0">
                                                    <span className="font-semibold text-[9px] sm:text-[11px] text-white/80 truncate leading-none">{s.parentName}</span>
                                                    <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-white/50 mt-1.5 truncate font-mono">
                                                        <Phone size={9} className="text-white/30 shrink-0" />
                                                        <span className="truncate">{s.parentMobile}</span>
                                                    </div>
                                                </div>

                                                {/* Col 4: Credentials */}
                                                <div className="flex flex-col w-[20%] min-w-0">
                                                    <div className="flex items-center gap-1 text-amber-400 font-bold uppercase tracking-wider text-[8px] leading-none">
                                                        <span>{isFemale ? "♀" : "♂"} PASS:</span>
                                                    </div>
                                                    <span className="font-black text-amber-400 font-mono tracking-wide text-[8px] sm:text-[9px] mt-1.5 truncate">
                                                        {pending}
                                                    </span>
                                                </div>

                                                {/* Col 5: Actions */}
                                                <div className="flex items-center justify-end w-[8%] shrink-0 gap-1" onClick={e => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
                                                                <MoreVertical size={14} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-[#0B1524] border border-white/10 text-white min-w-[160px] p-1.5 rounded-xl shadow-2xl">
                                                            <DropdownMenuItem onClick={() => router.push(`/admin/students/${s.schoolId}`)} className="rounded-lg gap-2 text-xs font-bold text-white hover:text-cyan-400 transition-colors">
                                                                <User size={14} /> Edit Profile
                                                            </DropdownMenuItem>
                                                            {isAdmin && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => router.push(`/admin/students/${s.schoolId}?action=collect-fee`)} className="rounded-lg gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                                                                        <CreditCard size={14} /> Collect Fee
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setResetUser({ uid: s.uid || "", schoolId: s.schoolId, name: s.studentName, role: "STUDENT" });
                                                                        setIsResetModalOpen(true);
                                                                    }} className="rounded-lg gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                                                                        <Key size={14} /> Reset Password
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        onClick={async () => {
                                                                            const nextStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                                                            if (!confirm(`Are you sure you want to set status to ${nextStatus}?`)) return;
                                                                            try {
                                                                                const studentDocId = s.studentDocId || s.schoolId;
                                                                                await updateDoc(doc(db, "students", studentDocId), {
                                                                                    status: nextStatus,
                                                                                    updatedAt: new Date().toISOString()
                                                                                });
                                                                                toast({ title: "Updated", description: `${s.studentName} is now ${nextStatus.toLowerCase()}.`, type: "success" });
                                                                            } catch (err: any) {
                                                                                toast({ title: "Error", description: err.message, type: "error" });
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "rounded-lg gap-2 text-xs font-bold transition-colors",
                                                                            s.status === 'ACTIVE' ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"
                                                                        )}
                                                                    >
                                                                        {s.status === 'ACTIVE' ? (
                                                                            <><Lock size={14} /> Deactivate</>
                                                                        ) : (
                                                                            <><CheckCircle2 size={14} /> Activate</>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    {s.status === "INACTIVE" && (
                                                                        <DropdownMenuItem 
                                                                            onClick={() => {
                                                                                setSelectedStudent(s);
                                                                                setIsDeleteModalOpen(true);
                                                                            }}
                                                                            className="rounded-lg gap-2 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                                        >
                                                                            <Trash2 size={14} /> Delete Account
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Bottom pagination summary */}
                                <div className="flex items-center justify-between p-4 border-t border-white/[0.04] bg-black/20 text-xs">
                                    <span className="text-white/40 font-mono">
                                        Showing 1 to {allStudents.length} of {students.length} students
                                    </span>
                                    <button 
                                        onClick={() => {
                                            toast({ title: "All records synced", description: "Showing current active matches.", type: "info" });
                                        }}
                                        className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-cyan-300 transition-colors text-[10px]"
                                    >
                                        View All <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <AdminChangePasswordModal
                        isOpen={isResetModalOpen}
                        onClose={() => setIsResetModalOpen(false)}
                        user={resetUser}
                        onSuccess={() => { window.location.reload(); }}
                    />

                    {selectedStudent && (
                        <DeleteUserModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => {
                                setIsDeleteModalOpen(false);
                                setSelectedStudent(null);
                            }}
                            user={{
                                id: selectedStudent.schoolId,
                                schoolId: selectedStudent.schoolId,
                                name: selectedStudent.studentName,
                                role: "student"
                            }}
                            checkEligibility={async () => {
                                const pQ = query(collection(db, "payments"), where("studentId", "==", selectedStudent.schoolId), limit(1));
                                const caps = await getDocs(pQ);
                                if (!caps.empty) return { canDelete: false, reason: "Payments exist." };
                                return { canDelete: true };
                            }}
                            onDeactivate={async (reason) => {
                                if (!selectedStudent) return;
                                const studentDocId = selectedStudent.studentDocId || selectedStudent.schoolId;
                                await updateDoc(doc(db, "students", studentDocId), {
                                    status: "INACTIVE",
                                    deactivationReason: reason,
                                    updatedAt: new Date().toISOString()
                                });

                                try {
                                    const ledgerId = `${selectedStudent.schoolId}_${selectedYear}`;
                                    await updateDoc(doc(db, "student_fee_ledgers", ledgerId), {
                                        studentStatus: "INACTIVE",
                                        updatedAt: new Date().toISOString()
                                    });
                                } catch (e) {
                                    console.warn("Ledger not found or update failed during deactivation:", e);
                                }
                            }}
                            onDelete={async (reason) => {
                                if (!selectedStudent) return;
                                if (!user) { alert("You are not authenticated"); return; }

                                const token = await user.getIdToken();
                                const res = await fetch("/api/admin/users/delete", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                        targetUid: selectedStudent.uid,
                                        schoolId: selectedStudent.schoolId,
                                        role: "STUDENT",
                                        collectionName: "students"
                                    })
                                });

                                const data = await res.json();
                                if (!data.success) {
                                    throw new Error(data.error || "Delete failed");
                                }
                            }}
                        />
                    )}
                </>
            ) : (
                <StudentApprovalsManager />
            )}
        </div>
    );
}

