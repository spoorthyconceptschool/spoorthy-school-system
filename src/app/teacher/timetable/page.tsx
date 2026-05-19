"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Calendar, ArrowLeft, Printer, Clock, Info, CheckCircle2 } from "lucide-react";
import { collection, query, getDocs, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
    
    // Active Day selector state for today's timeline
    const [selectedDay, setSelectedDay] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            return ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].includes(dayName) ? dayName : "MONDAY";
        }
        return "MONDAY";
    });

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

    const getSubjectCode = (name: string = "") => {
        const n = name.toUpperCase();
        if (n.includes("MATH")) return "MATH";
        if (n.includes("ENGLISH") || n.includes("ENG")) return "ENG";
        if (n.includes("SCIENCE") || n.includes("SCI")) return "SCI";
        if (n.includes("HINDI") || n.includes("HIN")) return "HIN";
        if (n.includes("SOCIAL") || n.includes("SST")) return "SST";
        if (n.includes("COMPUTER") || n.includes("COMP")) return "COMP";
        if (n.includes("ART") || n.includes("DRAW")) return "ART";
        if (n.includes("PHYSIC") || n.includes("PHY")) return "PHY";
        if (n.includes("GENERAL KNOWLEDGE") || n.includes("G.K")) return "G.K.";
        if (n.includes("TELUGU") || n.includes("TEL")) return "TEL";
        return name.substring(0, 4).toUpperCase();
    };

    const getSubjectStyle = (name: string = "") => {
        const n = name.toUpperCase();
        if (n.includes("MATH")) return "bg-emerald-500/10 border border-emerald-500/35 text-emerald-400";
        if (n.includes("ENG") || n.includes("LIT") || n.includes("G.K")) return "bg-blue-500/10 border border-blue-500/35 text-blue-400";
        if (n.includes("SCI") || n.includes("PHY") || n.includes("CHEM") || n.includes("BIO")) return "bg-amber-500/10 border border-amber-500/35 text-amber-400";
        if (n.includes("HIN") || n.includes("TEL") || n.includes("LANG")) return "bg-purple-500/10 border border-purple-500/35 text-purple-400";
        if (n.includes("SST") || n.includes("SOC") || n.includes("HIS") || n.includes("GEO")) return "bg-cyan-500/10 border border-cyan-500/35 text-cyan-400";
        if (n.includes("COMP") || n.includes("ART") || n.includes("DRAW")) return "bg-orange-500/10 border border-orange-500/35 text-orange-400";
        return "bg-slate-500/10 border border-slate-500/35 text-slate-400";
    };

    const getWeekDayDate = (dayName: string) => {
        const today = new Date();
        const currentDay = today.getDay();
        const targetIdx = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(dayName);
        const distance = targetIdx - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getWeekDayDateShort = (dayName: string) => {
        const today = new Date();
        const currentDay = today.getDay();
        const targetIdx = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(dayName);
        const distance = targetIdx - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    if (loading && !schedule) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-transparent">
                <Loader2 className="animate-spin text-[#10B981] w-10 h-10" />
            </div>
        );
    }

    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const activeDayData = getDaySchedule(DAYS.includes(todayName) ? todayName : "MONDAY");

    return (
        <div className="w-full text-[#E6F1FF] min-h-screen pb-16">
            
            {/* Main Timetable Content */}
            <div className="p-4 md:p-10 lg:p-12 space-y-6 max-w-[1600px] mx-auto print:hidden">
                
                {/* 1. Page Header Block */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-5">
                    <div className="space-y-1 relative pl-4 md:pl-6">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full" />
                        <Link href="/teacher" className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-blue-400 hover:underline mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                        </Link>
                        <h1 className="text-2xl md:text-4xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                            My Schedule
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm">Teacher Portal</p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        <Button 
                            onClick={() => window.print()} 
                            variant="outline" 
                            className="gap-2 bg-transparent border-white/10 hover:bg-white/5 text-white font-bold h-10 px-4 rounded-xl text-xs uppercase tracking-wider"
                        >
                            <Printer className="w-4 h-4 text-white" /> Print Timetable
                        </Button>
                    </div>
                </div>

                {/* 2. Today's Schedule timeline block */}
                <div className="bg-black/20 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-md shadow-2xl space-y-4">
                    <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-black text-blue-400 tracking-widest block">Active View</span>
                            <h2 className="text-sm md:text-base font-black text-white leading-tight">
                                Today ({activeDayData.dayName.substring(0, 1) + activeDayData.dayName.substring(1).toLowerCase()}), {getWeekDayDate(activeDayData.dayName)}
                            </h2>
                        </div>
                    </div>

                    {activeDayData.isHoliday ? (
                        <div className="py-12 flex flex-col items-center justify-center text-red-400 gap-3 border border-dashed border-red-500/25 rounded-2xl bg-red-500/5">
                            <Calendar className="w-10 h-10 opacity-80 animate-pulse" />
                            <div className="text-center">
                                <h4 className="text-sm font-black uppercase tracking-widest text-red-400">Official School Holiday</h4>
                                <p className="text-[10px] text-red-400/60 mt-1 font-semibold">The academy is officially closed for holiday. Rest up!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent snap-x snap-mandatory">
                            {activeDayData.slots.map((slot: any) => {
                                const subjectName = slot.subjectId ? (subjects?.[slot.subjectId]?.name || slot.subjectId) : "";
                                const subjectCode = getSubjectCode(subjectName);
                                const isFree = slot.type === "FREE";

                                return (
                                    <div 
                                        key={slot.id}
                                        className={cn(
                                            "snap-center shrink-0 p-3 rounded-2xl border flex flex-col justify-between text-center min-h-[110px] w-[105px] transition-all hover:scale-[1.02]",
                                            isFree 
                                                ? "bg-black/40 border-white/5 hover:border-white/10" 
                                                : slot.type === "SUBSTITUTION" 
                                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                                    : slot.type === "LEAVE"
                                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400 opacity-60 line-through"
                                                        : getSubjectStyle(subjectName)
                                        )}
                                    >
                                        <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">P{slot.id}</span>
                                        
                                        <div className="my-1.5 flex flex-col items-center justify-center">
                                            {isFree ? (
                                                <span className="text-lg font-extrabold text-white/20">-</span>
                                            ) : slot.type === "SUBSTITUTION" ? (
                                                <>
                                                    <span className="text-xs font-black uppercase tracking-tight text-blue-400">SUB</span>
                                                    <span className="text-[8px] font-bold text-white/50 block truncate max-w-[85px] mt-0.5">{slot.classId}</span>
                                                </>
                                            ) : slot.type === "LEAVE" ? (
                                                <>
                                                    <span className="text-xs font-black uppercase tracking-tight text-rose-400 line-through">OFF</span>
                                                    <span className="text-[8px] font-bold text-white/30 block truncate max-w-[85px] mt-0.5">{slot.classId}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-xs font-black uppercase tracking-tight truncate max-w-[85px]">{subjectCode}</span>
                                                    <span className="text-[8px] font-bold text-white/50 block truncate max-w-[85px] mt-0.5">({slot.classId})</span>
                                                </>
                                            )}
                                        </div>

                                        <span className="text-[8px] font-mono text-white/30 font-semibold tracking-tighter">
                                            {getPeriodTiming(slot.id)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 3. Weekly Overview Card */}
                <div className="bg-[#0A192F]/40 border border-white/10 rounded-[2rem] p-5 md:p-6 backdrop-blur-md shadow-2xl space-y-4">
                    <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                            <Clock className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-black text-indigo-400 tracking-widest block">Weekly Grid</span>
                            <h2 className="text-sm md:text-base font-black text-white leading-tight">Weekly Overview</h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                        <table className="w-full text-xs text-center border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                    <th className="p-4 text-left w-28 text-white/60">Day</th>
                                    {PERIODS.map(i => (
                                        <th key={i} className="p-4 border-l border-white/5">
                                            <div className="flex flex-col items-center">
                                                <span>P{i}</span>
                                                <span className="text-[8px] text-white/30 font-mono font-medium mt-0.5">{getPeriodTiming(i)}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {DAYS.map((day) => {
                                    const dateStr = getWeekDayDateShort(day);
                                    const daySchedule = schedule?.[day] || {};
                                    
                                    return (
                                        <tr key={day} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 text-left font-black flex flex-col justify-center leading-none">
                                                <span className="uppercase text-purple-400 tracking-wider text-[11px]">{day.substring(0, 3)}</span>
                                                <span className="text-[8px] text-white/30 font-semibold font-mono mt-1">{dateStr}</span>
                                            </td>
                                            
                                            {PERIODS.map(i => {
                                                const slot = daySchedule[i];
                                                
                                                if (!slot) {
                                                    return (
                                                        <td key={i} className="p-3 border-l border-white/5 text-center text-white/20 font-black text-sm">
                                                            -
                                                        </td>
                                                    );
                                                }

                                                const classId = typeof slot === 'object' ? slot.classId : slot;
                                                const subjectId = typeof slot === 'object' ? slot.subjectId : null;
                                                const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : "";
                                                const subjectCode = getSubjectCode(subjectName);

                                                return (
                                                    <td key={i} className="p-2 border-l border-white/5 text-center">
                                                        <div className={cn(
                                                            "p-2 rounded-xl text-[10px] font-black tracking-tight flex flex-col justify-center min-h-[48px] max-w-[90px] mx-auto",
                                                            getSubjectStyle(subjectName)
                                                        )}>
                                                            <span className="text-white truncate block">{subjectCode}</span>
                                                            <span className="opacity-75 truncate text-[8px] mt-0.5 block">({classId})</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Alert note at the bottom */}
                    <div className="flex items-center gap-2 text-[10px] text-cyan-400/80 font-bold pl-1 pt-2">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>All timings are subject to change.</span>
                    </div>
                </div>

            </div>

            {/* ========================================================================= */}
            {/* PRINT VIEW (Sleek Clean High Contrast Black & White Grid)                 */}
            {/* ========================================================================= */}
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
                                            const subjectCode = getSubjectCode(subjectName);

                                            return (
                                                <td key={i} className="p-3 border-l border-slate-300">
                                                    <div className="font-bold text-slate-900 text-xs">{subjectCode}</div>
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
