"use client";

import { useState } from "react";
import { useStudentData } from "@/context/StudentDataContext";
import { 
    BookOpen, Bell, Calendar, ChevronRight, AlertTriangle, Megaphone, 
    MapPin, Loader2, ArrowRight, Clock, CalendarCheck, Wallet, 
    FileText, ArrowUpRight, User, Sparkles, GraduationCap, CheckCircle2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentDashboard() {
    const { profile, homework, notices, attendanceStats, ledger, leaves, schedule, teacherMap, loading } = useStudentData();
    const router = useRouter();

    // Segment tab control state for mobile and desktop dashboards
    const [activeTab, setActiveTab] = useState<'notices' | 'homework'>('notices');

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return "";
        const date = new Date(timestamp.seconds * 1000);
        const now = Date.now();
        const diff = now - date.getTime();

        if (diff < 60 * 1000) return "Just now";
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const getNoticeStyles = (type: string) => {
        switch (type?.toUpperCase()) {
            case "URGENT":
                return {
                    icon: <AlertTriangle className="w-4 h-4 text-rose-450" />,
                    border: "border-rose-500/20 hover:border-rose-500/40",
                    bg: "bg-rose-500/10",
                    badgeBg: "bg-rose-500/20",
                    badgeText: "text-rose-400",
                    iconColor: "text-rose-450",
                    glow: "shadow-rose-500/5",
                };
            case "HOLIDAY":
                return {
                    icon: <Calendar className="w-4 h-4 text-amber-450" />,
                    border: "border-amber-500/20 hover:border-amber-500/40",
                    bg: "bg-amber-500/10",
                    badgeBg: "bg-amber-500/20",
                    badgeText: "text-amber-400",
                    iconColor: "text-amber-450",
                    glow: "shadow-amber-500/5",
                };
            case "EVENT":
                return {
                    icon: <MapPin className="w-4 h-4 text-indigo-450" />,
                    border: "border-indigo-500/20 hover:border-indigo-500/40",
                    bg: "bg-indigo-500/10",
                    badgeBg: "bg-indigo-500/20",
                    badgeText: "text-indigo-400",
                    iconColor: "text-indigo-450",
                    glow: "shadow-indigo-500/5",
                };
            case "ACADEMIC":
                return {
                    icon: <CalendarCheck className="w-4 h-4 text-emerald-455" />,
                    border: "border-emerald-500/20 hover:border-emerald-500/40",
                    bg: "bg-emerald-500/10",
                    badgeBg: "bg-emerald-500/20",
                    badgeText: "text-emerald-400",
                    iconColor: "text-emerald-455",
                    glow: "shadow-emerald-500/5",
                };
            default:
                return {
                    icon: <Megaphone className="w-4 h-4 text-sky-450" />,
                    border: "border-sky-500/20 hover:border-sky-500/40",
                    bg: "bg-sky-500/10",
                    badgeBg: "bg-sky-500/20",
                    badgeText: "text-sky-400",
                    iconColor: "text-sky-450",
                    glow: "shadow-sky-500/5",
                };
        }
    };

    const getGreeting = () => {
        const hrs = new Date().getHours();
        if (hrs >= 5 && hrs < 12) return { text: "Good Morning", sub: "Ready for an exciting day of learning and growth?", icon: "🌅" };
        if (hrs >= 12 && hrs < 17) return { text: "Good Afternoon", sub: "Keep up the excellent momentum and stay inspired!", icon: "☀️" };
        if (hrs >= 17 && hrs < 22) return { text: "Good Evening", sub: "Review your diary, complete assignments, and relax!", icon: "🌇" };
        return { text: "Good Night", sub: "Time to rest well and recharge for another bright tomorrow.", icon: "🌙" };
    };

    if (loading) {
        return (
            <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-blue-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                    Warming dashboard cache...
                </p>
            </div>
        );
    }

    const studentName = profile?.studentName || profile?.name || "Student";
    const studentClass = `${profile?.className || "Class 7"} (${profile?.sectionName || "A"})`;
    const studentId = profile?.schoolId || profile?.id || "SHS1400";
    const greeting = getGreeting();

    // Ledger Dues Calculation
    const ledgerItems = ledger?.items || [];
    const dueAmount = ledgerItems.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

    // Leaves Count
    const pendingLeaves = leaves?.filter((l: any) => l.status?.toUpperCase() === "PENDING")?.length || 0;

    // Limit active notices and homework to exactly 5
    const dashboardNotices = notices.slice(0, 5);
    const dashboardHomework = homework.slice(0, 5);

    // Today's Timetable slots
    const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayDayName = DAYS[new Date().getDay()];
    const PERIOD_TIMINGS: Record<number, string> = {
        1: "08:30 - 09:20",
        2: "09:20 - 10:10",
        3: "10:10 - 11:00",
        4: "11:15 - 12:05",
        5: "12:05 - 12:50",
        6: "01:30 - 02:15",
        7: "02:15 - 03:00",
        8: "03:00 - 03:45"
    };

    const todaySlots = (() => {
        if (!schedule || !todayDayName || todayDayName === "SUNDAY") return [];
        const rawDay = schedule[todayDayName] || {};
        const slots = [];
        for (let i = 1; i <= 8; i++) {
            const base = rawDay[i];
            if (!base) continue;
            slots.push({
                id: i,
                timing: PERIOD_TIMINGS[i] || "TBD",
                subject: base.subjectId || base.subject || "General Study",
                teacher: base.teacherName || teacherMap?.[base.teacherId] || "Faculty"
            });
        }
        return slots;
    })();

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 relative bg-transparent select-none pb-12">
            
            {/* Glowing Accent Blur Orbs */}
            <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] right-[-5%] w-[45%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

            {/* =======================================
                1. WELCOME HEADER CARD (Adaptive Layout)
                ======================================= */}
            <Card className="bg-[#112240]/25 border-white/[0.05] backdrop-blur-md shadow-2xl relative overflow-hidden rounded-2xl group border">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Visual Accent top border bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <CardContent className="p-5 sm:p-6 md:p-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 text-left">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black border border-white/20 shadow-xl shadow-blue-500/25 shrink-0 transform group-hover:scale-105 transition-transform duration-300 relative">
                            {studentName.charAt(0)}
                            <span className="absolute bottom-[-2px] right-[-2px] w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#112240] animate-pulse" />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 animate-spin duration-3000" /> Student Portal
                                </span>
                                <Badge className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
                                    Active Student
                                </Badge>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight truncate">
                                {greeting.icon} {greeting.text}, {studentName}
                            </h2>
                            <p className="text-xs text-white/50 leading-relaxed max-w-xl">
                                {greeting.sub}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t border-white/5 pt-4 md:pt-0 md:border-t-0 gap-3">
                        <div className="text-left md:text-right space-y-0.5">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block font-mono">Current Grade</span>
                            <div className="text-base font-black text-white flex items-center gap-1.5 justify-start md:justify-end">
                                <GraduationCap className="w-4 h-4 text-blue-400" />
                                {studentClass}
                            </div>
                        </div>
                        <div className="text-left md:text-right space-y-1">
                            <div className="text-[10px] text-white/40 font-mono">
                                ID: <span className="text-emerald-400 font-bold">{studentId}</span>
                            </div>
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 text-[9px] font-bold rounded-lg shadow-sm">
                                AY: {profile?.academicYear || "2025-2026"}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* =======================================
                2. KPI METRICS GRID (Responsive 2x2 to 4x1)
                ======================================= */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 select-none">
                
                {/* Metric 1: Attendance Rate */}
                <Link href="/student/attendance">
                    <Card className="bg-[#112240]/25 border-white/[0.05] hover:border-emerald-500/35 backdrop-blur-md shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.02] group h-full relative overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-4 flex flex-col justify-between h-full gap-3 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">Attendance</span>
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                    <CalendarCheck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tight">{attendanceStats?.percentage || 0}%</div>
                                <div className="text-[10px] text-white/40 font-medium truncate flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-450" />
                                    {attendanceStats?.present || 0} / {attendanceStats?.total || 0} Present Days
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Metric 2: Outstanding Dues */}
                <Link href="/student/fees">
                    <Card className="bg-[#112240]/25 border-white/[0.05] hover:border-rose-500/35 backdrop-blur-md shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.02] group h-full relative overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/0 via-rose-500/0 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-4 flex flex-col justify-between h-full gap-3 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">Outstanding Dues</span>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${dueAmount > 0 ? "bg-rose-500/10 border border-rose-500/20 text-rose-450" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>
                                    <Wallet className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className={`text-2xl md:text-3xl font-black tracking-tight ${dueAmount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                                    ₹{dueAmount.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-white/40 font-medium truncate flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${dueAmount > 0 ? "bg-rose-400" : "bg-emerald-400"}`} />
                                    {dueAmount > 0 ? "Term Fees Due" : "Ledger Fully Cleared"}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Metric 3: Leave Balance */}
                <Link href="/student/leaves">
                    <Card className="bg-[#112240]/25 border-white/[0.05] hover:border-indigo-500/35 backdrop-blur-md shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.02] group h-full relative overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-4 flex flex-col justify-between h-full gap-3 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">Leaves Status</span>
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                                    <FileText className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl md:text-3xl font-black text-indigo-400 tracking-tight">{pendingLeaves} Pending</div>
                                <div className="text-[10px] text-white/40 font-medium truncate flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    Total Leaves Applied: {leaves?.length || 0}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Metric 4: Notices count */}
                <Link href="/student/notices">
                    <Card className="bg-[#112240]/25 border-white/[0.05] hover:border-amber-500/35 backdrop-blur-md shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.02] group h-full relative overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-4 flex flex-col justify-between h-full gap-3 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">Notice Stream</span>
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 animate-none">
                                    <Bell className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl md:text-3xl font-black text-amber-400 tracking-tight">{notices?.length || 0} Board</div>
                                <div className="text-[10px] text-white/40 font-medium truncate flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Read notices instantly
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* =======================================
                3. PRIMARY INTERACTIVE BODY SECTION
                ======================================= */}
            <div className="grid grid-cols-12 gap-6 items-start text-left select-none">
                
                {/* Left Area: Notices & Homework hub (12 Cols on Mobile/Tablet, 7 Cols on Desktop) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col space-y-4">
                    
                    {/* Header with Switcher Tabs */}
                    <div className="flex items-center justify-between px-1 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">Student Stream</h3>
                        </div>

                        {/* Interactive Tab Switcher */}
                        <div className="flex bg-[#112240]/40 p-0.5 rounded-xl border border-white/5 select-none relative w-[220px] shrink-0">
                            <button
                                onClick={() => setActiveTab('notices')}
                                className={`relative flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 ${
                                    activeTab === 'notices' ? 'text-white' : 'text-white/60 hover:text-white/80'
                                }`}
                            >
                                {activeTab === 'notices' && (
                                    <motion.div
                                        layoutId="activeStreamTabIndicator"
                                        className="absolute inset-0 bg-blue-600 rounded-lg shadow-sm shadow-blue-500/20"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1">
                                    <Bell className="w-3 h-3" /> Notices
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('homework')}
                                className={`relative flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 ${
                                    activeTab === 'homework' ? 'text-white' : 'text-white/60 hover:text-white/80'
                                }`}
                            >
                                {activeTab === 'homework' && (
                                    <motion.div
                                        layoutId="activeStreamTabIndicator"
                                        className="absolute inset-0 bg-blue-600 rounded-lg shadow-sm shadow-blue-500/20"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" /> Homework
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Content List Stream */}
                    <div className="bg-[#112240]/15 border border-white/[0.05] backdrop-blur-md rounded-2xl p-4 sm:p-5 min-h-[360px] relative">
                        <AnimatePresence mode="wait">
                            {activeTab === 'notices' ? (
                                <motion.div
                                    key="notices-stream"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="flex justify-between items-center shrink-0 mb-1 border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">Recent Announcements</span>
                                        <Link href="/student/notices" className="text-[10px] text-blue-450 font-bold hover:underline flex items-center gap-0.5 group">
                                            Inbox Hub <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                    
                                    {dashboardNotices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center">
                                            <Bell className="w-12 h-12 text-white/10 mb-3.5" />
                                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Board is Clear</h4>
                                            <p className="text-xs text-white/40 max-w-[240px] mt-1.5 leading-relaxed">
                                                No announcements posted. You are completely caught up!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {dashboardNotices.map((n) => {
                                                const styles = getNoticeStyles(n.type);
                                                return (
                                                    <div
                                                        key={n.id}
                                                        className={`group relative overflow-hidden rounded-xl bg-[#112240]/10 hover:bg-[#112240]/25 border ${styles.border} transition-all duration-300 p-4 flex gap-3.5 shadow-sm ${styles.glow}`}
                                                    >
                                                        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/[0.05] shrink-0 h-fit ${styles.iconColor} mt-0.5 group-hover:scale-105 transition-transform`}>
                                                            {styles.icon}
                                                        </div>
                                                        <div className="space-y-1.5 min-w-0 flex-1">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <h4 className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-blue-400 transition-colors">
                                                                    {n.title}
                                                                </h4>
                                                                {n.type && (
                                                                    <span className={`text-[8px] px-2 py-0.5 uppercase tracking-widest font-black rounded-md ${styles.badgeBg} ${styles.badgeText} shrink-0 font-mono`}>
                                                                        {n.type}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line break-words">
                                                                {n.content}
                                                            </p>
                                                            <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-[9px] text-white/30 font-bold font-mono">
                                                                <span className="truncate">By: {n.senderName || "Admin Department"}</span>
                                                                <span>{formatTimestamp(n.createdAt)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="homework-stream"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="flex justify-between items-center shrink-0 mb-1 border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">Assigned Tasks</span>
                                        <Link href="/student/homework" className="text-[10px] text-blue-450 font-bold hover:underline flex items-center gap-0.5 group">
                                            Open Diary <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    </div>

                                    {dashboardHomework.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center">
                                            <BookOpen className="w-12 h-12 text-white/10 mb-3.5" />
                                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Diary is Clear</h4>
                                            <p className="text-xs text-white/40 max-w-[240px] mt-1.5 leading-relaxed">
                                                All assignments completed! Excellent job keeping your studies organized.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {dashboardHomework.map((hw) => (
                                                <div
                                                    key={hw.id}
                                                    className="group relative overflow-hidden rounded-xl bg-[#112240]/10 hover:bg-[#112240]/25 border border-white/5 hover:border-emerald-500/20 transition-all duration-300 p-4 border-l-4 border-l-emerald-500/80 text-left shadow-sm"
                                                >
                                                    <div className="space-y-2 min-w-0 flex-1">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h4 className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-emerald-400 transition-colors font-sans">
                                                                {hw.title}
                                                            </h4>
                                                            <Badge className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[8px] font-black tracking-wider uppercase py-0.5 px-2 shrink-0 font-mono">
                                                                {hw.subjectId || hw.subject || "General"}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line break-words line-clamp-3">
                                                            {hw.description}
                                                        </p>
                                                        <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-[9px] text-white/30 font-bold font-mono">
                                                            <span className="truncate">Teacher: {hw.teacherName || "Subject Faculty"}</span>
                                                            {hw.dueDate && (
                                                                <span className="text-rose-400 font-bold flex items-center gap-0.5 shrink-0">
                                                                    <Clock className="w-3 h-3" /> Due: {hw.dueDate}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Area: Today's Timetable timeline (12 Cols on Mobile/Tablet, 5 Cols on Desktop) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col space-y-4">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center px-1 shrink-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">Today's Timetable</h3>
                        </div>
                        <Link href="/student/timetable">
                            <Button variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 gap-1.5 p-0 hover:bg-transparent font-bold">
                                Full Schedule <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                    </div>

                    {/* Timetable card */}
                    <Card className="bg-[#112240]/15 border-white/[0.05] backdrop-blur-md shadow-2xl relative overflow-hidden rounded-2xl border min-h-[360px] p-5 flex flex-col justify-between">
                        
                        {/* Stream slots */}
                        <div className="flex-1 space-y-3.5">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">
                                    Day: {todayDayName || "Week Day"}
                                </span>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[8px] font-black uppercase font-mono">
                                    Standard Class
                                </Badge>
                            </div>

                            {todaySlots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <Calendar className="w-10 h-10 text-white/10 mb-3" />
                                    <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">No Scheduled Classes</h4>
                                    <p className="text-[11px] text-white/40 max-w-[200px] mt-1 leading-relaxed">
                                        {todayDayName === "SUNDAY" ? "Happy Sunday! Rest up for the school week." : "Check back later! No classes scheduled for today."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[330px] overflow-y-auto pr-1 scrollbar-none">
                                    {todaySlots.map((slot) => (
                                        <div
                                            key={slot.id}
                                            className="group relative overflow-hidden rounded-xl bg-[#112240]/10 hover:bg-[#112240]/25 border border-white/5 hover:border-indigo-500/20 transition-all duration-300 p-3 flex items-center justify-between gap-3 text-left shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs font-mono group-hover:scale-105 transition-transform shrink-0">
                                                    P{slot.id}
                                                </div>
                                                <div className="min-w-0">
                                                    <h5 className="font-extrabold text-white text-xs truncate group-hover:text-indigo-400 transition-colors">
                                                        {slot.subject}
                                                    </h5>
                                                    <p className="text-[9px] text-white/40 truncate">
                                                        Taught by: {slot.teacher}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge className="bg-white/5 text-white/50 border border-white/10 text-[8px] font-bold font-mono py-0.5 px-1.5 rounded">
                                                    {slot.timing}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Portal state check widget footer info */}
                        <div className="border-t border-white/5 pt-3.5 mt-4 shrink-0 flex items-center justify-between text-[9px] text-white/30 font-bold font-mono">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-450" /> Portal Status Stable
                            </span>
                            <span>v1.3.0</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Quick Actions Hub Grid (Always Visible at bottom of dashboard content) */}
            <div className="space-y-4 text-left select-none pt-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">Academic Hub</h3>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                        { label: "Fee Ledger", icon: Wallet, href: "/student/fees", bg: "bg-rose-500/10", border: "hover:border-rose-500/30", text: "text-rose-400" },
                        { label: "Schedule", icon: Calendar, href: "/student/timetable", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/30", text: "text-indigo-400" },
                        { label: "Attendance", icon: CalendarCheck, href: "/student/attendance", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/30", text: "text-emerald-400" },
                        { label: "Homework", icon: BookOpen, href: "/student/homework", bg: "bg-purple-500/10", border: "hover:border-purple-500/30", text: "text-purple-400" },
                        { label: "Leaves", icon: FileText, href: "/student/leaves", bg: "bg-amber-500/10", border: "hover:border-amber-500/30", text: "text-amber-400" },
                        { label: "Profile", icon: User, href: "/student/profile", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/30", text: "text-cyan-400" },
                    ].map((hub, idx) => (
                        <Link 
                            key={idx} 
                            href={hub.href}
                            className={`flex flex-col items-center justify-center p-4 bg-[#112240]/20 border border-white/5 rounded-2xl ${hub.border} hover:bg-[#112240]/40 transition-all duration-300 group`}
                        >
                            <div className={`w-10 h-10 rounded-xl ${hub.bg} flex items-center justify-center ${hub.text} group-hover:scale-110 transition-transform mb-2 shadow-inner`}>
                                <hub.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold text-white/80 tracking-wide truncate max-w-full">
                                {hub.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
