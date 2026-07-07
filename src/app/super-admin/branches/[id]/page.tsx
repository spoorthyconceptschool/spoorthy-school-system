"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { branchService, Branch } from "@/lib/services/branchService";
import { Button } from "@/components/ui/button";
import { BrandingSettingsV2 } from "@/components/admin/branding-settings";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-store";
import { Loader2, ArrowLeft, KeyRound, Building, AlertTriangle } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function BranchDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const branchId = params.id as string;

    const [branch, setBranch] = useState<Branch | null>(null);
    const [loading, setLoading] = useState(true);

    const [newPassword, setNewPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [initialEmail, setInitialEmail] = useState("");
    const [initialPassword, setInitialPassword] = useState("");
    const [resettingPassword, setResettingPassword] = useState(false);

    // Delete Branch States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!branchId) return;

        branchService.getBranchById(branchId)
            .then(b => {
                if (b) setBranch(b);
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const token = await user.getIdToken();
                    const res = await fetch(`/api/admin/branch/credentials?branchId=${branchId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const creds = await res.json();
                    if (creds && creds.success) {
                        setNewEmail(creds.email || "");
                        setNewPassword(creds.password || "");
                        setInitialEmail(creds.email || "");
                        setInitialPassword(creds.password || "");
                    }
                } catch (err) {
                    console.error("Failed to load branch admin credentials:", err);
                }
            }
        });

        return () => unsubscribe();
    }, [branchId]);

    const handleResetPassword = async () => {
        if (newEmail === initialEmail && newPassword === initialPassword) {
            toast({ title: "No Changes", description: "Please change the email or password first.", type: "error" });
            return;
        }
        if (newPassword && newPassword.length < 6) {
            toast({ title: "Invalid Password", description: "Password must be at least 6 characters.", type: "error" });
            return;
        }

        setResettingPassword(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            
            const payload: any = { branchId };
            if (newEmail !== initialEmail) payload.newEmail = newEmail;
            if (newPassword !== initialPassword) payload.newPassword = newPassword;

            const res = await fetch("/api/admin/branch/credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: "Credentials Updated", description: "Branch Admin credentials have been updated.", type: "success" });
                setInitialEmail(newEmail);
                setInitialPassword(newPassword);
                // Refresh branch details to reflect new email
                branchService.getBranchById(branchId).then(b => setBranch(b));
            } else {
                throw new Error(data.error || "Failed to update credentials");
            }
        } catch (e: any) {
            toast({ title: "Reset Failed", description: e.message, type: "error" });
        } finally {
            setResettingPassword(false);
        }
    };

    const handleDeleteBranch = async () => {
        if (!confirmPassword) {
            toast({ title: "Password Required", description: "Please enter your super admin password.", type: "error" });
            return;
        }

        setDeleting(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) {
                throw new Error("No authenticated super admin user session found.");
            }

            // Removed reauthenticateWithCredential as it causes auth/invalid-credential errors for some auth providers.
            // Backend strictly validates the SUPER_ADMIN token via JWT.
            const token = await currentUser.getIdToken();
            const res = await fetch("/api/admin/branch/delete", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ branchId })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to delete school and associated users.");
            }

            toast({ title: "School Deleted", description: "The school and all associated user accounts have been deleted successfully.", type: "success" });
            setIsDeleteDialogOpen(false);
            router.push("/super-admin/branches");
        } catch (e: any) {
            console.error("Failed to delete school:", e);
            toast({ title: "Deletion Failed", description: e.message || "Incorrect password or permission error.", type: "error" });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <div className="flex h-[400px] items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!branch) {
        return <div className="flex h-[400px] flex-col items-center justify-center text-white gap-4">
            <p>School not found.</p>
            <Button onClick={() => router.push("/super-admin/branches")} variant="outline">Go Back</Button>
        </div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <Button variant="ghost" onClick={() => router.push("/super-admin/branches")} className="h-10 w-10 p-0 text-zinc-400 hover:text-white hover:bg-white/5">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building className="w-6 h-6 text-indigo-400" />
                        {branch.branchName} Details
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">Manage configuration and credentials for this school.</p>
                </div>
            </div>

            {/* School Identity Settings */}
            <BrandingSettingsV2 branchId={branchId} />

            {/* Credential Management */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-6 backdrop-blur-xl shadow-2xl mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        <KeyRound className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">School Manager Credentials</h2>
                        <p className="text-sm text-zinc-400">Force reset the password or change the email for the School Admin account.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-end gap-4 max-w-2xl">
                    <div className="space-y-2 flex-1 w-full">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
                        <Input
                            type="email"
                            placeholder="e.g. school@example.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 focus:border-rose-500/50 text-white"
                        />
                    </div>
                    <div className="space-y-2 flex-1 w-full">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                        <Input
                            type="text"
                            placeholder="Enter password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 focus:border-rose-500/50 text-white"
                        />
                    </div>
                    <Button
                        onClick={handleResetPassword}
                        disabled={resettingPassword || (newEmail === initialEmail && newPassword === initialPassword) || (newPassword.length > 0 && newPassword.length < 6)}
                        className="bg-rose-600 hover:bg-rose-500 text-white transition-all w-full md:w-32"
                    >
                        {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-950/10 border border-rose-500/20 rounded-xl p-6 backdrop-blur-xl shadow-2xl mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Danger Zone</h2>
                        <p className="text-sm text-zinc-400">Permanently delete this school. This action cannot be undone.</p>
                    </div>
                </div>

                <div className="flex justify-start">
                    <Button
                        onClick={() => {
                            setConfirmPassword("");
                            setIsDeleteDialogOpen(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-white transition-all font-semibold"
                    >
                        Delete School
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white sm:max-w-[425px] border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-rose-500 font-bold flex items-center gap-2">
                            Delete {branch.branchName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-zinc-300">
                            Are you absolutely sure you want to delete this school? All associated settings will be lost.
                        </p>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Enter Super Admin Password to Confirm
                            </label>
                            <Input
                                type="password"
                                placeholder="Your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-zinc-950/50 border-white/10 focus:border-rose-500/50 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="text-[#8892B0] hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteBranch}
                            disabled={deleting || !confirmPassword}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
