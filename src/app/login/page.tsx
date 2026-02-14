"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-store";
import { useMasterData } from "@/context/MasterDataContext";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function LoginPage() {
    const { branding } = useMasterData();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { signIn } = useAuth();
    const router = useRouter();



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Get values from form
        const form = e.target as HTMLFormElement;
        const schoolId = (form.elements.namedItem("schoolId") as HTMLInputElement).value;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;

        // Map School ID to Email internally for Firebase Auth
        let email = schoolId.trim().toLowerCase();

        // 1. Allow full email input (e.g. admin@spoorthy.edu)
        if (!email.includes('@')) {
            // 2. Legacy Admin Support: Assuming admins were created with @spoorthy.edu or similar
            if (email.includes('admin')) {
                email = `${email}@spoorthy.edu`;
            } else {
                // 3. Standard Students/Teachers: Use internal domain
                email = `${email}@school.local`;
            }
        }

        try {
            await signIn(email, password);

            toast({
                title: "Welcome Back",
                description: "Successfully logged in.",
                type: "success"
            });

            // 1. Initial Role Assessment based on School ID (Legacy/Root support)
            const lowerId = schoolId.toLowerCase();
            let targetPath = "/student";

            if (lowerId.includes("admin")) {
                targetPath = "/admin";
            } else if (lowerId.startsWith("shst") || lowerId.startsWith("teacher")) {
                targetPath = "/teacher";
            }

            // 2. Refine Role from Firestore (For Managers and specific staff)
            try {
                if (auth.currentUser) {
                    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                    if (userDoc.exists()) {
                        const dbRole = userDoc.data().role;
                        if (["ADMIN", "MANAGER", "TIMETABLE_EDITOR"].includes(dbRole)) {
                            targetPath = "/admin";
                        } else if (dbRole === "TEACHER") {
                            targetPath = "/teacher";
                        } else {
                            targetPath = "/student";
                        }
                    }
                }
            } catch (roleError) {
                console.warn("Could not fetch DB role, sticking with ID-based path:", targetPath);
            }

            // 3. Final Redirection
            router.push(targetPath);

        } catch (err: any) {
            toast({
                title: "Login Failed",
                description: "Please check your credentials and try again.",
                type: "error"
            });
            // Only log non-authentication errors to avoid console noise
            if (err?.code && !err.code.includes('auth/')) {
                console.error(err);
            }
            setError("Invalid School ID or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-background flex flex-col items-center justify-center p-4">
            {/* Ambient Background - Reused from Landing for consistency */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-0 pointer-events-none" />
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/20 via-background to-background blur-3xl" />

            {/* Back Button */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-8 left-8 z-20"
            >
                <Link
                    href="/"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Back to Home</span>
                </Link>
            </motion.div>

            <div className="relative z-10 w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl"
                >
                    <div className="flex flex-col items-center text-center space-y-4 mb-8">
                        {branding.schoolLogo && (
                            <div className="w-20 h-20 rounded-2xl bg-white/5 p-2 border border-white/10 shadow-xl mb-4 group hover:scale-110 transition-transform">
                                <img src={branding.schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <h1 className="font-display text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/50">
                                {branding.schoolName || "Welcome Back"}
                            </h1>
                            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                                Portal Login
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="schoolId">School ID</Label>
                            <Input
                                id="schoolId"
                                type="text"
                                placeholder="e.g. 2026001"
                                className="bg-white/5 border-white/10 focus:border-accent/50 focus:bg-white/10 transition-all font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-accent hover:text-accent/80 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="bg-white/5 border-white/10 focus:border-accent/50 focus:bg-white/10 transition-all"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base bg-accent hover:bg-accent/90 text-white font-medium shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.5)] transition-all duration-300"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-muted-foreground">
                            Don't have an account?{" "}
                            <Link href="/admissions" className="text-white hover:underline decoration-accent/50 underline-offset-4">
                                Apply for Admission
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
