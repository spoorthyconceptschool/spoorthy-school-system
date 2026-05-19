"use client";

import { useState } from "react";
import { useStudentData } from "@/context/StudentDataContext";
import { BookOpen, Bell, Calendar, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Megaphone, MapPin, Loader2, ArrowRight, Clock, User, CalendarCheck, Wallet, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentDashboard() {
    const { profile, homework, notices, attendanceStats, ledger, leaves, loading } = useStudentData();
    const router = useRouter();

    // Segment tab control state for mobile view
    const [activeTab, setActiveTab] = useState<'notices' | 'homework'>('notices');

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return "";
        const date = new Date(timestamp.seconds * 1000);
        const now = Date.now();
        const diff = now - date.getTime();

        if (diff < 60 * 1000) return "Just now";
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const getNoticeStyles = (type: string) => {
        switch (type?.toUpperCase()) {
            case "URGENT":
                return {
                    icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
                    border: "border-rose-500/20",
                    bg: "bg-rose-500/10",
                    badgeBg: "bg-rose-500/20",
                    badgeText: "text-rose-400",
                };
            case "HOLIDAY":
                return {
                    icon: <Calendar className="w-4 h-4 text-amber-400" />,
                    border: "border-amber-500/20",
                    bg: "bg-amber-500/10",
                    badgeBg: "bg-amber-500/20",
                    badgeText: "text-amber-400",
                };
            case "EVENT":
                return {
                    icon: <MapPin className="w-4 h-4 text-indigo-400" />,
                    border: "border-indigo-500/20",
                    bg: "bg-indigo-500/10",
                    badgeBg: "bg-indigo-500/20",
                    badgeText: "text-indigo-400",
                };
            case "ACADEMIC":
                return {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
                    border: "border-emerald-500/20",
                    bg: "bg-emerald-500/10",
                    badgeBg: "bg-emerald-500/20",
                    badgeText: "text-emerald-400",
                };
            default:
                return {
                    icon: <Megaphone className="w-4 h-4 text-[#64FFDA]" />,
                    border: "border-[#64FFDA]/20",
                    bg: "bg-[#64FFDA]/10",
                    badgeBg: "bg-[#64FFDA]/20",
                    badgeText: "text-[#64FFDA]",
                };
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-[#64FFDA]">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                    Warming dashboard cache...
                </p>
            </div>
        );
    }

    const studentName = profile?.studentName || profile?.name || "Student";
    const studentClass = `${profile?.className || "Class 7"} (${profile?.sectionName || "B"})`;
    const studentId = profile?.schoolId || profile?.id || "SHS1400";

    // Ledger Dues Calculation
    const ledgerItems = ledger?.items || [];
    const dueAmount = ledgerItems.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

    // Leaves Count
    const pendingLeaves = leaves?.filter((l: any) => l.status?.toUpperCase() === "PENDING")?.length || 0;

    // Limit active notices and homework to exactly 5
    const dashboardNotices = notices.slice(0, 5);
    const dashboardHomework = homework.slice(0, 5);

    return (
        <div className="w-full h-full overflow-y-auto">
            {/* =======================================
                DESKTOP VIEW (>= lg Breakpoint)
                ======================================= */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-6 w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative">
                
                {/* Glowing Blur Decorations */}
                <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-[20%] right-[-5%] w-[35%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

                {/* Welcome Card & Summary Details */}
                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <CardContent className="p-6 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black border-2 border-white/20 shadow-xl shadow-blue-500/20">
                                {studentName.charAt(0)}
                            </div>
                            <div className="text-left space-y-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest font-mono">Student Account</span>
                                <h2 className="text-2xl font-extrabold text-white tracking-tight">{studentName}</h2>
                                <p className="text-xs text-neutral-400">
                                    School ID: <span className="text-emerald-400 font-mono font-bold">{studentId}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Current Class</span>
                                <div className="text-lg font-extrabold text-white mt-0.5">{studentClass}</div>
                            </div>
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 text-xs font-bold rounded-xl select-none">
                                Academic Year {profile?.academicYear || "2025-2026"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI Metrics Widgets Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. Attendance Rate */}
                    <Link href="/student/attendance">
                        <Card className="bg-[#112240]/40 border-white/10 hover:border-emerald-500/30 backdrop-blur-md shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-300">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Attendance Rate</span>
                                    <div className="text-3xl font-black text-emerald-400">{attendanceStats?.percentage || 0}%</div>
                                    <p className="text-[10px] text-neutral-400">{attendanceStats?.present || 0} Present / {attendanceStats?.total || 0} Days</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <CalendarCheck className="w-6 h-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* 2. Outstanding Dues */}
                    <Link href="/student/fees">
                        <Card className="bg-[#112240]/40 border-white/10 hover:border-rose-500/30 backdrop-blur-md shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-300">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Outstanding Dues</span>
                                    <div className={`text-3xl font-black ${dueAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                        ₹{dueAmount.toLocaleString()}
                                    </div>
                                    <p className="text-[10px] text-neutral-400">{dueAmount > 0 ? "Pending Term Fees" : "Dues fully cleared"}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dueAmount > 0 ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>
                                    <Wallet className="w-6 h-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* 3. Leave Balance */}
                    <Link href="/student/leaves">
                        <Card className="bg-[#112240]/40 border-white/10 hover:border-indigo-500/30 backdrop-blur-md shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-300">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Leave Requests</span>
                                    <div className="text-3xl font-black text-indigo-400">{pendingLeaves} Pending</div>
                                    <p className="text-[10px] text-neutral-400">Total applied: {leaves?.length || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* 4. Active Notices count */}
                    <Link href="/student/notices">
                        <Card className="bg-[#112240]/40 border-white/10 hover:border-amber-500/30 backdrop-blur-md shadow-md cursor-pointer transition-all hover:scale-[1.02] duration-300">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Notice Board</span>
                                    <div className="text-3xl font-black text-amber-400">{notices.length} Active</div>
                                    <p className="text-[10px] text-neutral-400">Official Announcements</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <Bell className="w-6 h-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Main 2-Column Responsive Dashboard Content Grid */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Notices Inbox Feed */}
                    <div className="col-span-12 lg:col-span-7 flex flex-col space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-amber-400" />
                                <h3 className="text-base font-extrabold text-white">Important School Notices</h3>
                            </div>
                            <Link href="/student/notices">
                                <Button variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 gap-1 p-0 hover:bg-transparent">
                                    View All Notices <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="bg-[#112240]/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-4">
                            {dashboardNotices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <Bell className="w-10 h-10 text-neutral-600 mb-3" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">No Active Announcements</h4>
                                    <p className="text-xs text-neutral-400 max-w-[240px] mt-1.5 leading-relaxed">
                                        Check back later! You are completely up to date with school events and news.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {dashboardNotices.map((n) => {
                                        const styles = getNoticeStyles(n.type);
                                        return (
                                            <div
                                                key={n.id}
                                                className={`group relative overflow-hidden rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border ${styles.border} transition-all duration-300 p-4 flex gap-4`}
                                            >
                                                <div className={`p-2.5 rounded-xl ${styles.bg} border ${styles.border} shrink-0 h-fit text-[#64FFDA] mt-0.5`}>
                                                    {styles.icon}
                                                </div>
                                                <div className="space-y-1.5 min-w-0 flex-1 text-left">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-blue-400 transition-colors">
                                                            {n.title}
                                                        </h4>
                                                        {n.type && (
                                                            <span className={`text-[8px] px-2 py-0.5 uppercase tracking-widest font-black rounded ${styles.badgeBg} ${styles.badgeText} shrink-0`}>
                                                                {n.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[#8892B0] leading-relaxed whitespace-pre-line">
                                                        {n.content}
                                                    </p>
                                                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-[#8892B0]/50 font-bold">
                                                        <span className="truncate">Publisher: {n.senderName || "Admin Department"}</span>
                                                        <span className="font-mono">{formatTimestamp(n.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Homework Diary ruled lines */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-base font-extrabold text-white">Daily Homework Diary</h3>
                            </div>
                            <Link href="/student/homework">
                                <Button variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 gap-1 p-0 hover:bg-transparent">
                                    Open Full Diary <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="bg-[#112240]/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-4">
                            {dashboardHomework.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <BookOpen className="w-10 h-10 text-neutral-600 mb-3" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">No Homework Assigned</h4>
                                    <p className="text-xs text-neutral-400 max-w-[240px] mt-1.5 leading-relaxed">
                                        Your study diary is empty. Excellent job completing all your academic assignments!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {dashboardHomework.map((hw) => (
                                        <div
                                            key={hw.id}
                                            className="group relative overflow-hidden rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-emerald-500/20 transition-all duration-300 p-4 border-l-4 border-l-emerald-500/80"
                                        >
                                            <div className="space-y-2 min-w-0 flex-1 text-left">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-emerald-400 transition-colors">
                                                        {hw.title}
                                                    </h4>
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black tracking-wider uppercase py-0.5 px-2 shrink-0">
                                                        {hw.subjectId || "General"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-[#8892B0] leading-relaxed whitespace-pre-line line-clamp-3">
                                                    {hw.description}
                                                </p>
                                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-[#8892B0]/50 font-bold">
                                                    <span className="truncate">Teacher: {hw.teacherName || "Subject Faculty"}</span>
                                                    {hw.dueDate && (
                                                        <span className="text-rose-400/90 font-bold flex items-center gap-0.5 shrink-0">
                                                            <Clock className="w-3.5 h-3.5" /> Due: {hw.dueDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* =======================================
                MOBILE VIEW (< lg Breakpoint)
                ======================================= */}
            <div className="max-w-md mx-auto flex lg:hidden flex-col h-[calc(100vh-100px)] space-y-3.5 animate-in fade-in duration-500 pb-3 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] px-2.5">
                
                {/* Glowing blur decorations */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

                {/* 1. COMPACT WELCOME HEADER BANNER */}
                <Card className="bg-white/5 border-white/10 shadow-lg relative overflow-hidden shrink-0 mt-2">
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate">
                            <div className="relative shrink-0 select-none">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black border-2 border-white/20 shadow-lg shadow-blue-500/10">
                                    {studentName.charAt(0)}
                                </div>
                            </div>
                            <div className="text-left space-y-0.5 truncate">
                                <h2 className="text-xs font-black text-white/55 leading-none uppercase tracking-widest">Welcome Back</h2>
                                <h3 className="text-sm font-extrabold text-white truncate leading-tight">{studentName}</h3>
                            </div>
                        </div>
                        <Badge className="text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 shrink-0 select-none">
                            {studentClass}
                        </Badge>
                    </CardContent>
                </Card>

                {/* 2. SEGMENT CONTROL TOGGLER */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full select-none shrink-0">
                    <button
                        onClick={() => setActiveTab('notices')}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            activeTab === 'notices'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Bell className="w-3.5 h-3.5" /> Important Notices
                    </button>
                    <button
                        onClick={() => setActiveTab('homework')}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            activeTab === 'homework'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" /> Homework Diary
                    </button>
                </div>

                {/* 3. DETAILED STREAM CONTENT WIDGETS */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#112240]/40 border border-white/10 backdrop-blur-md rounded-2xl relative p-3">
                    <AnimatePresence mode="wait">
                        {activeTab === 'homework' ? (
                            <motion.div
                                key="homework-feed"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col h-full min-h-0"
                            >
                                <div className="flex justify-between items-center mb-2 shrink-0 px-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Assigned Homework (Last 5)</span>
                                    <Link href="/student/homework" className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-0.5">
                                        Full Diary <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5 min-h-0">
                                    {dashboardHomework.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                                            <BookOpen className="w-8 h-8 text-neutral-600 mb-2" />
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Diary is Empty</p>
                                            <p className="text-[9px] text-neutral-600 font-medium mt-0.5">No tasks assigned for today.</p>
                                        </div>
                                    ) : (
                                        dashboardHomework.map((hw) => (
                                            <div
                                                key={hw.id}
                                                className="group relative overflow-hidden rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-emerald-500/20 transition-all duration-300 p-3 flex gap-3 border-l-3 border-l-emerald-500/80"
                                            >
                                                <div className="space-y-1.5 min-w-0 flex-1 text-left">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-extrabold text-white text-xs tracking-tight truncate">
                                                            {hw.title}
                                                        </h4>
                                                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-black tracking-wider uppercase py-0 px-1.5 shrink-0">
                                                            {hw.subjectId || "General"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] text-[#8892B0] line-clamp-2 leading-relaxed">
                                                        {hw.description}
                                                    </p>
                                                    <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[8px] text-[#8892B0]/50 font-bold">
                                                        <span className="truncate">By: {hw.teacherName || "Subject Teacher"}</span>
                                                        {hw.dueDate && (
                                                            <span className="text-rose-400/90 font-bold flex items-center gap-0.5">
                                                                <Clock className="w-2.5 h-2.5" /> Due: {hw.dueDate}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="notices-feed"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col h-full min-h-0"
                            >
                                <div className="flex justify-between items-center mb-2 shrink-0 px-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Notices (Last 5)</span>
                                    <Link href="/student/notices" className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-0.5">
                                        Inbox <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5 min-h-0">
                                    {dashboardNotices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                                            <Bell className="w-8 h-8 text-neutral-600 mb-2" />
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Inbox is Empty</p>
                                            <p className="text-[9px] text-neutral-600 font-medium mt-0.5">No announcements posted.</p>
                                        </div>
                                    ) : (
                                        dashboardNotices.map((n) => {
                                            const styles = getNoticeStyles(n.type);
                                            return (
                                                <div
                                                    key={n.id}
                                                    className={`group relative overflow-hidden rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border ${styles.border} transition-all duration-300 p-3 flex gap-3`}
                                                >
                                                    <div className={`p-2 rounded-lg ${styles.bg} border ${styles.border} shrink-0 h-fit text-[#64FFDA] mt-0.5`}>
                                                        {styles.icon}
                                                    </div>
                                                    <div className="space-y-1.5 min-w-0 flex-1 text-left">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h4 className="font-extrabold text-white text-xs tracking-tight truncate">
                                                                {n.title}
                                                            </h4>
                                                            {n.type && (
                                                                <span className={`text-[7px] px-1.5 py-0 uppercase tracking-widest font-black rounded ${styles.badgeBg} ${styles.badgeText} shrink-0`}>
                                                                    {n.type}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-[#8892B0] line-clamp-2 leading-relaxed">
                                                            {n.content}
                                                        </p>
                                                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[8px] text-[#8892B0]/50 font-bold">
                                                            <span className="truncate">Sender: {n.senderName || "Admin"}</span>
                                                            <span className="font-mono">{formatTimestamp(n.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 4. VIEW ALL ROUTING ACTION FOOTER */}
                <div className="shrink-0 flex items-center justify-between px-1.5 py-1 text-neutral-400 text-[10px] font-medium bg-white/5 border border-white/10 rounded-xl select-none mb-2">
                    <span>App Version 2.4.0</span>
                    <Link href="/student/notices" className="text-blue-400 font-bold flex items-center gap-0.5 hover:underline">
                        View All Notices <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
