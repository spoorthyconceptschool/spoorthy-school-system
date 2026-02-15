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
        <main className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] flex flex-col items-center justify-center p-4">
            {/* dynamic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent opacity-50" />
            </div>

            {/* Back Button */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-8 left-8 z-20"
            >
                <Link
                    href="/"
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all group"
                >
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Back to Home</span>
                </Link>
            </motion.div>

            <div className="relative z-10 w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="group relative"
                >
                    {/* Glow effect behind the card */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2.5rem] opacity-20 group-hover:opacity-30 blur transition duration-1000 group-hover:duration-200" />

                    <div className="relative rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-3xl p-8 md:p-10 shadow-2xl flex flex-col">
                        <div className="flex flex-col items-center text-center space-y-4 mb-10">
                            {branding.schoolLogo && (
                                <motion.div
                                    whileHover={{ rotate: 5, scale: 1.1 }}
                                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/10 to-transparent p-4 border border-white/10 shadow-2xl mb-4"
                                >
                                    <img src={branding.schoolLogo} alt="School Logo" className="w-full h-full object-contain filter drop-shadow-2xl" />
                                </motion.div>
                            )}
                            <div className="space-y-2">
                                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
                                    {branding.schoolName || "Welcome Back"}
                                </h1>
                                <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full" />
                                <p className="text-zinc-400 text-xs font-bold tracking-[0.2em] uppercase pt-2">
                                    Secure Access Portal
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="schoolId" className="text-zinc-300 ml-1">School ID</Label>
                                <Input
                                    id="schoolId"
                                    type="text"
                                    placeholder="e.g. 2026001"
                                    className="h-14 bg-white/5 border-white/10 focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono rounded-2xl placeholder:text-zinc-600"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" title="password color fix" className="text-zinc-300">Password</Label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-14 bg-white/5 border-white/10 focus:border-blue-500/50 focus:bg-white/10 transition-all rounded-2xl placeholder:text-zinc-600"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all duration-300 active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    "Authenticate"
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-zinc-500">
                                Need help?{" "}
                                <Link href="/admissions" className="text-white hover:text-blue-400 font-semibold underline-offset-4 transition-colors">
                                    Contact Support
                                </Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer decoration */}
            <div className="mt-12 text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-bold z-10">
                &copy; {new Date().getFullYear()} Spoorthy Technology Systems
            </div>
        </main>
    );
}
