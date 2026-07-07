"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, query, limit, getDocs, where, doc, updateDoc, startAfter, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from 'next/dynamic';
import { Filter, Search as SearchIcon, Plus, User, Users, Key, Trash2, CreditCard, Loader2, CheckCircle2, Phone, MoreVertical, ArrowRight, Lock, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "@/lib/toast-store";
import { cacheManager } from "@/lib/services/cache-manager";
import { VirtualList } from "@/components/ui/virtual-list";

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
    rollNumber?: string;
}

const AddStudentModal = dynamic(() => import("@/components/admin/add-student-modal").then(mod => mod.AddStudentModal), { ssr: false });
const DeleteUserModal = dynamic(() => import("@/components/admin/delete-user-modal").then(mod => mod.DeleteUserModal), { ssr: false });
const AdminChangePasswordModal = dynamic(() => import("@/components/admin/admin-change-password-modal").then(mod => mod.AdminChangePasswordModal), { ssr: false });
const StudentImportModal = dynamic(() => import("@/components/admin/student-import-modal").then(mod => mod.StudentImportModal), { ssr: false });
const StudentExportModal = dynamic(() => import("@/components/admin/student-export-modal").then(mod => mod.StudentExportModal), { ssr: false });
const StudentApprovalsManager = dynamic(() => import("@/components/admin/student-approvals-manager").then(mod => mod.StudentApprovalsManager), { ssr: false });

