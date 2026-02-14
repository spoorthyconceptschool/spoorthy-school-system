"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";

interface AdminChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        uid: string;
        schoolId: string;
        name: string;
        role: string; // STUDENT, TEACHER, STAFF
    } | null;
    onSuccess?: () => void;
}

export function AdminChangePasswordModal({ isOpen, onClose, user, onSuccess }: AdminChangePasswordModalProps) {
    const { user: adminUser } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    if (!user) return null;



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user.uid) {
            toast({ title: "Error", description: "User has no linked account.", type: "error" });
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/admin/users/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await adminUser?.getIdToken()}`
                },
                body: JSON.stringify({
                    targetUid: user.uid,
                    schoolId: user.schoolId,
                    role: user.role,
                    newPassword
                })
            });

            const data = await res.json();
            if (data.success) {
                toast({
                    title: "Password Changed",
                    description: `Proactively updated password for ${user.name}.`,
                    type: "success"
                });
                setNewPassword("");
                if (onSuccess) onSuccess();
                onClose();
            } else {
                toast({
                    title: "Reset Failed",
                    description: data.error || "Could not change password.",
                    type: "error"
                });
            }
        } catch (e: any) {
            toast({
                title: "Error",
                description: e.message || "An unexpected error occurred.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500" />
                        Reset Password
                    </DialogTitle>
                    <DialogDescription>
                        Set a new password for <span className="font-bold text-white">{user.name}</span> ({user.schoolId}).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>This will immediately update the user's password and log them out of all devices.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-black/20"
                            placeholder="Enter new password"
                            required
                            minLength={6}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                            Update Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
