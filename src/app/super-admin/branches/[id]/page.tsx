"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { branchService, Branch } from "@/lib/services/branchService";
import { Button } from "@/components/ui/button";
import { BrandingSettingsV2 } from "@/components/admin/branding-settings";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-store";
import { Loader2, ArrowLeft, KeyRound, Building } from "lucide-react";

export default function BranchDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const branchId = params.id as string;

    const [branch, setBranch] = useState<Branch | null>(null);
    const [loading, setLoading] = useState(true);

    const [newPassword, setNewPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [resettingPassword, setResettingPassword] = useState(false);

    useEffect(() => {
        if (branchId) {
            branchService.getBranchById(branchId)
                .then(b => setBranch(b))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [branchId]);

    const handleResetPassword = async () => {
        if (!newPassword && !newEmail) {
            toast({ title: "No Changes", description: "Please enter a new password or email.", type: "error" });
            return;
        }
        if (newPassword && newPassword.length < 6) {
            toast({ title: "Invalid Password", description: "Password must be at least 6 characters.", type: "error" });
            return;
        }

        setResettingPassword(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/branch/credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ branchId, newPassword, newEmail })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: "Credentials Updated", description: "Branch Admin credentials have been updated.", type: "success" });
                setNewPassword("");
                setNewEmail("");
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

    if (loading) {
        return <div className="flex h-[400px] items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!branch) {
        return <div className="flex h-[400px] flex-col items-center justify-center text-white gap-4">
            <p>Branch not found.</p>
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
                    <p className="text-sm text-zinc-400 mt-1">Manage configuration and credentials for this branch.</p>
                </div>
            </div>

            {/* Branch Identity Settings */}
            <BrandingSettingsV2 branchId={branchId} />

            {/* Credential Management */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-6 backdrop-blur-xl shadow-2xl mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        <KeyRound className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Branch Manager Credentials</h2>
                        <p className="text-sm text-zinc-400">Force reset the password or change the email for the Branch Admin account.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-end gap-4 max-w-2xl">
                    <div className="space-y-2 flex-1 w-full">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Email</label>
                        <Input
                            type="email"
                            placeholder={branch.email || "e.g. branch@school.edu"}
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 focus:border-rose-500/50 text-white"
                        />
                    </div>
                    <div className="space-y-2 flex-1 w-full">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
                        <Input
                            type="text"
                            placeholder="e.g. branch123"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 focus:border-rose-500/50 text-white"
                        />
                    </div>
                    <Button
                        onClick={handleResetPassword}
                        disabled={resettingPassword || (!newPassword && !newEmail) || (newPassword.length > 0 && newPassword.length < 6)}
                        className="bg-rose-600 hover:bg-rose-500 text-white transition-all w-full md:w-32"
                    >
                        {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
