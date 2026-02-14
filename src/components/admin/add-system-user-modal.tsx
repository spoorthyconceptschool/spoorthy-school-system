"use client";

import { useState } from "react";
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
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "@/lib/toast-store";

interface AddSystemUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddSystemUserModal({ isOpen, onClose, onSuccess }: AddSystemUserModalProps) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "MANAGER"
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("/api/admin/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast({
                title: "User Created",
                description: `System access granted to ${form.name} as ${form.role}`,
                type: "success"
            });

            setForm({ name: "", email: "", password: "", role: "MANAGER" });
            onSuccess();
            onClose();
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="text-accent" size={20} />
                        Add System User
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="bg-white/5 border-white/10"
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                            required
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="bg-white/5 border-white/10"
                            placeholder="user@school.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Initial Password</Label>
                        <Input
                            required
                            type="text"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            className="bg-white/5 border-white/10 font-mono"
                            placeholder="Secure password"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>System Role</Label>
                        <Select
                            value={form.role}
                            onValueChange={v => setForm({ ...form, role: v })}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="ADMIN">Administrator</SelectItem>
                                <SelectItem value="TIMETABLE_EDITOR">Timetable Editor</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {form.role === "MANAGER" && "Can manage academic operations but cannot access payroll or system settings."}
                            {form.role === "ADMIN" && "Full system access including payroll, settings, and user management."}
                            {form.role === "TIMETABLE_EDITOR" && "Restricted to timetable and faculty coverage management."}
                        </p>
                    </div>

                    <DialogFooter className="mt-4 pt-4 border-t border-white/5">
                        <Button type="submit" disabled={submitting} className="w-full bg-white text-black hover:bg-zinc-200">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gant System Access"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
