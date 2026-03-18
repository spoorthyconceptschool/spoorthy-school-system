"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, School, Eye, EyeOff } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LoginPage() {
    const [schoolId, setSchoolId] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Check for specific admin login via email format
            const adminEmails = ["25r21a05e2@mlrit.ac.in", "25421a05e2@mlrit.ac.in", "admin@school.local"];
            let email = "";

            if (schoolId.includes("@")) {
                email = schoolId.toLowerCase();
            } else {
                email = `${schoolId}@school.local`.toLowerCase();
            }

            console.log("[Login] Attempting sign-in for:", email);
            await signIn(email, password);

            toast({
                title: "Login Successful",
                description: "Redirecting to your dashboard...",
                type: "success"
            });

            // --- REDIRECTION LOGIC ---
            const lowerId = schoolId.toLowerCase();
            const lowerEmail = email.toLowerCase();
            let targetPath = "/student"; // Default

            // 1. Initial heuristic check
            if (adminEmails.includes(lowerEmail) || lowerId.includes("admin")) {
                targetPath = "/admin";
            }

            // 2. Database verification (The Source of Truth)
            try {
                const { auth } = await import("@/lib/firebase");
                const uid = auth.currentUser?.uid;
                if (uid) {
                    const userSnapshot = await getDoc(doc(db, "users", uid));
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.data();
                        const role = userData.role?.toString().toUpperCase();

                        if (["ADMIN", "SUPER_ADMIN", "MANAGER", "OWNER", "DEVELOPER"].includes(role)) {
                            targetPath = "/admin";
                        } else if (role === "TEACHER") {
                            targetPath = "/teacher";
                        } else if (role === "STUDENT") {
                            targetPath = "/student";
                        }
                    }
                }
            } catch (dbErr) {
                console.warn("[Login] DB Role check failed, using heuristic", dbErr);
                // Fallback heuristic if DB fails
                if (lowerId.startsWith("shst") || lowerId.startsWith("tch")) targetPath = "/teacher";
            }

            console.log("[Login] Final Target Path:", targetPath);
            router.push(targetPath);

        } catch (err: any) {
            // Use console.warn to avoid triggering the Next.js Dev Overlay for expected auth failures
            console.warn("[Login] Auth Failed:", err.message);
            setError(err.message || "Invalid credentials. Please try again.");
            toast({
                title: "Login Failed",
                description: err.message || "Please check your school ID and password.",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -z-10" />

            <Card className="w-full max-w-md bg-black/60 border-white/10 backdrop-blur-2xl shadow-2xl rounded-3xl">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                        <School className="w-8 h-8 text-accent" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-display italic font-bold text-white uppercase tracking-tight">
                            Portal Login
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                            Spoorthy Concept School System
                        </CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 pt-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 rounded-2xl">
                                <AlertDescription className="font-bold text-xs uppercase tracking-tight italic">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="schoolId" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                School ID / Email
                            </Label>
                            <Input
                                id="schoolId"
                                placeholder="e.g. SHSS20001 or admin email"
                                value={schoolId}
                                onChange={(e) => setSchoolId(e.target.value)}
                                required
                                className="bg-white/5 border-white/10 rounded-2xl h-12 focus:ring-accent focus:border-accent transition-all text-white font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 rounded-2xl h-12 focus:ring-accent focus:border-accent transition-all text-white pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl font-black text-lg transition-all transform active:scale-[0.98] shadow-lg shadow-accent/20"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-5 w-5" />
                                    AUTHENTICATE
                                </>
                            )}
                        </Button>
                        <p className="text-[9px] text-center text-muted-foreground font-bold uppercase tracking-widest">
                            Secure Terminal Access • v1.2.0
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
