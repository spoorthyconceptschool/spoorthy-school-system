"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
        <div className="w-full min-h-[calc(100vh-160px)] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
            
            {/* Soft Glowing Blur Accents */}
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="w-full max-w-md space-y-4 relative z-10">
                
                {/* Back to Profile shortcut */}
                <Link href="/student/profile" className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
                </Link>

                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                    {/* Top safety border line */}
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                    
                    <CardHeader className="text-left pt-6 px-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-md mb-3 select-none">
                            <Lock className="w-5 h-5 text-blue-400" />
                        </div>
                        <CardTitle className="text-lg font-black text-white">Change Account Password</CardTitle>
                        <CardDescription className="text-xs text-neutral-400">
                            Please set a secure, unique password to restrict unauthorized portal access to your student profile.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 pt-1">
                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">New Password</Label>
                                <Input 
                                    type="password" 
                                    required 
                                    placeholder="••••••••"
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    className="bg-[#0A192F]/60 border-white/10 text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/10" 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Confirm Password</Label>
                                <Input 
                                    type="password" 
                                    required 
                                    placeholder="••••••••"
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)} 
                                    className="bg-[#0A192F]/60 border-white/10 text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/10" 
                                />
                            </div>

                            {/* Secure Indicator Note */}
                            <div className="flex gap-2 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[9px] text-neutral-400 leading-normal select-none">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>Passwords must contain at least 6 characters and be kept strictly confidential.</span>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Save Security Credentials"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
