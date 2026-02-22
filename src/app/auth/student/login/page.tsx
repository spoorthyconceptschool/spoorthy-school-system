"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, School } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "@/lib/toast-store";

export default function StudentLoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ schoolId: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Construct Email (e.g., SHS00001@school.local)
            const syntheticEmail = `${form.schoolId.toUpperCase()}@school.local`;

            // 2. Auth Sign In
            const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, form.password);
            const user = userCredential.user;

            // 3. Verify Role & Status in Firestore
            // Note: We use the UID from Auth which should match the Student Doc ID if we set it up correctly,
            // OR we query by schoolId. 
            // In our CREATE logic, we created the Auth User. The Auth UID might NOT match the custom "SHS..." ID 
            // unless we explicitly set it (which admin SDK allows).
            // Let's assume standard behavior: Auth UID != School ID.
            // So we need to find the student doc. 
            // Actually, for students, we stored the `uid` on the student doc OR we can just check the custom claim if set.
            // Simplified: User logs in. We check if a student doc exists with this `schoolId` (from input).

            const studentDocRef = doc(db, "students", form.schoolId.toUpperCase()); // We used SchoolID as Doc ID!
            const studentSnap = await getDoc(studentDocRef);

            if (!studentSnap.exists()) {
                throw new Error("Student record not found.");
            }

            const studentData = studentSnap.data();
            if (studentData.status !== "ACTIVE") {
                throw new Error("Account is inactive. Contact Admin.");
            }

            toast({
                title: "Welcome Back",
                description: `Logged in as ${studentData.studentName}`,
                type: "success"
            });

            // 4. Redirect
            router.push("/student/dashboard");

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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4 ring-1 ring-white/10">
                        <School className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight font-display">Student Portal</h1>
                    <p className="text-muted-foreground">Enter your School ID to continue</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="schoolId">School ID</Label>
                            <Input
                                id="schoolId"
                                placeholder="e.g. SHS00001"
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

                        <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-bold" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground uppercase tracking-widest opacity-90">
                    Spoorthy Concept School
                </p>
            </div>
        </div>
    );
}
