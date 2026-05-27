"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, User, Phone, MapPin, Shield, Camera, Info, GraduationCap, Contact, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";
import { useStudentData } from "@/context/StudentDataContext";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentProfilePage() {
    const { user } = useAuth();
    const { classes = {}, villages = {}, sections = {} } = useMasterData() || {};
    const { profile = {}, loading = false } = useStudentData() || {};

    // Mobile tabs switcher state
    const [activeTab, setActiveTab] = useState<'academic' | 'contact'>('academic');

    if (loading && (!profile || !profile.id)) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Safety fallback variables to ensure absolute crash-proofing
    const studentName = profile?.studentName || profile?.name || user?.displayName || "Student";
    const studentId = profile?.schoolId || profile?.id || "SHS1400";
    
    // Class display safety mapping
    const mappedClass = classes?.[profile?.classId]?.name || profile?.className || "Class";
    const mappedSection = sections?.[profile?.sectionId]?.name || profile?.sectionName || "";
    const studentClass = mappedSection ? `${mappedClass} (${mappedSection})` : mappedClass;
    
    const dob = profile?.dateOfBirth || "Not Specified";
    const gender = profile?.gender || "Not Specified";
    const transport = profile?.transportRequired ? "Opted (Route Assigned)" : "Not Required";
    const parentMobile = profile?.parentMobile || profile?.phone || "Not Specified";
    const parentName = profile?.parentName || profile?.fatherName || "Not Specified";
    
    // Location safety mapping
    const villageName = villages?.[profile?.villageId]?.name || profile?.villageName || profile?.city || "Not Specified";
    const academicYear = profile?.academicYear || "2025-2026";
    const admissionNo = profile?.admissionNo || profile?.rollNo || "Not Specified";

    return (
        <div className="w-full h-full overflow-y-auto">
            {/* =======================================
                DESKTOP FULL RESPONSIVE GRID (>= lg)
                ======================================= */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-6 w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative">
                
                {/* Glowing Accents */}
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-purple-500/5 rounded-full blur-[90px] pointer-events-none" />

                {/* Top header row */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10 select-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black font-display text-white tracking-tight">Student Profile Portal</h1>
                            <p className="text-xs text-neutral-400 font-medium font-sans">Verify your registered details and credentials in our database.</p>
                        </div>
                    </div>

                    <Link href="/student">
                        <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white gap-2 rounded-xl font-bold font-sans">
                            <ArrowLeft className="w-4 h-4" /> Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Desktop Grid Layout */}
                <div className="grid grid-cols-3 gap-6 relative z-10 items-start">
                    
                    {/* Left Panel: Profile Hero & Quick Stats */}
                    <div className="col-span-1 space-y-6">
                        
                        {/* Profile Card */}
                        <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-xl overflow-hidden rounded-3xl">
                            <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-600 relative opacity-85" />
                            <CardContent className="pt-0 px-6 pb-6 text-center relative">
                                
                                {/* Photo Avatar */}
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black border-4 border-[#0a192f] shadow-xl mx-auto -mt-10 select-none font-display">
                                    {studentName.charAt(0)}
                                </div>

                                <div className="mt-4 space-y-1">
                                    <h2 className="text-xl font-black font-display text-white leading-tight">{studentName}</h2>
                                    <p className="text-xs font-mono font-black text-blue-400">{studentId}</p>
                                    <Badge className="mt-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 font-extrabold text-[10px] tracking-wide uppercase px-3 py-0.5 rounded-full">
                                        {studentClass}
                                    </Badge>
                                </div>

                                {/* Divider line */}
                                <div className="h-px bg-white/5 my-5" />

                                <div className="grid grid-cols-2 gap-3 text-left select-none">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black uppercase text-blue-200/50 tracking-wider font-sans">Academic Year</span>
                                        <p className="text-sm font-extrabold text-white">{academicYear}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black uppercase text-blue-200/50 tracking-wider font-sans">Admission No</span>
                                        <p className="text-sm font-extrabold text-white">{admissionNo}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Note Module */}
                        <Card className="bg-white/[0.02] border-white/5 p-4 rounded-3xl flex items-start gap-3 shadow-inner select-none">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <Info className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-left space-y-0.5">
                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider font-display">Data Verification</h4>
                                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans font-medium">
                                    All details above represent official records registered during admission. If any corrections are needed, please contact the school administration desk.
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Right Panel: Complete Details Grid (Spans 2 cols) */}
                    <div className="col-span-2 space-y-6">
                        
                        <div className="grid grid-cols-2 gap-6">
                            
                            {/* Academic Details Card */}
                            <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-xl rounded-3xl">
                                <CardHeader className="pb-3 border-b border-white/5 select-none">
                                    <CardTitle className="text-sm font-black font-display text-white flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-blue-400" />
                                        Academic Profile
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-1 gap-4 text-left">
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Date of Birth</label>
                                        <span className="text-sm font-extrabold text-white font-mono block">{dob}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Gender Profile</label>
                                        <span className="text-sm font-extrabold text-white capitalize block">{gender}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Registered Class</label>
                                        <span className="text-sm font-extrabold text-white block">{mappedClass}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Assigned Section</label>
                                        <span className="text-sm font-extrabold text-white block">{mappedSection || "None"}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contact Details Card */}
                            <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-xl rounded-3xl">
                                <CardHeader className="pb-3 border-b border-white/5 select-none">
                                    <CardTitle className="text-sm font-black font-display text-white flex items-center gap-2">
                                        <Contact className="w-5 h-5 text-purple-400" />
                                        Contact & Guardian
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-1 gap-4 text-left">
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Parent / Guardian Name</label>
                                        <span className="text-sm font-extrabold text-white block">{parentName}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Emergency Contact</label>
                                        <span className="text-sm font-extrabold text-emerald-400 font-mono block">{parentMobile}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">Village / Region</label>
                                        <span className="text-sm font-extrabold text-white block">{villageName}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-black text-blue-200/70 uppercase tracking-widest block font-sans">School Transport Status</label>
                                        <span className="text-sm font-extrabold text-white block">{transport}</span>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Security & Credentials Card */}
                        <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-xl rounded-3xl">
                            <CardHeader className="p-6 border-b border-white/5 flex flex-row justify-between items-center select-none">
                                <div className="space-y-1">
                                    <CardTitle className="text-sm font-black font-display text-white flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-emerald-400" />
                                        Portal Credentials & Security
                                    </CardTitle>
                                </div>
                                <Button asChild className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-10 rounded-xl px-5 text-xs transition-all shadow-inner font-sans">
                                    <Link href="/student/change-password">
                                        <Lock className="w-3.5 h-3.5 mr-2 text-blue-400" /> Change Security Password
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-xs text-neutral-400 leading-relaxed font-sans font-medium text-left">
                                    Your portal login credentials are encrypted and secure. To ensure standard cyber safety, we highly recommend changing your password every term.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>

            {/* =======================================
                MOBILE COMPACT TABBED VIEW (< lg)
                ======================================= */}
            <div className="max-w-md mx-auto lg:hidden flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-500 pb-4 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] px-2.5">
                
                {/* Soft Glowing Blur Accents */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Title / Header */}
                <div className="flex items-center justify-between px-1 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-extrabold text-white">My Profile</h1>
                            <p className="text-[10px] text-neutral-400">View and manage your registered details.</p>
                        </div>
                    </div>

                    <Link href="/student" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/10 transition-all shadow">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>

                {/* Avatar Hero Card */}
                <Card className="bg-white/5 border-white/10 shadow-lg relative overflow-hidden shrink-0">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="relative shrink-0 select-none">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white/20 shadow-lg shadow-blue-500/10">
                                {studentName.charAt(0)}
                            </div>
                        </div>

                        <div className="text-left space-y-1 truncate">
                            <h2 className="text-sm font-extrabold text-white truncate">{studentName}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider">{studentId}</span>
                                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                <Badge className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.2 shrink-0 select-none">
                                    {studentClass}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Segment Toggler */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full select-none shrink-0">
                    <button
                        onClick={() => setActiveTab('academic')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            activeTab === 'academic'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <GraduationCap className="w-3.5 h-3.5" /> Academic Details
                    </button>
                    <button
                        onClick={() => setActiveTab('contact')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            activeTab === 'contact'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Contact className="w-3.5 h-3.5" /> Contact & Security
                    </button>
                </div>

                {/* Info Cards Container */}
                <div className="flex-1 flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                        {activeTab === 'academic' ? (
                            <motion.div
                                key="academic-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3.5 flex-1 flex flex-col"
                            >
                                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg flex-1 flex flex-col overflow-hidden">
                                    <CardHeader className="pb-2 p-4 shrink-0">
                                        <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <GraduationCap className="w-4 h-4 text-blue-400" /> Academic Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4 p-4 text-left overflow-y-auto max-h-[220px]">
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Full Name</label>
                                            <div className="text-xs font-bold text-white truncate">{studentName}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Student ID</label>
                                            <div className="text-xs font-bold text-emerald-400 font-mono tracking-wider">{studentId}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Class & Section</label>
                                            <div className="text-xs font-bold text-white truncate">{studentClass}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Date of Birth</label>
                                            <div className="text-xs font-bold text-white font-mono">{dob}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Gender</label>
                                            <div className="text-xs font-bold text-white capitalize">{gender}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Transport</label>
                                            <div className="text-xs font-bold text-white truncate">{transport}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/[0.02] border-white/5 p-3 rounded-2xl flex items-start gap-2.5 shadow-inner shrink-0">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                        <Info className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <h4 className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest leading-none">Profile Note</h4>
                                        <p className="text-[8px] text-neutral-400 font-medium leading-normal">
                                            For corrections, please contact administration.
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="contact-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3.5 flex-1 flex flex-col"
                            >
                                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg flex-1 flex flex-col overflow-hidden">
                                    <CardHeader className="pb-2 p-4 shrink-0">
                                        <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Contact className="w-4 h-4 text-purple-400" /> Contact & Location
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3 text-left overflow-y-auto max-h-[220px]">
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="space-y-0.5 truncate">
                                                <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Mobile Number</label>
                                                <div className="text-xs font-bold text-white font-mono">{parentMobile}</div>
                                            </div>
                                            <a href={`tel:${parentMobile}`} className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow">
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="space-y-0.5 truncate">
                                                <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Parent / Guardian</label>
                                                <div className="text-xs font-bold text-white truncate">{parentName}</div>
                                            </div>
                                            <a href={`tel:${parentMobile}`} className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow">
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="space-y-0.5 truncate">
                                                <label className="text-[10px] font-bold text-blue-200/70 uppercase tracking-widest block">Village / Region</label>
                                                <div className="text-xs font-bold text-white truncate">{villageName}</div>
                                            </div>
                                            <button className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500 hover:text-white transition-all shadow">
                                                <MapPin className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg shrink-0">
                                    <CardContent className="p-4 py-3">
                                        <Button asChild className="w-full bg-white/5 border border-white/10 text-white font-bold h-10 rounded-xl flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all shadow-inner">
                                            <Link href="/student/change-password">
                                                <Lock className="w-3.5 h-3.5 text-blue-400" /> Change Security Password
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
