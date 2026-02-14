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
import { Loader2 } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";

interface EditStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: any;
    onSuccess: () => void;
}

export function EditStaffModal({ isOpen, onClose, staff, onSuccess }: EditStaffModalProps) {
    const [roles, setRoles] = useState<any[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    // Form State
    const [form, setForm] = useState({
        roleId: "",
        name: "",
        mobile: "",
        address: ""
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && staff) {
            setForm({
                roleId: staff.roleId || "",
                name: staff.name || "",
                mobile: staff.mobile || "",
                address: staff.address || ""
            });
            fetchRoles();
        }
    }, [isOpen, staff]);

    const fetchRoles = async () => {
        setLoadingRoles(true);
        try {
            const q = query(collection(db, "master_staff_roles"), where("hasLogin", "==", false));
            const snap = await getDocs(q);
            setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staff?.id) return;
        setSubmitting(true);

        try {
            const selectedRole = roles.find(r => r.id === form.roleId) || roles.find(r => r.code === staff.roleCode);

            const docRef = doc(db, "staff", staff.id);
            await updateDoc(docRef, {
                name: form.name,
                mobile: form.mobile,
                address: form.address,
                roleId: form.roleId,
                roleName: selectedRole?.name || staff.roleName,
                roleCode: selectedRole?.code || staff.roleCode,
                // We keep the current baseSalary unless it's a role change? 
                // Usually better not to auto-change salary here to avoid confusion.
                updatedAt: new Date().toISOString()
            });

            toast({
                title: "Staff Updated",
                description: `Successfully updated record for ${form.name}`,
                type: "success"
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            toast({
                title: "Update Failed",
                description: err.message || "Could not update staff record.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Staff Member</DialogTitle>
                </DialogHeader>

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
                        />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !form.roleId} className="bg-white text-black hover:bg-zinc-200">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
