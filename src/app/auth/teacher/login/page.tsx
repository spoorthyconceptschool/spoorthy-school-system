"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, School, GraduationCap } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "@/lib/toast-store";

export default function TeacherLoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ schoolId: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");



    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Construct Email (e.g., SHST0005@school.local)
            const syntheticEmail = `${form.schoolId.toUpperCase()}@school.local`;

            // 2. Auth Sign In
            const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, form.password);
            const user = userCredential.user;

            // 3. Verify Role & Status in Firestore
            // Check 'teachers' collection
            const teacherDocRef = doc(db, "teachers", form.schoolId.toUpperCase());
            const teacherSnap = await getDoc(teacherDocRef);

            if (!teacherSnap.exists()) {
                // Determine if it was actually a student trying to login here?
                throw new Error("Teacher record not found.");
            }

            const teacherData = teacherSnap.data();
            if (teacherData.status !== "ACTIVE") {
                throw new Error("Account is inactive. Contact Admin.");
            }

            // 4. Check Force Password Policy (from 'users' collection generally, or just check 'users/{uid}')
            // In API Create, we mapped UID to 'users/{uid}' with 'mustChangePassword: true'
            const userMetaRef = doc(db, "users", user.uid);
            const userMetaSnap = await getDoc(userMetaRef);

            if (userMetaSnap.exists() && userMetaSnap.data().mustChangePassword) {
                router.push("/auth/force-password-change");
                return;
            }

            toast({
                title: "Welcome Back",
                description: `Logged in as ${teacherData.name}`,
                type: "success"
            });

            // 5. Redirect to Dashboard
            router.push("/teacher/dashboard");

        } catch (err: any) {
            console.error("Login Error:", err);

            toast({
                title: "Login Failed",
                description: err.message || "Please check your ID and Password",
                type: "error"
            });

            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
                setError("Invalid ID or Password");
            } else {
                setError(err.message || "Login Failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4 ring-1 ring-blue-500/20">
                        <GraduationCap className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight font-display">Teacher Portal</h1>
                    <p className="text-muted-foreground">Enter your School ID to continue</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="schoolId">Teacher ID</Label>
                            <Input
                                id="schoolId"
                                placeholder="e.g. SHST0001"
                                className="bg-black/20 border-white/10 h-11 font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                                value={form.schoolId}
                                onChange={e => setForm({ ...form, schoolId: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="bg-black/20 border-white/10 h-11 pr-10"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <Lock className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground uppercase tracking-widest opacity-90">
                    Spoorthy Concept School • Faculty
                </p>
            </div>
        </div>
    );
}
