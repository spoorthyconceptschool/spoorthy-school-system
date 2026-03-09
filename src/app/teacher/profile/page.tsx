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
    Users,
} from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";

/**
 * TeacherProfilePage Component
 * 
 * Displays the comprehensive profile of the currently authenticated teacher.
 * Fetches core profile data from Firestore and dynamically derives "Class Teacher"
 * assignments from the Realtime Database master registry for live accuracy.
 * 
 * @returns {JSX.Element} The rendered teacher profile view.
 */
export default function TeacherProfilePage() {
    const { user, userData } = useAuth();
    const { classSections, classes, sections } = useMasterData();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData?.schoolId) {
            fetchProfile(userData.schoolId);
        } else if (user) {
            // Fallback for cases where userData isn't fully ready yet but user is
            setLoading(true);
        }
    }, [user, userData]);

    const fetchProfile = async (schoolId: string) => {
        try {
            const teacherRef = doc(db, "teachers", schoolId);
            const teacherSnap = await getDoc(teacherRef);

            if (teacherSnap.exists()) {
                const data = teacherSnap.data();
                setProfile({ ...data, schoolId: data.schoolId || teacherSnap.id });
            } else {
                // Final fallback
                const q = query(collection(db, "teachers"), where("uid", "==", user?.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    setProfile({ ...data, schoolId: data.schoolId || snap.docs[0].id });
                }
            }
        } catch (error: any) {
            console.warn("[Profile] Error fetching teacher profile:", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto p-6 md:p-10 lg:p-12 space-y-6 animate-in fade-in">
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
                                {(() => {
                                    const teacherId = profile.schoolId || profile.id;
                                    const myClasses = Object.values(classSections || {}).filter((cs: any) =>
                                        cs.classTeacherId === teacherId && cs.isActive !== false
                                    );

                                    if (myClasses.length === 0) return null;

                                    return (
                                        <div className="col-span-2 space-y-2 mt-4 pt-4 border-t border-white/5">
                                            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                <Users className="w-3 h-3" /> Class Teacher Of
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {myClasses.map((cs: any) => (
                                                    <div key={cs.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-white">
                                                                {classes[cs.classId]?.name || "Class"}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                                                Section {sections[cs.sectionId]?.name || "A"}
                                                            </span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                                                            In-charge
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
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
