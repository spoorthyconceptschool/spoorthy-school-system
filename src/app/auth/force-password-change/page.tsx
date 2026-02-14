"use client";

import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";

export default function ForcePasswordChangePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({ new: "", confirm: "" });
    const [error, setError] = useState("");

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (passwords.new.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No active session");

            // 1. Update Auth Password
            await updatePassword(user, passwords.new);

            // 2. Update Firestore `users/{uid}` to remove mustChangePassword
            await updateDoc(doc(db, "users", user.uid), {
                mustChangePassword: false
            });

            // 3. Redirect back to dash
            // Determine role? Simplified: Try teacher dash, if 404/denied handle there.
            // Or assume typical user is teacher for now.
            router.push("/teacher/dashboard");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4 ring-1 ring-yellow-500/20">
                        <ShieldCheck className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Update Password</h1>
                    <p className="text-muted-foreground">For security, you must change your password.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                required
                                value={passwords.new}
                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm Password</Label>
                            <Input
                                type="password"
                                required
                                value={passwords.confirm}
                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                className="bg-black/20 border-white/10"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password & Continue"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
