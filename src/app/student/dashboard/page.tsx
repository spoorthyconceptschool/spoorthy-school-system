"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

export default function StudentDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState("");
    const [schoolId, setSchoolId] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/auth/student/login");
                return;
            }

            try {
                // Determine ID from email (e.g., SHS00001@school.local -> SHS00001)
                const derivedSchoolId = user.email?.split("@")[0].toUpperCase() || "";
                setSchoolId(derivedSchoolId);

                // Fetch student details
                if (derivedSchoolId) {
                    const docRef = doc(db, "students", derivedSchoolId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setStudentName(docSnap.data().studentName);
                    }
                }
            } catch (error) {
                console.error("Dashboard Error:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/auth/student/login");
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Welcome, {studentName}</h1>
                    <p className="text-muted-foreground font-mono">{schoolId}</p>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold mb-2">My Profile</h3>
                    <p className="text-sm text-muted-foreground">View your academic and personal details.</p>
                </div>
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold mb-2">Fee Status</h3>
                    <p className="text-sm text-muted-foreground">Check pending dues and payment history.</p>
                </div>
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold mb-2">Attendance</h3>
                    <p className="text-sm text-muted-foreground">Track your daily class attendance.</p>
                </div>
            </div>
        </div>
    );
}
