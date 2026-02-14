"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";

// Reusing generic logic but keeping separate file for route clarity
export default function StudentChangePasswordPage() {
    const { user } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match"); return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters"); return;
        }

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert("Password updated successfully.");
                // Force reload to refresh user claims/doc state in context
                window.location.href = "/student";
            } else {
                alert(data.error || "Failed to update password");
            }
        } catch (e: any) {
            console.error(e);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-zinc-900 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="text-blue-500" /> Security Check
                    </CardTitle>
                    <CardDescription>
                        Please set a secure password for your student account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-black/20" />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm Password</Label>
                            <Input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-black/20" />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? <Loader2 className="animate-spin" /> : "Set Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
