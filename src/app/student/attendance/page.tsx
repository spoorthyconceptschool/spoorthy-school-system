"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, PieChart as PieChartIcon, ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, getDay } from "date-fns";
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
            <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-[#10B981]">
                <Loader2 className="w-10 h-10 animate-spin text-[#10B981]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                    Parsing attendance sheets...
                </p>
            </div>
        );
    }

    // SVG Pie Chart calculations
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const presentOffset = circumference - ((stats?.percentage || 0) / 100) * circumference;

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Grid Padding
    const startDay = getDay(monthStart); // 0 (Sun) - 6 (Sat)
    const emptyDays = Array(startDay).fill(null);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 relative bg-transparent pb-28 md:pb-8 text-left select-none">
            
            {/* Glowing Accent Orbs */}
            <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] right-[-5%] w-[45%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Row */}
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4 relative z-10 select-none">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shrink-0">
                        <CalendarDays className="w-4.5 h-4.5 md:w-5 md:h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-white tracking-tight">My Attendance</h1>
                        <p className="text-[10px] md:text-xs text-white/50 font-medium hidden sm:block">Track your comprehensive daily attendance records and stats.</p>
                    </div>
                </div>
                
                <div className="text-[10px] md:text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                    {stats?.percentage || 0}% Attendance Rate
                </div>
            </div>

            {/* ==========================================
                1. STATS OVERVIEW: Desktop vs Mobile
                ========================================== */}
            {/* Desktop Statistics Cards */}
            <div className="hidden md:grid grid-cols-4 gap-4 relative z-10">
                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md rounded-xl border">
                    <CardContent className="p-4 flex flex-col justify-between text-left space-y-1">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Attendance Rate</span>
                        <div className="text-2xl lg:text-3xl font-black text-white flex items-baseline gap-1">
                            {stats?.percentage || 0}%
                            <span className="text-[10px] text-white/30 font-medium font-sans">Total</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md rounded-xl border">
                    <CardContent className="p-4 flex flex-col justify-between text-left space-y-1">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Present Days</span>
                        <div className="text-2xl lg:text-3xl font-black text-white">
                            {stats?.present || 0} <span className="text-xs text-white/30 font-medium font-sans">Days</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md rounded-xl border">
                    <CardContent className="p-4 flex flex-col justify-between text-left space-y-1">
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Absent Days</span>
                        <div className="text-2xl lg:text-3xl font-black text-white">
                            {stats?.absent || 0} <span className="text-xs text-white/30 font-medium font-sans">Days</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md rounded-xl border">
                    <CardContent className="p-4 flex flex-col justify-between text-left space-y-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Total Working Days</span>
                        <div className="text-2xl lg:text-3xl font-black text-white">
                            {stats?.total || 0} <span className="text-xs text-white/30 font-medium font-sans">Days</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Statistics Compact Pills */}
            <div className="grid grid-cols-4 gap-2 md:hidden">
                <div className="bg-[#112240]/30 border border-white/5 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Rate</div>
                    <div className="text-xs font-black text-white mt-0.5">{stats?.percentage || 0}%</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-emerald-400 tracking-wider">Present</div>
                    <div className="text-xs font-black text-emerald-300 mt-0.5">{stats?.present || 0}d</div>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-rose-400 tracking-wider">Absent</div>
                    <div className="text-xs font-black text-rose-350 mt-0.5">{stats?.absent || 0}d</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-blue-400 tracking-wider">Total</div>
                    <div className="text-xs font-black text-blue-300 mt-0.5">{stats?.total || 0}d</div>
                </div>
            </div>

            {/* ==========================================
                2. SEGMENT CONTROL TOGGLER (Mobile Only)
                ========================================== */}
            <div className="flex bg-[#112240]/40 p-1 rounded-xl border border-white/10 w-full max-w-sm mx-auto select-none md:hidden shrink-0">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'calendar' ? 'text-white' : 'text-white/60'
                    }`}
                >
                    {activeTab === 'calendar' && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5" /> Calendar
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'analytics' ? 'text-white' : 'text-white/60'
                    }`}
                >
                    {activeTab === 'analytics' && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                        <PieChartIcon className="w-3.5 h-3.5" /> Analytics
                    </span>
                </button>
            </div>

            {/* ==========================================
                3. MAIN PANELS: Desktop side-by-side vs Mobile tab-toggled
                ========================================== */}
            
            {/* Desktop Layout (Both always rendered side-by-side) */}
            <div className="hidden md:grid grid-cols-3 gap-6 items-start relative z-10">
                
                {/* Desktop Calendar Card */}
                <Card className="col-span-2 bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-xl rounded-2xl border">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 p-5">
                        <CardTitle className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight select-none">
                            <CalendarIcon className="w-4.5 h-4.5 text-emerald-450" />
                            {format(currentMonth, 'MMMM yyyy')}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 bg-black/40 border-white/10 hover:bg-white/10 text-white rounded-lg">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 bg-black/40 border-white/10 hover:bg-white/10 text-white rounded-lg">
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                        <div className="grid grid-cols-7 mb-2 text-center select-none">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-[10px] uppercase font-black text-white/30 py-2 tracking-widest font-mono">
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
                                            aspect-square rounded-xl flex items-center justify-center text-sm font-black relative group border transition-all cursor-pointer select-none
                                            ${isHoliday 
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                                : status === 'P'
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                : status === 'A'
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-450 hover:bg-rose-500/20'
                                                    : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]'
                                            }
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#030712]' : ''}
                                        `}
                                    >
                                        {format(date, 'd')}
                                        {(status || isHoliday) && (
                                            <div className="absolute inset-x-0 -bottom-9 bg-black/95 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-center border border-white/10 shadow-lg">
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
                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-xl rounded-2xl flex flex-col border h-full">
                    <CardHeader className="pb-2 p-5">
                        <CardTitle className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight select-none">
                            <PieChartIcon className="w-4.5 h-4.5 text-emerald-450" /> Rate Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-5 pt-2">
                        <div className="relative w-44 h-44 lg:w-48 lg:h-48">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="transparent"
                                    stroke="rgba(244, 63, 94, 0.1)"
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
                                <span className="text-2xl lg:text-3xl font-black text-white">{stats?.percentage || 0}%</span>
                                <span className="text-[8px] lg:text-[9px] text-white/40 uppercase tracking-widest font-black font-mono">Present Rate</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <div>
                                    <div className="text-[8px] text-white/40 uppercase font-black font-mono">Present</div>
                                    <div className="font-extrabold text-emerald-400 text-xs mt-0.5">{stats?.present || 0} Days</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                <div>
                                    <div className="text-[8px] text-white/40 uppercase font-black font-mono">Absent</div>
                                    <div className="font-extrabold text-rose-450 text-xs mt-0.5">{stats?.absent || 0} Days</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Layout (Tab toggled) */}
            <div className="md:hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'calendar' ? (
                        <motion.div
                            key="calendar-tab"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="bg-[#112240]/30 border-white/10 backdrop-blur-md shadow-lg overflow-hidden border rounded-2xl">
                                <CardHeader className="flex flex-row items-center justify-between pb-2.5 p-4">
                                    <CardTitle className="flex items-center gap-1.5 text-xs text-white font-extrabold tracking-tight">
                                        <CalendarIcon className="w-4 h-4 text-emerald-400" />
                                        {format(currentMonth, 'MMMM yyyy')}
                                    </CardTitle>
                                    <div className="flex gap-1.5">
                                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-7 w-7 bg-black/40 border-white/10 hover:bg-white/10 rounded-md">
                                            <ArrowLeft className="w-3.5 h-3.5 text-white" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-7 w-7 bg-black/40 border-white/10 hover:bg-white/10 rounded-md">
                                            <ArrowRight className="w-3.5 h-3.5 text-white" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-3 pb-4">
                                    {/* Days Header */}
                                    <div className="grid grid-cols-7 mb-1.5 text-center font-mono">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                            <div key={d} className="text-[8px] uppercase font-black text-white/30 tracking-widest">
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
                                                        aspect-square h-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all select-none
                                                        ${isHoliday 
                                                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                                            : status === 'P'
                                                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                                            : status === 'A'
                                                                ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                                                                : 'bg-white/5 border-white/5 text-white/40'
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
                                    <div className="mt-4 pt-3.5 border-t border-white/5 flex justify-center gap-4 text-[8px] font-black tracking-widest text-white/30 uppercase select-none font-mono">
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Absent
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Holiday
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="analytics-tab"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="bg-[#112240]/30 border-white/10 backdrop-blur-md shadow-lg border rounded-2xl">
                                <CardHeader className="pb-1 p-4">
                                    <CardTitle className="flex items-center gap-1.5 text-xs text-white font-extrabold tracking-tight">
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
                                                stroke="rgba(244, 63, 94, 0.1)"
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
                                            <span className="text-2xl font-black text-white">{stats?.percentage || 0}%</span>
                                            <span className="text-[8px] text-white/30 uppercase tracking-widest font-black font-mono">Present Rate</span>
                                        </div>
                                    </div>

                                    {/* Legend blocks */}
                                    <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-left">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                            <div>
                                                <div className="text-[8px] text-white/30 uppercase font-black font-mono">Present</div>
                                                <div className="font-extrabold text-emerald-400 text-[11px] mt-0.5">{stats?.present || 0} Days</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/15 text-left">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                            <div>
                                                <div className="text-[8px] text-white/30 uppercase font-black font-mono">Absent</div>
                                                <div className="font-extrabold text-rose-450 text-[11px] mt-0.5">{stats?.absent || 0} Days</div>
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
