"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, User, Briefcase, Search, MoreHorizontal, Key, Trash2, DollarSign, MapPin, Phone, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { collection, query, orderBy, getDocs, where, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddTeacherModal } from "@/components/admin/add-teacher-modal";
import { AddStaffModal } from "@/components/admin/add-staff-modal";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { useAuth } from "@/context/AuthContext";
import { AdjustSalaryModal } from "@/components/admin/adjust-salary-modal";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useMasterData } from "@/context/MasterDataContext";

interface Teacher {
    id: string;
    uid?: string;
    name: string;
    schoolId: string;
    mobile: string;
    status: string;
    salary?: number;
    recoveryPassword?: string;
}

interface Staff {
    id: string;
    uid?: string;
    name: string;
    schoolId: string;
    mobile: string;
    status: string;
    baseSalary?: number;
    roleCode: string;
}

interface TeachersDirectoryProps {
    hideHeader?: boolean;
    onTabChange?: (tab: string) => void;
}

export function TeachersDirectory({ hideHeader = false, onTabChange }: TeachersDirectoryProps) {
    const router = useRouter();
    const { user, role } = useAuth(); // Use role from global context

    const [activeTab, setActiveTab] = useState("teachers");

    useEffect(() => {
        onTabChange?.(activeTab);
    }, [activeTab, onTabChange]);

    // Data State
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    // Master Data for filters
    const [roles, setRoles] = useState<any[]>([]);

    // Modals
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [resetUser, setResetUser] = useState<{ uid: string, schoolId: string, name: string, role: string } | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Delete Modal State
    const [deleteUser, setDeleteUser] = useState<{ id: string, schoolId: string, name: string, role: "teacher" | "admin" | "student", uid?: string, collectionName: string } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Salary Modal State
    const [salaryUser, setSalaryUser] = useState<{ id: string, name: string, schoolId: string, role: "TEACHER" | "STAFF", currentSalary: number, roleCode?: string } | null>(null);
    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

    useEffect(() => {
        const qTeachers = query(collection(db, "teachers"), orderBy("createdAt", "desc"));
        const unsubTeachers = onSnapshot(qTeachers, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
            setTeachers(list);
            setLoading(false);
        });

        const qStaff = query(collection(db, "staff"), orderBy("createdAt", "desc"));
        const unsubStaff = onSnapshot(qStaff, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStaff(list);
            setLoading(false);
        });

        return () => {
            unsubTeachers();
            unsubStaff();
        };
    }, []);

    useEffect(() => {
        // Real-time Roles (RTDB/Firestore)
        const qR = query(collection(db, "master_staff_roles"), orderBy("name"));
        const unsubscribeRoles = onSnapshot(qR, (snap) => {
            const loadedRoles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const uniqueRoles = Array.from(new Map(loadedRoles.map((item: any) => [item['code'], item])).values());
            setRoles(uniqueRoles);
        });

        return () => {
            unsubscribeRoles();
        };
    }, []);

    // Filter Logic
    const filteredTeachers = teachers.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.schoolId?.toLowerCase().includes(search.toLowerCase()) ||
        t.mobile?.includes(search)
    );

    const filteredStaff = staff.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.schoolId?.toLowerCase().includes(search.toLowerCase()) ||
            s.mobile?.includes(search);
        const matchesRole = roleFilter === "ALL" || s.roleCode === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className={cn("space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20", !hideHeader ? "p-4 md:p-0" : "p-0")}>
            {/* Header */}
            {!hideHeader && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-2 md:px-0">
                    <div className="space-y-0.5 md:space-y-1">
                        <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                            Faculty Registry
                        </h1>
                        <p className="text-muted-foreground text-[10px] md:text-lg tracking-tight uppercase font-black opacity-90">Managing <span className="text-white">{teachers.length + staff.length} professional staff</span> members</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => activeTab === 'teachers' ? setShowTeacherModal(true) : setShowStaffModal(true)}
                            className="h-10 md:h-12 flex-1 md:flex-initial bg-white text-black hover:bg-zinc-200 rounded-xl font-black uppercase tracking-tighter px-4 md:px-6 shadow-lg shadow-white/10 text-xs md:text-sm"
                        >
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 stroke-[3]" /> Add {activeTab === 'teachers' ? 'Teacher' : 'Staff'}
                        </Button>
                    </div>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
                <div className="px-2 md:px-0 space-y-3 md:space-y-4">
                    <TabsList className="bg-black/40 border border-white/10 p-1 h-auto rounded-xl md:rounded-2xl backdrop-blur-md w-full sm:w-fit grid grid-cols-2">
                        <TabsTrigger value="teachers" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-lg md:rounded-xl py-1.5 md:py-2.5 font-bold transition-all text-xs md:text-sm">
                            Teachers
                        </TabsTrigger>
                        <TabsTrigger value="staff" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-lg md:rounded-xl py-1.5 md:py-2.5 font-bold transition-all text-xs md:text-sm">
                            Staff
                        </TabsTrigger>
                    </TabsList>

                    {/* Filters */}
                    <div className="bg-black/20 p-3 md:p-5 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-md space-y-3 md:space-y-4 shadow-2xl">
                        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, ID, or mobile..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 md:pl-11 h-10 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl focus:ring-accent/30 text-xs md:text-sm"
                                />
                            </div>

                            <div className="flex gap-2">
                                {activeTab === "staff" && (
                                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                                        <SelectTrigger className="flex-1 md:w-[180px] h-10 md:h-12 bg-white/5 border-white/10 rounded-lg md:rounded-xl text-xs md:text-sm">
                                            <SelectValue placeholder="All Roles" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            <SelectItem value="ALL">All Roles</SelectItem>
                                            {roles.filter(r => !r.hasLogin).map(r => (
                                                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {(search || roleFilter !== "ALL") && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearch("");
                                            setRoleFilter("ALL");
                                        }}
                                        className="h-10 md:h-12 px-3 md:px-6 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-lg md:rounded-xl border border-dashed border-white/10 transition-all shrink-0"
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <TabsContent value="teachers" className="space-y-4 outline-none">
                    <DataTable
                        data={filteredTeachers}
                        isLoading={loading}
                        onRowClick={(t) => router.push(`/admin/teachers/${t.id}`)}
                        columns={[
                            {
                                key: "name",
                                header: "Staff Info",
                                render: (t: Teacher) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-accent/30 transition-colors">
                                            <User size={16} className="text-white/40 group-hover:text-accent transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-white group-hover:text-accent transition-colors leading-tight">{t.name}</span>
                                            <span className="text-[10px] font-mono text-white/40 tracking-tighter uppercase">{t.schoolId}</span>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: "mobile",
                                header: "Contact",
                                render: (t: Teacher) => (
                                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                                        <Phone size={12} className="text-white/20" />
                                        <span className="font-mono">{t.mobile}</span>
                                    </div>
                                )
                            },
                            {
                                key: "password",
                                header: "Secret Key",
                                render: (t: Teacher) => (
                                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500/80 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10 w-fit">
                                        <Key size={10} className="text-amber-500" />
                                        <span className="font-mono tracking-wider font-bold">{t.recoveryPassword || t.mobile}</span>
                                    </div>
                                )
                            },
                            {
                                key: "salary",
                                header: "Base Salary",
                                headerClassName: "text-right",
                                cellClassName: "text-right",
                                render: (t: Teacher) => role === "MANAGER" ? <span className="text-white/20">••••••</span> : <span className="font-mono font-black text-sm text-emerald-400">₹{t.salary?.toLocaleString() || '0'}</span>
                            },
                            {
                                key: "status",
                                header: "Status",
                                headerClassName: "text-center",
                                cellClassName: "text-center",
                                render: (t: Teacher) => (
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none transition-all",
                                        t.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {t.status}
                                    </Badge>
                                )
                            }
                        ]}
                        actions={(t) => (
                            <div className="flex flex-col gap-1">
                                <DropdownMenuItem onClick={() => {
                                    if (!t.uid) { alert("UID Missing"); return; }
                                    setResetUser({ uid: t.uid, schoolId: t.schoolId, name: t.name, role: "TEACHER" });
                                    setIsResetModalOpen(true);
                                }} className="rounded-lg gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                                    <Key size={14} /> Reset Password
                                </DropdownMenuItem>
                                {role !== "MANAGER" && (
                                    <>
                                        <DropdownMenuItem onClick={() => {
                                            setSalaryUser({
                                                id: t.id,
                                                name: t.name,
                                                schoolId: t.schoolId,
                                                role: "TEACHER",
                                                currentSalary: t.salary || 0
                                            });
                                            setIsSalaryModalOpen(true);
                                        }} className="rounded-lg gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                                            <DollarSign size={14} /> Adjust Salary
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            setDeleteUser({ id: t.id, schoolId: t.schoolId, name: t.name, role: "teacher", uid: t.uid, collectionName: "teachers" });
                                            setIsDeleteModalOpen(true);
                                        }} className="rounded-lg gap-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} /> Remove Faculty
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </div>
                        )}
                    />
                </TabsContent>

                <TabsContent value="staff" className="space-y-4 outline-none">
                    <DataTable
                        data={filteredStaff}
                        isLoading={loading}
                        onRowClick={(s) => router.push(`/admin/staff/${s.id}`)}
                        columns={[
                            {
                                key: "name",
                                header: "Staff Info",
                                render: (s: Staff) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-blue-400/30 transition-colors">
                                            <Briefcase size={16} className="text-white/40 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors leading-tight">{s.name}</span>
                                            <span className="text-[10px] font-mono text-white/40 tracking-tighter uppercase">{s.schoolId}</span>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: "role",
                                header: "Role & Placement",
                                render: (s: Staff) => {
                                    const roleObj = roles.find(r => r.code === s.roleCode);
                                    return (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit lowercase">{roleObj?.name || s.roleCode || "Staff"}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                                <Phone size={10} className="opacity-40" />
                                                <span className="font-mono">{s.mobile}</span>
                                            </div>
                                        </div>
                                    );
                                }
                            },
                            {
                                key: "baseSalary",
                                header: "Base Salary",
                                headerClassName: "text-right",
                                cellClassName: "text-right",
                                render: (s: Staff) => role === "MANAGER" ? <span className="text-white/20">••••••</span> : <span className="font-mono font-black text-sm text-emerald-400">₹{s.baseSalary?.toLocaleString() || "0"}</span>
                            },
                            {
                                key: "status",
                                header: "Status",
                                headerClassName: "text-center",
                                cellClassName: "text-center",
                                render: (s: Staff) => (
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none transition-all",
                                        s.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {s.status}
                                    </Badge>
                                )
                            }
                        ]}
                        actions={(s) => (
                            <div className="flex flex-col gap-1">
                                <DropdownMenuItem onClick={() => {
                                    if (!s.uid) { alert("UID Missing"); return; }
                                    setResetUser({ uid: s.uid, schoolId: s.schoolId, name: s.name, role: "STAFF" });
                                    setIsResetModalOpen(true);
                                }} className="rounded-lg gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                                    <Key size={14} /> Reset Password
                                </DropdownMenuItem>
                                {role !== "MANAGER" && (
                                    <>
                                        <DropdownMenuItem onClick={() => {
                                            setSalaryUser({
                                                id: s.id,
                                                name: s.name,
                                                schoolId: s.schoolId,
                                                role: "STAFF",
                                                currentSalary: s.baseSalary || 0,
                                                roleCode: s.roleCode
                                            });
                                            setIsSalaryModalOpen(true);
                                        }} className="rounded-lg gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                                            <DollarSign size={14} /> Adjust Salary
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            setDeleteUser({ id: s.id, schoolId: s.schoolId, name: s.name, role: "admin", uid: s.uid, collectionName: "staff" });
                                            setIsDeleteModalOpen(true);
                                        }} className="rounded-lg gap-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} /> Remove Staff
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </div>
                        )}
                    />
                </TabsContent>
            </Tabs>

            <AddTeacherModal isOpen={showTeacherModal} onClose={() => setShowTeacherModal(false)} onSuccess={() => { /* Real-time update */ }} />
            <AddStaffModal isOpen={showStaffModal} onClose={() => setShowStaffModal(false)} onSuccess={() => { /* Real-time update */ }} />

            <AdminChangePasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                user={resetUser}
                onSuccess={() => { /* Real-time update */ }}
            />

            <AdjustSalaryModal
                isOpen={isSalaryModalOpen}
                onClose={() => setIsSalaryModalOpen(false)}
                person={salaryUser}
                onSuccess={() => { /* Real-time update */ }}
            />

            {deleteUser && (
                <DeleteUserModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => { setIsDeleteModalOpen(false); setDeleteUser(null); }}
                    user={deleteUser}
                    checkEligibility={async () => ({ canDelete: true })}
                    onDeactivate={async (reason) => {
                        try {
                            await updateDoc(doc(db, deleteUser.collectionName, deleteUser.id), {
                                status: "INACTIVE",
                                deactivationReason: reason,
                                updatedAt: new Date().toISOString()
                            });
                        } catch (e: any) {
                            console.error(e);
                            throw e;
                        }
                    }}
                    onDelete={async (reason) => {
                        if (!user) { alert("Not authenticated"); return; }
                        const token = await user.getIdToken();
                        const res = await fetch("/api/admin/users/delete", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                targetUid: deleteUser.uid,
                                schoolId: deleteUser.schoolId,
                                role: deleteUser.role.toUpperCase(),
                                collectionName: deleteUser.collectionName
                            })
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error);
                    }}
                />
            )}
        </div>
    );
}
