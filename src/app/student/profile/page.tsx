"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, User } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";

export default function StudentProfilePage() {
    const { user } = useAuth();
    const { classes, villages, sections } = useMasterData();
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (!user?.email) return;

        const schoolIdFromEmail = user.email.split('@')[0].toUpperCase();

        // Primary: Fetch by Document ID (School ID)
        const unsubDoc = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                setProfile(pSnap.data());
            } else if (user.uid) {
                // Secondary: Fetch by UID query
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const unsubQuery = onSnapshot(q, (qSnap) => {
                    if (!qSnap.empty) setProfile(qSnap.docs[0].data());
                });
                return () => unsubQuery();
            }
        }, (err) => {
            console.error("Profile sync error:", err);
        });

        return () => unsubDoc();
    }, [user]);

    // fetchProfile is no longer needed as a separate function called in useEffect

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in">
            <h1 className="text-3xl font-display font-bold">My Profile</h1>

            <Card className="bg-black/20 border-white/10 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/10">
                    <CardTitle className="flex items-center gap-2 text-blue-400">
                        <User className="w-5 h-5" /> Student Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Core Info */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#3B82F6]">Academic Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Full Name</label>
                                    <div className="text-lg font-bold">{profile?.studentName || profile?.name || user?.displayName || "..."}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Student ID</label>
                                    <div className="text-lg font-bold font-mono text-emerald-400">{profile?.schoolId || "..."}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Class & Section</label>
                                    <div className="text-lg font-bold">
                                        {classes[profile?.classId]?.name || profile?.className || "N/A"}
                                        {profile?.sectionId && (
                                            <span className="text-muted-foreground ml-1">
                                                ({sections[profile.sectionId]?.name || profile.sectionName || "..."})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#10B981]">Personal Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Parent / Guardian</label>
                                    <div className="text-lg font-bold">{profile?.parentName || profile?.fatherName || "N/A"}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Date of Birth</label>
                                    <div className="text-lg font-bold">{profile?.dateOfBirth || "N/A"}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Gender</label>
                                    <div className="text-lg font-bold capitalize">{profile?.gender || "N/A"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Location */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#A855F7]">Contact & Location</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Mobile Number</label>
                                    <div className="text-lg font-bold">{profile?.parentMobile || profile?.phone || "N/A"}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Village / City</label>
                                    <div className="text-lg font-bold">{villages[profile?.villageId]?.name || profile?.villageName || profile?.city || "N/A"}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Transport</label>
                                    <div className={`text-lg font-bold ${profile?.transportRequired ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                        {profile?.transportRequired ? "Opted (Route Assigned)" : "Not Required"}
                                    </div>
                                </div>
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
