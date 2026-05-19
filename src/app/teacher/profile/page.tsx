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
import { cn } from "@/lib/utils";

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
        <div className="min-h-screen bg-gradient-to-br from-[#070F1E] via-[#0A192F] to-[#0F223D] text-[#E6F1FF] pb-16">
            <div className="max-w-[1200px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 animate-in fade-in duration-200">
                
                {/* Back Link */}
                <div className="flex justify-between items-center">
                    <Link
                        href="/teacher"
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/50 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-emerald-400" /> Back to Dashboard
                    </Link>
                </div>

                {loading ? (
                    <div className="min-h-[40vh] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <span className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></span>
                            <span className="text-white/40 uppercase tracking-widest font-black text-xs">Loading profile...</span>
                        </div>
                    </div>
                ) : !profile ? (
                    <div className="text-center py-16 bg-[#0A192F]/50 border border-white/10 rounded-[2rem] max-w-md mx-auto space-y-4">
                        <p className="text-white/50 font-bold">Profile not found. Please contact the administrator.</p>
                        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
                            <Link href="/teacher">Return Home</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Premium Avatar Header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-[#0F223D] via-[#162A4A] to-[#0A192F] border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row gap-6 items-center justify-between">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                            <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

                            <div className="flex flex-col sm:flex-row gap-6 items-center z-10">
                                {/* Initials Avatar Icon */}
                                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-[#64FFDA] p-[2px] shadow-[0_0_24px_rgba(37,99,235,0.4)] shrink-0 flex items-center justify-center">
                                    <div className="h-full w-full rounded-full bg-[#0A192F] flex items-center justify-center">
                                        <span className="text-2xl font-black text-white font-mono tracking-wider">
                                            {profile.name ? profile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "T"}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-center sm:text-left space-y-2">
                                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase flex items-center gap-1.5 w-max mx-auto sm:mx-0">
                                        {profile.status || "ACTIVE"}
                                    </span>
                                    <h1 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight">
                                        {profile.name || user?.displayName || "Professor"}
                                    </h1>
                                    <p className="text-xs sm:text-sm text-white/60 font-medium">
                                        Faculty Member • ID: <span className="font-mono text-emerald-400 font-bold">{profile.schoolId || profile.teacherId || "—"}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="relative z-10 shrink-0 flex flex-col items-center sm:items-end gap-1.5">
                                <Badge className="bg-[#10B981] text-black font-black text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/10 uppercase tracking-widest">
                                    Teacher Account
                                </Badge>
                                <span className="text-[10px] font-mono text-white/30">Registry Status: Operational</span>
                            </div>
                        </div>

                        {/* Responsive columns layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            
                            {/* Main Details (Col span 2) */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                {/* Contact & Personal Info */}
                                <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-5">
                                    <h3 className="flex items-center gap-2 font-bold text-lg text-white border-b border-white/5 pb-3">
                                        <Phone className="w-5 h-5 text-blue-400" /> Contact & Personal Details
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] sm:text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1">
                                                <Phone className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> Mobile Number
                                            </label>
                                            <div className="font-bold text-white text-base font-mono">
                                                {profile.mobile || <span className="text-white/20 italic font-medium">Not provided</span>}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] sm:text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Age
                                            </label>
                                            <div className="font-bold text-white text-base">
                                                {profile.age ? `${profile.age} years` : <span className="text-white/20 italic font-medium">Not provided</span>}
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2 space-y-1.5">
                                            <label className="text-[10px] sm:text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Address
                                            </label>
                                            <div className="font-bold text-white text-base">
                                                {profile.address || <span className="text-white/20 italic font-medium">Not provided</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Credentials */}
                                <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-5">
                                    <h3 className="flex items-center gap-2 font-bold text-lg text-white border-b border-white/5 pb-3">
                                        <GraduationCap className="w-5 h-5 text-purple-400" /> Academic & Professional Credentials
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] sm:text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1">
                                                Qualifications
                                            </label>
                                            <div className="font-bold text-white text-base">
                                                {profile.qualifications || <span className="text-white/20 italic font-medium">Not provided</span>}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] sm:text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1">
                                                <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Assigned Subjects
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                {profile.subjects && profile.subjects.length > 0 ? (
                                                    profile.subjects.map((s: string) => (
                                                        <Badge
                                                            key={s}
                                                            variant="outline"
                                                            className="bg-purple-500/10 border-purple-500/30 text-purple-300 font-bold text-[10px] rounded-lg px-2.5 py-0.5"
                                                        >
                                                            {s}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-white/20 italic font-medium">No subjects assigned</span>
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
                                                <div className="sm:col-span-2 space-y-3 mt-2 pt-4 border-t border-white/5">
                                                    <label className="text-[10px] sm:text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5 text-emerald-400" /> Class Teacher Directives
                                                    </label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {myClasses.map((cs: any) => (
                                                            <div key={cs.id} className="bg-black/20 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between transition-all group">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black text-white">
                                                                        {classes[cs.classId]?.name || "Class"}
                                                                    </span>
                                                                    <span className="text-[9px] text-white/45 uppercase tracking-widest font-black mt-0.5">
                                                                        Section {sections[cs.sectionId]?.name || "A"}
                                                                    </span>
                                                                </div>
                                                                <Badge className="text-[9px] font-black uppercase border-none bg-emerald-500/20 text-emerald-400">
                                                                    In-charge
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Panels (Col span 1) */}
                            <div className="space-y-6">
                                
                                {/* Registry & Status */}
                                <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                                    <h3 className="flex items-center gap-2 font-bold text-lg text-white border-b border-white/5 pb-3">
                                        <User className="w-5 h-5 text-emerald-400" /> Registry Details
                                    </h3>
                                    
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-white/40 font-bold text-xs uppercase tracking-wider">Registration Status</span>
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-bold text-[10px] px-2.5 py-0.5">
                                                {profile.status || "ACTIVE"}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-white/5">
                                            <span className="text-white/40 font-bold text-xs uppercase tracking-wider">Assigned Role</span>
                                            <span className="font-bold text-white">Faculty (Teacher)</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-white/5">
                                            <span className="text-white/40 font-bold text-xs uppercase tracking-wider">Email Address</span>
                                            <span className="font-bold text-white truncate max-w-[150px] font-mono text-xs">{user?.email || "—"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Action Card */}
                                <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                                    <h3 className="flex items-center gap-2 font-bold text-lg text-white border-b border-white/5 pb-3">
                                        <Lock className="w-5 h-5 text-amber-400" /> Security Controls
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <p className="text-xs text-white/50 leading-relaxed">
                                            Ensure your account remains safe. We recommend changing passwords regularly to maintain data privacy.
                                        </p>
                                        <Button asChild className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase tracking-wider py-5 rounded-2xl transition-all shadow-lg shadow-emerald-500/5">
                                            <Link href="/teacher/change-password">Change Password</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
