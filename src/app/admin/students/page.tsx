"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, limit, orderBy, getDocs, where, doc, updateDoc, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import { ManageRollNumbersModal } from "@/components/teacher/manage-roll-numbers-modal";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { Filter, Search as SearchIcon, Plus, Download, IndianRupee, Users, MoreHorizontal, User, Key, Trash2, CreditCard, Loader2, CheckCircle2, MapPin, Phone, BookOpen, RefreshCw, Calendar, AlertTriangle } from "lucide-react";
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
    academicYear?: string;
}

import { StudentLeavesManager } from "@/components/admin/student-leaves-manager";
import { StudentApprovalsManager } from "@/components/admin/student-approvals-manager";

export default function StudentsPage() {
    const router = useRouter();
    const { user, role, isAdmin } = useAuth();
    const { villages: villagesData, classes: classesData, loading: masterLoading, selectedYear } = useMasterData();
    const [students, setStudents] = useState<Student[]>([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"directory" | "leaves" | "approvals">("directory");

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [villageFilter, setVillageFilter] = useState("all");
    const [classFilter, setClassFilter] = useState("all");
    const [sectionFilter, setSectionFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"createdAt" | "schoolId">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const [isManageRollsOpen, setIsManageRollsOpen] = useState(false);

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
    }, [user, selectedYear, statusFilter, classFilter, villageFilter, sectionFilter, searchQuery, sortBy, sortOrder, isManageRollsOpen]);

    const sections = useMemo(() => {
        if (classFilter === "all" || !classesData?.[classFilter]) return [];
        const cls = classesData[classFilter];
        return Object.values(cls.sections || {}).map((s: any) => ({
            id: s.id,
            name: s.name || "A"
        }));
    }, [classFilter, classesData]);

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-200 pb-24">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-10">
                <div className="space-y-6">
                    <div className="space-y-1.5 px-1">
                        <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                            Student Directory
                        </h1>
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-white/30 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            Complete student records and enrollment status
                        </p>
                    </div>

                    <div className="flex w-full bg-black/20 p-1 rounded-2xl border border-white/5 gap-1">
                        {[
                            { id: "directory", label: "Directory", icon: Users },
                            { id: "leaves", label: "Leave Requests", icon: Calendar },
                            { id: "approvals", label: "Approvals", icon: AlertTriangle, color: "amber" }
                        ].map((tab) => (
                            <Button
                                key={tab.id}
                                variant="ghost"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex-1 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 rounded-xl text-[10px] md:text-sm font-bold h-10 md:h-11 transition-all",
                                    activeTab === tab.id
                                        ? "bg-white text-black hover:bg-white shadow-lg"
                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {activeTab === "directory" && (
                    <div className="hidden md:flex flex-wrap items-center gap-2">
                        {isAdmin && classFilter !== "all" && sectionFilter !== "all" && (
                            <Button
                                onClick={() => setIsManageRollsOpen(true)}
                                variant="outline"
                                className="h-12 md:h-16 px-4 md:px-8 bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 text-blue-400 font-black text-[10px] md:text-[11px] uppercase tracking-widest rounded-xl md:rounded-2xl transition-all shadow-xl active:scale-95 group"
                            >
                                <Users className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 group-hover:scale-110 transition-transform" /> Manage Rolls
                            </Button>
                        )}
                        <StudentExportModal students={students} />
                        {isAdmin && (
                            <>
                                {/* Desktop Buttons */}
                                <div className="hidden md:flex items-center gap-3 md:gap-4">
                                    <StudentImportModal onSuccess={() => { window.location.reload(); }} />
                                    <AddStudentModal onSuccess={() => { }} />
                                </div>

                                {/* Mobile FAB for Add Student */}
                                <div className="fixed bottom-24 right-6 z-50 md:hidden">
                                    <AddStudentModal onSuccess={() => { }}>
                                        <Button className="w-16 h-16 rounded-full bg-accent text-black shadow-2xl shadow-accent/40 border-none transition-all active:scale-90 flex items-center justify-center p-0">
                                            <Plus className="w-8 h-8" />
                                        </Button>
                                    </AddStudentModal>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {isManageRollsOpen && classFilter !== "all" && sectionFilter !== "all" && (
                <ManageRollNumbersModal
                    students={students}
                    classId={classFilter}
                    sectionId={sectionFilter}
                    className={classesData[classFilter]?.name || ""}
                    sectionName={classesData[classFilter]?.sections?.[sectionFilter]?.name || ""}
                    onClose={() => setIsManageRollsOpen(false)}
                    onSuccess={() => setIsManageRollsOpen(false)}
                />
            )}

            {activeTab === "directory" ? (
                <div className="space-y-10">
                    {/* Premium Filters Glass Panel */}
                    <div className="glass-panel p-6 md:p-10 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full -mr-48 -mt-48 blur-[100px] group-hover:bg-accent/10 transition-all duration-1000" />

                        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 relative z-10">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/40 group-focus-within:text-accent transition-colors" />
                                <Input
                                    placeholder="Search by Name, ID, or Phone..."
                                    className="pl-14 md:pl-16 h-14 md:h-16 bg-white/[0.03] border-white/10 rounded-2xl md:rounded-[1.5rem] focus:ring-accent/20 text-xs md:text-sm font-medium tracking-tight placeholder:text-white/20 transition-all focus:bg-white/[0.05]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("all");
                                    setClassFilter("all");
                                    setVillageFilter("all");
                                    setSectionFilter("all");
                                    setSortBy("createdAt");
                                    setSortOrder("desc");
                                }}
                                className="h-14 md:h-16 px-6 md:px-10 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-accent/60 hover:text-accent hover:bg-accent/5 rounded-2xl md:rounded-[1.5rem] border border-accent/10 transition-all group/reset"
                            >
                                <RefreshCw className={cn("w-4 h-4 mr-2 md:mr-3 group-hover/reset:rotate-180 transition-all duration-700", localLoading && "animate-spin")} />
                                Clear
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 md:gap-4 relative z-10">
                            {[
                                { filter: statusFilter, set: setStatusFilter, items: [{ id: "all", n: "All Status" }, { id: "ACTIVE", n: "Active Students" }, { id: "INACTIVE", n: "Inactive Records" }], label: "Status", icon: Filter },
                                { filter: classFilter, set: (v: any) => { setClassFilter(v); setSectionFilter("all") }, items: [{ id: "all", n: "All Classes" }, ...classes.map(c => ({ id: c.id, n: c.name }))], label: "Academy", icon: BookOpen },
                                { filter: villageFilter, set: setVillageFilter, items: [{ id: "all", n: "All Villages" }, ...villages.map(v => ({ id: v.id, n: v.name }))], label: "Village", icon: MapPin }
                            ].map((sel, idx) => (
                                <Select key={idx} value={sel.filter} onValueChange={sel.set}>
                                    <SelectTrigger className="w-full lg:w-[220px] h-12 md:h-14 bg-white/[0.03] border-white/5 hover:border-white/10 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <sel.icon size={13} className="text-white/20" />
                                            <SelectValue placeholder={sel.label} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl md:rounded-2xl p-2 shadow-3xl">
                                        {sel.items.map(i => <SelectItem key={i.id} value={i.id} className="rounded-lg md:rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest">{i.n}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ))}

                            {sections.length > 0 && (
                                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                    <SelectTrigger className="w-full lg:w-[180px] h-12 md:h-14 bg-accent/5 border-accent/10 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-left-4 duration-500">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                            <SelectValue placeholder="Section" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl md:rounded-2xl p-2 shadow-3xl">
                                        <SelectItem value="all" className="rounded-lg md:rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest">All Sections</SelectItem>
                                        {sections.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="rounded-lg md:rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest">Section {s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <div className="flex-1" />

                            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
                                const [field, order] = val.split('-');
                                setSortBy(field as any);
                                setSortOrder(order as any);
                            }}>
                                <SelectTrigger className="w-full lg:w-[220px] h-12 md:h-14 bg-white/5 border-white/10 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-xl">
                                    <SelectValue placeholder="Order Logic" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl md:rounded-2xl p-2 shadow-3xl">
                                    <SelectItem value="createdAt-desc" className="rounded-lg md:rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest italic">Newest First</SelectItem>
                                    <SelectItem value="createdAt-asc" className="rounded-lg md:rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest italic">Oldest First</SelectItem>
                                    <SelectItem value="schoolId-asc" className="rounded-lg md:rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest italic">ID: Low to High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Data Matrix */}
                    {/* Mobile Card Grid */}
                    <div className="grid grid-cols-1 gap-4 lg:hidden">
                        {isTableLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
                            ))
                        ) : students.length > 0 ? (
                            students.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => router.push(`/admin/students/${s.schoolId}`)}
                                    className="group relative bg-black/40 border border-white/10 rounded-3xl p-5 space-y-4 hover:border-accent/40 transition-all active:scale-[0.98] shadow-xl overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-all" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <User size={20} className="text-accent/60" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-lg text-white uppercase italic tracking-tight leading-none">{s.studentName}</span>
                                                <span className="text-[9px] font-black text-white/30 tracking-widest uppercase mt-1">ID: {s.schoolId}</span>
                                            </div>
                                        </div>
                                        <Badge className={cn(
                                            "text-[8px] font-black uppercase tracking-tighter px-2 h-5 rounded-full border-none",
                                            s.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                        )}>
                                            {s.status}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Academic</span>
                                            <span className="text-[10px] font-bold text-white block">Grade {s.className} - {s.sectionName || 'A'}</span>
                                        </div>
                                        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Village</span>
                                            <span className="text-[10px] font-bold text-white block truncate">{s.villageName}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <Phone size={12} className="text-white/20" />
                                            <span className="text-[10px] font-mono font-bold text-white/40">{s.parentMobile}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/admin/students/${s.schoolId}?action=collect-fee`);
                                                    }}
                                                    className="h-9 px-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                >
                                                    <IndianRupee size={12} className="mr-1.5" /> Fees
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-muted-foreground bg-black/20 rounded-3xl border border-dashed border-white/10">
                                No records found matching current sync filters.
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block rounded-[3rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-3xl overflow-hidden group/table transition-all hover:border-white/20">
                        <DataTable<Student>
                            data={students}
                            isLoading={isTableLoading}
                            pageSize={20}
                            className="border-none"
                            onRowClick={(s) => router.push(`/admin/students/${s.schoolId}`)}
                            columns={[
                                {
                                    key: "studentInfo",
                                    header: "Student Profile",
                                    render: (s) => (
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 p-1 flex items-center justify-center relative group/avatar overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                                <User size={24} className="text-white/20 group-hover/avatar:text-accent group-hover/avatar:scale-110 transition-all duration-500" />
                                                {s.status === 'ACTIVE' && <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-black text-xl text-white group-hover:text-accent transition-colors leading-none tracking-tight italic uppercase">{s.studentName}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">UID: {s.schoolId}</span>
                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                    <span className="text-[9px] font-black text-accent/60 tracking-[0.2em] uppercase italic">{s.academicYear || selectedYear}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "classPlacement",
                                    header: "Class & Section",
                                    render: (s) => (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-white italic uppercase tracking-widest">
                                                    Grade {s.className}
                                                </div>
                                                <div className="px-2 py-1 bg-accent/5 border border-accent/20 rounded-lg text-[9px] font-black text-accent uppercase tracking-widest">
                                                    Sect {s.sectionName || 'A'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-widest italic pl-1">
                                                <MapPin size={10} className="text-white/20" />
                                                {s.villageName}
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "parentDetails",
                                    header: "Contact Details",
                                    render: (s) => (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[11px] font-black text-white uppercase tracking-tight">{s.parentName}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-2.5 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
                                                    <Phone size={10} className="text-white/20" />
                                                    <span className="text-[10px] font-mono font-bold text-white/40">{s.parentMobile}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: "credentials",
                                    header: "Login Details",
                                    render: (s) => (
                                        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between w-fit min-w-[140px] group/key hover:border-amber-500/30 transition-all">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-[0.2em]">Password</span>
                                                <span className="text-xs font-black text-amber-500 tracking-wider font-mono">{s.recoveryPassword || s.parentMobile}</span>
                                            </div>
                                            <Key size={14} className="text-amber-500/20 group-hover/key:text-amber-500 group-hover/key:rotate-12 transition-all" />
                                        </div>
                                    )
                                },
                                {
                                    key: "status",
                                    header: "Status",
                                    cellClassName: "text-center",
                                    render: (s) => (
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const isActivating = s.status !== 'ACTIVE';
                                                if (!confirm(`Initialize ${isActivating ? 'RE-ACTIVATION' : 'DE-ACTIVATION'} sequence for ${s.studentName}?`)) return;

                                                try {
                                                    const studentDocId = s.studentDocId || s.schoolId;
                                                    const newStatus = isActivating ? "ACTIVE" : "INACTIVE";

                                                    await updateDoc(doc(db, "students", studentDocId), {
                                                        status: newStatus,
                                                        deactivationReason: isActivating ? null : "Manual Override",
                                                        updatedAt: new Date().toISOString()
                                                    });

                                                    if (selectedYear) {
                                                        try {
                                                            const ledgerId = `${s.schoolId}_${selectedYear}`;
                                                            await updateDoc(doc(db, "student_fee_ledgers", ledgerId), {
                                                                studentStatus: newStatus,
                                                                updatedAt: new Date().toISOString()
                                                            });
                                                        } catch (err) {
                                                            console.warn("Matrix update failed:", err);
                                                        }
                                                    }
                                                    toast({
                                                        title: isActivating ? "Index Restored" : "Offline Mode",
                                                        description: `${s.studentName} is now ${newStatus.toLowerCase()}.`,
                                                        type: "success"
                                                    });
                                                } catch (err: any) {
                                                    toast({ title: "Signal Lost", description: err.message, type: "error" });
                                                }
                                            }}
                                            className={cn(
                                                "h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group/status",
                                                s.status === 'ACTIVE'
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black shadow-lg shadow-emerald-500/5"
                                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-black shadow-lg shadow-rose-500/5"
                                            )}
                                        >
                                            <span className="relative z-10">{s.status}</span>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/status:translate-y-0 transition-transform duration-300" />
                                        </button>
                                    )
                                },
                                {
                                    key: "management",
                                    header: "Actions",
                                    cellClassName: "text-right",
                                    render: (s) => (
                                        <div className="flex items-center justify-end gap-3" onClick={e => e.stopPropagation()}>
                                            {isAdmin && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/students/${s.schoolId}?action=collect-fee`)}
                                                        className="h-12 w-12 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-emerald-500/10 text-emerald-500 transition-all hover:-translate-y-1 shadow-xl"
                                                        title="Financial Interface"
                                                    >
                                                        <CreditCard size={18} />
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/10 text-white/40 hover:text-white transition-all shadow-xl">
                                                                <MoreHorizontal size={18} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white min-w-[220px] p-2 rounded-2xl shadow-3xl animate-in zoom-in-95 duration-200">
                                                            <DropdownMenuItem onClick={() => router.push(`/admin/students/${s.schoolId}`)} className="rounded-xl gap-3 p-4 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-accent hover:bg-white/5 transition-all">
                                                                <User size={16} /> Edit Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                if (!s.uid) { alert("Core UID Missing"); return; }
                                                                setResetUser({ uid: s.uid, schoolId: s.schoolId, name: s.studentName, role: "STUDENT" });
                                                                setIsResetModalOpen(true);
                                                            }} className="rounded-xl gap-3 p-4 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 transition-all">
                                                                <Key size={16} /> Change Password
                                                            </DropdownMenuItem>
                                                            <div className="h-px bg-white/5 my-2" />
                                                            {s.status === "INACTIVE" ? (
                                                                <DropdownMenuItem onClick={async () => {
                                                                    if (!confirm("Restore student index?")) return;
                                                                    try {
                                                                        const studentDocId = s.studentDocId || s.schoolId;
                                                                        await updateDoc(doc(db, "students", studentDocId), {
                                                                            status: "ACTIVE",
                                                                            updatedAt: new Date().toISOString()
                                                                        });
                                                                        toast({ title: "Restored", type: "success" });
                                                                    } catch (err: any) {
                                                                        toast({ title: "Error", description: err.message, type: "error" });
                                                                    }
                                                                }} className="rounded-xl gap-3 p-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-all">
                                                                    <CheckCircle2 size={16} /> Activate Student
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedStudent(s);
                                                                    setIsDeleteModalOpen(true);
                                                                }} className="rounded-xl gap-3 p-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
                                                                    <Trash2 size={16} /> Deactivate/Remove
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

                                try {
                                    const ledgerId = `${selectedStudent.schoolId}_${selectedYear}`;
                                    await updateDoc(doc(db, "student_fee_ledgers", ledgerId), {
                                        studentStatus: "INACTIVE",
                                        updatedAt: new Date().toISOString()
                                    });
                                } catch (e) {
                                    console.warn("Ledger update failed:", e);
                                }
                            }}
                            onDelete={async (reason) => {
                                if (!selectedStudent) return;
                                if (!user) { alert("Unauthorized"); return; }

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
                                if (!data.success) throw new Error(data.error || "Deletions failed");
                            }}
                        />
                    )}
                </div>
            ) : activeTab === "leaves" ? (
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <StudentLeavesManager />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <StudentApprovalsManager />
                </div>
            )}
        </div>
    );
}

