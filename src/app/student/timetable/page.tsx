"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coffee, Printer, Calendar, Clock, ArrowLeft, ArrowRight, UserCheck, Sparkles, BookOpen } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { useStudentData } from "@/context/StudentDataContext";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentTimetablePage() {
    const { user } = useAuth();
    const { subjects, classes, sections } = useMasterData();
    const { profile, schedule, substitutions, teacherMap, notices, loading } = useStudentData();
    
    const [activeTab, setActiveTab] = useState<'today' | 'weekly'>('today');
    const [selectedWeeklyDay, setSelectedWeeklyDay] = useState<string>("MONDAY");
    const [todayDayName, setTodayDayName] = useState<string>("MONDAY");

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

    useEffect(() => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        setTodayDayName(dayName);
        if (DAYS.includes(dayName)) {
            setSelectedWeeklyDay(dayName);
        }
    }, []);

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
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
        const currentDay = today.getDay();
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

    const weeklyDayData = getWeeklyScheduleForDay(selectedWeeklyDay);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto">
            {/* =======================================
                DESKTOP FULL RESPONSIVE VIEW (>= lg)
                ======================================= */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-6 w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative">
                
                {/* Glowing Accents */}
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />

                {/* Top header row */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10 select-none">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg">
                            <Calendar className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black font-display text-white tracking-tight">Interactive Timetable Matrix</h1>
                            <p className="text-xs text-neutral-400 font-medium font-sans">
                                Class {classes[classId]?.name || `Grade ${classId}`} {sectionId && sections && sections[sectionId] ? ` - Section ${sections[sectionId].name}` : ""} • Live Timeline & Weekly Schedule
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            onClick={() => window.print()} 
                            variant="outline" 
                            className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl font-bold font-sans"
                        >
                            <Printer className="w-4 h-4 text-amber-400" /> Print Timetable
                        </Button>
                    </div>
                </div>

                {/* ==========================================
                    NEW FEATURE: TODAY'S LIVE SCHEDULE TIMELINE
                    ========================================== */}
                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-3.5 select-none">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider font-sans">Today's Live Schedule</h3>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] font-black uppercase ml-1 rounded">
                            {todayDayName}
                        </Badge>
                    </div>

                    {todayData.isHoliday ? (
                        <Card className="bg-[#112240]/40 border border-amber-500/20 backdrop-blur-md p-6 rounded-2xl flex items-center justify-center gap-3 text-amber-500 select-none">
                            <Coffee className="w-6 h-6 animate-pulse" />
                            <div className="text-left">
                                <h4 className="text-sm font-black uppercase tracking-wider font-display">Term Holiday / Public Break Today</h4>
                                <p className="text-xs text-amber-500/60 font-medium font-sans">No classes scheduled for today.</p>
                            </div>
                        </Card>
                    ) : !DAYS.includes(todayDayName) ? (
                        <Card className="bg-[#112240]/40 border border-white/5 backdrop-blur-md p-5 rounded-2xl flex items-center gap-3 text-neutral-400 select-none">
                            <Coffee className="w-5 h-5" />
                            <div className="text-left">
                                <h4 className="text-xs font-black uppercase tracking-wider font-display">Weekend Rest Day</h4>
                                <p className="text-[11px] text-neutral-500 font-medium font-sans">Enjoy your weekend! Standard classes resume on Monday.</p>
                            </div>
                        </Card>
                    ) : todayData.slots.length === 0 ? (
                        <Card className="bg-[#112240]/40 border border-white/5 backdrop-blur-md p-5 rounded-2xl text-center text-neutral-400 italic text-xs font-medium font-sans select-none">
                            No classes or schedule information available for today.
                        </Card>
                    ) : (
                        <div className="grid grid-cols-8 gap-3">
                            {PERIOD_IDS.map(pId => {
                                const slot = todayData.slots.find((s: any) => s.id === pId);
                                
                                if (!slot) {
                                    return (
                                        <Card key={`today-timeline-free-${pId}`} className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl p-3 flex flex-col justify-between h-[82px] text-left select-none opacity-50">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-neutral-600 font-mono">P{pId}</span>
                                                <span className="text-[8px] font-semibold text-neutral-600 font-mono">{PERIOD_TIMINGS[pId]}</span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">Free Slot</span>
                                        </Card>
                                    );
                                }

                                if (slot.type === "BREAK") {
                                    return (
                                        <Card key={`today-timeline-break-${pId}`} className="bg-white/5 border border-white/5 p-3 flex flex-col justify-between h-[82px] text-left select-none">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-neutral-500 font-mono">P{pId}</span>
                                                <span className="text-[8px] font-semibold text-neutral-500 font-mono">{PERIOD_TIMINGS[pId]}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Coffee className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Break</span>
                                            </div>
                                        </Card>
                                    );
                                }

                                const isSub = !!slot.substitution;
                                const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                const teacherName = isSub && slot.substitution.substituteTeacherId
                                    ? (teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId)
                                    : (teacherMap[slot.teacherId] || slot.teacherId || "Staff");

                                return (
                                    <Card 
                                        key={`today-timeline-slot-${pId}`}
                                        className={`p-3 flex flex-col justify-between h-[82px] text-left relative overflow-hidden transition-all duration-300 ${
                                            isSub
                                                ? "bg-yellow-500/10 border-yellow-500/35 shadow-md shadow-yellow-500/5 hover:border-yellow-500/50"
                                                : isLeisure || rawSubjectId === "leisure"
                                                ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                                                : "bg-[#112240]/60 border-white/10 hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center select-none">
                                            <span className="text-[9.5px] font-black text-neutral-400 font-mono">P{pId}</span>
                                            <span className="text-[8.5px] font-semibold text-neutral-400 font-mono">{PERIOD_TIMINGS[pId]}</span>
                                        </div>

                                        <div className="truncate my-0.5">
                                            <h4 className="font-black text-[11px] text-white tracking-tight capitalize truncate">
                                                {isLeisure || rawSubjectId === "leisure" ? (
                                                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Free</span>
                                                ) : (
                                                    `${subjectName} (${teacherName})`
                                                )}
                                            </h4>
                                        </div>

                                        <div className="truncate shrink-0 flex items-center justify-between">
                                            <div />
                                            {isSub && (
                                                <Badge className="text-[7px] bg-yellow-500 text-neutral-900 border-none font-extrabold px-1 py-0 rounded shrink-0 select-none">
                                                    Sub
                                                </Badge>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2D Matrix Table Grid Container */}
                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-3.5 select-none">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-sans">Weekly Timetable Matrix</h3>
                    </div>

                    <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                        <CardContent className="p-5">
                            <div className="grid grid-cols-9 gap-2.5 items-stretch text-center">
                                
                                {/* Grid Corner Header (Day / Periods) */}
                                <div className="bg-[#0f1d3a] rounded-2xl border border-white/5 p-2 flex flex-col justify-center items-center h-14 select-none shadow-inner">
                                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider font-display">Days</span>
                                    <div className="h-px bg-white/10 w-6 my-0.5" />
                                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider font-display">Periods</span>
                                </div>

                                {/* Periods Columns Headers (Period 1 to 8) */}
                                {PERIOD_IDS.map(pId => (
                                    <div 
                                        key={`header-period-${pId}`} 
                                        className="bg-white/5 rounded-2xl border border-white/5 p-2 flex flex-col justify-center items-center h-14 shadow-inner select-none"
                                    >
                                        <span className="text-xs font-black text-white tracking-tight font-display">Period {pId}</span>
                                        <span className="text-[8.5px] text-neutral-400 font-bold font-mono mt-0.5">{PERIOD_TIMINGS[pId]}</span>
                                    </div>
                                ))}

                                {/* Matrix Rows (Days Monday to Saturday) */}
                                {DAYS.map(dayName => {
                                    const rowData = getWeeklyScheduleForDay(dayName);
                                    const isToday = dayName === todayDayName;

                                    return (
                                        <div key={`matrix-row-${dayName}`} className="contents">
                                            
                                            {/* Day Column label (Column 1) */}
                                            <div 
                                                className={`rounded-2xl border flex flex-col justify-center items-center h-[72px] shadow-sm select-none transition-all ${
                                                    isToday
                                                        ? "bg-amber-400 border-amber-300 text-neutral-900 shadow-amber-500/10"
                                                        : "bg-[#0A192F]/60 border-white/5 text-white"
                                                }`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-widest font-display">{dayName.substring(0, 3)}</span>
                                                <span className={`text-[8.5px] font-extrabold uppercase mt-0.5 ${isToday ? "text-neutral-800" : "text-neutral-400"}`}>
                                                    {rowData.dateLabel}
                                                </span>
                                                {isToday && (
                                                    <Badge className="bg-neutral-900 text-white text-[7px] font-black uppercase px-1.5 py-0.2 mt-1 border-none">
                                                        Today
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* 8 Periods Slots Columns (Columns 2 to 9) */}
                                            {rowData.isHoliday ? (
                                                /* Holiday Row Span */
                                                <div className="col-span-8 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-center justify-center gap-3 text-amber-500 h-[72px] shadow-inner select-none">
                                                    <Coffee className="w-4 h-4 animate-pulse" />
                                                    <div className="text-left">
                                                        <h4 className="text-xs font-black uppercase tracking-widest font-display">Holiday / Public Break</h4>
                                                        <p className="text-[9.5px] text-amber-500/60 font-semibold font-sans">Class timetable suspended for this date.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                PERIOD_IDS.map(pId => {
                                                    const slot = rowData.slots.find((s: any) => s.id === pId);
                                                    
                                                    if (!slot) {
                                                        return (
                                                            <div 
                                                                key={`matrix-slot-${dayName}-${pId}`} 
                                                                className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-neutral-600 text-[11px] font-mono h-[72px] select-none"
                                                            >
                                                                —
                                                            </div>
                                                        );
                                                    }

                                                    if (slot.type === "BREAK") {
                                                        return (
                                                            <div 
                                                                key={`matrix-slot-${dayName}-${pId}`} 
                                                                className="bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl flex flex-col justify-center items-center text-neutral-400 gap-0.5 h-[72px] shadow-inner select-none transition-all"
                                                            >
                                                                <Coffee className="w-3.5 h-3.5 text-neutral-500" />
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500 font-display">Recess</span>
                                                            </div>
                                                        );
                                                    }

                                                    const isSub = !!slot.substitution;
                                                    const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                                    const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                                    const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                                    const teacherName = isSub && slot.substitution.substituteTeacherId
                                                        ? (teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId)
                                                        : (teacherMap[slot.teacherId] || slot.teacherId || "Staff");

                                                    return (
                                                        <div 
                                                            key={`matrix-slot-${dayName}-${pId}`}
                                                            className={`group relative overflow-hidden p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-left h-[72px] ${
                                                                isSub
                                                                    ? "bg-yellow-500/10 border-yellow-500/25 shadow-md shadow-yellow-500/5 hover:border-yellow-500/40"
                                                                    : isLeisure || rawSubjectId === "leisure"
                                                                    ? "bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30"
                                                                    : "bg-[#0A192F]/40 border-white/5 hover:border-white/15"
                                                            }`}
                                                        >
                                                            {/* Top indicator tag */}
                                                            <div className="flex justify-between items-center gap-1 shrink-0 select-none">
                                                                <span className="text-[8px] font-black text-neutral-500 font-mono">P{pId}</span>
                                                                {isSub && (
                                                                    <Badge className="text-[7px] bg-yellow-500 text-neutral-900 border-none font-black px-1 py-0 rounded">
                                                                        Sub
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Subject name */}
                                                            <div className="truncate my-0.5">
                                                                <h4 className="font-extrabold text-[10.5px] text-white tracking-tight capitalize truncate group-hover:text-amber-400 transition-colors font-display">
                                                                    {isLeisure || rawSubjectId === "leisure" ? (
                                                                        <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[8.5px]">Free</span>
                                                                    ) : (
                                                                        subjectName
                                                                    )}
                                                                </h4>
                                                            </div>

                                                            {/* Faculty name footnote */}
                                                            <div className="truncate shrink-0">
                                                                {!isLeisure && rawSubjectId !== "leisure" && (
                                                                    <span className="text-[8.5px] text-neutral-400 font-medium truncate block font-sans">({teacherName})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* =======================================
                MOBILE VIEW (< lg Breakpoint)
                ======================================= */}
            <div className="max-w-md mx-auto lg:hidden flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-500 pb-4 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] px-2.5">
                
                {/* Glowing Accents */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Header Area */}
                <div className="flex justify-between items-center px-1 mt-2">
                    <div>
                        <h1 className="text-base font-extrabold text-white">My Timetable</h1>
                        <p className="text-[10px] text-neutral-400">
                            {classes[classId]?.name || `Class ${classId}`}
                            {sectionId && sections && sections[sectionId] ? ` (${sections[sectionId].name})` : ""}
                        </p>
                    </div>
                    
                    <Button 
                        onClick={() => window.print()} 
                        variant="outline" 
                        className="gap-1.5 print:hidden bg-white/5 border-white/10 hover:bg-white/10 text-white px-2.5 py-1 text-[10px] font-bold h-7 rounded-xl"
                    >
                        <Printer className="w-3 h-3 text-amber-400" /> Print
                    </Button>
                </div>

                {/* Segment Toggler */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full select-none shrink-0">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            activeTab === 'today'
                                ? 'bg-amber-400 text-neutral-900 shadow-lg shadow-amber-500/20'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" /> Today
                    </button>
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            activeTab === 'weekly'
                                ? 'bg-amber-400 text-neutral-900 shadow-lg shadow-amber-500/20'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" /> Weekly View
                    </button>
                </div>

                {/* View Panels */}
                <div className="flex-1 flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                        {activeTab === 'today' ? (
                            <motion.div
                                key="today-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="flex-1 flex flex-col"
                            >
                                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg flex-1 flex flex-col overflow-hidden">
                                    <CardHeader className="pb-2.5 p-4 flex flex-row items-center justify-between shrink-0">
                                        <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-emerald-400" />
                                            Today ({todayData.dayName.substring(0, 3)})
                                        </CardTitle>
                                        <span className="text-[9px] font-mono text-neutral-400 font-bold bg-white/5 px-2 py-0.5 rounded">
                                            {todayData.dateKey ? new Date(todayData.dateKey).toLocaleDateString([], {month: 'short', day: 'numeric'}) : ''}
                                        </span>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-3 flex-1 flex flex-col overflow-hidden">
                                        {todayData.isHoliday ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-2.5">
                                                <Coffee className="w-10 h-10 opacity-80" />
                                                <div className="text-center">
                                                    <h3 className="text-xs font-bold uppercase tracking-wider">Holiday</h3>
                                                    <p className="text-[10px] text-red-400/60 mt-0.5">Enjoy your holiday!</p>
                                                </div>
                                            </div>
                                        ) : todayData.slots.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center text-neutral-400 italic text-xs font-medium font-sans">
                                                No classes scheduled.
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 overflow-y-auto max-h-[350px] pr-0.5">
                                                {todayData.slots.map((slot: any) => {
                                                    const isSub = !!slot.substitution;
                                                    const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                                    const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                                    const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                                    const getTeacherDisplay = () => {
                                                        if (isSub && slot.substitution.substituteTeacherId) {
                                                            return teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId;
                                                        }
                                                        return teacherMap[slot.teacherId] || slot.teacherId || "No Teacher";
                                                    };

                                                    if (slot.type === "BREAK") {
                                                        return (
                                                            <div key={`mob-today-slot-${slot.id}`} className="py-1 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center gap-1.5 select-none shrink-0 h-7">
                                                                <Coffee className="w-3 h-3 text-neutral-500 shrink-0" />
                                                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Recess Break</span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div 
                                                            key={`mob-today-slot-${slot.id}`} 
                                                            className={`p-2 rounded-xl border flex items-center justify-between gap-3 ${
                                                                isSub 
                                                                    ? "bg-yellow-500/10 border-yellow-500/20" 
                                                                    : "bg-white/5 border-white/10"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 truncate">
                                                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 select-none">
                                                                    P{slot.id}
                                                                </div>
                                                                <div className="truncate">
                                                                    <div className="font-extrabold text-xs text-white truncate capitalize">
                                                                        {isLeisure || rawSubjectId === "leisure" ? (
                                                                            <span className="text-emerald-400 font-medium">Free Period</span>
                                                                        ) : (
                                                                            `${subjectName} (${getTeacherDisplay()})`
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isSub && (
                                                                <Badge className="text-[7.5px] bg-yellow-500/20 text-yellow-500 border-none font-bold px-1 py-0.2 shrink-0 select-none">
                                                                    Changed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="weekly-tab"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="flex-1 flex flex-col"
                            >
                                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg flex-1 flex flex-col overflow-hidden">
                                    <CardHeader className="pb-2.5 p-4 space-y-2.5 shrink-0">
                                        <CardTitle className="text-xs font-bold text-white flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 font-display">
                                                <Calendar className="w-4 h-4 text-amber-400" />
                                                Weekly Schedule
                                            </span>
                                            <span className="text-[9px] font-mono text-neutral-400 font-bold bg-white/5 px-2 py-0.5 rounded">
                                                {weeklyDayData.dateLabel}
                                            </span>
                                        </CardTitle>

                                        {/* Horizontal Week Bubble Strip */}
                                        <div className="flex gap-1 bg-white/5 p-0.5 rounded-xl border border-white/5 select-none w-full">
                                            {DAYS.map(day => {
                                                const isSelected = selectedWeeklyDay === day;
                                                return (
                                                    <button
                                                        key={`mob-week-day-${day}`}
                                                        onClick={() => setSelectedWeeklyDay(day)}
                                                        className={`flex-1 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all duration-300 font-display ${
                                                            isSelected
                                                                ? "bg-amber-400 text-neutral-900 shadow-sm font-black"
                                                                : "text-white/60 hover:text-white"
                                                        }`}
                                                    >
                                                        {day.substring(0, 3)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="px-3 pb-3 flex-1 flex flex-col overflow-hidden">
                                        {weeklyDayData.isHoliday ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-2.5">
                                                <Coffee className="w-10 h-10 opacity-80" />
                                                <div className="text-center">
                                                    <h3 className="text-xs font-bold uppercase tracking-wider">Holiday</h3>
                                                    <p className="text-[10px] text-red-400/60 mt-0.5">School closed today.</p>
                                                </div>
                                            </div>
                                        ) : weeklyDayData.slots.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center text-neutral-400 italic text-xs font-medium font-sans">
                                                No classes scheduled.
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 overflow-y-auto max-h-[290px] pr-0.5">
                                                {weeklyDayData.slots.map((slot: any) => {
                                                    const isSub = !!slot.substitution;
                                                    const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                                    const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                                    const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                                    const getTeacherDisplay = () => {
                                                        if (isSub && slot.substitution.substituteTeacherId) {
                                                            return teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId;
                                                        }
                                                        return teacherMap[slot.teacherId] || slot.teacherId || "No Teacher";
                                                    };

                                                    if (slot.type === "BREAK") {
                                                        return (
                                                            <div key={`mob-week-slot-${slot.id}`} className="py-1 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center gap-1.5 select-none shrink-0 h-7">
                                                                <Coffee className="w-3 h-3 text-neutral-500 shrink-0" />
                                                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Recess Break</span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div 
                                                            key={`mob-week-slot-${slot.id}`} 
                                                            className={`p-2 rounded-xl border flex items-center justify-between gap-3 ${
                                                                isSub 
                                                                    ? "bg-yellow-500/10 border-yellow-500/20" 
                                                                    : "bg-white/5 border-white/10"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 truncate">
                                                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 select-none">
                                                                    P{slot.id}
                                                                </div>
                                                                <div className="truncate">
                                                                    <div className="font-extrabold text-xs text-white truncate capitalize">
                                                                        {isLeisure || rawSubjectId === "leisure" ? (
                                                                            <span className="text-emerald-400 font-medium">Free Period</span>
                                                                        ) : (
                                                                            `${subjectName} (${getTeacherDisplay()})`
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isSub && (
                                                                <Badge className="text-[7.5px] bg-yellow-500/20 text-yellow-500 border-none font-bold px-1 py-0.2 shrink-0 select-none">
                                                                    Changed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
