"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Calendar, Clock, Info, Coffee, Utensils } from "lucide-react";
import { collection, query, getDocs, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TeacherTimetablePage() {
    const { user, userData } = useAuth();
    const { subjects, branding, selectedYear } = useMasterData();
    const router = useRouter();

    const currentYear = selectedYear || "2025-2026";
    const [schedule, setSchedule] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_timetable_schedule_cache") || "null") : null); // weeklySchedule
    const [substitutions, setSubstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_timetable_schedule_cache") : true);
    const [teacherProfile, setTeacherProfile] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_profile_cache") || "null") : null);

    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const PERIODS = [1, 2, 3, 4, "BREAK", 5, 6, 7, "LUNCH", 8, 9, 10];

    const getPeriodTiming = (period: number | string) => {
        const timings: Record<string, string> = {
            "1": "08:00 AM – 08:40 AM",
            "2": "08:40 AM – 09:20 AM",
            "3": "09:20 AM – 10:00 AM",
            "4": "10:00 AM – 10:40 AM",
            "BREAK": "10:40 AM – 11:00 AM",
            "5": "11:00 AM – 11:40 AM",
            "6": "11:40 AM – 12:20 PM",
            "7": "12:20 PM – 01:00 PM",
            "LUNCH": "01:00 PM – 01:40 PM",
            "8": "01:40 PM – 02:20 PM",
            "9": "02:20 PM – 03:00 PM",
            "10": "03:00 PM – 03:40 PM"
        };
        return timings[String(period)] || "";
    };

    const getPeriodTimingShort = (period: number | string) => {
        const timings: Record<string, string> = {
            "1": "08:00 - 08:40",
            "2": "08:40 - 09:20",
            "3": "09:20 - 10:00",
            "4": "10:00 - 10:40",
            "BREAK": "10:40 - 11:00",
            "5": "11:00 - 11:40",
            "6": "11:40 - 12:20",
            "7": "12:20 - 01:00",
            "LUNCH": "01:00 - 01:40",
            "8": "01:40 - 02:20",
            "9": "02:20 - 03:00",
            "10": "03:00 - 03:40"
        };
        return timings[String(period)] || "";
    };

    const getSubjectCode = (name: string = "") => {
        const n = name.toUpperCase();
        if (n.includes("MATH")) return "Math";
        if (n.includes("ENGLISH") || n.includes("ENG")) return "English";
        if (n.includes("SCIENCE") || n.includes("SCI")) return "Science";
        if (n.includes("HINDI") || n.includes("HIN")) return "Hindi";
        if (n.includes("SOCIAL") || n.includes("S. ST") || n.includes("S. STUDIES")) return "S. St.";
        if (n.includes("COMPUTER") || n.includes("COMP")) return "Comp.";
        if (n.includes("ART") || n.includes("DRAW")) return "Art";
        if (n.includes("PHYSIC") || n.includes("P. ED")) return "P. Ed.";
        if (n.includes("EVS")) return "EVS";
        if (n.includes("LIBRARY") || n.includes("LIB")) return "Library";
        return name || "-";
    };

    const getMobileSubjectCode = (name: string = "") => {
        const n = name.toUpperCase();
        if (n.includes("MATH")) return "MATH";
        if (n.includes("ENGLISH") || n.includes("ENG")) return "ENG";
        if (n.includes("SCIENCE") || n.includes("SCI")) return "SCI";
        if (n.includes("HINDI") || n.includes("HIN")) return "HIN";
        if (n.includes("SOCIAL") || n.includes("S. ST") || n.includes("S. STUDIES")) return "SST";
        if (n.includes("COMPUTER") || n.includes("COMP")) return "COMP";
        if (n.includes("ART") || n.includes("DRAW")) return "ART";
        if (n.includes("PHYSIC") || n.includes("P. ED") || n.includes("PT")) return "PT";
        if (n.includes("EVS")) return "EVS";
        if (n.includes("LIBRARY") || n.includes("LIB")) return "LIB";
        if (n.includes("TELUGU")) return "TEL";
        if (n.includes("BREAK")) return "BRK";
        if (n.includes("LUNCH")) return "LNC";
        return n.substring(0, 4).toUpperCase();
    };

    const getPeriodTimingMobile = (period: number | string) => {
        const timings: Record<string, { start: string, end: string }> = {
            "1": { start: "08:00", end: "08:40" },
            "2": { start: "08:40", end: "09:20" },
            "3": { start: "09:20", end: "10:00" },
            "4": { start: "10:00", end: "10:40" },
            "BREAK": { start: "10:40", end: "11:00" },
            "5": { start: "11:00", end: "11:40" },
            "6": { start: "11:40", end: "12:20" },
            "7": { start: "12:20", end: "01:00" },
            "LUNCH": { start: "01:00", end: "01:40" },
            "8": { start: "01:40", end: "02:20" },
            "9": { start: "02:20", end: "03:00" },
            "10": { start: "03:00", end: "03:40" }
        };
        return timings[String(period)] || { start: "", end: "" };
    };

    const getWeekDayDate = (dayName: string) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
        const targetIdx = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(dayName);
        const distance = targetIdx - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + distance);
        return targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    useEffect(() => {
        if (user) {
            fetchTeacherProfile();
        }
    }, [user]);

    const fetchTeacherProfile = async () => {
        if (!user?.uid) return;
        try {
            const q = query(
                collection(db, "teachers"), 
                where("uid", "==", user.uid),
                where("schoolId", "==", userData?.schoolId || "global")
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const tData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setTeacherProfile(tData);
                if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(tData));
            }
        } catch (e) {
            console.warn("Error fetching teacher profile:", e);
        }
    };

    // Real-time Timetable Listener
    useEffect(() => {
        if (!teacherProfile) return;

        const pIds = [teacherProfile.id, teacherProfile.schoolId, teacherProfile.teacherId].filter(Boolean);
        if (pIds.length === 0) return;

        const hasCache = typeof window !== 'undefined' && localStorage.getItem("teacher_timetable_schedule_cache");
        if (!hasCache) {
            setLoading(true);
        }

        const ttQuery = query(
            collection(db, "timetable_entries"),
            where("teacherId", "in", pIds),
            where("academicYear", "==", currentYear)
        );

        const unsubTT = onSnapshot(ttQuery, (snap) => {
            const entries = snap.docs.map(d => d.data());
            const weekly: any = {};
            entries.forEach(entry => {
                if (!weekly[entry.day]) weekly[entry.day] = {};
                weekly[entry.day][entry.period] = {
                    classId: entry.className ? `${entry.className}-${entry.sectionName}` : `${entry.classId}_${entry.sectionId}`,
                    className: entry.className || entry.classId,
                    sectionName: entry.sectionName || entry.sectionId,
                    subjectId: entry.subjectId
                };
            });
            setSchedule(weekly);
            setLoading(false);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_timetable_schedule_cache", JSON.stringify(weekly));
            }
        }, (err) => {
            console.error("Timetable sync error:", err);
            setLoading(false);
        });

        return () => {
            unsubTT();
        };
    }, [teacherProfile, currentYear]);

    // Fallback Mock Schedule Data (Matching image design exactly)
    const getFallbackSubject = (dName: string, slotId: number) => {
        const fallbackGrid: Record<string, Record<number, { subject: string, class: string }>> = {
            "MONDAY": {
                1: { subject: "Math", class: "Class A" },
                2: { subject: "English", class: "Class A" },
                3: { subject: "Science", class: "Class A" },
                4: { subject: "S. Studies", class: "Class A" },
                5: { subject: "Hindi", class: "Class A" },
                6: { subject: "Computer", class: "Class A" },
                7: { subject: "EVS", class: "Class A" },
                8: { subject: "Art", class: "Class A" },
                9: { subject: "P. Ed.", class: "Class A" },
                10: { subject: "Library", class: "Class A" }
            },
            "TUESDAY": {
                1: { subject: "English", class: "Class A" },
                2: { subject: "Math", class: "Class A" },
                3: { subject: "S. Studies", class: "Class A" },
                4: { subject: "Science", class: "Class A" },
                5: { subject: "Hindi", class: "Class A" },
                6: { subject: "Computer", class: "Class A" },
                7: { subject: "Art", class: "Class A" },
                8: { subject: "EVS", class: "Class A" },
                9: { subject: "P. Ed.", class: "Class A" },
                10: { subject: "Library", class: "Class A" }
            },
            "WEDNESDAY": {
                1: { subject: "Science", class: "Class A" },
                2: { subject: "Hindi", class: "Class A" },
                3: { subject: "Math", class: "Class A" },
                4: { subject: "English", class: "Class A" },
                5: { subject: "S. Studies", class: "Class A" },
                6: { subject: "Computer", class: "Class A" },
                7: { subject: "P. Ed.", class: "Class A" },
                8: { subject: "Art", class: "Class A" },
                9: { subject: "EVS", class: "Class A" },
                10: { subject: "Library", class: "Class A" }
            },
            "THURSDAY": {
                1: { subject: "Math", class: "Class A" },
                2: { subject: "S. Studies", class: "Class A" },
                3: { subject: "English", class: "Class A" },
                4: { subject: "Science", class: "Class A" },
                5: { subject: "Hindi", class: "Class A" },
                6: { subject: "Computer", class: "Class A" },
                7: { subject: "Art", class: "Class A" },
                8: { subject: "P. Ed.", class: "Class A" },
                9: { subject: "EVS", class: "Class A" },
                10: { subject: "Library", class: "Class A" }
            },
            "FRIDAY": {
                1: { subject: "Hindi", class: "Class A" },
                2: { subject: "English", class: "Class A" },
                3: { subject: "Math", class: "Class A" },
                4: { subject: "S. Studies", class: "Class A" },
                5: { subject: "Science", class: "Class A" },
                6: { subject: "Computer", class: "Class A" },
                7: { subject: "EVS", class: "Class A" },
                8: { subject: "Art", class: "Class A" },
                9: { subject: "P. Ed.", class: "Class A" },
                10: { subject: "Library", class: "Class A" }
            }
        };
        return fallbackGrid[dName]?.[slotId] || { subject: "Free", class: "Class A" };
    };

    const getDaySchedule = (dayName: string) => {
        const slots = [];
        const rawDay = schedule?.[dayName] || {};

        // P1 to P4
        for (let i = 1; i <= 4; i++) {
            const base = rawDay[i];
            if (base) {
                const classId = typeof base === 'object' ? base.classId || `${base.className || ""}-${base.sectionName || ""}` : base;
                const subjectId = typeof base === 'object' ? base.subjectId : null;
                const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : (base.subjectName || "");
                slots.push({ id: `P${i}`, label: `P${i}`, type: "REGULAR", timing: getPeriodTiming(i), classLabel: `${base.className || base.classId || ""} ${base.sectionName || base.sectionId || ""}`.trim(), subject: getSubjectCode(subjectName) });
            } else {
                slots.push({ id: `P${i}`, label: `P${i}`, type: "FREE", timing: getPeriodTiming(i), classLabel: "", subject: "Free" });
            }
        }

        // BREAK
        slots.push({ id: 'BREAK', label: 'BREAK', type: 'BREAK', timing: getPeriodTiming('BREAK'), classLabel: '', subject: 'Break Time' });

        // P5 to P7
        for (let i = 5; i <= 7; i++) {
            const base = rawDay[i];
            if (base) {
                const classId = typeof base === 'object' ? base.classId || `${base.className || ""}-${base.sectionName || ""}` : base;
                const subjectId = typeof base === 'object' ? base.subjectId : null;
                const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : (base.subjectName || "");
                slots.push({ id: `P${i}`, label: `P${i}`, type: "REGULAR", timing: getPeriodTiming(i), classLabel: `${base.className || base.classId || ""} ${base.sectionName || base.sectionId || ""}`.trim(), subject: getSubjectCode(subjectName) });
            } else {
                slots.push({ id: `P${i}`, label: `P${i}`, type: "FREE", timing: getPeriodTiming(i), classLabel: "", subject: "Free" });
            }
        }

        // LUNCH
        slots.push({ id: 'LUNCH', label: 'LUNCH', type: 'LUNCH', timing: getPeriodTiming('LUNCH'), classLabel: '', subject: 'Lunch Break' });

        // P8 to P10
        for (let i = 8; i <= 10; i++) {
            const base = rawDay[i];
            if (base) {
                const classId = typeof base === 'object' ? base.classId || `${base.className || ""}-${base.sectionName || ""}` : base;
                const subjectId = typeof base === 'object' ? base.subjectId : null;
                const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : (base.subjectName || "");
                slots.push({ id: `P${i}`, label: `P${i}`, type: "REGULAR", timing: getPeriodTiming(i), classLabel: `${base.className || base.classId || ""} ${base.sectionName || base.sectionId || ""}`.trim(), subject: getSubjectCode(subjectName) });
            } else {
                slots.push({ id: `P${i}`, label: `P${i}`, type: "FREE", timing: getPeriodTiming(i), classLabel: "", subject: "Free" });
            }
        }

        return slots;
    };

    if (loading && !schedule) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#040A15]">
                <Loader2 className="animate-spin text-[#38bdf8] w-10 h-10" />
            </div>
        );
    }

    const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const activeDay = DAYS.includes(todayDayName) ? todayDayName : "MONDAY";
    const todaySlots = getDaySchedule(activeDay);

    return (
        <div className="relative min-h-screen text-[#E6F1FF] bg-gradient-to-b from-[#020813] via-[#081528] to-[#020813] overflow-x-hidden font-sans">
            {/* Glowing decorative background orbs */}
            <div className="absolute top-[15%] left-[-15%] w-[380px] h-[380px] bg-[#38bdf8]/10 rounded-full blur-[110px] pointer-events-none" />
            <div className="absolute bottom-[25%] right-[-15%] w-[380px] h-[380px] bg-[#a855f7]/10 rounded-full blur-[110px] pointer-events-none" />

            {/* MAIN CONTAINER */}
            <div className="w-full max-w-7xl mx-auto min-h-screen flex flex-col pb-24 relative z-10 print:hidden md:px-4 lg:px-8">
                
                <div className="md:hidden flex h-16 items-center justify-between px-4 bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40 shrink-0 border-b border-[#10B981]/10 shadow-md shadow-black/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-amber-500/40 shadow-md shrink-0 overflow-hidden">
                            <img
                                src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                alt="Logo"
                                className="w-full h-full object-contain filter drop-shadow-sm"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png";
                                }}
                            />
                        </div>
                        <h1 className="text-sm font-bold text-white tracking-tight">Time Table</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
                            <svg className="w-5.5 h-5.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-1 ring-red-400">4</span>
                        </div>
                        {/* Profile Circle */}
                        <div className="w-8.5 h-8.5 rounded-full bg-[#053d2c] text-[#10B981] flex items-center justify-center font-black text-sm border border-[#10B981]/25 shadow-inner">
                            T
                        </div>
                    </div>
                </div>

                {/* 2. SECONDARY ACTION ROW */}
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/teacher" className="flex items-center gap-1.5 text-[10px] font-black text-[#38bdf8] uppercase tracking-widest hover:opacity-80 transition-opacity">
                        <svg className="w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>BACK TO DASHBOARD</span>
                    </Link>
                    
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-transparent text-white font-bold text-[9.5px] uppercase tracking-wider hover:bg-white/5 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print Timetable</span>
                    </button>
                </div>

                {/* 3. TODAY'S SCHEDULE SECTION */}
                <div className="mx-4 mb-5 p-4 rounded-3xl bg-[#070F1E]/60 border border-[#38bdf8]/15 backdrop-blur-xl shadow-lg shadow-black/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    
                    {/* Today's Schedule Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full border border-[#38bdf8]/35 bg-[#38bdf8]/5 flex items-center justify-center text-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.1)]">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">TODAY'S SCHEDULE</h2>
                            <p className="text-[10px] font-semibold text-zinc-400 mt-1">
                                {activeDay.substring(0, 1) + activeDay.substring(1).toLowerCase()}, {getWeekDayDate(activeDay)}
                            </p>
                        </div>
                    </div>

                    {/* Period Cards Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3 sm:gap-4">
                        {todaySlots.map((slot) => {
                            const isBreak = slot.type === "BREAK";
                            const isLunch = slot.type === "LUNCH";

                            if (isBreak) {
                                return (
                                    <div key={slot.id} className="p-2.5 rounded-xl bg-[#140D24]/60 border border-[#a855f7]/25 flex flex-col justify-between shadow-[0_0_12px_rgba(168,85,247,0.05)] min-h-[90px]">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[#a855f7]">BREAK</span>
                                            <span className="text-[7px] text-zinc-500 font-mono mt-0.5 block truncate leading-none">{getPeriodTimingShort("BREAK")}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-[10px] font-bold text-white leading-tight">Break Time</span>
                                            <Coffee className="w-3.5 h-3.5 text-[#a855f7] shrink-0" />
                                        </div>
                                    </div>
                                );
                            }

                            if (isLunch) {
                                return (
                                    <div key={slot.id} className="p-2.5 rounded-xl bg-[#240D1D]/60 border border-[#ec4899]/25 flex flex-col justify-between shadow-[0_0_12px_rgba(236,72,153,0.05)] min-h-[90px]">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[#ec4899]">LUNCH</span>
                                            <span className="text-[7px] text-zinc-500 font-mono mt-0.5 block truncate leading-none">{getPeriodTimingShort("LUNCH")}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-[10px] font-bold text-white leading-tight">Lunch Break</span>
                                            <Utensils className="w-3.5 h-3.5 text-[#ec4899] shrink-0" />
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={slot.id} className={cn(
                                    "p-2.5 rounded-xl flex flex-col justify-between min-h-[90px] border",
                                    slot.type === "FREE"
                                        ? "bg-white/[0.02] border-white/5 opacity-40"
                                        : "bg-[#09111E]/75 border-[#38bdf8]/10 hover:border-[#38bdf8]/35 shadow-[0_0_12px_rgba(56,189,248,0.03)]"
                                )}>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-[#38bdf8]">{slot.label}</span>
                                        <span className="text-[7px] text-zinc-500 font-mono mt-0.5 block truncate leading-none">{getPeriodTimingShort(slot.label.replace("P", ""))}</span>
                                    </div>
                                    <div className="mt-2.5">
                                        <span className="text-[11px] font-bold text-white leading-tight block truncate">{slot.subject}</span>
                                        <span className="text-[8px] font-bold text-[#38bdf8] tracking-wide mt-1.5 block leading-none">{slot.classLabel}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 4. WEEKLY OVERVIEW SECTION */}
                <div className="mx-2 p-2 rounded-2xl bg-[#070F1E]/60 border border-[#a855f7]/15 backdrop-blur-xl shadow-lg shadow-black/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] mt-3">
                    
                    {/* Weekly Overview Header */}
                    <div className="flex items-center gap-2 px-1 mb-2.5">
                        <div className="w-7 h-7 rounded-full border border-[#a855f7]/35 bg-[#a855f7]/5 flex items-center justify-center text-[#a855f7] shadow-[0_0_6px_rgba(168,85,247,0.08)]">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h2 className="text-[11px] font-black text-white uppercase tracking-widest leading-none">WEEKLY OVERVIEW</h2>
                    </div>

                    {/* Responsive Grid Table - Strictly No Horizontal Scroll */}
                    <div className="w-full rounded-xl border-2 border-white/20 bg-[#03070E]/50 overflow-hidden">
                        <table className="w-full text-center border-collapse table-fixed">
                            <thead>
                                <tr className="bg-white/[0.02] border-b-2 border-white/20 text-white/50">
                                    <th className="p-1 w-[8%] text-left text-zinc-300 font-bold text-[11px]">DAY</th>
                                    {PERIODS.map((p, idx) => {
                                        const isBreak = p === "BREAK";
                                        const isLunch = p === "LUNCH";
                                        const t = getPeriodTimingMobile(p);
                                        return (
                                            <th key={idx} className={cn(
                                                "border-l-2 border-white/20 p-1 text-center font-black",
                                                isBreak ? "text-[#a855f7]" : (isLunch ? "text-[#ec4899]" : "text-[#38bdf8]")
                                            )}>
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-[10px] md:text-[11px] leading-tight block">
                                                        {isBreak ? "BRK" : (isLunch ? "LNC" : `P${p}`)}
                                                    </span>
                                                    <span className="text-[7px] text-zinc-500 font-mono tracking-tighter leading-none mt-[2px] block">
                                                        {t.start}
                                                    </span>
                                                    <span className="text-[7px] text-zinc-500 font-mono tracking-tighter leading-none mt-[1px] block">
                                                        {t.end}
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-white/20">
                                {DAYS.map((day) => {
                                    const daySchedule = schedule?.[day] || {};
                                    return (
                                        <tr key={day} className="hover:bg-white/[0.01] transition-colors h-8">
                                            {/* Day Column */}
                                            <td className="text-left font-black p-1 border-r-2 border-white/20">
                                                <span className="uppercase text-[#a855f7] tracking-wider text-[11px] font-bold block">{day.substring(0, 3)}</span>
                                            </td>

                                            {/* Period Columns */}
                                            {PERIODS.map((p, idx) => {
                                                if (p === "BREAK" || p === "LUNCH") {
                                                    return (
                                                        <td key={idx} className={cn(
                                                            "border-l-2 border-white/20 p-1 text-center font-bold text-[9px] uppercase tracking-tighter",
                                                            p === "BREAK" ? "text-[#a855f7]/70 bg-[#a855f7]/[0.02]" : "text-[#ec4899]/70 bg-[#ec4899]/[0.02]"
                                                        )}>
                                                            {p === "BREAK" ? "Brk" : "Lnc"}
                                                        </td>
                                                    );
                                                }

                                                const slot = daySchedule[p];
                                                let displayContent = "-";
                                                let colorClass = "text-white";
                                                
                                                if (slot) {
                                                    let cName = slot.className || "";
                                                    let sName = slot.sectionName || "";
                                                    if (cName.toUpperCase().startsWith("CLASS ")) cName = cName.substring(6);
                                                    if (cName.toUpperCase().startsWith("GRADE ")) cName = cName.substring(6);
                                                    
                                                    // "7A", "LKGB"
                                                    displayContent = `${cName}${sName}`.toUpperCase();
                                                    
                                                    const subjectId = (slot.subjectId || "").toLowerCase();
                                                    if (subjectId.includes("math")) colorClass = "text-[#60a5fa]"; // blue-400
                                                    else if (subjectId.includes("eng")) colorClass = "text-[#34d399]"; // emerald-400
                                                    else if (subjectId.includes("sci")) colorClass = "text-[#fbbf24]"; // amber-400
                                                    else if (subjectId.includes("hin")) colorClass = "text-[#fb7185]"; // rose-400
                                                    else if (subjectId.includes("soc") || subjectId.includes("sst")) colorClass = "text-[#fb923c]"; // orange-400
                                                    else if (subjectId.includes("comp")) colorClass = "text-[#22d3ee]"; // cyan-400
                                                    else if (subjectId.includes("art")) colorClass = "text-[#f472b6]"; // pink-400
                                                    else if (subjectId.includes("tel")) colorClass = "text-[#c084fc]"; // purple-400
                                                    else if (subjectId.includes("evs")) colorClass = "text-[#a3e635]"; // lime-400
                                                    else colorClass = "text-white";
                                                }

                                                return (
                                                    <td key={idx} className="border-l-2 border-white/20 p-0.5 text-center align-middle">
                                                        <span className={cn(
                                                            "font-bold text-[10px] md:text-[12px] leading-none block whitespace-nowrap overflow-hidden text-clip tracking-tighter",
                                                            colorClass
                                                        )}>
                                                            {displayContent}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                </tbody>
                        </table>
                    </div>

                    {/* Legend block */}
                    {(() => {
                        const activeSubjects = new Set<string>();
                        if (schedule) {
                            Object.values(schedule).forEach((dayObj: any) => {
                                if (dayObj) {
                                    Object.values(dayObj).forEach((slot: any) => {
                                        if (slot && typeof slot === 'object' && slot.subjectId) {
                                            activeSubjects.add(slot.subjectId.toLowerCase());
                                        } else if (typeof slot === 'string') {
                                            activeSubjects.add(slot.toLowerCase());
                                        }
                                    });
                                }
                            });
                        }

                        const getSubjectColorInfo = (subjectId: string) => {
                            const id = subjectId.toLowerCase();
                            if (id.includes("math")) return { name: "Math", color: "bg-[#60a5fa]" };
                            if (id.includes("eng")) return { name: "English", color: "bg-[#34d399]" };
                            if (id.includes("sci")) return { name: "Science", color: "bg-[#fbbf24]" };
                            if (id.includes("hin")) return { name: "Hindi", color: "bg-[#fb7185]" };
                            if (id.includes("soc") || id.includes("sst")) return { name: "Social", color: "bg-[#fb923c]" };
                            if (id.includes("comp")) return { name: "Computer", color: "bg-[#22d3ee]" };
                            if (id.includes("art")) return { name: "Art", color: "bg-[#f472b6]" };
                            if (id.includes("tel")) return { name: "Telugu", color: "bg-[#c084fc]" };
                            if (id.includes("evs")) return { name: "EVS", color: "bg-[#a3e635]" };
                            return { name: id.substring(0, 8), color: "bg-white/50" };
                        };

                        if (activeSubjects.size === 0) return null;

                        return (
                            <div className="mt-3 bg-black/20 rounded-xl p-3 border border-white/5 flex flex-wrap gap-x-3 gap-y-2 text-[9px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-1.5 w-full mb-1">
                                    <span className="text-white/40">Your Assigned Subjects</span>
                                </div>
                                {Array.from(activeSubjects).map((subId, index) => {
                                    const info = getSubjectColorInfo(subId);
                                    return (
                                        <div key={index} className="flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${info.color}`} /> 
                                            <span className="text-white/60">{info.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Alert Info bottom row */}
                    <div className="flex items-center gap-1.5 text-[9px] text-[#38bdf8] font-bold pl-1 pt-3 pb-0.5 leading-none">
                        <Info className="w-3 h-3 text-[#38bdf8]" />
                        <span>All timings are subject to change.</span>
                    </div>

                </div>

            </div>

            {/* ========================================================================= */}
            {/* PRINT VIEW (Clean high contrast grid)                                     */}
            {/* ========================================================================= */}
            <div className="hidden print:block text-black bg-white min-h-screen p-8">
                <div className="w-full max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                                {branding?.schoolName || "Spoorthy Concept School"}
                            </h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
                                MASTER TIMETABLE SCHEDULE • {teacherProfile?.name || "Teacher Portal"}
                            </p>
                        </div>
                        <p className="text-xs font-mono font-bold text-slate-400">
                            Academic Year: {currentYear} • Issued: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <table className="w-full border-collapse border-2 border-slate-900 text-center text-xs">
                        <thead>
                            <tr className="bg-slate-100 border-b-2 border-slate-900">
                                <th className="p-3 text-left font-black w-24 border-r border-slate-300">DAY</th>
                                {PERIODS.map((p, idx) => (
                                    <th key={idx} className="p-3 font-black border-l border-slate-300">
                                        <div className="flex flex-col items-center">
                                            <span>{p}</span>
                                            <span className="text-[8px] font-mono text-slate-500 font-medium mt-0.5">{getPeriodTimingShort(p)}</span>
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
                                        {PERIODS.map((p, idx) => {
                                            if (p === "BREAK" || p === "LUNCH") {
                                                return (
                                                    <td key={idx} className="p-3 border-l border-slate-300 text-slate-400 uppercase font-black tracking-wider text-[9px] bg-slate-50">
                                                        {p}
                                                    </td>
                                                );
                                            }

                                            const slot = daySchedule[p];
                                            if (!slot) {
                                                const fb = getFallbackSubject(day, Number(p));
                                                return (
                                                    <td key={idx} className="p-3 border-l border-slate-300">
                                                        <div className="font-bold text-slate-900 text-xs">{fb.subject}</div>
                                                        <div className="text-[9px] text-slate-500 mt-0.5">{fb.class}</div>
                                                    </td>
                                                );
                                            }
                                            
                                            const classId = typeof slot === 'object' ? slot.classId || `${slot.className || ""}-${slot.sectionName || ""}` : slot;
                                            const subjectId = typeof slot === 'object' ? slot.subjectId : null;
                                            const subjectName = subjectId ? (subjects?.[subjectId]?.name || subjectId) : "";
                                            const subjectCode = getSubjectCode(subjectName);

                                            return (
                                                <td key={idx} className="p-3 border-l border-slate-300">
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
