"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, limit, orderBy, getDocs, where, doc, updateDoc, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { Filter, Search as SearchIcon, Plus, Download, IndianRupee, Users, MoreHorizontal, User, Key, Trash2, CreditCard, Loader2, CheckCircle2, MapPin, Phone, BookOpen, RefreshCw } from "lucide-react";
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

export default function StudentsPage() {
    const router = useRouter();
    const { user, role, isAdmin } = useAuth();
    const { villages: villagesData, classes: classesData, loading: masterLoading, selectedYear } = useMasterData();
    const STUDENT_CACHE_KEY = `spoorthy_students_cache_${selectedYear}`;
    const [students, setStudents] = useState<Student[]>(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            const cached = localStorage.getItem(STUDENT_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch (e) { return []; }
            }
        }
        return [];
    });
    const [localLoading, setLocalLoading] = useState(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            return !localStorage.getItem(STUDENT_CACHE_KEY);
        }
        return true;
    });
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

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200 w-full pb-20 px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-1 md:px-0">
                <div className="space-y-0.5 md:space-y-1">
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight flex items-center gap-3">
                        Student Center
                        <span className="text-sm md:text-lg bg-accent/20 text-accent px-3 py-1 rounded-full not-italic tracking-normal font-medium">
                            {students.length} Total
                        </span>
                    </h1>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("directory")}
                            className={cn(
                                "flex-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest h-8",
                                activeTab === "directory" ? "bg-white text-black hover:bg-white" : "text-white/40 hover:text-white"
                            )}
                        >
                            Directory
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("approvals")}
                            className={cn(
                                "flex-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest h-8",
                                activeTab === "approvals" ? "bg-amber-500 text-black hover:bg-amber-500" : "text-white/40 hover:text-white"
                            )}
                        >
                            Approvals
                        </Button>
                    </div>
                </div>

                {activeTab === "directory" && (
                    <div className="hidden md:flex flex-wrap items-center gap-1.5 md:gap-2">
                        <StudentExportModal students={students} />
                        {isAdmin && (
                            <>
                                <StudentImportModal onSuccess={() => { window.location.reload(); }} />
                                <AddStudentModal 
                                    onSuccess={() => { }} 
                                    onOptimisticUpdate={(newStudent) => {
                                        setStudents(prev => {
                                            if (prev.find(s => s.schoolId === newStudent.schoolId || s.id === newStudent.id)) return prev;
                                            return [newStudent, ...prev];
                                        });
                                    }}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Mobile FAB */}
                {activeTab === "directory" && isAdmin && (
                    <div className="fixed bottom-20 right-4 z-50 md:hidden">
                        <AddStudentModal 
                            onSuccess={() => { }}
                            onOptimisticUpdate={(newStudent) => {
                                setStudents(prev => {
                                    if (prev.find(s => s.schoolId === newStudent.schoolId || s.id === newStudent.id)) return prev;
                                    return [newStudent, ...prev];
                                });
                            }}
                        >
                            <button className="w-14 h-14 rounded-full bg-accent text-black shadow-2xl shadow-accent/40 flex items-center justify-center">
                                <Plus className="w-7 h-7" />
                            </button>
                        </AddStudentModal>
                    </div>
                )}
            </div>

            {activeTab === "directory" ? (
                <>
                    {/* Filters - Always Rendered for Instant Interaction */}
                    <div className="bg-black/20 p-3 md:p-5 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-md space-y-3 md:space-y-4 shadow-2xl mx-0">
                        <div className="relative w-full">
                            <SearchIcon className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search name, ID, or mobile..."
                                className="pl-9 md:pl-11 h-10 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl focus:ring-accent/30 text-xs md:text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full lg:w-[160px] h-9 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl text-xs md:text-sm">
                                    <div className="flex items-center gap-2">
                                        <Filter size={12} className="text-white/40" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setSectionFilter("all"); }}>
                                <SelectTrigger className="w-full lg:w-[160px] h-9 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl text-xs md:text-sm">
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={12} className="text-white/40" />
                                        <SelectValue placeholder="Class" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {sections.length > 0 && (
                                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                    <SelectTrigger className="w-full lg:w-[160px] h-9 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl text-xs md:text-sm animate-in slide-in-from-left-2 duration-300">
                                        <SelectValue placeholder="Section" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {sections.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select value={villageFilter} onValueChange={setVillageFilter}>
                                <SelectTrigger className="w-full lg:w-[180px] h-9 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl text-xs md:text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-white/40" />
                                        <SelectValue placeholder="Village" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    <SelectItem value="all">All Villages</SelectItem>
                                    {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <div className="h-9 md:h-12 w-px bg-white/10 mx-1 hidden sm:block" />

                            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
                                const [field, order] = val.split('-');
                                setSortBy(field as "createdAt" | "schoolId");
                                setSortOrder(order as "asc" | "desc");
                            }}>
                                <SelectTrigger className="w-full lg:w-[160px] h-9 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl text-xs md:text-sm">
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                                    <SelectItem value="schoolId-asc">ID (Low to High)</SelectItem>
                                    <SelectItem value="schoolId-desc">ID (High to Low)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("all");
                                    setClassFilter("all");
                                    setVillageFilter("all");
                                    setSectionFilter("all");
                                    setSortBy("createdAt");
                                    setSortOrder("desc");
                                }}
                                className="h-9 md:h-12 px-3 md:px-6 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 rounded-lg md:rounded-xl border border-accent/20 transition-all"
                            >
                                <RefreshCw className={cn("w-3 h-3 md:w-4 md:h-4 mr-2", localLoading && "animate-spin")} />
                                Reset Filters
                            </Button>
                        </div>
                    </div>

                    {/* Content View - Non-blocking Table */}
                    <div className="relative min-h-[400px]">
                        <DataTable<Student>
                            data={students}
                            isLoading={isTableLoading}
                            pageSize={20}
                            onRowClick={(s) => router.push(`/admin/students/${s.schoolId}`)}
                            columns={[
                                {
                                    key: "studentInfo",
                                    header: "Student Info",
                                    render: (s) => (
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:border-accent/40 transition-colors">
                                                <User size={16} className="text-white/60 group-hover:text-accent transition-colors" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white group-hover:text-accent transition-colors leading-tight">{s.studentName}</span>
                                                <span className="text-[10px] font-mono text-white/50 tracking-tighter uppercase">ID: {s.schoolId}</span>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "classPlacement",
                                    header: "Class & Placement",
                                    render: (s) => (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase font-black text-white/60 tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">{s.className}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                                <MapPin size={10} className="opacity-40" />
                                                <span className="truncate max-w-[120px]">{s.villageName}</span>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "parentDetails",
                                    header: "Parent Details",
                                    render: (s) => (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-bold text-white/80">{s.parentName}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                                <Phone size={10} className="opacity-40" />
                                                <span className="font-mono">{s.parentMobile}</span>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "credentials",
                                    header: "Login Credentials",
                                    render: (s) => (
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                                                <Key size={10} className="opacity-60" />
                                                <span className="uppercase tracking-tighter">Pass: {s.recoveryPassword || s.parentMobile}</span>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "status",
                                    header: "Status",
                                    cellClassName: "text-center",
                                    render: (s) => (
                                        s.status === 'ACTIVE' ? (
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!confirm("Are you sure you want to deactivate this student?")) return;
                                                    try {
                                                        const studentDocId = s.studentDocId || s.schoolId;
                                                        await updateDoc(doc(db, "students", studentDocId), {
                                                            status: "INACTIVE",
                                                            deactivationReason: "Admin quick toggle",
                                                            updatedAt: new Date().toISOString()
                                                        });
                                                        if (selectedYear) {
                                                            try {
                                                                const ledgerId = `${s.schoolId}_${selectedYear}`;
                                                                await updateDoc(doc(db, "student_fee_ledgers", ledgerId), {
                                                                    studentStatus: "INACTIVE",
                                                                    updatedAt: new Date().toISOString()
                                                                });
                                                            } catch (err) {
                                                                console.warn("Ledger update failed:", err);
                                                            }
                                                        }
                                                        toast({ title: "Deactivated", description: `${s.studentName} is now inactive.`, type: "success" });
                                                    } catch (err: any) {
                                                        toast({ title: "Error", description: err.message, type: "error" });
                                                    }
                                                }}
                                                className="inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-[9px] font-black uppercase tracking-tighter h-5 border-none bg-emerald-500/10 text-emerald-400 hover:bg-red-500/20 hover:text-red-400 cursor-pointer shadow-sm hover:shadow-red-500/20"
                                                title="Click to Deactivate"
                                            >
                                                ACTIVE
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!confirm("Are you sure you want to reactivate this student?")) return;
                                                    try {
                                                        const studentDocId = s.studentDocId || s.schoolId;
                                                        await updateDoc(doc(db, "students", studentDocId), {
                                                            status: "ACTIVE",
                                                            deactivationReason: null,
                                                            updatedAt: new Date().toISOString()
                                                        });

                                                        if (selectedYear) {
                                                            try {
                                                                const ledgerId = `${s.schoolId}_${selectedYear}`;
                                                                await updateDoc(doc(db, "student_fee_ledgers", ledgerId), {
                                                                    studentStatus: "ACTIVE",
                                                                    updatedAt: new Date().toISOString()
                                                                });
                                                            } catch (err) {
                                                                console.warn("Ledger update failed:", err);
                                                            }
                                                        }
                                                        toast({ title: "Reactivated", description: `${s.studentName} is now active.`, type: "success" });
                                                    } catch (err: any) {
                                                        toast({ title: "Error", description: err.message, type: "error" });
                                                    }
                                                }}
                                                className="inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-[9px] font-black uppercase tracking-tighter h-5 border-none bg-red-500/10 text-red-500 hover:bg-emerald-500/20 hover:text-emerald-400 cursor-pointer shadow-sm hover:shadow-emerald-500/20"
                                                title="Click to Reactivate"
                                            >
                                                INACTIVE
                                            </button>
                                        )
                                    )
                                },
                                {
                                    key: "management",
                                    header: "Management",
                                    cellClassName: "text-right",
                                    render: (s) => (
                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                            {isAdmin && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/students/${s.schoolId}?action=collect-fee`)}
                                                        className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 text-emerald-500"
                                                        title="Collect Fee"
                                                    >
                                                        <CreditCard size={14} />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10">
                                                                <MoreHorizontal size={14} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-[160px] p-1.5 rounded-xl shadow-2xl">
                                                            <DropdownMenuItem onClick={() => {
                                                                router.push(`/admin/students/${s.schoolId}`);
                                                            }} className="rounded-lg gap-2 text-xs font-bold text-white hover:text-accent transition-colors">
                                                                <User size={14} /> Edit Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                if (!s.uid) { alert("UID Missing"); return; }
                                                                setResetUser({ uid: s.uid, schoolId: s.schoolId, name: s.studentName, role: "STUDENT" });
                                                                setIsResetModalOpen(true);
                                                            }} className="rounded-lg gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                                                                <Key size={14} /> Reset Password
                                                            </DropdownMenuItem>
                                                            {s.status === "INACTIVE" ? (
                                                                <DropdownMenuItem onClick={async () => {
                                                                    if (!confirm("Are you sure you want to reactivate this student?")) return;
                                                                    try {
                                                                        const studentDocId = s.studentDocId || s.schoolId;
                                                                        await updateDoc(doc(db, "students", studentDocId), {
                                                                            status: "ACTIVE",
                                                                            deactivationReason: null,
                                                                            updatedAt: new Date().toISOString()
                                                                        });

                                                                        if (selectedYear) {
                                                                            try {
                                                                                const ledgerId = `${s.schoolId}_${selectedYear}`;
                                                                                await updateDoc(doc(db, "student_fee_ledgers", ledgerId), {
                                                                                    studentStatus: "ACTIVE",
                                                                                    updatedAt: new Date().toISOString()
                                                                                });
                                                                            } catch (e) {
                                                                                console.warn("Ledger update failed:", e);
                                                                            }
                                                                        }
                                                                        toast({ title: "Reactivated", description: `${s.studentName} is now active.`, type: "success" });
                                                                    } catch (err: any) {
                                                                        toast({ title: "Error", description: err.message, type: "error" });
                                                                    }
                                                                }} className="rounded-lg gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                                                                    <CheckCircle2 size={14} /> Reactivate Student
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedStudent(s);
                                                                    setIsDeleteModalOpen(true);
                                                                }} className="rounded-lg gap-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors">
                                                                    <Trash2 size={14} /> Delete Student
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </>
                                            )}
                                        </div>
                                    )
                                }
                            ]}
                        />
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

                                // Also update status in student_fee_ledgers if exists to hide from fee reports
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

