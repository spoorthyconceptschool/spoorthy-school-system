"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TeacherProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user?.uid) return;
        const q = query(collection(db, "teachers"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
            setProfile(snap.docs[0].data());
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in">
            <div>
                <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-display font-bold">My Profile</h1>
            </div>

            <Card className="bg-black/20 border-white/10">
                <CardHeader><CardTitle className="flex items-center gap-2"><User /> Identity</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase">Name</label>
                            <div className="font-medium text-lg">{profile?.name || user?.displayName || "Loading..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase">School ID</label>
                            <div className="font-medium text-lg font-mono">{profile?.schoolId || "..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase">Mobile</label>
                            <div className="font-medium text-lg">{profile?.phone || "..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase">Role</label>
                            <div className="font-medium text-lg">Teacher</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10">
                <CardHeader><CardTitle className="flex items-center gap-2"><Lock /> Security</CardTitle></CardHeader>
                <CardContent>
                    <Button variant="outline" asChild>
                        <Link href="/teacher/change-password">Change Password</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
