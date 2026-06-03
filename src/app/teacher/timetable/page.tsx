"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
    Loader2, Calendar, ArrowLeft, Printer, Clock, Info, CheckCircle, 
    AlertCircle, Sparkles, BookOpen, Coffee, ChevronLeft, ChevronRight, UserCheck
} from "lucide-react";
import { collection, query, getDocs, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function TeacherTimetablePage() {
    const { user, userData } = useAuth();
    const { subjects, branding, selectedYear } = useMasterData();
    const router = useRouter();

    const currentYear = selectedYear || "2026-2027";
    const [schedule, setSchedule] = useState<any>(null); // weeklySchedule
    const [substitutions, setSubstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
    const [holidays, setHolidays] = useState<any[]>([]);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'planner'>('today');
    
    // Active Day selector state for today's timeline
    const [selectedWeeklyDay, setSelectedWeeklyDay] = useState<string>("MONDAY");
    const [todayDayName, setTodayDayName] = useState<string>("MONDAY");
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [selectedPlannerMonth, setSelectedPlannerMonth] = useState<Date>(new Date());
    const [selectedPlannerDate, setSelectedPlannerDate] = useState<string | null>(null);

    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const getPeriodTiming = (period: number) => {
        const timings: Record<number, string> = {
            1: "08:00 - 08:40",
            2: "08:40 - 09:20",
            3: "09:20 - 10:00",
            4: "10:20 - 11:00",
            5: "11:00 - 11:40",
            6: "11:40 - 12:20",
            7: "12:40 - 01:20",
            8: "01:20 - 02:00",
            9: "02:00 - 02:40",
            10: "02:40 - 03:20"
        };
        return timings[period] || "";
    };

    // Helper for formatting weekday dates
    const getWeekDayDateShort = (dayName: string) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday
        const dIdx = DAYS.indexOf(dayName);
        const distance = (dIdx + 1) - (currentDay === 0 ? 7 : currentDay);
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        return targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
        if (hrs < 7) hrs += 12; // Handles PM boundary
        return hrs * 60 + mins;
    };

    const parsePeriodTiming = (timeStr: string) => {
        const [startPart, endPart] = timeStr.split(" - ");
        return {
            start: getMinutes(startPart),
            end: getMinutes(endPart)
        };
    };

    useEffect(() => {
        if (user) {
            fetchTeacherProfile();
            fetchTeachers();
            fetchHolidays();
        }
    }, [user]);

    const fetchTeacherProfile = async () => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "teachers"), 
            where("uid", "==", user.uid),
            where("schoolId", "==", userData?.schoolId || "global")
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            setTeacherProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
    };

    // Real-time Timetable Listener
    useEffect(() => {
        if (!teacherProfile) return;

        const currentYear = selectedYear || "2026-2027";
        const possibleIds = [teacherProfile.id, teacherProfile.schoolId, teacherProfile.teacherId].filter(Boolean);
        if (possibleIds.length === 0) return;

        setLoading(true);

        const ttQuery = query(
            collection(db, "timetable_entries"),
            where("teacherId", "in", possibleIds),
            where("academicYear", "==", currentYear),
            where("schoolId", "==", userData?.schoolId || "global")
        );
        const subQuery1 = query(
            collection(db, "substitutions"), 
            where("originalTeacherId", "in", possibleIds),
            where("schoolId", "==", userData?.schoolId || "global")
        );
        const subQuery2 = query(
            collection(db, "substitutions"), 
            where("substituteTeacherId", "in", possibleIds),
            where("schoolId", "==", userData?.schoolId || "global")
        );

        let lastEntries = [] as any[];
        let lastOrig = [] as any[];
        let lastSub = [] as any[];

        const processAll = () => {
            const weekly: any = {};
            lastEntries.forEach(entry => {
                if (!weekly[entry.day]) weekly[entry.day] = {};
                weekly[entry.day][entry.period] = {
                    classId: entry.className ? `${entry.className}-${entry.sectionName}` : `${entry.classId}_${entry.sectionId}`,
                    className: entry.className || entry.classId,
                    sectionName: entry.sectionName || entry.sectionId,
                    subjectId: entry.subjectId
                };
            });
            setSchedule(weekly);
            setSubstitutions([...lastOrig.map(s => ({ ...s, role: "ORIGINAL" })), ...lastSub.map(s => ({ ...s, role: "SUBSTITUTE" }))]);
            setLoading(false);
        };

        const unsubTT = onSnapshot(ttQuery, (snap) => {
            lastEntries = snap.docs.map(d => d.data());
            processAll();
        }, (err) => {
            console.error("Timetable sync error:", err);
            setLoading(false);
        });

        const unsubSub1 = onSnapshot(subQuery1, (snap) => {
            lastOrig = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAll();
        });

        const unsubSub2 = onSnapshot(subQuery2, (snap) => {
            lastSub = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAll();
        });

        return () => {
            unsubTT();
            unsubSub1();
            unsubSub2();
        };
    }, [teacherProfile, selectedYear]);

    const fetchHolidays = async () => {
        try {
            const hQuery = query(
                collection(db, "notices"), 
                where("type", "==", "HOLIDAY"),
                where("schoolId", "in", [userData?.schoolId || "global", "global"])
            );
            const hSnap = await getDocs(hQuery);
            setHolidays(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.warn("[Timetable] Holiday Fetch Error", e); }
    };

    const fetchTeachers = async () => {
        try {
            const q = query(
                collection(db, "teachers"),
                where("schoolId", "==", userData?.schoolId || "global")
            );
            const snap = await getDocs(q);
            const map: Record<string, string> = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.schoolId) map[data.schoolId] = data.name;
                map[d.id] = data.name;
            });
            setTeacherMap(map);
        } catch (e) { console.warn("[Timetable] Teachers Fetch Error:", e); }
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

    const getDaySchedule = (dayName: string) => {
        const today = new Date();
        const distance = DAYS.indexOf(dayName) + 1 - today.getDay();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        const isHoliday = isDateHoliday(targetDate);
        if (isHoliday) return { dayName, dateKey, slots: Array.from({ length: 10 }).map((_, idx) => ({ id: idx + 1, type: "FREE" })), isHoliday: true };

        const slots = [];
        const rawDay = schedule?.[dayName] || {};

        for (let i = 1; i <= 10; i++) {
            const origSub = substitutions.find(s => s.date === dateKey && s.slotId === i && s.role === "ORIGINAL");
            const coverSub = substitutions.find(s => s.date === dateKey && s.slotId === i && s.role === "SUBSTITUTE");

            if (coverSub) {
                slots.push({ id: i, type: "SUBSTITUTION", classId: coverSub.classId, note: "Substitution Coverage", originalTeacherId: coverSub.originalTeacherId });
                continue;
            }
            if (origSub) {
                slots.push({ id: i, type: "LEAVE", ...(rawDay[i] || {}), note: origSub.resolutionType === "LEISURE" ? "Marked Leisure" : "Subst. Assigned" });
                continue;
            }
            const base = rawDay[i];
            if (base) {
                const classId = typeof base === 'string' ? base : base.classId;
                const subjectId = typeof base === 'object' ? base.subjectId : null;
                slots.push({ id: i, type: "REGULAR", classId, subjectId });
            } else {
                slots.push({ id: i, type: "FREE" });
            }
        }

        return { dayName, dateKey, slots, isHoliday: false };
    };

    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const todayData = getDaySchedule(DAYS.includes(todayName) ? todayName : "MONDAY");

    // Memoized scheduler statistics
    const statsInfo = useMemo(() => {
        // Calculate weekly workload count
        let workloadCount = 0;
        DAYS.forEach(day => {
            const daySched = schedule?.[day] || {};
            PERIODS.forEach(p => {
                if (daySched[p]) workloadCount++;
            });
        });

        if (todayData.isHoliday || !DAYS.includes(todayDayName) || todayData.slots.length === 0) {
            return { activeId: null, nextId: null, countdownStr: "", schoolProgress: 0, workloadCount, subCoverageCount: 0 };
        }

        const hrs = currentTime.getHours();
        const mins = currentTime.getMinutes();
        const currentMins = hrs * 60 + mins;

        // School hours bounds (08:00 - 15:20)
        const schoolStart = 480; // 08:00
        const schoolEnd = 920;   // 15:20
        const schoolProgress = Math.max(0, Math.min(100, Math.round(((currentMins - schoolStart) / (schoolEnd - schoolStart)) * 100)));

        let activeId: number | null = null;
        let nextId: number | null = null;
        let countdownStr = "";

        // Iterate period timings
        for (const pId of PERIODS) {
            const { start, end } = parsePeriodTiming(getPeriodTiming(pId));
            if (currentMins >= start && currentMins < end) {
                activeId = pId;
            } else if (currentMins < start && nextId === null) {
                const hasClass = todayData.slots.some(s => s.id === pId && s.type !== "FREE");
                if (hasClass) {
                    nextId = pId;
                    const diff = start - currentMins;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    countdownStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
            }
        }

        // Count substitutions teacher is covering today
        const subCoverageCount = todayData.slots.filter(s => s.type === "SUBSTITUTION").length;

        return { activeId, nextId, countdownStr, schoolProgress, workloadCount, subCoverageCount };
    }, [schedule, todayData, todayDayName, currentTime]);

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

    if (loading && !schedule) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-[#030712]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-[#10B981]" />
                    <span className="text-sm font-semibold text-neutral-400 font-mono tracking-wider">Syncing Schedule Engine...</span>
                </div>
            </div>
        );
    }

    const nextClassSlot = statsInfo.nextId ? todayData.slots.find(s => s.id === statsInfo.nextId) : null;
    const activeClassSlot = statsInfo.activeId ? todayData.slots.find(s => s.id === statsInfo.activeId) : null;

    // Period formatting adjustments based on total periods (10 periods) to meet Single Row requirement
    const periodCount = PERIODS.length; // 10
    const cardPadding = periodCount > 7 ? "p-1.5 md:p-2" : "p-4";
    const gapSize = periodCount > 7 ? "gap-1 md:gap-1.5" : "gap-3";
    const titleSize = periodCount > 7 ? "text-[8.5px] md:text-[10px]" : "text-xs";
    const textDetailsSize = periodCount > 7 ? "text-[8px] md:text-[9.5px]" : "text-[10.5px]";

    return (
        <div className="w-full min-h-screen text-[#E6F1FF] bg-[#030712] font-sans pb-16 relative overflow-hidden select-none">
            {/* Glowing Nebula Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#10B981]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#64FFDA]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8 relative z-10">
                {/* 1. Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#10B981]/20 to-[#64FFDA]/20 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40">
                            <Calendar className="w-6 h-6 text-[#10B981]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-display">SCHEDULING SUITE</h1>
                                <Badge className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono text-[9px] px-2 py-0.5 rounded uppercase">TEACHER</Badge>
                            </div>
                            <p className="text-xs text-neutral-400 font-medium">
                                Faculty Roster: {teacherProfile?.name || "Global Instructor"} • Academic Master Calendar
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => window.print()} 
                            variant="outline" 
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl font-bold font-sans transition-all text-xs h-10 px-4 gap-2"
                        >
                            <Printer className="w-4 h-4 text-[#10B981]" /> Print Schedule
                        </Button>
                    </div>
                </div>

                {/* 2. Hero Widget Block */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Next Class widget with countdown */}
                    <Card className="bg-[#09152b]/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between h-[130px] shadow-xl relative overflow-hidden group">
                        <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-[#10B981]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#10B981]/10 transition-all duration-500" />
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-black uppercase text-[#10B981] tracking-wider block">Upcoming Class</span>
                                <h4 className="text-base font-black text-white mt-1 leading-tight tracking-tight capitalize truncate max-w-[170px]">
                                    {nextClassSlot ? (
                                        nextClassSlot.type === "SUBSTITUTION" ? `Sub: Class ${nextClassSlot.classId}` : `Class ${nextClassSlot.classId}`
                                    ) : activeClassSlot && activeClassSlot.type !== "FREE" ? (
                                        <span className="text-[#64FFDA] text-xs font-bold uppercase tracking-wider">In Progress Now</span>
                                    ) : (
                                        "Workday Completed"
                                    )}
                                </h4>
                                {nextClassSlot && (
                                    <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                                        Period {statsInfo.nextId} ({getPeriodTiming(statsInfo.nextId!)})
                                    </span>
                                )}
                            </div>
                            <Clock className="w-5 h-5 text-[#10B981] shrink-0" />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-400 font-medium">Starts in</span>
                            <Badge className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 font-mono font-black text-xs px-2.5 py-0.5 rounded-lg">
                                {statsInfo.countdownStr || "—"}
                            </Badge>
                        </div>
                    </Card>

                    {/* Today's Progress wheel */}
                    <Card className="bg-[#09152b]/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4 h-[130px] shadow-xl relative overflow-hidden group">
                        <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                            {/* SVG progress circle */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="36" cy="36" r="28" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                                <circle 
                                    cx="36" cy="36" r="28" 
                                    stroke="#64FFDA" strokeWidth="6" fill="transparent" 
                                    strokeDasharray={175.9}
                                    strokeDashoffset={175.9 - (175.9 * statsInfo.schoolProgress) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <span className="absolute text-xs font-mono font-black text-white">{statsInfo.schoolProgress}%</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[9px] font-black uppercase text-[#64FFDA] tracking-wider block">Workday Index</span>
                            <h4 className="text-sm font-bold text-white mt-1 leading-snug">Instruction Hours Progress</h4>
                            <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                                {statsInfo.schoolProgress === 100 ? "Classroom shift complete" : "Class hours 8:00 - 3:20"}
                            </p>
                        </div>
                    </Card>

                    {/* Attendance Card */}
                    <Card className="bg-[#09152b]/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between h-[130px] shadow-xl relative overflow-hidden group">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">Workload Count</span>
                                <h4 className="text-base font-black text-white mt-1 tracking-tight">{statsInfo.workloadCount} Slots Weekly</h4>
                                <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">Active Academic Load</span>
                            </div>
                            <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold py-0.5 px-2 rounded">Optimal Workload</Badge>
                        </div>
                    </Card>

                    {/* Timetable Overview */}
                    <Card className="bg-[#09152b]/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between h-[130px] shadow-xl relative overflow-hidden group">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">Substitution Duties</span>
                                <h4 className="text-base font-black text-white mt-1 tracking-tight">{statsInfo.subCoverageCount} Covered Today</h4>
                                <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">Substitution Desk Coverage</span>
                            </div>
                            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Badge className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[9px] font-bold py-0.5 px-2 rounded">Covering Assigned Leaves</Badge>
                        </div>
                    </Card>
                </div>

                {/* 3. Interactive View Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto shadow-inner relative z-25">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                                activeTab === 'today'
                                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 font-black'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <Clock className="w-4 h-4" /> Today
                        </button>
                        <button
                            onClick={() => setActiveTab('weekly')}
                            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                                activeTab === 'weekly'
                                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 font-black'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <Calendar className="w-4 h-4" /> Weekly Matrix
                        </button>
                        <button
                            onClick={() => setActiveTab('planner')}
                            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                                activeTab === 'planner'
                                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 font-black'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <BookOpen className="w-4 h-4" /> Monthly Planner
                        </button>
                    </div>
                </div>

                {/* 4. Active Panel Canvas */}
                <div className="w-full">
                    <AnimatePresence mode="wait">
                        {activeTab === 'today' && (
                            <motion.div
                                key="today-view-timeline"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                        <h3 className="text-sm font-black uppercase text-emerald-400 tracking-widest font-display">Timeline Scheduler</h3>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                                        {todayData.dateKey ? new Date(todayData.dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                                    </span>
                                </div>

                                {todayData.isHoliday ? (
                                    <Card className="bg-[#09152b]/30 border border-white/10 backdrop-blur-md p-10 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
                                            <Coffee className="w-8 h-8 text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase tracking-wider font-display">Official School Holiday / Break</h4>
                                            <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">Standard class sessions are suspended for the holiday. Enjoy your rest day!</p>
                                        </div>
                                    </Card>
                                ) : !DAYS.includes(todayDayName) ? (
                                    <Card className="bg-[#09152b]/30 border border-white/10 backdrop-blur-md p-10 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                                        <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/25">
                                            <Coffee className="w-8 h-8 text-[#10B981]" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase tracking-wider font-display">Weekend Academic Break</h4>
                                            <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">Regular class schedule resumes on Monday. Enjoy the weekend!</p>
                                        </div>
                                    </Card>
                                ) : todayData.slots.length === 0 ? (
                                    <Card className="bg-[#09152b]/30 border border-white/10 backdrop-blur-md p-10 rounded-3xl text-center text-neutral-400 italic text-sm">
                                        No scheduled periods found for today.
                                    </Card>
                                ) : (
                                    <div className="relative pl-6 md:pl-8 border-l-2 border-[#3B82F6]/20 space-y-4">
                                        {PERIODS.map((pId) => {
                                            const slot = todayData.slots.find((s: any) => s.id === pId);
                                            const isCurrent = statsInfo.activeId === pId;
                                            const isNext = statsInfo.nextId === pId;

                                            // Highlight connector node
                                            const nodeBg = isCurrent ? "bg-[#64FFDA]" : isNext ? "bg-[#10B981]" : "bg-[#09152b]";
                                            const nodeBorder = isCurrent ? "border-[#64FFDA] ring-4 ring-[#64FFDA]/20" : isNext ? "border-[#10B981] ring-4 ring-[#10B981]/20" : "border-white/10";

                                            if (!slot || slot.type === "FREE") {
                                                return (
                                                    <div key={`timeline-slot-free-${pId}`} className="relative group">
                                                        <div className={`absolute left-[-31px] md:left-[-39px] top-4 w-4 h-4 rounded-full border-2 ${nodeBg} ${nodeBorder} transition-all duration-300 z-10`} />
                                                        <div className="bg-[#09152b]/30 border border-dashed border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-50">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-xs font-mono font-black text-neutral-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg">P{pId}</span>
                                                                <div>
                                                                    <h5 className="text-sm font-black text-neutral-500 uppercase tracking-wider">Free Period / Preparation Time</h5>
                                                                    <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">{getPeriodTiming(pId)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isSub = slot.type === "SUBSTITUTION";
                                            const isLeave = slot.type === "LEVE" || slot.type === "LEAVE";
                                            const subjectName = slot.subjectId ? (subjects?.[slot.subjectId]?.name || slot.subjectId) : "General Lecture";

                                            return (
                                                <div key={`timeline-slot-${pId}`} className="relative group">
                                                    <div className={`absolute left-[-31px] md:left-[-39px] top-6 w-4 h-4 rounded-full border-2 ${nodeBg} ${nodeBorder} transition-all duration-300 z-10 ${isCurrent ? "animate-pulse" : ""}`} />

                                                    <div 
                                                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
                                                            isCurrent 
                                                                ? "bg-[#64FFDA]/10 border-[#64FFDA]/30 shadow-lg shadow-[#64FFDA]/5" 
                                                                : isSub 
                                                                ? "bg-amber-500/10 border-amber-500/30" 
                                                                : isLeave
                                                                ? "bg-rose-500/5 border-rose-500/20 opacity-60 line-through"
                                                                : "bg-[#09152b]/50 border-white/5 hover:border-white/20"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black font-mono shrink-0 select-none ${
                                                                isCurrent ? "bg-[#64FFDA] text-[#030712]" : "bg-white/5 text-neutral-300"
                                                            }`}>
                                                                P{pId}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h5 className="text-base font-black text-white capitalize leading-none">
                                                                        {isSub ? "Substitution Class Coverage" : isLeave ? "Leave Slot Suspended" : subjectName}
                                                                    </h5>
                                                                    {isCurrent && <Badge className="bg-[#64FFDA]/20 text-[#64FFDA] border-none font-bold text-[9px] px-2 py-0.5 rounded">Active Now</Badge>}
                                                                    {isSub && <Badge className="bg-amber-500/20 text-amber-400 border-none font-bold text-[9px] px-2 py-0.5 rounded">Covering Leave</Badge>}
                                                                    {isLeave && <Badge className="bg-rose-500/20 text-rose-400 border-none font-bold text-[9px] px-2 py-0.5 rounded">On Leave</Badge>}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-neutral-400 text-xs mt-1.5">
                                                                    <span className="font-medium text-[11px]">Class: {slot.classId}</span>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                                                    <span className="font-mono text-[10.5px]">{getPeriodTiming(pId)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {isSub && slot.originalTeacherId && (
                                                            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-400/5 border border-amber-400/20 px-3 py-1.5 rounded-xl self-start md:self-auto">
                                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                                <span>Original Teacher: {teacherMap[slot.originalTeacherId] || slot.originalTeacherId}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'weekly' && (
                            <motion.div
                                key="weekly-view-matrix"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#10B981]" />
                                        <h3 className="text-sm font-black uppercase text-[#10B981] tracking-widest font-display">Adaptive Grid System</h3>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                                        Grid View • 10 Periods Matrix
                                    </span>
                                </div>

                                <Card className="bg-[#09152b]/40 border border-white/5 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                                    <div className="p-4 md:p-6 overflow-x-hidden">
                                        {/* Row Column Headers */}
                                        <div className="flex flex-col space-y-3.5">
                                            {/* Header Label Row */}
                                            <div className="flex items-center gap-2.5">
                                                {/* Corner element */}
                                                <div className="w-[85px] md:w-[130px] shrink-0 bg-[#09152b] rounded-xl border border-white/5 p-2 flex flex-col justify-center items-center h-12 shadow-inner">
                                                    <span className="text-[9px] font-black uppercase text-[#10B981] tracking-wider font-display">DAYS</span>
                                                    <div className="h-px bg-white/10 w-5 my-0.5" />
                                                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider font-display">PERIODS</span>
                                                </div>

                                                {/* Period slots mapping. Forces single-row and responsive scale */}
                                                <div className={`flex flex-1 ${gapSize} min-w-0`}>
                                                    {PERIODS.map(pId => (
                                                        <div 
                                                            key={`weekly-header-${pId}`} 
                                                            className="flex-1 min-w-0 bg-white/5 rounded-xl border border-white/5 p-2 flex flex-col justify-center items-center h-12 shadow-inner"
                                                        >
                                                            <span className={`font-black text-white tracking-tight font-display ${titleSize}`}>P{pId}</span>
                                                            <span className="text-[8px] text-neutral-400 font-bold font-mono mt-0.5 block truncate w-full text-center">{getPeriodTiming(pId)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Days Rows */}
                                            {DAYS.map(dayName => {
                                                const rowData = getDaySchedule(dayName);
                                                const isToday = dayName === todayDayName;
                                                const dateLabel = getWeekDayDateShort(dayName);

                                                return (
                                                    <div key={`weekly-row-${dayName}`} className="flex items-stretch gap-2.5">
                                                        {/* Day Label Header Column */}
                                                        <div 
                                                            className={`w-[85px] md:w-[130px] shrink-0 rounded-xl border flex flex-col justify-center items-center shadow-sm transition-all ${
                                                                isToday
                                                                    ? "bg-[#10B981] border-[#10B981]/30 text-black shadow-[#10B981]/10"
                                                                    : "bg-[#09152b]/60 border-white/5 text-white"
                                                            }`}
                                                        >
                                                            <span className="text-[11px] font-black uppercase tracking-widest font-display">{dayName.substring(0, 3)}</span>
                                                            <span className={`text-[8.5px] font-extrabold uppercase mt-0.5 ${isToday ? "text-white/80" : "text-neutral-400"}`}>
                                                                {dateLabel}
                                                            </span>
                                                        </div>

                                                        {/* Periods Columns (No wrapping, scales dynamically to single row width) */}
                                                        <div className={`flex flex-1 ${gapSize} min-w-0`}>
                                                            {rowData.isHoliday ? (
                                                                <div className="flex-1 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-center justify-center gap-2 text-amber-500 px-3 shadow-inner">
                                                                    <Coffee className="w-4 h-4 shrink-0" />
                                                                    <span className="text-[10px] font-black uppercase tracking-wider font-display truncate">Holiday</span>
                                                                </div>
                                                            ) : (
                                                                PERIODS.map(pId => {
                                                                    const slot = rowData.slots.find((s: any) => s.id === pId);
                                                                    
                                                                    if (!slot || slot.type === "FREE") {
                                                                        return (
                                                                            <div 
                                                                                key={`matrix-slot-free-${dayName}-${pId}`} 
                                                                                className="flex-1 min-w-0 bg-white/[0.01] border border-dashed border-white/5 rounded-xl flex items-center justify-center text-neutral-600 text-[10px] font-mono"
                                                                            >
                                                                                —
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const isSub = slot.type === "SUBSTITUTION";
                                                                    const isLeave = slot.type === "LEAVE";
                                                                    const subjectName = slot.subjectId ? (subjects?.[slot.subjectId]?.name || slot.subjectId) : "Duty";

                                                                    return (
                                                                        <div 
                                                                            key={`matrix-slot-class-${dayName}-${pId}`}
                                                                            className={`flex-1 min-w-0 ${cardPadding} rounded-xl border transition-all duration-300 flex flex-col justify-between text-left relative overflow-hidden group ${
                                                                                isSub
                                                                                    ? "bg-yellow-500/10 border-yellow-500/25 shadow-md shadow-yellow-500/5 hover:border-yellow-500/40"
                                                                                    : isLeave
                                                                                    ? "bg-rose-500/5 border-rose-500/15 opacity-60 line-through"
                                                                                    : "bg-[#0A192F]/40 border-white/5 hover:border-white/15"
                                                                            }`}
                                                                        >
                                                                            <div className="flex justify-between items-center gap-0.5 shrink-0 select-none">
                                                                                <span className="text-[7.5px] font-black text-neutral-500 font-mono">P{pId}</span>
                                                                                {isSub && (
                                                                                    <Badge className="text-[6px] md:text-[7px] bg-yellow-500 text-neutral-900 border-none font-black px-1 py-0 rounded leading-none shrink-0">
                                                                                        SUB
                                                                                    </Badge>
                                                                                )}
                                                                            </div>

                                                                            <div className="truncate my-0.5">
                                                                                <h4 className="font-extrabold text-white tracking-tight capitalize truncate group-hover:text-[#3B82F6] transition-colors font-display" style={{ fontSize: textDetailsSize }}>
                                                                                    {isLeave ? "On Leave" : subjectName}
                                                                                </h4>
                                                                            </div>

                                                                            <div className="truncate shrink-0">
                                                                                <span className="text-neutral-400 font-medium truncate block font-sans" style={{ fontSize: periodCount > 7 ? "8.5px" : "10.5px" }}>
                                                                                    ({slot.classId})
                                                                                </span>
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
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'planner' && (
                            <motion.div
                                key="planner-view-calendar"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                                        <h3 className="text-sm font-black uppercase text-[#3B82F6] tracking-widest font-display">Academic Planner</h3>
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
                                                const noticeList = holidays.filter(n => {
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
                                                    cellBg = "bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20";
                                                    borderClass = "border-[#3B82F6]/30";
                                                    textClass = "text-[#3B82F6] font-bold";
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
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Card>

                                    {/* Sidebar Details */}
                                    <div className="space-y-4">
                                        <Card className="bg-[#0D1F3D]/40 border border-white/5 backdrop-blur-md p-5 rounded-3xl shadow-xl space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-[#3B82F6] font-display">Agenda Details</h4>
                                            
                                            {selectedPlannerDate ? (() => {
                                                const targetDate = new Date(selectedPlannerDate);
                                                const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                                                const isHoliday = isDateHoliday(targetDate);
                                                const daySchedule = schedule?.[dayName] || {};
                                                const activeNotices = holidays.filter(n => {
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
                                                                {PERIODS.some(i => daySchedule[i]) ? (
                                                                    <div className="space-y-1.5">
                                                                        {PERIODS.map(i => {
                                                                            const slot = daySchedule[i];
                                                                            if (!slot || slot.type === "FREE") return null;

                                                                            const classId = typeof slot === 'object' ? slot.classId : slot;
                                                                            const subjectId = typeof slot === 'object' ? slot.subjectId : null;
                                                                            const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : "Lecture Duty";

                                                                            return (
                                                                                <div key={i} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl p-2.5 text-xs">
                                                                                    <span className="font-bold text-[#3B82F6] font-mono">P{i}</span>
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Print Layout */}
            <div className="hidden print:block text-black bg-white min-h-screen p-8">
                <div className="w-full max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-end border-b-2 border-slate-900 pb-5">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                                {branding?.schoolName || "Spoorthy Concept School"}
                            </h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
                                Master Schedule • {teacherProfile?.name || "Teacher Portal"}
                            </p>
                        </div>
                        <p className="text-xs font-mono font-bold text-slate-400">
                            Academic Year: {currentYear} • Issued: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <table className="w-full border-collapse border-2 border-slate-900 text-center text-xs">
                        <thead>
                            <tr className="bg-slate-100 border-b-2 border-slate-900">
                                <th className="p-3 text-left font-black w-24 border-r border-slate-300">Day</th>
                                {PERIODS.map(i => (
                                    <th key={i} className="p-3 font-black border-l border-slate-300">
                                        <div className="flex flex-col items-center">
                                            <span>P{i}</span>
                                            <span className="text-[8px] font-mono text-slate-500 font-medium mt-0.5">{getPeriodTiming(i)}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map(day => {
                                const daySchedule = schedule?.[day] || {};
                                return (
                                    <tr key={day} className="border-b border-slate-300">
                                        <td className="p-3 text-left font-black uppercase border-r border-slate-300 bg-slate-50">{day.substring(0, 3)}</td>
                                        {PERIODS.map(i => {
                                            const slot = daySchedule[i];
                                            if (!slot) return <td key={i} className="p-3 border-l border-slate-300 text-slate-300">-</td>;
                                            
                                            const classId = typeof slot === 'object' ? slot.classId : slot;
                                            const subjectId = typeof slot === 'object' ? slot.subjectId : null;
                                            const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : "";

                                            return (
                                                <td key={i} className="p-3 border-l border-slate-300">
                                                    <div className="font-bold text-slate-900 text-xs">{subjectName}</div>
                                                    <div className="text-[9px] text-slate-500 mt-0.5">{classId}</div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
