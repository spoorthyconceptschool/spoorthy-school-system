"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, User } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";

export default function StudentProfilePage() {
    const { user } = useAuth();
    const { classes, villages, sections } = useMasterData();
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        try {
            // Guard: Ensure user.uid is available
            if (!user?.uid) return;

            const q = query(collection(db, "students"), where("uid", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setProfile(snap.docs[0].data());
            }
        } catch (e: any) {
            // Suppress Firestore index errors - expected during development
            if (!e?.message?.includes('index')) {
                console.error(e);
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in">
            <h1 className="text-3xl font-display font-bold">My Profile</h1>

            <Card className="bg-black/20 border-white/10">
                <CardHeader><CardTitle className="flex items-center gap-2"><User /> Personal Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Name</label>
                            <div className="font-bold text-xl">{profile?.studentName || profile?.name || user?.displayName || "Loading..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Student ID</label>
                            <div className="font-bold text-xl font-mono text-blue-400">{profile?.schoolId || "..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Class</label>
                            <div className="font-bold text-lg">
                                {classes[profile?.classId]?.name || profile?.className || "..."}
                                {profile?.sectionId && sections && sections[profile.sectionId] && (
                                    <span className="text-muted-foreground ml-1 font-medium text-base">
                                        ({sections[profile.sectionId].name})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Village</label>
                            <div className="font-bold text-lg">
                                {villages[profile?.villageId]?.name || profile?.villageName || "N/A"}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10">
                <CardHeader><CardTitle className="flex items-center gap-2"><Lock /> Security</CardTitle></CardHeader>
                <CardContent>
                    <Button variant="outline" asChild>
                        <Link href="/student/change-password">Change Password</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
