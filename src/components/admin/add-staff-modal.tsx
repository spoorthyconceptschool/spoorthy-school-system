"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";
import { useAuth } from "@/context/AuthContext";
import { onSnapshot, doc } from "firebase/firestore";

interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
    const { user } = useAuth();
    const [roles, setRoles] = useState<any[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
        return () => unsub();
    }, [user]);

    // Form State
    const [form, setForm] = useState({
        roleId: "",
        name: "",
        mobile: "",
        address: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [createdId, setCreatedId] = useState("");

    useEffect(() => {
        if (isOpen) {
            setCreatedId("");
            setForm({ roleId: "", name: "", mobile: "", address: "" });
            fetchRoles();
        }
    }, [isOpen]);



    const fetchRoles = async () => {
        setLoadingRoles(true);
        try {
            // Only non-login roles
            const q = query(collection(db, "master_staff_roles"), where("hasLogin", "==", false));
            const snap = await getDocs(q);
            setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not fetch roles.", type: "error" });
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const selectedRole = roles.find(r => r.id === form.roleId);
            if (!selectedRole) throw new Error("Invalid Role");

            const res = await fetch("/api/admin/staff/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roleId: form.roleId,
                    roleName: selectedRole.name,
                    roleCode: selectedRole.code,
                    baseSalary: selectedRole.basicSalary,
                    name: form.name,
                    mobile: form.mobile,
                    address: form.address
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast({
                title: "Staff Created",
                description: `Created staff record for ${form.name}`,
                type: "success"
            });

            setCreatedId(data.staffId);
            onSuccess();
        } catch (err: any) {
            toast({
                title: "Creation Failed",
                description: err.message || "Something went wrong.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const selectedRoleData = roles.find(r => r.id === form.roleId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Non-Teaching Staff</DialogTitle>
                </DialogHeader>

                {createdId ? (
                    <div className="py-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-green-400">Staff Created!</h3>
                            <p className="text-muted-foreground mt-2">Staff ID Generated:</p>
                            <p className="text-2xl font-mono font-bold tracking-wider mt-1">{createdId}</p>
                        </div>
                        <Button onClick={onClose} className="w-full bg-white text-black hover:bg-zinc-200">
                            Done
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Job Role</Label>
                            <Select
                                value={form.roleId}
                                onValueChange={v => setForm({ ...form, roleId: v })}
                                disabled={loadingRoles}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select Role"} />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-white/10 text-white">
                                    {roles.map(role => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name} ({role.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="e.g. Ramesh Kumar"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mobile Number</Label>
                            <Input
                                required
                                type="tel"
                                pattern="[0-9]{10}"
                                value={form.mobile}
                                onChange={e => setForm({ ...form, mobile: e.target.value })}
                                className="bg-white/5 border-white/10 font-mono"
                                placeholder="e.g. 9876543210"
                                maxLength={10}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                required
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="Residential Address"
                            />
                        </div>

                        {selectedRoleData && role !== "MANAGER" && (
                            <div className="p-3 rounded bg-white/5 border border-white/10 text-sm flex justify-between">
                                <span className="text-muted-foreground">Standard Basic Salary:</span>
                                <span className="font-mono font-bold">₹{selectedRoleData.basicSalary?.toLocaleString()}</span>
                            </div>
                        )}

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={submitting || !form.roleId} className="w-full bg-white text-black hover:bg-zinc-200">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Staff Record"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
