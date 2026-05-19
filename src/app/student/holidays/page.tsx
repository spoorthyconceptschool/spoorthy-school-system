"use client";

import { useStudentData } from "@/context/StudentDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Info, ArrowLeft, Coffee, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function StudentHolidaysPage() {
    const { notices, loading } = useStudentData();

    const holidays = notices.filter((n: any) => n.type === "HOLIDAY");

    const formatHolidayDate = (h: any) => {
        if (h.startDate) {
            const start = new Date(h.startDate.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (h.endDate && h.startDate.seconds !== h.endDate.seconds) {
                const end = new Date(h.endDate.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `${start} - ${end}`;
            }
            return start;
        }
        return new Date(h.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDetailedDateBadge = (h: any) => {
        const d = h.startDate ? new Date(h.startDate.seconds * 1000) : new Date(h.createdAt?.seconds * 1000 || Date.now());
        const day = d.getDate();
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
        return { day, month, weekday };
    };

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
                DESKTOP HOLIDAYS CARD GRID (>= lg)
                ======================================= */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-6 w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative">
                
                {/* Glowing Blur Accents */}
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[90px] pointer-events-none" />

                {/* Header Row */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg">
                            <Calendar className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Academic Holidays</h1>
                            <p className="text-xs text-neutral-400 font-medium">Scheduled school closures, seasonal vacations, and observed events.</p>
                        </div>
                    </div>

                    <Link href="/student">
                        <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white gap-2 rounded-xl">
                            <ArrowLeft className="w-4 h-4" /> Dashboard
                        </Button>
                    </Link>
                </div>

                {holidays.length === 0 ? (
                    <Card className="bg-[#112240]/40 border-white/10 p-12 text-center flex flex-col items-center justify-center rounded-2xl min-h-[300px] relative z-10">
                        <Coffee className="w-12 h-12 text-amber-400 mb-4 animate-pulse" />
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">No Scheduled Holidays</h2>
                        <p className="text-sm text-neutral-400 mt-2 max-w-xs leading-relaxed">
                            No holidays or term breaks are scheduled at the moment. Keep working hard!
                        </p>
                    </Card>
                ) : (
                    /* Elegant Holiday Card Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {holidays.map((h) => {
                            const { day, month, weekday } = getDetailedDateBadge(h);
                            return (
                                <Card 
                                    key={h.id} 
                                    className="bg-[#112240]/40 border-white/5 hover:border-amber-500/20 transition-all duration-300 shadow-xl group overflow-hidden relative"
                                >
                                    {/* Accent gradient ring */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-600 opacity-60" />
                                    
                                    <CardContent className="p-6 flex gap-4 text-left">
                                        
                                        {/* Stylized Calendar Tear-Off Sheet Icon */}
                                        <div className="flex flex-col items-center w-14 shrink-0 bg-white rounded-xl overflow-hidden shadow-md select-none">
                                            <div className="bg-red-500 text-white font-extrabold text-[8px] uppercase py-1 w-full text-center tracking-widest">
                                                {month}
                                            </div>
                                            <div className="text-neutral-800 font-black text-lg py-1 leading-none text-center">
                                                {day}
                                            </div>
                                            <div className="bg-neutral-100 text-neutral-400 font-bold text-[7.5px] uppercase py-0.5 w-full text-center border-t border-neutral-200">
                                                {weekday}
                                            </div>
                                        </div>

                                        {/* Holiday Details */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-extrabold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                                                        {h.title}
                                                    </h3>
                                                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[7px] font-black uppercase shrink-0">
                                                        Vacation
                                                    </Badge>
                                                </div>
                                                
                                                <p className="text-xs text-neutral-400 leading-relaxed font-medium line-clamp-3">
                                                    {h.content}
                                                </p>
                                            </div>

                                            {/* Date range footer */}
                                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold select-none pt-2 border-t border-white/5">
                                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Duration: {formatHolidayDate(h)}</span>
                                            </div>
                                        </div>

                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* =======================================
                MOBILE COMPACT LIST VIEW (< lg)
                ======================================= */}
            <div className="max-w-md mx-auto lg:hidden flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-500 pb-4 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] px-2.5">
                
                {/* Soft Glowing Blur Accents */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Title / Header */}
                <div className="flex items-center justify-between px-1 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                            <Calendar className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-extrabold text-white">Academic Holidays</h1>
                            <p className="text-[10px] text-neutral-400">School closures and seasonal vacations.</p>
                        </div>
                    </div>

                    <Link href="/student" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/10 transition-all shadow">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>

                {/* Mobile scroll box */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex-1 flex flex-col min-h-[300px]">
                        {holidays.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-[#112240]/40 border border-white/10 rounded-3xl p-6 text-center backdrop-blur-md shadow-2xl">
                                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-inner relative">
                                    <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-md" />
                                    <Calendar className="w-8 h-8 text-amber-400 relative z-10" />
                                </div>
                                <h3 className="text-sm font-extrabold text-white mb-1">No Holidays Scheduled</h3>
                                <p className="text-[10.5px] text-neutral-400 max-w-[200px] leading-relaxed">
                                    There are no upcoming school holidays scheduled in the calendar.
                                </p>
                            </div>
                        ) : (
                            <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg flex-1 flex flex-col overflow-hidden">
                                <CardContent className="p-3 overflow-y-auto max-h-[300px] space-y-2.5">
                                    {holidays.map((h, i) => (
                                        <div key={h.id || i} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-amber-500/25 transition-all">
                                            <div className="flex items-center gap-2.5 truncate">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 select-none">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div className="truncate text-left">
                                                    <h4 className="text-[11px] font-extrabold text-white truncate">{h.title}</h4>
                                                    <p className="text-[9px] text-neutral-400 truncate mt-0.5">{h.content}</p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-end gap-1 select-none">
                                                <Badge className="text-[7.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.2 shrink-0">
                                                    Holiday
                                                </Badge>
                                                <span className="text-[8px] font-bold text-neutral-400 tracking-wider shrink-0 font-mono">
                                                    {formatHolidayDate(h)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Back to Home Button Footer */}
                    <div className="shrink-0 pt-1 shrink-0">
                        <Link href="/student" className="block">
                            <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-xs h-10 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-inner">
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