export default function StudentsPage() {
    const router = useRouter();
    const { user, userData, branchId: userBranchId, role, isAdmin } = useAuth();
    const { selectedBranchId } = useBranch();
    const activeBranchId = selectedBranchId || (role === "SUPER_ADMIN" ? "global" : (userBranchId || userData?.schoolId));

    const { villages: villagesData, classes: classesData, loading: masterLoading, selectedYear } = useMasterData();

    // Local state
    const [students, setStudents] = useState<Student[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [localLoading, setLocalLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"directory" | "approvals">("directory");
    const [isMobile, setIsMobile] = useState(false);

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [villageFilter, setVillageFilter] = useState("all");
    const [classFilter, setClassFilter] = useState("all");
    const [sectionFilter, setSectionFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"createdAt" | "schoolId">("createdAt");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Pagination Refs
    const lastDocRef = useRef<any>(null);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);

    // Modal & Optimistic states
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resetUser, setResetUser] = useState<{ uid: string, schoolId: string, name: string, role: string } | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [pendingStudents, setPendingStudents] = useState<Student[]>([]);

    const [localVillages, setLocalVillages] = useState<any[]>([]);
    const [localClasses, setLocalClasses] = useState<any[]>([]);

    const isTableLoading = students.length === 0 && (masterLoading || localLoading);

    // Handle Mobile Detection
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Defensive dropdown data hydration
    useEffect(() => {
        if (!activeBranchId || activeBranchId === "global") return;
        const hydrateDropdowns = async () => {
            try {
                if (!villagesData || Object.keys(villagesData).length === 0) {
                    const vSnap = await getDocs(query(collection(db, "villages"), where("schoolId", "==", activeBranchId)));
                    setLocalVillages(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                if (!classesData || Object.keys(classesData).length === 0) {
                    const cSnap = await getDocs(query(collection(db, "classes"), where("schoolId", "==", activeBranchId)));
                    setLocalClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            } catch (err) {
                console.error("Defensive hydration failed:", err);
            }
        };
        hydrateDropdowns();
    }, [activeBranchId, villagesData, classesData]);

    const villages = Object.keys(villagesData || {}).length > 0 
        ? Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)))
        : localVillages.map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
        
    const classes = Object.keys(classesData || {}).length > 0 
        ? Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name || "Unknown Class", order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order)
        : localClasses.map((c: any) => ({ id: c.id, name: c.name || "Unknown Class", order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    const sections = useMemo(() => {
        if (classFilter === "all") return [];
        let cls = (classesData && classesData[classFilter]) || localClasses.find(c => c.id === classFilter);
        if (!cls) return [];
        return Object.values(cls.sections || {}).map((s: any) => ({
            id: s.id || s.sectionId,
            name: s.name || s.sectionName || "A"
        }));
    }, [classFilter, classesData, localClasses]);

    const classLabel = classFilter === "all" ? "All Classes" : (classes.find(c => c.id === classFilter)?.name || "Class");
    const villageLabel = villageFilter === "all" ? "All Villages" : (villages.find(v => v.id === villageFilter)?.name || "Village");
    const statusLabel = statusFilter === "all" ? "All Status" : (statusFilter === "ACTIVE" ? "Active" : "Inactive");
    const sortLabel = sortBy === "createdAt" 
        ? (sortOrder === "desc" ? "Newest First" : "Oldest First") 
        : (sortOrder === "asc" ? "ID (Low to High)" : "ID (High to Low)");

    // Cache key computation
    const getCacheKey = () => {
        const searchNorm = debouncedSearchQuery.trim().toLowerCase();
        return `students_${activeBranchId || "global"}_${selectedYear}_${statusFilter}_${classFilter}_${villageFilter}_${sectionFilter}_${sortBy}_${sortOrder}_${searchNorm}`;
    };

    // Load first page of students
    const loadFirstPage = async () => {
        if (!user || !activeBranchId) return;

        setLocalLoading(true);
        lastDocRef.current = null;
        hasMoreRef.current = true;
        loadingMoreRef.current = false;

        const cacheKey = getCacheKey();

        // Fetch total count in parallel (non-blocking)
        const fetchTotalCount = async () => {
            try {
                const constraints = buildQueryConstraints();
                const countQ = query(collection(db, "students"), ...constraints);
                const countSnap = await getCountFromServer(countQ);
                setTotalCount(countSnap.data().count);
            } catch (e) {
                console.warn("[StudentsPage] Failed to fetch total count:", e);
            }
        };
        fetchTotalCount();

        try {
            // Check persistent Cache (Level 2)
            const cachedData = await cacheManager.get<Student[]>(cacheKey);
            if (cachedData && cachedData.length > 0) {
                setStudents(cachedData);
                setLocalLoading(false);
                // Perform silent background update
                triggerBackgroundUpdate(cacheKey);
                return;
            }
        } catch (e) {
            console.warn("[StudentsPage] Cache read failed:", e);
        }

        try {
            const constraints = buildQueryConstraints();
            const q = query(collection(db, "students"), ...constraints, limit(50));
            const snapshot = await getDocs(q);

            const fetchedStudents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                studentDocId: doc.id
            })) as Student[];

            if (snapshot.docs.length < 50) {
                hasMoreRef.current = false;
            } else {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            }

            setStudents(fetchedStudents);
            
            // Cache the result (5 minute TTL)
            await cacheManager.set(cacheKey, fetchedStudents, 5 * 60 * 1000);
        } catch (error) {
            console.warn("[StudentsPage] Query failed:", error);
            toast({ title: "Fetch Error", description: "Failed to load student records.", type: "error" });
        } finally {
            setLocalLoading(false);
        }
    };

    // Load next page of students (Infinite Scroll callback)
    const loadNextPage = async () => {
        if (loadingMoreRef.current || !hasMoreRef.current || !user || !activeBranchId) return;

        loadingMoreRef.current = true;
        try {
            const constraints = buildQueryConstraints();
            
            // Defensive cursor recovery: if lastDocRef.current is missing (e.g. on early clicks after cache hits),
            // resolve the first page cursor first by querying the database.
            if (!lastDocRef.current) {
                console.log("[StudentsPage] Cursor missing. Resolving first page cursor...");
                const firstQ = query(collection(db, "students"), ...constraints, limit(50));
                const firstSnap = await getDocs(firstQ);
                if (firstSnap.docs.length < 50) {
                    hasMoreRef.current = false;
                    loadingMoreRef.current = false;
                    return;
                }
                lastDocRef.current = firstSnap.docs[firstSnap.docs.length - 1];
            }

            const q = query(
                collection(db, "students"),
                ...constraints,
                startAfter(lastDocRef.current),
                limit(50)
            );
            const snapshot = await getDocs(q);

            const nextBatch = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                studentDocId: doc.id
            })) as Student[];

            if (snapshot.docs.length < 50) {
                hasMoreRef.current = false;
            } else {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            }

            setStudents(prev => {
                const updated = [...prev, ...nextBatch];
                // Update persistent cache with current full dataset
                cacheManager.set(getCacheKey(), updated, 5 * 60 * 1000).catch(() => {});
                return updated;
            });
        } catch (error) {
            console.warn("[StudentsPage] Pagination failed:", error);
        } finally {
            loadingMoreRef.current = false;
        }
    };

    // background updates for Cache-Aside sync
    const triggerBackgroundUpdate = async (cacheKey: string) => {
        try {
            const constraints = buildQueryConstraints();
            const q = query(collection(db, "students"), ...constraints, limit(50));
            const snapshot = await getDocs(q);

            const freshBatch = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                studentDocId: doc.id
            })) as Student[];

            // Update pagination cursors based on fresh real-time data
            if (snapshot.docs.length < 50) {
                hasMoreRef.current = false;
            } else {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
                hasMoreRef.current = true;
            }

            // Update cache
            await cacheManager.set(cacheKey, freshBatch, 5 * 60 * 1000);

            // If there's an actual update in the first page, sync it with the state
            setStudents(prev => {
                if (prev.length > 50) {
                    const cachedSlice = prev.slice(0, freshBatch.length);
                    if (JSON.stringify(cachedSlice) !== JSON.stringify(freshBatch)) {
                        return [...freshBatch, ...prev.slice(freshBatch.length)];
                    }
                    return prev;
                } else {
                    return freshBatch;
                }
            });
        } catch (e) {
            console.warn("[StudentsPage] Background sync failed:", e);
        }
    };

    const buildQueryConstraints = () => {
        const constraints: any[] = [where("academicYear", "==", selectedYear)];

        if (activeBranchId && activeBranchId !== "global") {
            constraints.push(where("branchId", "==", activeBranchId));
        }

        if (statusFilter !== "all") constraints.push(where("status", "==", statusFilter));
        if (classFilter !== "all") constraints.push(where("classId", "==", classFilter));
        if (villageFilter !== "all") constraints.push(where("villageId", "==", villageFilter));
        if (sectionFilter !== "all") constraints.push(where("sectionId", "==", sectionFilter));

        if (debouncedSearchQuery.trim()) {
            constraints.push(where("keywords", "array-contains", debouncedSearchQuery.trim().toLowerCase()));
        }

        // Custom memory sorting will align with DB indexing. To keep indexes simple, we sort by current configuration
        // (default indexing on branchId, status, classes).
        return constraints;
    };

    // Trigger load on filter modifications
    useEffect(() => {
        loadFirstPage();
    }, [user, activeBranchId, selectedYear, statusFilter, classFilter, villageFilter, sectionFilter, debouncedSearchQuery]);

    // Unified list of students (Real + Optimistic pending items)
    const allStudents = useMemo(() => {
        const realSchoolIds = new Set(students.map(s => s.schoolId));
        const filteredPending = pendingStudents.filter(ps => !realSchoolIds.has(ps.schoolId));
        
        // Final sorted set
        const totalList = [...filteredPending, ...students];
        totalList.sort((a, b) => {
            let valA = a[sortBy as keyof Student] || "";
            let valB = b[sortBy as keyof Student] || "";
            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
        return totalList;
    }, [students, pendingStudents, sortBy, sortOrder]);

    const renderDropdownItems = (s: Student) => {
        const canEditProfile = isAdmin || role === "MANAGER";
        const canCollectFee = isAdmin || role === "MANAGER";
        const canResetPassword = isAdmin || role === "MANAGER";
        const canToggleStatus = isAdmin; 
        const canDelete = isAdmin && s.status === "INACTIVE";

        return (
            <>
                {canEditProfile && (
                    <DropdownMenuItem onClick={() => router.push(`/admin/students/${s.schoolId}`)} className="rounded-lg gap-2 text-xs font-bold text-white hover:text-cyan-400 transition-colors">
                        <User size={14} /> Edit Profile
                    </DropdownMenuItem>
                )}
                {canCollectFee && (
                    <DropdownMenuItem onClick={() => router.push(`/admin/students/${s.schoolId}?action=collect-fee`)} className="rounded-lg gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                        <CreditCard size={14} /> Collect Fee
                    </DropdownMenuItem>
                )}
                {canResetPassword && (
                    <DropdownMenuItem onClick={() => {
                        setResetUser({ uid: s.uid || "", schoolId: s.schoolId, name: s.studentName, role: "STUDENT" });
                        setIsResetModalOpen(true);
                    }} className="rounded-lg gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                        <Key size={14} /> Reset Password
                    </DropdownMenuItem>
                )}
                {canToggleStatus && (
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
                                // Local state update for immediate feedback
                                setStudents(prev => prev.map(item => item.id === s.id ? { ...item, status: nextStatus } : item));
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
                )}
                {canDelete && (
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
        );
    };

    return (
        <div className="flex flex-col gap-[12px] w-full px-[16px] pb-[12px] pt-[2px] md:pb-20 md:px-6 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
                <h1 className="text-[22px] md:text-3xl font-[700] bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent leading-tight flex items-center gap-3">
                    Student Center
                    <span className="text-[13px] font-medium text-white/40 ml-1 tracking-normal">{totalCount} Students</span>
                </h1>
                {isAdmin && (
                    <AddStudentModal 
                        onSuccess={(finalData) => {
                            if (finalData?.schoolId) {
                                setPendingStudents(prev => prev.map(ps => 
                                    (ps.schoolId === "PENDING..." && ps.studentName === finalData.studentName) 
                                    ? { ...ps, ...finalData } : ps
                                ));
                                loadFirstPage();
                            }
                        }} 
                        onOptimisticUpdate={(newStudent) => {
                            setPendingStudents(prev => [newStudent, ...prev]);
                        }}
                    >
                        <Button size="icon" className="w-[40px] h-[40px] rounded-full bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black shadow-[0_4px_14px_rgba(0,229,255,0.15)] transition-transform hover:scale-105 active:scale-95 shrink-0">
                            <Plus size={22} />
                        </Button>
                    </AddStudentModal>
                )}
            </div>

            {/* Unified Action Bar */}
            <div className="flex items-center p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-[12px] w-full gap-1 shadow-inner relative overflow-hidden">
                <button
                    onClick={() => setActiveTab("directory")}
                    className={cn(
                        "flex-1 relative flex items-center justify-center gap-1.5 h-[36px] rounded-[8px] text-[11px] md:text-[13px] font-[600] transition-all duration-300",
                        activeTab === "directory" 
                            ? "bg-white/10 text-white shadow-sm border border-white/10" 
                            : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                >
                    <Users size={14} className="hidden sm:block" /> Directory
                </button>
                
                <div className="w-[1px] h-5 bg-white/10 shrink-0 transition-opacity duration-300" />
                
                <button
                    onClick={() => setActiveTab("approvals")}
                    className={cn(
                        "flex-1 relative flex items-center justify-center gap-1.5 h-[36px] rounded-[8px] text-[11px] md:text-[13px] font-[600] transition-all duration-300",
                        activeTab === "approvals" 
                            ? "bg-white/10 text-white shadow-sm border border-white/10" 
                            : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                >
                    <CheckCircle2 size={14} className="hidden sm:block" /> Approvals
                </button>

                <div className="w-[1px] h-5 bg-white/10 shrink-0 transition-opacity duration-300" />
                
                <div className="flex-1 flex">
                    <StudentExportModal students={students}>
                        <button className="w-full relative flex items-center justify-center gap-1.5 h-[36px] rounded-[8px] text-[11px] md:text-[13px] font-[600] text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent transition-all duration-300">
                            <FileText size={14} className="hidden sm:block" /> Reports
                        </button>
                    </StudentExportModal>
                </div>

                {isAdmin && (
                    <>
                        <div className="w-[1px] h-5 bg-white/10 shrink-0 transition-opacity duration-300" />
                        <div className="flex-1 flex">
                            <StudentImportModal onSuccess={() => { loadFirstPage(); }}>
                                <button className="w-full relative flex items-center justify-center gap-1.5 h-[36px] rounded-[8px] text-[11px] md:text-[13px] font-[600] text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent transition-all duration-300">
                                    <FileSpreadsheet size={14} className="hidden sm:block" /> Import
                                </button>
                            </StudentImportModal>
                        </div>
                    </>
                )}
            </div>

            {activeTab === "directory" ? (
                <div className="flex flex-col gap-[12px]">
                    {/* Search & Filter Funnel controls */}
                    <div className="flex items-center gap-[8px]">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40" />
                            <Input
                                placeholder="Search name, ID..."
                                className="pl-10 h-[42px] md:h-9 bg-[#0B1524]/60 border-white/5 rounded-[12px] focus:ring-cyan-500/30 text-[13px] md:text-xs text-white placeholder-white/40 font-sans"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Button 
                                variant={isFilterOpen ? "default" : "outline"}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                size="icon" 
                                className={cn(
                                    "h-[42px] w-[42px] md:h-9 md:w-9 rounded-[12px] shrink-0 transition-colors",
                                    isFilterOpen 
                                        ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                                        : "bg-[#0B1524]/60 border border-white/5 text-white/50 hover:text-white"
                                )}
                            >
                                <Filter size={18} className="md:w-3.5 md:h-3.5" />
                            </Button>
                            
                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                                    <div className="absolute top-[calc(100%+8px)] right-[-16px] md:right-[-24px] w-[280px] bg-[#0B1120] border border-white/10 border-r-0 p-5 rounded-l-3xl rounded-r-none shadow-2xl z-50 flex flex-col gap-4 animate-in fade-in slide-in-from-right-full duration-500 ease-out">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-white font-bold text-sm">Filters</h3>
                                        </div>
                                    
                                    {/* Status Filter */}
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full h-[42px] bg-[#0B1524]/60 border border-white/5 rounded-[10px] text-[13px] px-4 font-[500] text-white/70">
                                            <SelectValue>{statusLabel}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs font-sans rounded-[12px] border-white/10">
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Class Filter */}
                                    <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setSectionFilter("all"); }}>
                                        <SelectTrigger className="w-full h-[42px] bg-[#0B1524]/60 border border-white/5 rounded-[10px] text-[13px] px-4 font-[500] text-white/70">
                                            <SelectValue>{classLabel}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs font-sans rounded-[12px] border-white/10">
                                            <SelectItem value="all">All Classes</SelectItem>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    {/* Village Filter */}
                                    <Select value={villageFilter} onValueChange={setVillageFilter}>
                                        <SelectTrigger className="w-full h-[42px] bg-[#0B1524]/60 border border-white/5 rounded-[10px] text-[13px] px-4 font-[500] text-white/70">
                                            <SelectValue>{villageLabel}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs font-sans rounded-[12px] border-white/10">
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
                                        <SelectTrigger className="w-full h-[42px] bg-[#0B1524]/60 border border-white/5 rounded-[10px] text-[13px] px-4 font-[500] text-white/70">
                                            <SelectValue>{sortLabel}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs font-sans rounded-[12px] border-white/10">
                                            <SelectItem value="createdAt-desc">Newest</SelectItem>
                                            <SelectItem value="createdAt-asc">Oldest</SelectItem>
                                            <SelectItem value="schoolId-asc">ID (Low)</SelectItem>
                                            <SelectItem value="schoolId-desc">ID (High)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                        {/* Reset Filter Button */}
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setStatusFilter("ACTIVE");
                                                setClassFilter("all");
                                                setVillageFilter("all");
                                                setSectionFilter("all");
                                                setSortBy("createdAt");
                                                setSortOrder("desc");
                                                setIsFilterOpen(false);
                                            }}
                                            className="w-full mt-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-[10px] text-white/70"
                                        >
                                            Reset Filters
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* List View Container */}
                    <div className="relative min-h-[300px]">
                        {isTableLoading ? (
                            <div className="h-48 w-full flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#64FFDA] animate-spin mb-4" />
                                <p className="text-xs text-white/30 uppercase tracking-widest animate-pulse font-mono">Loading students...</p>
                            </div>
                        ) : allStudents.length === 0 ? (
                            <div className="h-48 w-full flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                                <User className="w-8 h-8 text-white/20 mb-2" />
                                <p className="text-xs text-white/40 uppercase tracking-widest font-mono">No students found</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col">
                                {/* Table Header Row (Desktop Only) */}
                                <div className="hidden md:flex items-stretch bg-black/40 border-b border-white/[0.06] text-[10px] font-black text-cyan-400 uppercase tracking-widest gap-0 rounded-t-2xl shrink-0">
                                    <div className="w-[5%] pl-4 pr-2 py-3 flex items-center border-r border-white/[0.06]">S.No</div>
                                    <div className="w-[15%] px-3 py-3 flex items-center border-r border-white/[0.06]">Name</div>
                                    <div className="w-[10%] px-3 py-3 flex items-center border-r border-white/[0.06]">School ID</div>
                                    <div className="w-[10%] px-3 py-3 flex items-center border-r border-white/[0.06]">Class</div>
                                    <div className="w-[10%] px-3 py-3 flex items-center border-r border-white/[0.06]">Location</div>
                                    <div className="w-[12%] px-3 py-3 flex items-center border-r border-white/[0.06]">Parent Name</div>
                                    <div className="w-[11%] px-3 py-3 flex items-center border-r border-white/[0.06]">Parent Mobile</div>
                                    <div className="w-[8%] px-3 py-3 flex items-center border-r border-white/[0.06]">Gender</div>
                                    <div className="w-[9%] px-3 py-3 flex items-center border-r border-white/[0.06]">DOB</div>
                                    <div className="w-[10%] px-3 py-3 flex items-center border-r border-white/[0.06]">Login Key</div>
                                    <div className="w-[5%] pr-4 py-3 flex items-center justify-end">Actions</div>
                                </div>

                                {/* Virtualized Row List Container */}
                                <VirtualList
                                    items={allStudents}
                                    itemHeight={isMobile ? 85 : 52}
                                    containerHeight="500px"
                                    onScrollEnd={loadNextPage}
                                    onScrollEndThreshold={150}
                                    className="p-0"
                                    renderItem={(s, idx) => {
                                        const pending = s.recoveryPassword || s.parentMobile;
                                        const isFemale = s.gender?.toLowerCase() === "female" || s.gender?.toLowerCase() === "f";
                                        const formattedNum = idx < 9 ? `0${idx + 1}` : `${idx + 1}`;
                                        
                                        return (
                                            <div 
                                                onClick={() => router.push(`/admin/students/${s.schoolId}`)}
                                                className="flex flex-col md:flex-row md:items-stretch justify-between h-full bg-[#0B1524] md:bg-white/[0.01] transition-all duration-300 ease-out transform hover:translate-x-1 hover:bg-[#0d1f3d]/60 hover:shadow-[0_4px_16px_rgba(0,229,255,0.08),inset_3px_0_0_#00E5FF] cursor-pointer border border-white/[0.06] md:border-none md:border-b md:border-white/[0.04] group rounded-[14px] md:rounded-none"
                                            >
                                                {/* ================================== */}
                                                {/* MOBILE VIEW                        */}
                                                {/* ================================== */}
                                                <div className="flex md:hidden flex-row items-stretch w-full h-full overflow-hidden">
                                                    {/* S.No Section */}
                                                    <div className="w-[38px] shrink-0 flex items-center justify-center border-r border-white/[0.08] bg-white/[0.02]">
                                                        <span className="text-white/40 font-mono text-[11px] tracking-wider">{formattedNum}</span>
                                                    </div>

                                                    {/* Left Section (Name, ID, Class) */}
                                                    <div className="flex flex-col justify-center min-w-0 flex-1 gap-[2px] p-2.5 border-r border-white/[0.08]">
                                                        <span className="font-[600] text-[13px] font-sans text-white leading-tight truncate">
                                                            {s.studentName}
                                                        </span>
                                                        <span className="text-[10px] font-[500] text-white/50 font-sans truncate tracking-wide">
                                                            ID: {s.schoolId || "---"}
                                                        </span>
                                                        <span className="text-[10px] font-[500] text-[#00E5FF] font-sans truncate">
                                                            {s.className} {s.sectionName && `- ${s.sectionName}`}
                                                        </span>
                                                    </div>

                                                    {/* Middle Section (Contact) */}
                                                    <div className="flex flex-col justify-center min-w-0 flex-[0.8] gap-[2px] p-2.5 border-r border-white/[0.08]">
                                                        <span className="text-[10px] font-[500] text-white/50 font-sans truncate">
                                                            Contact
                                                        </span>
                                                        <span className="text-[11px] font-[600] text-emerald-400 font-sans truncate">
                                                            {s.parentMobile || 'N/A'}
                                                        </span>
                                                        <span className="text-[10px] font-[500] text-white/40 font-sans truncate uppercase tracking-wider">
                                                            {s.gender ? (s.gender.charAt(0).toUpperCase() + s.gender.slice(1).toLowerCase()) : 'N/A'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Right Section (Actions) */}
                                                    <div className="flex flex-col items-center justify-center gap-[6px] shrink-0 w-[42px] py-2 bg-white/[0.02]">
                                                        <a href={`tel:${s.parentMobile}`} className="h-[28px] w-[28px] rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors shadow-sm" onClick={e => e.stopPropagation()}>
                                                            <Phone size={12} />
                                                        </a>
                                                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-[28px] w-[28px] hover:bg-white/10 text-white/50 shrink-0 rounded-full">
                                                                        <MoreVertical size={14} />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-[#0B1524] border border-white/10 text-white min-w-[160px] p-1.5 rounded-[12px] shadow-xl font-sans">
                                                                    {renderDropdownItems(s)}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </div>
 
                                                {/* ================================== */}
                                                {/* DESKTOP VIEW                       */}
                                                {/* ================================== */}
                                                {/* Col 0: S.No */}
                                                <div className="hidden md:flex items-center w-[5%] min-w-0 pl-4 pr-2 py-3.5 border-r border-white/[0.06]">
                                                    <span className="text-xs text-white/40 font-mono tracking-wider">{formattedNum}</span>
                                                </div>
                                                
                                                {/* Col 1: Student Name */}
                                                <div className="hidden md:flex items-center gap-2 w-[15%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">
                                                        {s.studentName}
                                                    </span>
                                                </div>
 
                                                {/* Col 2: School ID */}
                                                <div className="hidden md:flex items-center w-[10%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className="text-xs text-zinc-200 tracking-wider font-mono truncate">
                                                        {s.schoolId || "---"}
                                                    </span>
                                                </div>
 
                                                {/* Col 3: Class */}
                                                <div className="hidden md:flex items-center w-[10%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className="bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border border-[#00E5FF]/20 w-fit leading-none truncate">
                                                        {s.className} {s.sectionName && `- ${s.sectionName}`}
                                                    </span>
                                                </div>
 
                                                {/* Col 4: Location */}
                                                <div className="hidden md:flex items-center w-[10%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className="text-xs text-zinc-200 truncate">
                                                        {s.villageName}
                                                    </span>
                                                </div>
 
                                                {/* Col 5: Parent Name */}
                                                <div className="hidden md:flex items-center w-[12%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className="font-semibold text-xs text-white truncate">{s.parentName}</span>
                                                </div>
 
                                                {/* Col 6: Parent Mobile */}
                                                <div className="hidden md:flex items-center w-[11%] min-w-0 font-mono text-xs text-zinc-200 px-3 py-3.5 border-r border-white/[0.06]">
                                                    {s.parentMobile}
                                                </div>
 
                                                {/* Col 7: Gender */}
                                                <div className="hidden md:flex items-center w-[8%] min-w-0 text-xs text-zinc-200 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className={isFemale ? "text-pink-400" : "text-blue-400"}>{isFemale ? "Female" : "Male"}</span>
                                                </div>
 
                                                {/* Col 8: DOB */}
                                                <div className="hidden md:flex items-center w-[9%] min-w-0 font-mono text-xs text-zinc-200 px-3 py-3.5 border-r border-white/[0.06]">
                                                    {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-GB') : "—"}
                                                </div>
 
                                                {/* Col 9: Login Key */}
                                                <div className="hidden md:flex items-center w-[10%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                                    <span className="font-black text-amber-400 font-mono tracking-wide text-xs truncate">
                                                        {pending}
                                                    </span>
                                                </div>
 
                                                {/* Col 10: Actions */}
                                                <div className="hidden md:flex items-center justify-end w-[5%] shrink-0 gap-1 pr-4 py-3.5" onClick={e => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-[#0B1524] border border-white/10 text-white min-w-[160px] p-1.5 rounded-xl shadow-2xl">
                                                            {renderDropdownItems(s)}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />

                                {/* Bottom pagination summary */}
                                <div className="flex items-center justify-between p-4 border-t border-white/[0.04] bg-black/20 text-xs shrink-0">
                                    <span className="text-white/40 font-mono">
                                        Showing {allStudents.length} of {totalCount} students
                                    </span>
                                    {hasMoreRef.current && (
                                        <button 
                                            onClick={loadNextPage}
                                            disabled={loadingMoreRef.current}
                                            className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-cyan-300 transition-colors text-[10px]"
                                        >
                                            {loadingMoreRef.current ? "Loading..." : "Load More"} <ArrowRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <AdminChangePasswordModal
                        isOpen={isResetModalOpen}
                        onClose={() => setIsResetModalOpen(false)}
                        user={resetUser}
                        onSuccess={() => { loadFirstPage(); }}
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
                                loadFirstPage();
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
                                loadFirstPage();
                            }}
                        />
                    )}
                </div>
            ) : (
                <StudentApprovalsManager activeBranchId={activeBranchId} />
            )}
        </div>
    );
}
