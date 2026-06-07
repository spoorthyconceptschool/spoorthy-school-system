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
const DEFAULT_PROFILE = {
    name: "Prof. S. Praneeth",
    schoolId: "TCH-2026-042",
    teacherId: "TCH-2026-042",
    status: "ACTIVE",
    mobile: "+91 98765 43210",
    age: "34",
    address: "Plot 104, Spoorthy Campus Road, Vijayawada, AP",
    qualifications: "M.Sc. Mathematics, B.Ed. (Gold Medalist)",
    experience: "12 Years in Secondary Education",
    joiningDate: "12-06-2018",
    gender: "MALE",
    bloodGroup: "O+VE",
    email: "praneeth.maths@spoorthyschool.edu.in",
    emergencyContact: "+91 98765 43211",
    schoolName: "Spoorthy High School"
};

export default function TeacherProfilePage() {
    const { user, userData } = useAuth();
    const [activeTab, setActiveTab] = useState("PERSONAL");

    const { classSections, classes, sections, subjectTeachers, subjects } = useMasterData();
    const [profile, setProfile] = useState<any>(() => {
        if (typeof window === 'undefined') return DEFAULT_PROFILE;
        const cached = localStorage.getItem("teacher_profile_cache");
        return cached ? JSON.parse(cached) : DEFAULT_PROFILE;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userData?.schoolId) {
            fetchProfile(userData.schoolId);
        }
    }, [user, userData]);

    const fetchProfile = async (schoolId: string) => {
        try {
            const teacherRef = doc(db, "teachers", schoolId);
            const teacherSnap = await getDoc(teacherRef);

            if (teacherSnap.exists()) {
                const data = teacherSnap.data();
                const pObj = { ...data, schoolId: data.schoolId || teacherSnap.id };
                setProfile(pObj);
                if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(pObj));
            } else {
                // Final fallback
                const q = query(collection(db, "teachers"), where("uid", "==", user?.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    const pObj = { ...data, schoolId: data.schoolId || snap.docs[0].id };
                    setProfile(pObj);
                    if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(pObj));
                }
            }
        } catch (error: any) {
            console.warn("[Profile] Error fetching teacher profile:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const getTeachingAssignments = () => {
        if (!profile || !subjectTeachers || !classSections) return [];
        const tId = profile.schoolId || profile.teacherId || profile.id;
        
        const groups: Record<string, {
            subjectId: string;
            subjectName: string;
            classes: {
                classId: string;
                sectionId: string;
                className: string;
                sectionName: string;
                key: string;
            }[];
        }> = {};

        Object.keys(subjectTeachers).forEach(classSectionId => {
            const subjectsObj = subjectTeachers[classSectionId] || {};
            Object.keys(subjectsObj).forEach(subId => {
                if (subjectsObj[subId] === tId) {
                    const cs = classSections[classSectionId];
                    if (!cs || cs.isActive === false) return;
                    
                    const cId = cs.classId;
                    const sId = cs.sectionId;
                    const cName = classes?.[cId]?.name || cId;
                    const sName = sections?.[sId]?.name || sId;
                    const subName = subjects?.[subId]?.name || subId;

                    if (!groups[subId]) {
                        groups[subId] = {
                            subjectId: subId,
                            subjectName: subName,
                            classes: []
                        };
                    }

                    const exists = groups[subId].classes.some(c => c.key === classSectionId);
                    if (!exists) {
                        groups[subId].classes.push({
                            classId: cId,
                            sectionId: sId,
                            className: cName,
                            sectionName: sName,
                            key: classSectionId
                        });
                    }
                }
            });
        });

        return Object.values(groups).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    };

    const teachingAssignments = getTeachingAssignments();

    return (
        <div className="min-h-screen bg-transparent text-[#E6F1FF] pb-16">
            <div className="max-w-[1200px] mx-auto p-2 sm:p-6 md:p-8 lg:p-10 space-y-4 animate-in fade-in duration-200">
                
                {/* Back Link */}
                <div className="flex justify-between items-center">
                    <Link
                        href="/teacher"
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/50 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-emerald-400" /> Back to Dashboard
                    </Link>
                </div>

                {!profile ? (
                    <div className="text-center py-16 bg-[#0A192F]/50 border border-white/10 rounded-[2rem] max-w-md mx-auto space-y-4">
                        <p className="text-white/50 font-bold">Profile not found. Please contact the administrator.</p>
                        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
                            <Link href="/teacher">Return Home</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Premium Avatar Header (Compressed for Mobile) */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-[#0F223D] via-[#162A4A] to-[#0A192F] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl flex gap-4 items-center justify-between">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>

                            <div className="flex gap-4 items-center z-10 min-w-0">
                                {/* Initials Avatar Icon */}
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-[#64FFDA] p-[2px] shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0 flex items-center justify-center">
                                    <div className="h-full w-full rounded-full bg-[#0A192F] flex items-center justify-center">
                                        <span className="text-lg sm:text-xl font-black text-white font-mono tracking-wider">
                                            {profile.name ? profile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "T"}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-lg sm:text-xl font-display font-black text-white leading-none truncate">
                                            {profile.name || user?.displayName || "Professor"}
                                        </h1>
                                        <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md uppercase hidden sm:block">
                                            {profile.status || "ACTIVE"}
                                        </span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-white/60 font-medium truncate">
                                        Faculty Member • ID: <span className="font-mono text-emerald-400 font-bold">{profile.schoolId || profile.teacherId || "—"}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="relative z-10 shrink-0 flex flex-col items-end gap-1">
                                <Badge className="bg-[#10B981] text-black font-black text-[9px] sm:text-[10px] px-2 py-1 rounded-lg shadow-md shadow-emerald-500/10 uppercase tracking-wider">
                                    Teacher A/C
                                </Badge>
                                <span className="text-[8px] font-mono text-white/30 hidden sm:block">Registry: Operational</span>
                            </div>
                        </div>

                        {/* Mobile-Friendly Horizontal Tab Navigation */}
                        <div className="flex justify-between sm:justify-start overflow-x-auto hide-scrollbar gap-1 py-1 border-b border-white/10 scroll-smooth">
                            <button 
                                onClick={() => setActiveTab("PERSONAL")}
                                className={cn(
                                    "px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg font-black text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
                                    activeTab === "PERSONAL" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-black/20 text-white/50 border border-transparent hover:bg-white/5 hover:text-white/80"
                                )}
                            >
                                <Phone className="hidden sm:block sm:w-4 sm:h-4" /> Personal
                            </button>
                            <button 
                                onClick={() => setActiveTab("ACADEMIC")}
                                className={cn(
                                    "px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg font-black text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
                                    activeTab === "ACADEMIC" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "bg-black/20 text-white/50 border border-transparent hover:bg-white/5 hover:text-white/80"
                                )}
                            >
                                <GraduationCap className="hidden sm:block sm:w-4 sm:h-4" /> Academic
                            </button>
                            <button 
                                onClick={() => setActiveTab("ASSIGNMENTS")}
                                className={cn(
                                    "px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg font-black text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
                                    activeTab === "ASSIGNMENTS" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-black/20 text-white/50 border border-transparent hover:bg-white/5 hover:text-white/80"
                                )}
                            >
                                <BookOpen className="hidden sm:block sm:w-4 sm:h-4" /> Assignments
                            </button>
                            <button 
                                onClick={() => setActiveTab("SECURITY")}
                                className={cn(
                                    "px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg font-black text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none",
                                    activeTab === "SECURITY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-black/20 text-white/50 border border-transparent hover:bg-white/5 hover:text-white/80"
                                )}
                            >
                                <Lock className="hidden sm:block sm:w-4 sm:h-4" /> Security
                            </button>
                        </div>

                        {/* Tab Content Rendering */}
                        <div className="space-y-4">
                            
                            {/* TAB: PERSONAL */}
                            {activeTab === "PERSONAL" && (
                                <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur-md shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="flex items-center gap-2 font-bold text-base text-white border-b border-white/5 pb-2">
                                        <Phone className="w-4 h-4 text-blue-400" /> Contact & Personal Details
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            )}

                            {/* TAB: ACADEMIC */}
                            {activeTab === "ACADEMIC" && (
                                <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur-md shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="flex items-center gap-2 font-bold text-base text-white border-b border-white/5 pb-2">
                                        <GraduationCap className="w-4 h-4 text-purple-400" /> Academic & Professional Credentials
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            )}

                            {/* TAB: ASSIGNMENTS */}
                            {activeTab === "ASSIGNMENTS" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {teachingAssignments.length > 0 ? (
                                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur-md shadow-xl space-y-3">
                                            <h3 className="flex items-center gap-2 font-bold text-base text-amber-400 border-b border-white/5 pb-2">
                                                <GraduationCap className="w-4 h-4" /> Teaching Assignments
                                            </h3>
                                            <div className="space-y-2">
                                                {teachingAssignments.map(ta => (
                                                    <div key={ta.subjectId} className="bg-black/20 border border-white/5 rounded-xl p-2.5 sm:p-4 space-y-2.5 hover:border-amber-500/20 transition-all group">
                                                        <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <BookOpen className="w-4 h-4 text-amber-400" />
                                                                <span className="font-bold text-white/95 text-sm">{ta.subjectName}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            {ta.classes.map(cls => (
                                                                <div
                                                                    key={cls.key}
                                                                    className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-white/5 bg-black/20 text-[10px] sm:text-xs font-bold min-w-[90px]"
                                                                >
                                                                    <span className="text-white/80 truncate">{cls.className} - {cls.sectionName}</span>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0 ml-2" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-[#0A192F]/50 border border-white/10 rounded-[2rem]">
                                            <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-3" />
                                            <p className="text-white/50 font-bold text-sm">No teaching assignments found.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: SECURITY */}
                            {activeTab === "SECURITY" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Registry & Status */}
                                    <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur-md shadow-xl space-y-3">
                                        <h3 className="flex items-center gap-2 font-bold text-base text-white border-b border-white/5 pb-2">
                                            <User className="w-4 h-4 text-emerald-400" /> Registry Details
                                        </h3>
                                        
                                        <div className="space-y-2.5 text-sm">
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
                                    <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur-md shadow-xl space-y-3">
                                        <h3 className="flex items-center gap-2 font-bold text-base text-white border-b border-white/5 pb-2">
                                            <Lock className="w-4 h-4 text-amber-400" /> Security Controls
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            <p className="text-xs text-white/50 leading-relaxed">
                                                Ensure your account remains safe. We recommend changing passwords regularly to maintain data privacy.
                                            </p>
                                            <Button asChild className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase tracking-wider py-5 rounded-2xl transition-all shadow-lg shadow-emerald-500/5 mt-4">
                                                <Link href="/teacher/change-password">Change Password</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
