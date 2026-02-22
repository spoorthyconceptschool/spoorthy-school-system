"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Lock,
    User,
    ArrowLeft,
    Phone,
    MapPin,
    GraduationCap,
    BookOpen,
    Calendar,
    Hash,
} from "lucide-react";
import Link from "next/link";

export default function TeacherProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user?.uid) return;
        try {
            // 1. Fetch user map to get their schoolId reliably
            const userMetaRef = doc(db, "users", user.uid);
            const userMetaSnap = await getDoc(userMetaRef);

            if (userMetaSnap.exists() && userMetaSnap.data().schoolId) {
                const schoolId = userMetaSnap.data().schoolId;
                const teacherRef = doc(db, "teachers", schoolId);
                const teacherSnap = await getDoc(teacherRef);

                if (teacherSnap.exists()) {
                    const data = teacherSnap.data();
                    setProfile({ ...data, schoolId: data.schoolId || teacherSnap.id });
                    return;
                }
            }

            // 2. Fallback query if no user map exists
            const q = query(collection(db, "teachers"), where("uid", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                // doc ID is the schoolId (e.g. SHST0001), use as fallback
                setProfile({ ...data, schoolId: data.schoolId || snap.docs[0].id });
            }
        } catch (error) {
            console.error("Error fetching teacher profile:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in">
            <div>
                <Link
                    href="/teacher"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-display font-bold text-white">My Profile</h1>
            </div>

            {loading ? (
                <div className="text-center text-muted-foreground py-12">Loading profile...</div>
            ) : !profile ? (
                <div className="text-center text-muted-foreground py-12">
                    Profile not found. Please contact the admin.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Identity */}
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <User className="w-5 h-5" /> Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Full Name
                                    </label>
                                    <div className="font-medium text-base text-white">
                                        {profile.name || user?.displayName || "—"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> School ID
                                    </label>
                                    <div className="font-medium text-base font-mono text-emerald-400">
                                        {profile.schoolId || "Not assigned"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </label>
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                profile.status === "ACTIVE"
                                                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                                                    : "border-amber-500 text-amber-400 bg-amber-500/10"
                                            }
                                        >
                                            {profile.status || "Unknown"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Role
                                    </label>
                                    <div className="font-medium text-base text-white">Teacher</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact & Personal Details */}
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Phone className="w-5 h-5" /> Contact & Personal Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Mobile Number
                                    </label>
                                    <div className="font-medium text-base font-mono text-white">
                                        {profile.mobile || (
                                            <span className="text-white/30 italic text-sm">Not provided</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Age
                                    </label>
                                    <div className="font-medium text-base text-white">
                                        {profile.age ? (
                                            `${profile.age} years`
                                        ) : (
                                            <span className="text-white/30 italic text-sm">Not provided</span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Address
                                    </label>
                                    <div className="font-medium text-base text-white">
                                        {profile.address || (
                                            <span className="text-white/30 italic text-sm">Not provided</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Professional Details */}
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <GraduationCap className="w-5 h-5" /> Professional Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Qualifications
                                    </label>
                                    <div className="font-medium text-base text-white">
                                        {profile.qualifications || (
                                            <span className="text-white/30 italic text-sm">Not provided</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" /> Subjects
                                    </label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {profile.subjects && profile.subjects.length > 0 ? (
                                            profile.subjects.map((s: string) => (
                                                <Badge
                                                    key={s}
                                                    variant="outline"
                                                    className="border-white/20 text-white/80"
                                                >
                                                    {s}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-white/30 italic text-sm">Not assigned</span>
                                        )}
                                    </div>
                                </div>
                                {profile.classTeacherOf && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground uppercase tracking-wider">
                                            Class Teacher Of
                                        </label>
                                        <div className="font-medium text-base text-white">
                                            {[
                                                profile.classTeacherOf.classId || profile.classTeacherOf.className,
                                                profile.classTeacherOf.sectionId || profile.classTeacherOf.sectionName,
                                            ]
                                                .filter(Boolean)
                                                .join(" - ")}
                                        </div>
                                    </div>
                                )}
                                {Number(profile.salary) > 0 && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground uppercase tracking-wider">
                                            Monthly Salary
                                        </label>
                                        <div className="font-medium text-base text-white">
                                            ₹{Number(profile.salary).toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Lock className="w-5 h-5" /> Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" asChild className="border-white/10 text-white hover:bg-white/5">
                                <Link href="/teacher/change-password">Change Password</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
