"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ChangePasswordPage() {
    const { user } = useAuth();

    // API Approach: 
    // POST /api/auth/change-password { newPassword }
    // Backend updates Auth + Firestore flag.

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            // 1. Re-authenticate to verify Old Password
            if (!user || !user.email) throw new Error("User not found");

            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. If success, call API to update
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify({ newPassword }) // API only needs new pwd now
            });
            const data = await res.json();

            if (data.success) {
                alert("Password updated successfully. Please login again.");
                router.push("/teacher");
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            console.error(e);
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                alert("Incorrect Current Password");
            } else {
                alert(e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-zinc-900 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="text-emerald-500" /> Security Check
                    </CardTitle>
                    <CardDescription>
                        For your security, you must change your password before proceeding.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <Input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="bg-black/20"
                                placeholder="Enter your old password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm Password</Label>
                            <Input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
