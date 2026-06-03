"use client";

import { useStudentData } from "@/context/StudentDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Coffee, ArrowLeft } from "lucide-react";
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
            <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-amber-400">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                    Loading holiday calendar...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 relative bg-transparent pb-28 md:pb-8 text-left">
            
            {/* Glowing Accent Orbs */}
            <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[40%] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] right-[-5%] w-[45%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Row */}
            <div className="flex flex-row justify-between items-center border-b border-white/[0.05] pb-4 relative z-10 select-none">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shrink-0">
                        <Calendar className="w-4.5 h-4.5 md:w-5 md:h-5 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-white tracking-tight">Academic Holidays</h1>
                        <p className="text-[10px] md:text-xs text-white/50 font-medium hidden sm:block">Scheduled school closures, seasonal vacations, and observed breaks.</p>
                    </div>
                </div>

                <Link href="/student">
                    <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white gap-1.5 rounded-xl text-xs px-3 h-9 md:h-10">
                        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                    </Button>
                </Link>
            </div>

            {holidays.length === 0 ? (
                <Card className="bg-[#112240]/30 border-white/[0.05] p-12 text-center flex flex-col items-center justify-center rounded-2xl min-h-[300px] relative z-10 border">
                    <Coffee className="w-12 h-12 text-amber-400 mb-4 animate-pulse" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">No Scheduled Holidays</h2>
                    <p className="text-xs text-white/40 mt-2 max-w-xs leading-relaxed">
                        No holidays or term breaks are scheduled in the school calendar at the moment. Keep up the great work!
                    </p>
                </Card>
            ) : (
                /* Elegant Adaptive Holiday Card Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
                    {holidays.map((h, index) => {
                        const { day, month, weekday } = getDetailedDateBadge(h);
                        return (
                            <motion.div
                                key={h.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card 
                                    className="bg-[#112240]/30 border-white/[0.05] hover:border-amber-500/20 transition-all duration-300 shadow-xl group overflow-hidden relative border h-full rounded-2xl"
                                >
                                    {/* Accent gradient ring */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-600 opacity-60" />
                                    
                                    <CardContent className="p-5 flex gap-4 text-left items-start">
                                        
                                        {/* Stylized Calendar Tear-Off Sheet Icon */}
                                        <div className="flex flex-col items-center w-14 shrink-0 bg-white rounded-xl overflow-hidden shadow-md select-none border border-white/20">
                                            <div className="bg-red-500 text-white font-extrabold text-[8px] uppercase py-1 w-full text-center tracking-widest leading-none">
                                                {month}
                                            </div>
                                            <div className="text-neutral-800 font-black text-lg py-1 leading-none text-center">
                                                {day}
                                            </div>
                                            <div className="bg-neutral-100 text-neutral-400 font-bold text-[7.5px] uppercase py-0.5 w-full text-center border-t border-neutral-200 leading-none">
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
                                                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[7px] font-black uppercase shrink-0 px-1.5 py-0">
                                                        Vacation
                                                    </Badge>
                                                </div>
                                                
                                                <p className="text-xs text-white/60 leading-relaxed font-medium line-clamp-3 break-words">
                                                    {h.content}
                                                </p>
                                            </div>

                                            {/* Date range footer */}
                                            <div className="flex items-center gap-1.5 text-[9px] text-white/40 font-semibold select-none pt-2 border-t border-white/5 font-mono">
                                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Duration: {formatHolidayDate(h)}</span>
                                            </div>
                                        </div>

                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
