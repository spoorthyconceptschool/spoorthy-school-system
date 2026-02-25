"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, limit, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { Filter, Search as SearchIcon, Users, MoreHorizontal, Key, Trash2, Download, Loader2, User, MapPin, Phone, BookOpen } from "lucide-react";
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
}

import { StudentLeavesManager } from "@/components/admin/student-leaves-manager";

export default function StudentsPage() {
    const router = useRouter();
    const { user, role } = useAuth();
    const { villages: villagesData, classes: classesData, loading: masterLoading, selectedYear } = useMasterData();
    const [students, setStudents] = useState<Student[]>([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"directory" | "leaves">("directory");

    // Replace master data sync with local fetch
    useEffect(() => {
        const q = query(collection(db, "students"), orderBy("createdAt", "desc"), limit(1000));
        const unsub = onSnapshot(q, (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, studentDocId: d.id, ...d.data() } as Student)));
            setLocalLoading(false);
        }, (error) => {
            console.error("Firebase Students onSnapshot Error:", error);
            setLocalLoading(false);
        });
        return () => unsub();
    }, []);

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [villageFilter, setVillageFilter] = useState("all");
    const [classFilter, setClassFilter] = useState("all");

    // Derive loading - Unified state
    const loading = masterLoading || localLoading;

    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name })).sort((a, b) => a.name.localeCompare(b.name));
    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resetUser, setResetUser] = useState<{ uid: string, schoolId: string, name: string, role: string } | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Filtered Students - Computed synchronously during render
    const filteredStudents = useMemo(() => {
        let result = students;

        // Filter by Academic Year
        if (selectedYear) {
            result = result.filter(s => {
                const sYear = (s as any).academicYear || "2025-2026";
                return sYear === selectedYear;
            });
        }

        if (statusFilter !== "all") {
            result = result.filter(s => s.status === statusFilter);
        }

        if (classFilter !== "all") {
            result = result.filter(s => s.classId === classFilter || s.className === classFilter);
        }

        if (villageFilter !== "all") {
            result = result.filter(s => s.villageId === villageFilter || s.villageName === villageFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(s =>
                s.studentName?.toLowerCase().includes(q) ||
                s.schoolId?.toLowerCase().includes(q) ||
                s.parentName?.toLowerCase().includes(q) ||
                s.parentMobile?.includes(q)
            );
        }

        return result;
    }, [students, selectedYear, statusFilter, classFilter, villageFilter, searchQuery]);

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto p-1 md:p-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-1 md:px-0">
                <div className="space-y-0.5 md:space-y-1">
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Student Center
                    </h1>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-fit mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("directory")}
                            className={cn(
                                "rounded-lg text-[10px] font-black uppercase tracking-widest px-4 h-8",
                                activeTab === "directory" ? "bg-white text-black hover:bg-white" : "text-white/40 hover:text-white"
                            )}
                        >
                            Active Directory
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab("leaves")}
                            className={cn(
                                "rounded-lg text-[10px] font-black uppercase tracking-widest px-4 h-8",
                                activeTab === "leaves" ? "bg-white text-black hover:bg-white" : "text-white/40 hover:text-white"
                            )}
                        >
                            Leave Requests
                        </Button>
                    </div>
                </div>

                {activeTab === "directory" && (
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        <StudentExportModal students={filteredStudents} />
                        {role !== "MANAGER" && (
                            <>
                                <StudentImportModal onSuccess={() => { window.location.reload(); }} />
                                <AddStudentModal onSuccess={() => {
                                    // Give onSnapshot a moment to trigger, then force refresh just in case caching hides it.
                                    setTimeout(() => window.location.reload(), 2000);
                                }} />
                            </>
                        )}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap gap-1.5 md:gap-2">
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

                            <Select value={classFilter} onValueChange={setClassFilter}>
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

                            {(searchQuery || statusFilter !== "all" || classFilter !== "all" || villageFilter !== "all") && (
                                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setClassFilter("all"); setVillageFilter("all"); }} className="h-9 md:h-12 px-3 md:px-6 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-lg md:rounded-xl border border-dashed border-white/10 transition-all col-span-2 md:col-span-1">
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content View - Non-blocking Table */}
                    <div className="relative min-h-[400px]">
                        <DataTable
                            data={filteredStudents}
                            isLoading={loading}
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
                                        <Badge className={cn(
                                            "text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none transition-all",
                                            s.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                        )}>
                                            {s.status}
                                        </Badge>
                                    )
                                },
                                {
                                    key: "management",
                                    header: "Management",
                                    cellClassName: "text-right",
                                    render: (s) => (
                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                            {(role === "ADMIN" || role === "MANAGER") && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10">
                                                            <MoreHorizontal size={14} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-[160px] p-1.5 rounded-xl shadow-2xl">
                                                        <DropdownMenuItem onClick={() => {
                                                            if (!s.uid) { alert("UID Missing"); return; }
                                                            setResetUser({ uid: s.uid, schoolId: s.schoolId, name: s.studentName, role: "STUDENT" });
                                                            setIsResetModalOpen(true);
                                                        }} className="rounded-lg gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                                                            <Key size={14} /> Reset Password
                                                        </DropdownMenuItem>
                                                        {role === "ADMIN" && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedStudent(s);
                                                                setIsDeleteModalOpen(true);
                                                            }} className="rounded-lg gap-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors">
                                                                <Trash2 size={14} /> Delete Student
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                                await updateDoc(doc(db, "students", selectedStudent.studentDocId || selectedStudent.schoolId), {
                                    status: "INACTIVE",
                                    deactivationReason: reason,
                                    updatedAt: new Date().toISOString()
                                });
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
                <StudentLeavesManager />
            )}
        </div>
    );
}

