"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, PieChart as PieChartIcon, ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useStudentData } from "@/context/StudentDataContext";

export default function StudentAttendancePage() {
    const { user } = useAuth();
    const { attendanceMap, attendanceStats: stats, notices, loading } = useStudentData();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'calendar' | 'analytics'>('calendar');

    const holidays = notices.filter((n: any) => n.type === "HOLIDAY");

    const isDateHoliday = (date: Date) => {
        return holidays.some(h => {
            const start = h.startDate?.seconds ? new Date(h.startDate.seconds * 1000) : (h.date?.seconds ? new Date(h.date.seconds * 1000) : (h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000) : new Date()));
            const end = h.endDate?.seconds ? new Date(h.endDate.seconds * 1000) : new Date(start.getTime());
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        });
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    if (loading && Object.keys(attendanceMap).length === 0) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
            </div>
        );
    }

    // SVG Pie Chart calculations
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const presentOffset = circumference - (stats.percentage / 100) * circumference;

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Grid Padding
    const startDay = getDay(monthStart); // 0 (Sun) - 6 (Sat)
    const emptyDays = Array(startDay).fill(null);

    return (
        <div className="max-w-6xl mx-auto flex flex-col space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-4 md:pb-10 relative select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] min-h-[calc(100vh-160px)] p-4 rounded-3xl">
            {/* Header and Subtext */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                        My Attendance
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Track your comprehensive attendance record.</p>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full md:hidden">
                    {stats.percentage}% Rate
                </div>
            </div>

            {/* ==========================================
                1. STATS OVERVIEW: Desktop vs Mobile
                ========================================== */}
            {/* Desktop: 4 Grid Cards */}
            <div className="hidden md:grid grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-md">
                    <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-black text-white flex items-baseline gap-2">
                            {stats.percentage}%
                            <span className="text-xs font-normal text-muted-foreground">Total</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-md">
                    <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Present Days</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-black text-white">{stats.present} <span className="text-xs text-muted-foreground font-normal">Days</span></div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-md">
                    <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Absent Days</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-black text-white">{stats.absent} <span className="text-xs text-muted-foreground font-normal">Days</span></div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm shadow-md">
                    <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Total Working Days</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-black text-white">{stats.total} <span className="text-xs text-muted-foreground font-normal">Days</span></div>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile: Ultra-Compact Stat Pills Row (Only 48px high, saving ~250px) */}
            <div className="grid grid-cols-4 gap-2 md:hidden">
                <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-neutral-400 tracking-wider">Rate</div>
                    <div className="text-xs font-black text-white mt-0.5">{stats.percentage}%</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-emerald-400 tracking-wider">Present</div>
                    <div className="text-xs font-black text-emerald-300 mt-0.5">{stats.present}d</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-red-400 tracking-wider">Absent</div>
                    <div className="text-xs font-black text-red-300 mt-0.5">{stats.absent}d</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-blue-400 tracking-wider">Total</div>
                    <div className="text-xs font-black text-blue-300 mt-0.5">{stats.total}d</div>
                </div>
            </div>

            {/* ==========================================
                2. SEGMENT CONTROL TOGGLER (Mobile Only)
                ========================================== */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full max-w-sm mx-auto select-none md:hidden">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'calendar'
                            ? 'bg-[#10B981] text-white shadow-lg shadow-emerald-500/20'
                            : 'text-white/60 hover:text-white'
                    }`}
                >
                    <CalendarIcon className="w-3.5 h-3.5" /> Calendar
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'analytics'
                            ? 'bg-[#10B981] text-white shadow-lg shadow-emerald-500/20'
                            : 'text-white/60 hover:text-white'
                    }`}
                >
                    <PieChartIcon className="w-3.5 h-3.5" /> Analytics
                </button>
            </div>

            {/* ==========================================
                3. MAIN PANELS: Desktop side-by-side vs Mobile tab-toggled
                ========================================== */}
            {/* Desktop Layout (Both always rendered side-by-side) */}
            <div className="hidden md:grid grid-cols-3 gap-6 items-start">
                
                {/* Desktop Calendar Card */}
                <Card className="col-span-2 bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="flex items-center gap-2 text-white">
                            <CalendarIcon className="w-5 h-5 text-emerald-400" />
                            {format(currentMonth, 'MMMM yyyy')}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 bg-black/50 border-white/20 hover:bg-white/10">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 bg-black/50 border-white/20 hover:bg-white/10">
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 mb-2 text-center">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-[10px] uppercase font-black text-muted-foreground py-2 tracking-wider">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {emptyDays.map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            {daysInMonth.map(date => {
                                const dateStr = format(date, 'yyyy-MM-dd');
                                const status = attendanceMap[dateStr];
                                const isToday = isSameDay(date, new Date());
                                const isHoliday = isDateHoliday(date);

                                return (
                                    <div
                                        key={dateStr}
                                        className={`
                                            aspect-square rounded-lg flex items-center justify-center text-sm font-extrabold relative group border transition-all cursor-pointer
                                            ${isHoliday 
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                                                : status === 'P'
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                : status === 'A'
                                                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                                            }
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}
                                        `}
                                    >
                                        {format(date, 'd')}
                                        {(status || isHoliday) && (
                                            <div className="absolute inset-x-0 -bottom-8 bg-black/90 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-center border border-white/10">
                                                {isHoliday ? 'Holiday' : (status === 'P' ? 'Present' : 'Absent')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Desktop Analytics Card */}
                <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-xl flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-white">
                            <PieChartIcon className="w-5 h-5 text-emerald-400" /> Check Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
                        <div className="relative w-52 h-52">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="transparent"
                                    stroke="rgba(239, 68, 68, 0.15)"
                                    strokeWidth="10"
                                />
                                <motion.circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="transparent"
                                    stroke="#10b981"
                                    strokeWidth="10"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={presentOffset}
                                    strokeLinecap="round"
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: presentOffset }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">{stats.percentage}%</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Attendance</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3 w-full px-2">
                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                <div>
                                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Present</div>
                                    <div className="font-extrabold text-emerald-400 text-sm">{stats.present} Days</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                <div>
                                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Absent</div>
                                    <div className="font-extrabold text-red-400 text-sm">{stats.absent} Days</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Layout (Tab toggled, extremely compact, guaranteed ZERO vertical scroll) */}
            <div className="md:hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'calendar' ? (
                        <motion.div
                            key="calendar-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between pb-2.5 p-4">
                                    <CardTitle className="flex items-center gap-1.5 text-sm text-white">
                                        <CalendarIcon className="w-4 h-4 text-emerald-400" />
                                        {format(currentMonth, 'MMMM yyyy')}
                                    </CardTitle>
                                    <div className="flex gap-1.5">
                                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-7 w-7 bg-black/40 border-white/10 hover:bg-white/10">
                                            <ArrowLeft className="w-3.5 h-3.5 text-white" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-7 w-7 bg-black/40 border-white/10 hover:bg-white/10">
                                            <ArrowRight className="w-3.5 h-3.5 text-white" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-3 pb-4">
                                    {/* Days Header */}
                                    <div className="grid grid-cols-7 mb-1 text-center">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                            <div key={d} className="text-[8px] uppercase font-black text-neutral-400 tracking-wider">
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Days Grid - Extremely Compact Day Cells */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {emptyDays.map((_, i) => (
                                            <div key={`empty-mob-${i}`} className="aspect-square h-8" />
                                        ))}
                                        {daysInMonth.map(date => {
                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            const status = attendanceMap[dateStr];
                                            const isToday = isSameDay(date, new Date());
                                            const isHoliday = isDateHoliday(date);

                                            return (
                                                <div
                                                    key={`mob-${dateStr}`}
                                                    className={`
                                                        aspect-square h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all
                                                        ${isHoliday 
                                                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                                                            : status === 'P'
                                                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                                            : status === 'A'
                                                                ? 'bg-red-500/10 border-red-500/25 text-red-400'
                                                                : 'bg-white/5 border-white/5 text-neutral-400'
                                                        }
                                                        ${isToday ? 'ring-1.5 ring-blue-500 ring-offset-1 ring-offset-black' : ''}
                                                    `}
                                                >
                                                    {format(date, 'd')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Compact Legend Indicators */}
                                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-center gap-4 text-[9px] font-bold text-neutral-400 uppercase select-none">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-red-500" /> Absent
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500" /> Holiday
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="analytics-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg">
                                <CardHeader className="pb-1 p-4">
                                    <CardTitle className="flex items-center gap-1.5 text-sm text-white">
                                        <PieChartIcon className="w-4 h-4 text-emerald-400" /> Attendance Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center p-4">
                                    
                                    {/* Compact Circular SVG */}
                                    <div className="relative w-40 h-40">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r={radius}
                                                fill="transparent"
                                                stroke="rgba(239, 68, 68, 0.15)"
                                                strokeWidth="10"
                                            />
                                            <motion.circle
                                                cx="60"
                                                cy="60"
                                                r={radius}
                                                fill="transparent"
                                                stroke="#10b981"
                                                strokeWidth="10"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={presentOffset}
                                                strokeLinecap="round"
                                                initial={{ strokeDashoffset: circumference }}
                                                animate={{ strokeDashoffset: presentOffset }}
                                                transition={{ duration: 1.0, ease: "easeOut" }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-white">{stats.percentage}%</span>
                                            <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-extrabold">Attendance</span>
                                        </div>
                                    </div>

                                    {/* Legend blocks */}
                                    <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                            <div>
                                                <div className="text-[8px] text-neutral-400 uppercase font-bold">Present</div>
                                                <div className="font-black text-emerald-400 text-xs mt-0.5">{stats.present} Days</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                            <div>
                                                <div className="text-[8px] text-neutral-400 uppercase font-bold">Absent</div>
                                                <div className="font-black text-red-400 text-xs mt-0.5">{stats.absent} Days</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
