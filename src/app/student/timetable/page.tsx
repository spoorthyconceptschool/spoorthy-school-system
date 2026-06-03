"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, Coffee, Printer, Calendar, Clock, ArrowLeft, ArrowRight, 
    UserCheck, Sparkles, BookOpen, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Info
} from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { useStudentData } from "@/context/StudentDataContext";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentTimetablePage() {
    const { user } = useAuth();
    const { subjects, classes, sections } = useMasterData();
    const { profile, schedule, substitutions, teacherMap, notices, loading } = useStudentData();
    
    const [selectedWeeklyDay, setSelectedWeeklyDay] = useState<string>("MONDAY");
    const [todayDayName, setTodayDayName] = useState<string>("MONDAY");
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [selectedPlannerMonth, setSelectedPlannerMonth] = useState<Date>(new Date());
    const [selectedPlannerDate, setSelectedPlannerDate] = useState<string | null>(null);
    const [showPlanner, setShowPlanner] = useState<boolean>(false);

    const classId = profile?.classId || "";
    const sectionId = profile?.sectionId || "";
    const holidays = notices.filter((n: any) => n.type === "HOLIDAY");

    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const PERIOD_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

    // Standard Period Timings
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

    // Live clock update
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        setTodayDayName(dayName);
        if (DAYS.includes(dayName)) {
            setSelectedWeeklyDay(dayName);
        }
    }, []);

    // Convert time string to minutes since midnight
    const getMinutes = (part: string) => {
        const [time] = part.trim().split(" ");
        let [hrs, mins] = time.split(":").map(Number);
        if (hrs < 7) hrs += 12; // Handles standard school hours PM boundary (e.g. 1:30 PM)
        return hrs * 60 + mins;
    };

    const parsePeriodTiming = (timeStr: string) => {
        const [startPart, endPart] = timeStr.split(" - ");
        return {
            start: getMinutes(startPart),
            end: getMinutes(endPart)
        };
    };

    const isDateHoliday = (date: Date) => {
        return holidays.some(h => {
            const start = h.startDate?.seconds ? new Date(h.startDate.seconds * 1000) : (h.date?.seconds ? new Date(h.date.seconds * 1000) : (h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000) : new Date()));
            const end = h.endDate?.seconds ? new Date(h.endDate.seconds * 1000) : new Date(start.getTime());
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        });
    };

    const getTodaySchedule = () => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const isHoliday = isDateHoliday(today);
        if (isHoliday) return { dayName, dateKey, slots: [], isHoliday: true };

        if (!schedule || !schedule[dayName]) return { dayName, dateKey, slots: [], isHoliday: false };

        const todaySlots = [];
        const rawDay = schedule[dayName] || {};

        for (let i = 1; i <= 8; i++) {
            const base = rawDay[i];
            if (!base) continue;

            const sub = substitutions.find(s => s.date === dateKey && s.slotId === i);
            todaySlots.push({
                id: i,
                ...base,
                substitution: sub
            });
        }

        return { dayName, dateKey, slots: todaySlots, isHoliday: false };
    };

    const todayData = getTodaySchedule();

    const getWeeklyScheduleForDay = (dayName: string) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday
        const dIdx = DAYS.indexOf(dayName);
        const distance = (dIdx + 1) - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        const isHoliday = isDateHoliday(targetDate);
        const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        if (isHoliday) return { slots: [], isHoliday: true, dateLabel: targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' }), dateKey };

        const daySchedule = schedule?.[dayName] || {};
        const slots = [];
        
        for (let i = 1; i <= 8; i++) {
            const base = daySchedule[i];
            if (!base) continue;

            const sub = substitutions.find(s => s.date === dateKey && s.slotId === i);
            slots.push({
                id: i,
                ...base,
                substitution: sub
            });
        }

        return { slots, isHoliday: false, dateLabel: targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' }), dateKey };
    };

    // Calculate Active, Next class and school day progress
    const activeSlotInfo = useMemo(() => {
        if (todayData.isHoliday || !DAYS.includes(todayDayName) || todayData.slots.length === 0) {
            return { activeId: null, nextId: null, countdownStr: "", schoolProgress: 0 };
        }

        const hrs = currentTime.getHours();
        const mins = currentTime.getMinutes();
        const currentMins = hrs * 60 + mins;

        // School hours duration bounds
        const schoolStart = 510; // 08:30
        const schoolEnd = 945;  // 15:45
        const schoolProgress = Math.max(0, Math.min(100, Math.round(((currentMins - schoolStart) / (schoolEnd - schoolStart)) * 100)));

        let activeId: number | null = null;
        let nextId: number | null = null;
        let countdownStr = "";

        // Iterate standard periods
        for (const pId of PERIOD_IDS) {
            const { start, end } = parsePeriodTiming(PERIOD_TIMINGS[pId]);
            if (currentMins >= start && currentMins < end) {
                activeId = pId;
            } else if (currentMins < start && nextId === null) {
                // Find next slot that has a scheduled class
                const hasClass = todayData.slots.some(s => s.id === pId);
                if (hasClass) {
                    nextId = pId;
                    const diff = start - currentMins;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    countdownStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
            }
        }

        return { activeId, nextId, countdownStr, schoolProgress };
    }, [todayData, todayDayName, currentTime]);

    // Monthly Planner Mini-Calendar Calculations
    const plannerDays = useMemo(() => {
        const year = selectedPlannerMonth.getFullYear();
        const month = selectedPlannerMonth.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0
        const totalDays = new Date(year, month + 1, 0).getDate();

        const daysArr = [];
        // Add padding from previous month
        for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
            daysArr.push(null);
        }
        // Add current month days
        for (let d = 1; d <= totalDays; d++) {
            daysArr.push(new Date(year, month, d));
        }
        return daysArr;
    }, [selectedPlannerMonth]);

    const handlePlannerMonthChange = (offset: number) => {
        setSelectedPlannerMonth(new Date(selectedPlannerMonth.getFullYear(), selectedPlannerMonth.getMonth() + offset, 1));
        setSelectedPlannerDate(null);
    };

    const getSubjectStyle = (name: string) => {
        const n = (name || "").toLowerCase();
        if (n.includes("math")) {
            return {
                bg: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-500/40",
                pill: "bg-blue-500/25 text-blue-300 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
                iconBg: "bg-blue-500/20 border border-blue-500/30",
                iconColor: "text-blue-400",
                gradient: "from-blue-600/15 via-[#0D1F3D] to-[#070F1E]/50",
                accent: "#3B82F6"
            };
        }
        if (n.includes("sci") || n.includes("phy") || n.includes("chem") || n.includes("bio") || n.includes("env")) {
            return {
                bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40",
                pill: "bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
                iconBg: "bg-emerald-500/20 border border-emerald-500/30",
                iconColor: "text-emerald-400",
                gradient: "from-emerald-600/15 via-[#0D1F3D] to-[#070F1E]/50",
                accent: "#10B981"
            };
        }
        if (n.includes("eng") || n.includes("lit") || n.includes("lang")) {
            return {
                bg: "bg-violet-500/10 border-violet-500/20 text-violet-400 hover:border-violet-500/40",
                pill: "bg-violet-500/25 text-violet-300 border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]",
                iconBg: "bg-violet-500/20 border border-violet-500/30",
                iconColor: "text-violet-400",
                gradient: "from-violet-600/15 via-[#0D1F3D] to-[#070F1E]/50",
                accent: "#8B5CF6"
            };
        }
        if (n.includes("art") || n.includes("draw") || n.includes("paint") || n.includes("music") || n.includes("craft")) {
            return {
                bg: "bg-pink-500/10 border-pink-500/20 text-pink-400 hover:border-pink-500/40",
                pill: "bg-pink-500/25 text-pink-300 border border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.15)]",
                iconBg: "bg-pink-500/20 border border-pink-500/30",
                iconColor: "text-pink-400",
                gradient: "from-pink-600/15 via-[#0D1F3D] to-[#070F1E]/50",
                accent: "#EC4899"
            };
        }
        if (n.includes("phys") || n.includes("pe") || n.includes("sport") || n.includes("game")) {
            return {
                bg: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/40",
                pill: "bg-amber-500/25 text-amber-300 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
                iconBg: "bg-amber-500/20 border border-amber-500/30",
                iconColor: "text-amber-400",
                gradient: "from-amber-600/15 via-[#0D1F3D] to-[#070F1E]/50",
                accent: "#F59E0B"
            };
        }
        // Default
        return {
            bg: "bg-slate-500/10 border-white/5 text-slate-300 hover:border-slate-500/30",
            pill: "bg-white/5 text-neutral-300 border border-white/10",
            iconBg: "bg-white/5 border border-white/10",
            iconColor: "text-[#64FFDA]",
            gradient: "from-blue-900/10 via-[#0D1F3D] to-[#070F1E]/50",
            accent: "#64748B"
        };
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-[#070F1E]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-[#64FFDA]" />
                    <span className="text-sm font-semibold text-neutral-400 font-mono tracking-wider">Syncing Schedule Engine...</span>
                </div>
            </div>
        );
    }

    const nextClassSlot = activeSlotInfo.nextId ? todayData.slots.find(s => s.id === activeSlotInfo.nextId) : null;
    const activeClassSlot = activeSlotInfo.activeId ? todayData.slots.find(s => s.id === activeSlotInfo.activeId) : null;

    // Period formatting adjustments based on total periods to meet Single Row requirement
    const periodCount = PERIOD_IDS.length;
    const cardPadding = periodCount > 7 ? "p-3" : "p-4.5";
    const gapSize = periodCount > 7 ? "gap-2" : "gap-3";
    const titleSize = periodCount > 7 ? "text-[10px]" : "text-xs";
    const textDetailsSize = periodCount > 7 ? "text-[9.5px]" : "text-[11px]";

    return (
        <div className="w-full min-h-screen text-[#E6F1FF] bg-gradient-to-b from-[#030712] via-[#09152b] to-[#030712] font-sans pb-20 relative overflow-hidden select-none">
            {/* Glowing Nebula Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3B82F6]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#64FFDA]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-10 relative z-10">
                {/* 1. Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6]/20 to-[#64FFDA]/20 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40">
                            <Calendar className="w-6 h-6 text-[#64FFDA]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-display">SCHEDULING SUITE</h1>
                                <Badge className="bg-[#64FFDA]/15 text-[#64FFDA] border border-[#64FFDA]/30 font-mono text-[9px] px-2 py-0.5 rounded uppercase">STUDENT</Badge>
                            </div>
                            <p className="text-xs text-neutral-400 font-medium">
                                Class {classes[classId]?.name || `Grade ${classId}`} {sectionId && sections && sections[sectionId] ? ` • Section ${sections[sectionId].name}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => setShowPlanner(!showPlanner)} 
                            variant="outline" 
                            className={`border-white/10 text-white rounded-xl font-bold font-sans transition-all text-xs h-10 px-4 gap-2 ${showPlanner ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                            <Calendar className="w-4 h-4 text-[#64FFDA]" /> {showPlanner ? "Show Timetable" : "Academic Planner"}
                        </Button>
                        <Button 
                            onClick={() => window.print()} 
                            variant="outline" 
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl font-bold font-sans transition-all text-xs h-10 px-4 gap-2"
                        >
                            <Printer className="w-4 h-4 text-[#64FFDA]" /> Print
                        </Button>
                    </div>
                </div>

                {!showPlanner ? (
                    <>
                        {/* 2. Today's Timetable Section (Chronologically at the Top) */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#64FFDA] animate-ping" />
                                    <h2 className="text-sm font-black uppercase text-[#64FFDA] tracking-widest font-display">TODAY'S SCHEDULE</h2>
                                </div>
                                <span className="text-xs font-mono font-bold text-neutral-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                                    {todayData.dateKey ? new Date(todayData.dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                                </span>
                            </div>

                            {todayData.isHoliday ? (
                                <Card className="bg-[#0D1F3D]/30 border border-white/15 backdrop-blur-md p-10 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
                                        <Coffee className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white uppercase tracking-wider font-display">Official School Holiday / Break</h4>
                                        <p className="text-sm text-neutral-400 mt-1 w-full md:max-w-3xl mx-auto">Standard class sessions are suspended for the holiday. Enjoy your rest day!</p>
                                    </div>
                                </Card>
                            ) : !DAYS.includes(todayDayName) ? (
                                <Card className="bg-[#0D1F3D]/30 border border-white/15 backdrop-blur-md p-10 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/25">
                                        <Coffee className="w-8 h-8 text-[#3B82F6]" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white uppercase tracking-wider font-display">Weekend Academic Break</h4>
                                        <p className="text-sm text-neutral-400 mt-1 w-full md:max-w-3xl mx-auto">Regular class schedule resumes on Monday. Enjoy the weekend!</p>
                                    </div>
                                </Card>
                            ) : todayData.slots.length === 0 ? (
                                <Card className="bg-[#0D1F3D]/30 border border-white/15 backdrop-blur-md p-10 rounded-3xl text-center text-neutral-400 italic text-sm">
                                    No scheduled periods found for today.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative">
                                    {PERIOD_IDS.map((pId) => {
                                        const slot = todayData.slots.find((s: any) => s.id === pId);
                                        const isCurrent = activeSlotInfo.activeId === pId;
                                        const isNext = activeSlotInfo.nextId === pId;

                                        if (!slot) {
                                            return (
                                                <div 
                                                    key={`today-slot-free-${pId}`} 
                                                    className="bg-[#0D1F3D]/20 border border-dashed border-white/5 rounded-2xl p-5 flex flex-col justify-between h-[150px] opacity-40 hover:opacity-60 transition-all duration-300"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-mono font-black text-neutral-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg">P{pId}</span>
                                                        <span className="text-[10px] text-neutral-500 font-mono font-semibold">{PERIOD_TIMINGS[pId]}</span>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-base font-black text-neutral-500 uppercase tracking-wider">Free Period</h5>
                                                        <span className="text-[10px] text-neutral-500 mt-0.5 block font-mono">Self study interval</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (slot.type === "BREAK") {
                                            return (
                                                <div 
                                                    key={`today-slot-break-${pId}`} 
                                                    className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col justify-between h-[150px] hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden group shadow-lg"
                                                >
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">P{pId}</span>
                                                        <span className="text-[10px] text-neutral-400 font-mono font-semibold">{PERIOD_TIMINGS[pId]}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Coffee className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
                                                        <div>
                                                            <h5 className="text-base font-black text-white uppercase tracking-wider">Recess Break</h5>
                                                            <span className="text-[10px] text-neutral-400 block font-mono">Rest interval</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const isSub = !!slot.substitution;
                                        const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                        const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                        const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                        const teacherName = isSub && slot.substitution.substituteTeacherId
                                            ? (teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId)
                                            : (teacherMap[slot.teacherId] || slot.teacherId || "Faculty Coordinator");

                                        const style = getSubjectStyle(subjectName);

                                        return (
                                            <div 
                                                key={`today-slot-class-${pId}`}
                                                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-[150px] relative overflow-hidden group shadow-lg ${
                                                    isCurrent 
                                                        ? "bg-[#64FFDA]/15 border-[#64FFDA]/30 shadow-[#64FFDA]/5 scale-[1.02] ring-1 ring-[#64FFDA]/30" 
                                                        : isSub 
                                                        ? "bg-amber-500/10 border-amber-500/30" 
                                                        : "bg-[#0D1F3D]/50 border-white/5 hover:border-white/20"
                                                }`}
                                            >
                                                {/* Backdrop subtle gradient */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-20 pointer-events-none`} />

                                                <div className="flex justify-between items-start relative z-10">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 select-none ${
                                                            isCurrent ? "bg-[#64FFDA] text-[#070F1E]" : style.iconBg
                                                        }`}>
                                                            P{pId}
                                                        </div>
                                                        {isCurrent && (
                                                            <Badge className="bg-[#64FFDA]/20 text-[#64FFDA] border-none font-bold text-[9px] px-2 py-0.5 rounded animate-pulse">
                                                                ACTIVE
                                                            </Badge>
                                                        )}
                                                        {isSub && (
                                                            <Badge className="bg-amber-500/20 text-amber-500 border-none font-bold text-[9px] px-2 py-0.5 rounded">
                                                                SUB
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-neutral-400 font-mono font-semibold">{PERIOD_TIMINGS[pId]}</span>
                                                </div>

                                                <div className="relative z-10 mt-auto">
                                                    <h5 className="text-base font-black text-white capitalize leading-tight group-hover:text-[#64FFDA] transition-colors truncate">
                                                        {isLeisure || rawSubjectId === "leisure" ? (
                                                            <span className="text-emerald-400 font-semibold uppercase tracking-wider text-xs">Free Period</span>
                                                        ) : (
                                                            subjectName
                                                        )}
                                                    </h5>
                                                    <div className="flex items-center gap-1 text-neutral-400 text-xs mt-1.5 truncate">
                                                        <span className="font-medium text-[11px] truncate">{teacherName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 3. Weekly Timetable Section (Below Today's Schedule) */}
                        <div className="space-y-6 pt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-[#64FFDA]" />
                                    <h2 className="text-sm font-black uppercase text-[#64FFDA] tracking-widest font-display">WEEKLY MATRIX</h2>
                                </div>
                                <span className="text-xs font-mono font-bold text-neutral-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                                    Adaptable Grid System
                                </span>
                            </div>

                            <Card className="bg-[#0D1F3D]/30 border border-white/5 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                                {/* Wrap the table in a container scrollable on mobile */}
                                <div className="overflow-x-auto scrollbar-none">
                                    <div className="p-4 md:p-6 min-w-[850px]">
                                        {/* Row Column Headers */}
                                        <div className="flex flex-col space-y-3.5">
                                            {/* Header Label Row */}
                                            <div className="flex items-center gap-2.5">
                                                {/* Corner element */}
                                                <div className="w-[100px] shrink-0 bg-[#0A192F] rounded-xl border border-white/5 p-2 flex flex-col justify-center items-center h-12 shadow-inner">
                                                    <span className="text-[9px] font-black uppercase text-[#64FFDA] tracking-wider font-display">DAYS</span>
                                                    <div className="h-px bg-white/10 w-5 my-0.5" />
                                                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider font-display">PERIODS</span>
                                                </div>

                                                {/* Period slots mapping. Forces single-row and responsive scale */}
                                                <div className={`flex flex-1 ${gapSize} min-w-0`}>
                                                    {PERIOD_IDS.map(pId => (
                                                        <div 
                                                            key={`weekly-header-${pId}`} 
                                                            className="flex-1 min-w-0 bg-white/5 rounded-xl border border-white/5 p-2 flex flex-col justify-center items-center h-12 shadow-inner"
                                                        >
                                                            <span className={`font-black text-white tracking-tight font-display ${titleSize}`}>P{pId}</span>
                                                            <span className="text-[8px] text-neutral-400 font-bold font-mono mt-0.5 block truncate w-full text-center">{PERIOD_TIMINGS[pId]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Days Rows */}
                                            {DAYS.map(dayName => {
                                                const rowData = getWeeklyScheduleForDay(dayName);
                                                const isToday = dayName === todayDayName;

                                                return (
                                                    <div key={`weekly-row-${dayName}`} className="flex items-stretch gap-2.5">
                                                        {/* Day Label Header Column */}
                                                        <div 
                                                            className={`w-[100px] shrink-0 rounded-xl border flex flex-col justify-center items-center shadow-sm transition-all ${
                                                                isToday
                                                                    ? "bg-[#64FFDA] border-[#64FFDA]/30 text-[#070F1E] shadow-[#64FFDA]/10"
                                                                    : "bg-[#0A192F]/60 border-white/5 text-white"
                                                            }`}
                                                        >
                                                            <span className="text-[11px] font-black uppercase tracking-widest font-display">{dayName.substring(0, 3)}</span>
                                                            <span className={`text-[8.5px] font-extrabold uppercase mt-0.5 ${isToday ? "text-[#070F1E]/80" : "text-neutral-400"}`}>
                                                                {rowData.dateLabel}
                                                            </span>
                                                        </div>

                                                        {/* Periods Columns (No wrapping, scales dynamically to single row width) */}
                                                        <div className={`flex flex-1 ${gapSize} min-w-0`}>
                                                            {rowData.isHoliday ? (
                                                                <div className="flex-1 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-center justify-center gap-2 text-amber-500 px-3 shadow-inner">
                                                                    <Coffee className="w-4 h-4 shrink-0" />
                                                                    <span className="text-[10px] font-black uppercase tracking-wider font-display truncate">School Holiday</span>
                                                                </div>
                                                            ) : (
                                                                PERIOD_IDS.map(pId => {
                                                                    const slot = rowData.slots.find((s: any) => s.id === pId);
                                                                    
                                                                    if (!slot) {
                                                                        return (
                                                                            <div 
                                                                                key={`matrix-slot-free-${dayName}-${pId}`} 
                                                                                className="flex-1 min-w-0 bg-white/[0.01] border border-dashed border-white/5 rounded-xl flex items-center justify-center text-neutral-600 text-[10px] font-mono"
                                                                            >
                                                                                —
                                                                            </div>
                                                                        );
                                                                    }

                                                                    if (slot.type === "BREAK") {
                                                                        return (
                                                                            <div 
                                                                                key={`matrix-slot-break-${dayName}-${pId}`} 
                                                                                className="flex-1 min-w-0 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-center items-center text-neutral-500 gap-0.5 shadow-inner"
                                                                            >
                                                                                <Coffee className="w-3.5 h-3.5 text-neutral-600" />
                                                                                <span className="text-[7.5px] font-black uppercase tracking-wider text-neutral-600 font-display">Recess</span>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const isSub = !!slot.substitution;
                                                                    const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                                                    const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                                                    const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                                                    const teacherName = isSub && slot.substitution.substituteTeacherId
                                                                        ? (teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId)
                                                                        : (teacherMap[slot.teacherId] || slot.teacherId || "Faculty");

                                                                    const style = getSubjectStyle(subjectName);

                                                                    return (
                                                                        <div 
                                                                            key={`matrix-slot-class-${dayName}-${pId}`}
                                                                            className={`flex-1 min-w-0 ${cardPadding} rounded-xl border transition-all duration-300 flex flex-col justify-between text-left relative overflow-hidden group ${
                                                                                isSub
                                                                                    ? "bg-yellow-500/10 border-yellow-500/25 shadow-md shadow-yellow-500/5 hover:border-yellow-500/40"
                                                                                    : isLeisure || rawSubjectId === "leisure"
                                                                                    ? "bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30"
                                                                                    : style.bg
                                                                            }`}
                                                                        >
                                                                            {/* Background gradient style accent */}
                                                                            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-10 pointer-events-none`} />

                                                                            <div className="flex justify-between items-center gap-0.5 shrink-0 select-none relative z-10">
                                                                                <span className="text-[7.5px] font-black text-neutral-500 font-mono">P{pId}</span>
                                                                                {isSub && (
                                                                                    <Badge className="text-[6.5px] bg-yellow-500 text-neutral-900 border-none font-black px-1 py-0 rounded leading-none shrink-0">
                                                                                        SUB
                                                                                    </Badge>
                                                                                )}
                                                                            </div>

                                                                            <div className="truncate my-0.5 relative z-10">
                                                                                <h4 className="font-extrabold text-white tracking-tight capitalize truncate group-hover:text-[#64FFDA] transition-colors font-display" style={{ fontSize: textDetailsSize }}>
                                                                                    {isLeisure || rawSubjectId === "leisure" ? (
                                                                                        <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[8px]">Free</span>
                                                                                    ) : (
                                                                                        subjectName
                                                                                    )}
                                                                                </h4>
                                                                            </div>

                                                                            <div className="truncate shrink-0 relative z-10">
                                                                                {!isLeisure && rawSubjectId !== "leisure" && (
                                                                                    <span className="text-neutral-400 font-medium truncate block font-sans text-[8.5px]">
                                                                                        ({teacherName})
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </>
                ) : (
                    /* 4. Academic Planner Section */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-[#64FFDA]" />
                                <h3 className="text-sm font-black uppercase text-[#64FFDA] tracking-widest font-display">Academic Planner</h3>
                            </div>
                            <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 rounded-xl p-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => handlePlannerMonthChange(-1)} className="h-8 w-8 text-neutral-400 hover:text-white rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs font-black uppercase font-mono px-2 text-white">
                                    {selectedPlannerMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => handlePlannerMonthChange(1)} className="h-8 w-8 text-neutral-400 hover:text-white rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Monthly grid */}
                            <Card className="lg:col-span-2 bg-[#0D1F3D]/40 border border-white/5 backdrop-blur-md p-4 rounded-3xl shadow-xl">
                                <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
                                    {/* Days Headers */}
                                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => (
                                        <div key={day} className="text-[10px] font-black uppercase text-neutral-500 py-1.5 font-display">{day}</div>
                                    ))}

                                    {/* Calendar Days */}
                                    {plannerDays.map((dateObj, idx) => {
                                        if (!dateObj) {
                                            return <div key={`empty-cell-${idx}`} className="bg-transparent rounded-lg h-12 md:h-16" />;
                                        }

                                        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                                        const isHoliday = isDateHoliday(dateObj);
                                        const hasSub = substitutions.some(s => s.date === dateKey);
                                        const noticeList = notices.filter(n => {
                                            const start = n.startDate?.seconds ? new Date(n.startDate.seconds * 1000) : (n.date?.seconds ? new Date(n.date.seconds * 1000) : (n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : new Date()));
                                            const end = n.endDate?.seconds ? new Date(n.endDate.seconds * 1000) : new Date(start.getTime());
                                            start.setHours(0,0,0,0);
                                            end.setHours(23,59,59,999);
                                            return dateObj >= start && dateObj <= end;
                                        });

                                        const isToday = dateObj.toDateString() === new Date().toDateString();
                                        const isSelected = selectedPlannerDate === dateKey;

                                        let cellBg = "bg-white/[0.01] hover:bg-white/5";
                                        let borderClass = "border-white/5";
                                        let textClass = "text-white/80";

                                        if (isToday) {
                                            cellBg = "bg-[#64FFDA]/10 hover:bg-[#64FFDA]/20";
                                            borderClass = "border-[#64FFDA]/30";
                                            textClass = "text-[#64FFDA] font-bold";
                                        } else if (isHoliday) {
                                            cellBg = "bg-red-500/10 hover:bg-red-500/15";
                                            borderClass = "border-red-500/25";
                                            textClass = "text-red-400";
                                        } else if (isSelected) {
                                            cellBg = "bg-[#3B82F6]/25 hover:bg-[#3B82F6]/30";
                                            borderClass = "border-[#3B82F6]/50";
                                        }

                                        return (
                                            <button
                                                key={`calendar-cell-${dateKey}`}
                                                onClick={() => setSelectedPlannerDate(dateKey)}
                                                className={`border rounded-2xl h-12 md:h-16 flex flex-col justify-between p-2 text-left relative overflow-hidden transition-all duration-200 select-none ${cellBg} ${borderClass}`}
                                            >
                                                <span className={`text-[11px] font-mono font-black ${textClass}`}>{dateObj.getDate()}</span>
                                                
                                                {/* Event indicator dots */}
                                                <div className="flex gap-1 items-center shrink-0">
                                                    {isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                                                    {hasSub && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                                    {noticeList.length > 0 && !isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Sidebar Details */}
                            <div className="space-y-4">
                                <Card className="bg-[#0D1F3D]/40 border border-white/5 backdrop-blur-md p-5 rounded-3xl shadow-xl space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-[#64FFDA] font-display">Agenda Details</h4>
                                    
                                    {selectedPlannerDate ? (() => {
                                        const targetDate = new Date(selectedPlannerDate);
                                        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                                        const isHoliday = isDateHoliday(targetDate);
                                        const daySchedule = schedule?.[dayName] || {};
                                        const activeNotices = notices.filter(n => {
                                            const start = n.startDate?.seconds ? new Date(n.startDate.seconds * 1000) : (n.date?.seconds ? new Date(n.date.seconds * 1000) : (n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : new Date()));
                                            const end = n.endDate?.seconds ? new Date(n.endDate.seconds * 1000) : new Date(start.getTime());
                                            start.setHours(0,0,0,0);
                                            end.setHours(23,59,59,999);
                                            return targetDate >= start && targetDate <= end;
                                        });

                                        return (
                                            <div className="space-y-3.5 animate-in fade-in duration-300">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                    <span className="text-xs font-black text-white font-mono">{selectedPlannerDate}</span>
                                                    <Badge className="bg-white/5 text-neutral-400 border border-white/10 text-[8.5px] px-2 py-0.5 rounded font-black">{dayName.substring(0,3)}</Badge>
                                                </div>

                                                {isHoliday && (
                                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5 text-red-400">
                                                        <Coffee className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="text-xs font-bold block leading-tight">School Holiday / Notice Block</span>
                                                            <p className="text-[10px] text-red-400/60 mt-1">Normal academic sessions are suspended today.</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {activeNotices.map((n: any, idx) => (
                                                    <div key={idx} className="p-3 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-2xl space-y-1">
                                                        <div className="text-[10.5px] font-black text-white tracking-tight uppercase">{n.title}</div>
                                                        <p className="text-[10px] text-neutral-400 leading-normal">"{n.content}"</p>
                                                    </div>
                                                ))}

                                                {!isHoliday && (
                                                    <div className="space-y-2">
                                                        <span className="text-[9.5px] font-black uppercase text-neutral-500 tracking-wider block">Class Roster For Day</span>
                                                        {PERIOD_IDS.some(i => daySchedule[i]) ? (
                                                            <div className="space-y-1.5">
                                                                {PERIOD_IDS.map(i => {
                                                                    const slot = daySchedule[i];
                                                                    if (!slot || slot.type === "BREAK") return null;

                                                                    const classId = typeof slot === 'object' ? slot.classId : slot;
                                                                    const subjectId = typeof slot === 'object' ? slot.subjectId : null;
                                                                    const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : "";

                                                                    return (
                                                                        <div key={i} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl p-2.5 text-xs">
                                                                            <span className="font-bold text-[#64FFDA] font-mono">P{i}</span>
                                                                            <span className="font-extrabold text-white truncate max-w-[120px] capitalize">{subjectName}</span>
                                                                            <span className="text-neutral-400 font-medium text-[10.5px]">({classId})</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] text-neutral-500 italic">No academic classes scheduled.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })() : (
                                        <div className="text-center py-8 text-xs text-neutral-500 italic">
                                            Select a planner date to view notice lists and schedule agendas.
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}




