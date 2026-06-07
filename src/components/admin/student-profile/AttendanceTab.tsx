"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, CheckCircle2, XCircle } from "lucide-react";

interface AttendanceTabProps {
    attendanceMap: Record<string, 'P' | 'A'>;
    attendanceStats: {
        total: number;
        present: number;
        absent: number;
        percentage: number;
    };
    viewingYear: string;
    loading?: boolean;
}

export function AttendanceTab({
    attendanceMap,
    attendanceStats,
    viewingYear,
    loading
}: AttendanceTabProps) {

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-[200px] bg-white/5 rounded-[2rem]" />
                <div className="h-[300px] bg-white/5 rounded-[2rem]" />
            </div>
        );
    }

    const academicMonths = [
        { name: "June", month: 5, yearOffset: 0 },
        { name: "July", month: 6, yearOffset: 0 },
        { name: "August", month: 7, yearOffset: 0 },
        { name: "September", month: 8, yearOffset: 0 },
        { name: "October", month: 9, yearOffset: 0 },
        { name: "November", month: 10, yearOffset: 0 },
        { name: "December", month: 11, yearOffset: 0 },
        { name: "January", month: 0, yearOffset: 1 },
        { name: "February", month: 1, yearOffset: 1 },
        { name: "March", month: 2, yearOffset: 1 },
        { name: "April", month: 3, yearOffset: 1 },
        { name: "May", month: 4, yearOffset: 1 }
    ];

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const [startYearStr] = viewingYear.split("-");
    const startYear = Number(startYearStr) || new Date().getFullYear();

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 pb-8">
            {/* Master Attendance Summary Card */}
            <div className="flex flex-row items-center justify-between p-3 rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] border border-indigo-500/30 shadow-lg ring-1 ring-white/5 relative overflow-hidden gap-2">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
                
                <div className="flex-1 text-left pl-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-blue-400/80 mb-0.5">Overall</p>
                    <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-500 tracking-tight leading-none drop-shadow-md">
                        {attendanceStats.percentage}%
                    </h3>
                </div>
                
                <div className="w-[1px] h-8 bg-white/10" />
                
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400/80 mb-0.5">Present</p>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-none">
                        {attendanceStats.present}
                    </h3>
                </div>
                
                <div className="w-[1px] h-8 bg-white/10" />
                
                <div className="flex-1 text-right pr-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-rose-400/80 mb-0.5">Absent</p>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-none">
                        {attendanceStats.absent}
                    </h3>
                </div>
            </div>

            {/* Heatmap / Calendar Style */}
            <Card className="bg-[#0f172a] border-white/5 rounded-[1.5rem] shadow-2xl overflow-hidden">
                <CardHeader className="bg-white/[0.02] border-b border-white/5 py-3 px-4">
                    <CardTitle className="text-[14px] font-bold text-white">Academic Heatmap ({viewingYear})</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4">
                    <div className="overflow-x-auto custom-scrollbar pb-4 pt-1 snap-x">
                        <div className="flex gap-3 md:gap-5 min-w-max px-1">
                            {academicMonths.map((m, i) => {
                                const year = startYear + m.yearOffset;
                                const daysInMonth = getDaysInMonth(m.month, year);
                                
                                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                                
                                const weeks: number[][] = [];
                                let currentWeek: number[] = [];
                                
                                days.forEach(day => {
                                    currentWeek.push(day);
                                    if (currentWeek.length === 7) {
                                        weeks.push(currentWeek);
                                        currentWeek = [];
                                    }
                                });
                                if (currentWeek.length > 0) weeks.push(currentWeek);

                                return (
                                    <div key={i} className="flex flex-col gap-2 snap-center">
                                        <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full text-center">{m.name}</span>
                                        <div className="flex gap-1 p-1.5 bg-black/20 rounded-lg border border-white/5">
                                            {weeks.map((week, wIndex) => (
                                                <div key={wIndex} className="flex flex-col gap-1">
                                                    {week.map(day => {
                                                        const dateStr = `${year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                        const status = attendanceMap[dateStr];
                                                        
                                                        return (
                                                            <div 
                                                                key={day}
                                                                title={`${dateStr}: ${status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'No Data'}`}
                                                                className={cn(
                                                                    "w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] transition-all duration-300 cursor-help shadow-sm",
                                                                    status === 'P' ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20" :
                                                                    status === 'A' ? "bg-rose-500 hover:bg-rose-400 shadow-rose-500/20" :
                                                                    "bg-white/5 hover:bg-white/10"
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-bold text-[#8892B0] uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-[3px] bg-emerald-500 shadow-sm shadow-emerald-500/20"></div> Present</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-[3px] bg-rose-500 shadow-sm shadow-rose-500/20"></div> Absent</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-[3px] bg-white/5 border border-white/10"></div> No Data</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
