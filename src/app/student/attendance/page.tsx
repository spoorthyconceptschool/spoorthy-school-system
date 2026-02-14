"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, PieChart as PieChartIcon, ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { motion } from "framer-motion";

export default function StudentAttendancePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
    const [attendanceMap, setAttendanceMap] = useState<Record<string, 'P' | 'A'>>({});
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // 1. Get Student Profile to know Class/Section and School ID
                // User email is SHSxxxxx@school.local, generally schoolId is the prefix.
                // Or fetch from /students/{uid} or /students -> where uid == user.uid

                // reliable way: query students by uid
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const snap = await getDocs(q);

                if (snap.empty) {
                    console.error("Student profile not found");
                    setLoading(false);
                    return;
                }

                const student = snap.docs[0].data();
                const studentId = student.schoolId || snap.docs[0].id; // The ID used in attendance records
                const classId = student.classId;
                const sectionId = student.sectionId;

                if (!classId) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch Attendance for this Class
                // Query all attendance records for this class (We fetch all to calculate YTD stats)
                // Optimization: Maybe limit to current academic year? For now, fetch all.
                const attQuery = query(
                    collection(db, "attendance"),
                    where("classId", "==", classId),
                    where("sectionId", "==", sectionId) // Attendance is usually per section
                );

                const attSnap = await getDocs(attQuery);

                const map: Record<string, 'P' | 'A'> = {};
                let present = 0;
                let absent = 0;
                let total = 0;

                attSnap.forEach(doc => {
                    const data = doc.data();
                    const status = data.records?.[studentId];
                    if (status) {
                        map[data.date] = status;
                        total++;
                        if (status === 'P') present++;
                        else if (status === 'A') absent++;
                    }
                });

                setAttendanceMap(map);
                setStats({
                    total,
                    present,
                    absent,
                    percentage: total > 0 ? Math.round((present / total) * 100) : 0
                });

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    // Pie Chart Data
    // We'll create a simple SVG Pie Chart
    const radius = 50;
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
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                    My Attendance
                </h1>
                <p className="text-muted-foreground">Track your comprehensive attendance record.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white flex items-baseline gap-2">
                            {stats.percentage}%
                            <span className="text-sm font-normal text-muted-foreground">Total</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400 uppercase tracking-widest">Present Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white">{stats.present}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-400 uppercase tracking-widest">Absent Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white">{stats.absent}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-400 uppercase tracking-widest">Total Working Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white">{stats.total}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <Card className="lg:col-span-2 bg-black/40 border-white/10 backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="flex items-center gap-2">
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
                        {/* Days Header */}
                        <div className="grid grid-cols-7 mb-2 text-center">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-[10px] uppercase font-bold text-muted-foreground py-2">
                                    {d}
                                </div>
                            ))}
                        </div>
                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {emptyDays.map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            {daysInMonth.map(date => {
                                const dateStr = format(date, 'yyyy-MM-dd');
                                const status = attendanceMap[dateStr];
                                const isToday = isSameDay(date, new Date());

                                return (
                                    <div
                                        key={dateStr}
                                        className={`
                                            aspect-square rounded-lg flex items-center justify-center text-sm font-bold relative group border transition-all
                                            ${status === 'P'
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                : status === 'A'
                                                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                                            }
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}
                                        `}
                                    >
                                        {format(date, 'd')}
                                        {status && (
                                            <div className="absolute inset-x-0 -bottom-8 bg-black/90 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-center border border-white/10">
                                                {status === 'P' ? 'Present' : 'Absent'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Pie Chart Visualization */}
                <Card className="bg-black/40 border-white/10 backdrop-blur-md flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-purple-400" /> Check Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
                        <div className="relative w-64 h-64">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                {/* Background Circle (Absent/Total) */}
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="transparent"
                                    stroke="rgba(239, 68, 68, 0.2)" // Red for absent base
                                    strokeWidth="12"
                                />
                                {/* Absent Fill (Remaining) - Actually we just need Present to overlay */}

                                {/* Present Circle (Green) */}
                                <motion.circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="transparent"
                                    stroke="#10b981" // Emerald 500
                                    strokeWidth="12"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={presentOffset}
                                    strokeLinecap="round"
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: presentOffset }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>

                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-white">{stats.percentage}%</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Attendance</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-8 grid grid-cols-2 gap-4 w-full px-8">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase">Present</div>
                                    <div className="font-bold text-emerald-400">{stats.present} Days</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase">Absent</div>
                                    <div className="font-bold text-red-400">{stats.absent} Days</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
