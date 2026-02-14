"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit, Trash2, ShieldAlert, Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface StaffRole {
    id: string;
    name: string; // e.g. "Driver", "Teacher"
    code: string; // e.g. "DRV", "TCH"
    hasLogin: boolean;
    basicSalary: number; // For non-login roles
    isActive: boolean;
    createdAt?: any;
}

export default function StaffRolesPage() {
    const [roles, setRoles] = useState<StaffRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<StaffRole | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<StaffRole>>({
        name: "",
        code: "",
        hasLogin: false,
        basicSalary: 0,
        isActive: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const q = query(collection(db, "master_staff_roles"), orderBy("name"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffRole));
            setRoles(data);
        } catch (error) {
            console.error("Error fetching roles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Validation
            if (!formData.name || !formData.code) throw new Error("Name and Code are required.");
            if (!formData.hasLogin && (formData.basicSalary === undefined || formData.basicSalary < 0)) throw new Error("Basic Salary is required for non-login roles.");

            const payload = {
                name: formData.name,
                code: formData.code.toUpperCase(),
                hasLogin: formData.hasLogin || false,
                basicSalary: formData.hasLogin ? 0 : Number(formData.basicSalary),
                isActive: formData.isActive !== undefined ? formData.isActive : true,
                updatedAt: Timestamp.now()
            };

            if (editingRole) {
                await updateDoc(doc(db, "master_staff_roles", editingRole.id), payload);
                alert("Role updated successfully!");
            } else {
                await addDoc(collection(db, "master_staff_roles"), {
                    ...payload,
                    createdAt: Timestamp.now()
                });
                alert("Role created successfully!");
            }

            setIsModalOpen(false);
            setEditingRole(null);
            setFormData({ name: "", code: "", hasLogin: false, basicSalary: 0, isActive: true });
            fetchRoles();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This role cannot be deleted if assigned to staff.")) return;
        try {
            // Check usage before delete (TODO: Implement usage check properly)
            // For now, just simplistic delete
            await deleteDoc(doc(db, "master_staff_roles", id));
            fetchRoles();
            alert("Role deleted.");
        } catch (error) {
            console.error(error);
            alert("Failed to delete.");
        }
    };

    const openEdit = (role: StaffRole) => {
        setEditingRole(role);
        setFormData(role);
        setIsModalOpen(true);
    };

    const columns = [
        { key: "name", header: "Role Name", render: (r: StaffRole) => <span className="font-bold">{r.name}</span> },
        { key: "code", header: "Code", render: (r: StaffRole) => <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded">{r.code}</span> },
        {
            key: "hasLogin",
            header: "Access Type",
            render: (r: StaffRole) => (
                r.hasLogin
                    ? <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">Login Access</span>
                    : <span className="text-muted-foreground text-xs">No Login</span>
            )
        },
        { key: "basicSalary", header: "Base Salary", render: (r: StaffRole) => !r.hasLogin ? `₹${r.basicSalary?.toLocaleString()}` : "-" },
        { key: "isActive", header: "Status", render: (r: StaffRole) => r.isActive ? <span className="text-green-500">Active</span> : <span className="text-red-500">Inactive</span> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                    <h1 className="text-3xl font-display font-bold">Staff Roles</h1>
                    <p className="text-muted-foreground">Manage job titles, permissions, and base salaries.</p>
                </div>
                <Button onClick={() => { setEditingRole(null); setFormData({ name: "", code: "", hasLogin: false, basicSalary: 0, isActive: true }); setIsModalOpen(true); }} className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200">
                    <Plus className="w-4 h-4 mr-2" /> Add Role
                </Button>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-black/95 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role Name <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. Driver"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role Code <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. DRV"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="bg-white/5 border-white/10 font-mono uppercase"
                                    maxLength={4}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                            <div className="space-y-0.5">
                                <Label>Login Access</Label>
                                <p className="text-xs text-muted-foreground">Enable for Teachers/Admins only.</p>
                            </div>
                            <Switch
                                checked={formData.hasLogin}
                                onCheckedChange={checked => setFormData({ ...formData, hasLogin: checked, basicSalary: checked ? 0 : formData.basicSalary })}
                            />
                        </div>

                        {!formData.hasLogin && (
                            <div className="space-y-2">
                                <Label>Basic Salary (₹) <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.basicSalary}
                                    onChange={e => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                                    className="bg-white/5 border-white/10"
                                    required
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                            />
                            <Label>Active</Label>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={submitting} className="bg-white text-black hover:bg-zinc-200">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingRole ? "Save Changes" : "Create Role")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <DataTable
                columns={columns}
                data={roles}
                isLoading={loading}
                actions={(role) => (
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(role); }}>
                            <Edit className="w-4 h-4 text-muted-foreground hover:text-white" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }} className="hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                    </div>
                )}
            />
        </div>
    );
}
