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
        if (!user?.email) return;

        try {
            // Extract SHSTxxxx from SHSTxxxx@school.local
            const schoolId = user.email.split('@')[0].toUpperCase();

            const { doc, getDoc } = await import("firebase/firestore");
            const docRef = doc(db, "teachers", schoolId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                console.error("Teacher profile document not found!");
            }
        } catch (error) {
            console.error("Error fetching teacher profile:", error);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</label>
                            <div className="font-medium text-lg">{profile?.name || user?.displayName || "Loading..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">School ID</label>
                            <div className="font-medium text-lg font-mono">{profile?.schoolId || "- - -"}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Number</label>
                            <div className="font-medium text-lg font-mono">{profile?.mobile || profile?.phone || "..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Role</label>
                            <div className="font-medium text-lg">Teacher</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Age</label>
                            <div className="font-medium text-lg">{profile?.age ? `${profile.age} years` : "..."}</div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Qualifications</label>
                            <div className="font-medium text-lg">{profile?.qualifications || "..."}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Address</label>
                            <div className="font-medium text-lg">{profile?.address || "..."}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Class Teacher Assignment</label>
                            <div className="font-medium text-lg text-emerald-400">
                                {profile?.classTeacherOf && profile.classTeacherOf.classId !== "NONE" ? `Class ${profile.classTeacherOf.classId?.toUpperCase() || "..."} - Section ${profile.classTeacherOf.sectionId || "..."}` : "Not Assigned"}
                            </div>
                        </div>
                        <div className="md:col-span-2 pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Primary Subject</label>
                                {profile?.subjects?.[0] ? (
                                    <div className="bg-white/10 px-3 py-1 rounded-md text-sm font-medium border border-white/5 w-fit">
                                        {profile.subjects[0]}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground italic text-sm">Not assigned</span>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Secondary Subject (Optional)</label>
                                {profile?.subjects?.[1] ? (
                                    <div className="bg-white/10 px-3 py-1 rounded-md text-sm font-medium border border-white/5 w-fit">
                                        {profile.subjects[1]}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground italic text-sm">None</span>
                                )}
                            </div>
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
