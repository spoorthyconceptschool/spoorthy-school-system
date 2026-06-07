"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
    const [schedule, setSchedule] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_timetable_schedule_cache") || "null") : null); // weeklySchedule
    const [substitutions, setSubstitutions] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_timetable_substitutions_cache") || "[]") : []);
    const [loading, setLoading] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_timetable_schedule_cache") : true);
    const [teacherMap, setTeacherMap] = useState<Record<string, string>>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_timetable_teacherMap_cache") || "{}") : {});
    const [holidays, setHolidays] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_timetable_holidays_cache") || "[]") : []);
    const [teacherProfile, setTeacherProfile] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_profile_cache") || "null") : null);
    const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'planner'>('today');
    
    // Active Day selector state for today's timeline
    const [selectedWeeklyDay, setSelectedWeeklyDay] = useState<string>("MONDAY");
    const [todayDayName, setTodayDayName] = useState<string>("MONDAY");
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [selectedPlannerMonth, setSelectedPlannerMonth] = useState<Date>(new Date());
    const [selectedPlannerDate, setSelectedPlannerDate] = useState<string | null>(null);

    const [totalPeriods, setTotalPeriods] = useState<number>(7);
    const PERIODS = useMemo(() => {
        return Array.from({ length: totalPeriods }, (_, i) => i + 1);
    }, [totalPeriods]);

    const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
    const [pathLength, setPathLength] = useState<number>(1000);
    const [containerWidth, setContainerWidth] = useState<number>(390);
    const [containerHeight, setContainerHeight] = useState<number>(500);
    const [routeContainerHeight, setRouteContainerHeight] = useState<number>(0);
    const routeWrapperRef = useRef<HTMLDivElement>(null);

    const getPeriodColors = (pId: number) => {
        const colors: Record<number, { text: string, border: string, bg: string, shadow: string, glow: string }> = {
            1: { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-400", shadow: "shadow-emerald-500/10", glow: "rgba(16, 185, 129, 0.2)" },
            2: { text: "text-teal-400", border: "border-teal-500/30", bg: "bg-teal-400", shadow: "shadow-teal-500/10", glow: "rgba(20, 184, 166, 0.2)" },
            3: { text: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-400", shadow: "shadow-cyan-500/10", glow: "rgba(6, 182, 212, 0.2)" },
            4: { text: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-400", shadow: "shadow-blue-500/10", glow: "rgba(59, 130, 246, 0.2)" },
            5: { text: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-400", shadow: "shadow-indigo-500/10", glow: "rgba(79, 70, 229, 0.2)" },
            6: { text: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-400", shadow: "shadow-purple-500/10", glow: "rgba(124, 58, 237, 0.2)" },
            7: { text: "text-pink-400", border: "border-pink-500/30", bg: "bg-pink-400", shadow: "shadow-pink-500/10", glow: "rgba(236, 72, 153, 0.2)" },
            8: { text: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-400", shadow: "shadow-rose-500/10", glow: "rgba(244, 63, 94, 0.2)" },
            9: { text: "text-red-400", border: "border-red-500/30", bg: "bg-red-400", shadow: "shadow-red-500/10", glow: "rgba(239, 68, 68, 0.2)" },
            10: { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-400", shadow: "shadow-orange-500/10", glow: "rgba(249, 115, 22, 0.2)" },
            11: { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-400", shadow: "shadow-amber-500/10", glow: "rgba(245, 158, 11, 0.2)" },
            12: { text: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-400", shadow: "shadow-yellow-500/10", glow: "rgba(234, 179, 8, 0.2)" },
        };
        return colors[pId] || colors[1];
    };

    useEffect(() => {
        if (activeTab !== 'today') return;

        const computeHeight = () => {
            if (!routeWrapperRef.current) return;
            const rect = routeWrapperRef.current.getBoundingClientRect();
            const dvh = window.innerHeight;
            // Reserve bottom padding: mobile bottom nav is ~64px, otherwise 16px
            const isMobile = window.innerWidth < 1024;
            const bottomReserve = isMobile ? 68 : 20;
            const available = Math.max(200, dvh - rect.top - bottomReserve);
            setRouteContainerHeight(available);
        };

        const updatePoints = () => {
            computeHeight();
            const container = document.getElementById("timetable-route-container");
            if (!container) return;
            setContainerWidth(container.clientWidth);
            setContainerHeight(container.clientHeight);
            const containerRect = container.getBoundingClientRect();
            
            const newPoints = [];
            for (let i = 1; i <= totalPeriods; i++) {
                const isOdd = i % 2 !== 0;
                const nodeInner = document.getElementById(`node-p${i}`);
                const nodeOuter = document.getElementById(`node-outer-p${i}`);
                if (nodeInner && nodeOuter) {
                    const rInner = nodeInner.getBoundingClientRect();
                    const rOuter = nodeOuter.getBoundingClientRect();
                    
                    const pInner = {
                        x: rInner.left - containerRect.left + rInner.width / 2,
                        y: rInner.top - containerRect.top + rInner.height / 2
                    };
                    const pOuter = {
                        x: rOuter.left - containerRect.left + rOuter.width / 2,
                        y: rOuter.top - containerRect.top + rOuter.height / 2
                    };
                    
                    if (isOdd) {
                        newPoints.push(pInner, pOuter);
                    } else {
                        newPoints.push(pOuter, pInner);
                    }
                }
            }
            if (newPoints.length > 0) {
                setPoints(newPoints);
                
                // Read vector path total length for trail calculation
                setTimeout(() => {
                    const pathElement = document.getElementById("main-route-path") as SVGPathElement | null;
                    if (pathElement) {
                        try {
                            const length = pathElement.getTotalLength();
                            if (length > 0) {
                                setPathLength(length);
                            }
                        } catch (e) {
                            console.warn("SVG path measurement error:", e);
                        }
                    }
                }, 100);
            }
        };

        updatePoints();
        const intervals = [50, 150, 300, 600, 1200, 2000];
        const timers = intervals.map(delay => setTimeout(updatePoints, delay));

        window.addEventListener("resize", updatePoints);
        
        return () => {
            timers.forEach(clearTimeout);
            window.removeEventListener("resize", updatePoints);
        };
    }, [schedule, activeTab, totalPeriods]);

    const segments = useMemo(() => {
        const list = [];
        const dx = containerWidth * 0.45; // 45% of screen width horizontal swing overshoot
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const isLeftToRight = p1.x < p2.x;
            let d = "";
            
            if (i % 2 === 0) {
                // Intra-card: straight line
                d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
            } else {
                // Inter-card: bezier curve
                if (isLeftToRight) {
                    d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
                } else {
                    d = `M ${p1.x} ${p1.y} C ${p1.x - dx} ${p1.y}, ${p2.x + dx} ${p2.y}, ${p2.x} ${p2.y}`;
                }
            }
            list.push({
                id: i,
                d,
                p1,
                p2,
                isLeftToRight
            });
        }
        return list;
    }, [points, containerWidth]);

    const fullPathD = useMemo(() => {
        if (points.length === 0) return "";
        const dx = containerWidth * 0.45;
        let d = `M ${points[0].x} ${points[0].y} `;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            
            if (i % 2 === 0) {
                // Intra-card: straight line through the card
                d += `L ${p2.x} ${p2.y} `;
            } else {
                // Inter-card: beautiful wide bezier curve
                const isLeftToRight = p1.x < p2.x;
                if (isLeftToRight) {
                    d += `C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y} `;
                } else {
                    d += `C ${p1.x - dx} ${p1.y}, ${p2.x + dx} ${p2.y}, ${p2.x} ${p2.y} `;
                }
            }
        }
        return d;
    }, [points, containerWidth]);

    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

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
            10: "02:40 - 03:20",
            11: "03:20 - 04:00",
            12: "04:00 - 04:40"
        };
        return timings[period] || "";
    };

    const getSubjectColor = (subjectName: string = "") => {
        const name = subjectName.toUpperCase();
        if (name.includes("MATH")) return "border-l-emerald-500 bg-emerald-500/5 hover:border-l-emerald-400";
        if (name.includes("ENGLISH") || name.includes("ENG") || name.includes("LIT")) return "border-l-blue-500 bg-blue-500/5 hover:border-l-blue-400";
        if (name.includes("SCIENCE") || name.includes("SCI") || name.includes("PHY") || name.includes("CHEM") || name.includes("BIO")) return "border-l-amber-500 bg-amber-500/5 hover:border-l-amber-400";
        if (name.includes("HINDI") || name.includes("TELUGU") || name.includes("TEL") || name.includes("LANG")) return "border-l-purple-500 bg-purple-500/5 hover:border-l-purple-400";
        if (name.includes("SOCIAL") || name.includes("SST") || name.includes("HIS") || name.includes("GEO")) return "border-l-cyan-500 bg-cyan-500/5 hover:border-l-cyan-400";
        if (name.includes("COMP") || name.includes("ART") || name.includes("DRAW")) return "border-l-orange-500 bg-orange-500/5 hover:border-l-orange-400";
        return "border-l-[#10B981] bg-white/[0.02] hover:border-l-emerald-400";
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
        if (user && userData?.schoolId) {
            fetchTeacherProfile();
            fetchTeachers();
            fetchHolidays();
        }
    }, [user, userData?.schoolId]);

    const fetchTeacherProfile = async () => {
        if (!user?.uid || !userData?.schoolId) return;
        const q = query(
            collection(db, "teachers"), 
            where("uid", "==", user.uid),
            where("schoolId", "==", userData.schoolId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const tProfile = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setTeacherProfile(tProfile);
            if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(tProfile));
        }
    };

    // Real-time Timetable Listener
    useEffect(() => {
        if (!teacherProfile || !userData?.schoolId) return;

        const currentYear = selectedYear || "2026-2027";
        const possibleIds = [teacherProfile.id, teacherProfile.schoolId, teacherProfile.teacherId].filter(Boolean);
        if (possibleIds.length === 0) return;

        setLoading(true);

        const ttQuery = query(
            collection(db, "timetable_entries"),
            where("teacherId", "in", possibleIds),
            where("academicYear", "==", currentYear),
            where("schoolId", "==", userData.schoolId)
        );
        const subQuery1 = query(
            collection(db, "substitutions"), 
            where("originalTeacherId", "in", possibleIds),
            where("schoolId", "==", userData.schoolId)
        );
        const subQuery2 = query(
            collection(db, "substitutions"), 
            where("substituteTeacherId", "in", possibleIds),
            where("schoolId", "==", userData.schoolId)
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
            const subList = [...lastOrig.map(s => ({ ...s, role: "ORIGINAL" })), ...lastSub.map(s => ({ ...s, role: "SUBSTITUTE" }))];
            setSubstitutions(subList);
            setLoading(false);

            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_timetable_schedule_cache", JSON.stringify(weekly));
                localStorage.setItem("teacher_timetable_substitutions_cache", JSON.stringify(subList));
            }
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
        }, (err) => {
            console.warn("Substitutions (orig) sync error:", err);
        });

        const unsubSub2 = onSnapshot(subQuery2, (snap) => {
            lastSub = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAll();
        }, (err) => {
            console.warn("Substitutions (sub) sync error:", err);
        });

        return () => {
            unsubTT();
            unsubSub1();
            unsubSub2();
        };
    }, [teacherProfile, selectedYear, userData?.schoolId]);

    const fetchHolidays = async () => {
        if (!userData?.schoolId) return;
        try {
            const hQuery = query(
                collection(db, "notices"), 
                where("type", "==", "HOLIDAY"),
                where("schoolId", "in", [userData.schoolId, "global"])
            );
            const hSnap = await getDocs(hQuery);
            const hList = hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHolidays(hList);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_timetable_holidays_cache", JSON.stringify(hList));
            }
        } catch (e) { console.warn("[Timetable] Holiday Fetch Error", e); }
    };

    const fetchTeachers = async () => {
        if (!userData?.schoolId) return;
        try {
            const q = query(
                collection(db, "teachers"),
                where("schoolId", "==", userData.schoolId)
            );
            const snap = await getDocs(q);
            const map: Record<string, string> = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.schoolId) map[data.schoolId] = data.name;
                map[d.id] = data.name;
            });
            setTeacherMap(map);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_timetable_teacherMap_cache", JSON.stringify(map));
            }
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
        if (isHoliday) return { dayName, dateKey, slots: Array.from({ length: totalPeriods }).map((_, idx) => ({ id: idx + 1, type: "FREE" })), isHoliday: true };

        const slots = [];
        const rawDay = schedule?.[dayName] || {};

        for (let i = 1; i <= totalPeriods; i++) {
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

    // Period formatting — dynamically computed from actual measured container height
    // so ALL periods ALWAYS fit on screen without scrolling on any device/period count.
    const cardLayout = useMemo(() => {
        // Use measured container height if available, fallback to viewport estimate
        const effectiveH = routeContainerHeight > 0 ? routeContainerHeight : window?.innerHeight * 0.62 || 500;
        // Each card occupies a share of the container. We leave ~15% margin (top + bottom = 7.5% each)
        // so usable = 85% of container for N cards spaced evenly.
        // Card height = (usable height) / N, capped for readability.
        const usable = effectiveH * 0.88;
        const rawH = usable / totalPeriods;
        const heightPx = Math.min(84, Math.max(36, Math.round(rawH)));

        // Adaptive typography based on computed card height
        const isTiny = heightPx < 48;
        const isSmall = heightPx < 62;

        return {
            heightClass: "", // not used — inline style drives it
            heightPx,
            titleClass: isTiny
                ? "text-[7.5px] font-extrabold"
                : isSmall
                ? "text-[9px] xs:text-[10px] font-black"
                : "text-[10px] xs:text-[11px] font-black",
            timeClass: isTiny
                ? "text-[6.5px]"
                : isSmall
                ? "text-[7.5px] xs:text-[8px]"
                : "text-[8px] xs:text-[9px]",
            metaClass: isTiny
                ? "text-[6px]"
                : isSmall
                ? "text-[7px] xs:text-[7.5px]"
                : "text-[7.5px] xs:text-[8.5px]",
            padding: isTiny ? "p-1" : isSmall ? "p-1.5" : "p-2",
            badgeSize: isTiny
                ? "w-6 h-6 text-[8px]"
                : isSmall
                ? "w-7 h-7 text-[9px]"
                : "w-8 h-8 text-[10px]"
        };
    }, [totalPeriods, routeContainerHeight]);




    return (
        <div className={cn(
            "w-full text-[#E6F1FF] bg-transparent font-sans relative select-none",
            activeTab === 'today' ? "overflow-hidden" : "min-h-screen pb-16"
        )}>
            {/* Glowing Nebula Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#10B981]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#64FFDA]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className={cn(
                "max-w-7xl mx-auto px-3 md:px-8 pt-3 md:pt-4 relative z-10",
                activeTab === 'today' ? "flex flex-col" : "space-y-4 md:space-y-6"
            )}>
                {/* 1. Header Banner */}
                <div className="flex flex-row items-center justify-between gap-2 border-b border-white/5 pb-2 flex-none">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-[#10B981]/20 to-[#64FFDA]/20 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1">
                                <h1 className="text-xs sm:text-base font-black tracking-tight text-white font-display uppercase truncate">Scheduling Suite</h1>
                                <Badge className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono text-[7px] px-1 py-0 rounded uppercase shrink-0">TEACHER</Badge>
                            </div>
                            <p className="text-[8.5px] sm:text-[10px] text-neutral-400 font-medium truncate hidden xs:block">
                                Faculty Roster: {teacherProfile?.name || "Global Instructor"}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <Button 
                            onClick={() => window.print()} 
                            variant="outline" 
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-md font-black uppercase tracking-wider transition-all text-[9px] h-7 px-2.5 gap-1 shrink-0"
                        >
                            <Printer className="w-3 h-3 text-[#10B981]" />
                            <span className="hidden sm:inline">Print Schedule</span>
                            <span className="sm:hidden">Print</span>
                        </Button>
                    </div>
                </div>

                {/* 3. Interactive View Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2 flex-none">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-full md:w-auto shadow-inner relative z-20">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={cn(
                                "flex-1 md:flex-none px-3 md:px-6 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2",
                                activeTab === 'today'
                                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 font-black'
                                    : 'text-neutral-400 hover:text-white'
                            )}
                        >
                            <Clock className="w-3.5 h-3.5" /> <span className="inline">Today</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('weekly')}
                            className={cn(
                                "flex-1 md:flex-none px-3 md:px-6 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2",
                                activeTab === 'weekly'
                                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 font-black'
                                    : 'text-neutral-400 hover:text-white'
                            )}
                        >
                            <Calendar className="w-3.5 h-3.5" /> <span className="inline">Weekly</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('planner')}
                            className={cn(
                                "flex-1 md:flex-none px-3 md:px-6 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2",
                                activeTab === 'planner'
                                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20 font-black'
                                    : 'text-neutral-400 hover:text-white'
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> <span className="inline">Planner</span>
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
                                className="flex flex-col"
                            >
                                <div className="flex items-center justify-between mt-2 flex-none">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <h3 className="text-[10px] xs:text-xs font-black uppercase text-emerald-400 tracking-wider font-display">Timeline Journey</h3>
                                        
                                        {/* Dynamic Period Count Selector Badges */}
                                        <div className="hidden xs:flex items-center gap-1 bg-black/45 border border-white/5 rounded-lg p-0.5 ml-2 shadow-inner">
                                            {[5, 7, 8, 10, 12].map(count => (
                                                <button
                                                    key={`period-btn-${count}`}
                                                    onClick={() => setTotalPeriods(count)}
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all duration-200",
                                                        totalPeriods === count
                                                            ? "bg-[#10B981] text-black shadow shadow-[#10B981]/25"
                                                            : "text-neutral-400 hover:text-white"
                                                    )}
                                                >
                                                    {count}P
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-[9px] xs:text-[10.5px] font-mono font-bold text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg">
                                        {todayData.dateKey ? new Date(todayData.dateKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                    </span>
                                </div>

                                {todayData.isHoliday ? (
                                    <Card className="bg-[#09152b]/30 border border-white/10 backdrop-blur-md p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center mt-4">
                                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
                                            <Coffee className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-wider font-display">Official School Holiday / Break</h4>
                                            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">Standard class sessions are suspended for the holiday.</p>
                                        </div>
                                    </Card>
                                ) : !DAYS.includes(todayDayName) ? (
                                    <Card className="bg-[#09152b]/30 border border-white/10 backdrop-blur-md p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center mt-4">
                                        <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/25">
                                            <Coffee className="w-6 h-6 text-[#10B981]" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-wider font-display">Weekend Academic Break</h4>
                                            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">Regular class schedule resumes on Monday. Enjoy the weekend!</p>
                                        </div>
                                    </Card>
                                ) : todayData.slots.length === 0 ? (
                                    <Card className="bg-[#09152b]/30 border border-white/10 backdrop-blur-md p-8 rounded-2xl text-center text-neutral-400 italic text-xs mt-4">
                                        No scheduled periods found for today.
                                    </Card>
                                ) : (
                                    <div
                                        ref={routeWrapperRef}
                                        className="w-full relative mt-2 max-w-[480px] mx-auto overflow-hidden"
                                        style={{ height: routeContainerHeight > 0 ? `${routeContainerHeight}px` : '60vh' }}
                                    >
                                        <div id="timetable-route-container" className="relative w-full h-full select-none overflow-hidden camera-effect">
                                            {/* CSS Styling overlay */}
                                            <style dangerouslySetInnerHTML={{__html: `
                                                @keyframes radar-ripple {
                                                    0% { transform: scale(0.7); opacity: 0.8; }
                                                    50% { transform: scale(1.6); opacity: 1; }
                                                    100% { transform: scale(0.7); opacity: 0.8; }
                                                }
                                                @keyframes breathing-shadow {
                                                    0%, 100% { filter: drop-shadow(0 0 3px currentColor) opacity(0.85); }
                                                    50% { filter: drop-shadow(0 0 12px currentColor) opacity(1); }
                                                }
                                                @keyframes node-flare {
                                                    0% { transform: scale(1.0); opacity: 0.7; filter: brightness(1) drop-shadow(0 0 0px currentColor); }
                                                    4% { transform: scale(1.6); opacity: 1; filter: brightness(2.5) drop-shadow(0 0 14px currentColor); }
                                                    10% { transform: scale(1.0); opacity: 0.7; filter: brightness(1) drop-shadow(0 0 0px currentColor); }
                                                    100% { transform: scale(1.0); opacity: 0.7; }
                                                }
                                                @keyframes node-ripple {
                                                    0% { transform: scale(0.8); opacity: 0.85; border-width: 2px; }
                                                    15% { transform: scale(2.8); opacity: 0; border-width: 0.5px; }
                                                    100% { transform: scale(0.8); opacity: 0; }
                                                }
                                                @keyframes float-bg {
                                                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
                                                    50% { transform: translate(12px, -12px) scale(1.15); opacity: 0.45; }
                                                }
                                                @keyframes route-glow-pulse {
                                                    0%, 100% { opacity: 0.55; filter: drop-shadow(0 0 1px currentColor); }
                                                    50% { opacity: 0.75; filter: drop-shadow(0 0 5px currentColor); }
                                                }
                                                @keyframes camera-breath {
                                                    0%, 100% { transform: scale(1); }
                                                    50% { transform: scale(1.006) translate(0.5px, 0.5px); }
                                                }
                                                @keyframes active-float {
                                                    0%, 100% { transform: translateY(-50%) translateY(0px) scale(1); }
                                                    50% { transform: translateY(-50%) translateY(-4px) scale(1.025); }
                                                }
                                                .camera-effect {
                                                    animation: camera-breath 7s infinite ease-in-out;
                                                }
                                                .active-card-float {
                                                    animation: active-float 3s infinite ease-in-out;
                                                }
                                                .node-pulse {
                                                    animation: radar-ripple 2.5s infinite ease-in-out;
                                                }
                                                .card-glow-active {
                                                    animation: breathing-shadow 3s infinite ease-in-out;
                                                }
                                                .bg-glow-float {
                                                    animation: float-bg 9s infinite ease-in-out;
                                                }
                                                .route-pulse {
                                                    animation: route-glow-pulse 4.5s infinite ease-in-out;
                                                }
                                            `}} />

                                            {/* Ambient drifting glowing background circles (Futuristic neon fog) */}
                                            <div className="absolute top-1/4 left-1/2 w-48 h-48 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none bg-glow-float" />
                                            <div className="absolute top-1/2 right-10 w-64 h-64 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none bg-glow-float" style={{ animationDelay: '-3s' }} />
                                            <div className="absolute bottom-1/4 left-10 w-56 h-56 bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none bg-glow-float" style={{ animationDelay: '-5s' }} />

                                            {/* Floating background particles */}
                                            <div className="absolute top-12 left-1/4 w-1.5 h-1.5 bg-[#10B981]/30 rounded-full blur-[1px] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />
                                            <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-[#06B6D4]/20 rounded-full blur-[1px] animate-ping pointer-events-none" style={{ animationDuration: '6s' }} />
                                            <div className="absolute bottom-1/3 left-1/6 w-1 h-1 bg-white/45 rounded-full animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
                                            <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-[#7C3AED]/25 rounded-full blur-[1px] animate-pulse pointer-events-none" style={{ animationDuration: '5s' }} />

                                            {/* SVG Route overlay */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                                                <defs>
                                                    {/* Glowing Filters */}
                                                    <filter id="heavy-glow" x="-50%" y="-50%" width="200%" height="200%">
                                                        <feGaussianBlur stdDeviation="8" result="blur1" />
                                                        <feGaussianBlur stdDeviation="4" result="blur2" />
                                                        <feMerge>
                                                            <feMergeNode in="blur1" />
                                                            <feMergeNode in="blur2" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                    {/* Vertical Color Gradient */}
                                                    <linearGradient id="route-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#10B981" />
                                                        <stop offset="15%" stopColor="#14B8A6" />
                                                        <stop offset="30%" stopColor="#06B6D4" />
                                                        <stop offset="45%" stopColor="#3B82F6" />
                                                        <stop offset="60%" stopColor="#4F46E5" />
                                                        <stop offset="75%" stopColor="#7C3AED" />
                                                        <stop offset="90%" stopColor="#EC4899" />
                                                        <stop offset="100%" stopColor="#F43F5E" />
                                                    </linearGradient>
                                                </defs>

                                                {/* 1. Base glow path (thick) */}
                                                {fullPathD && (
                                                    <path 
                                                        id="main-route-path"
                                                        d={fullPathD} 
                                                        fill="none" 
                                                        stroke="url(#route-gradient)" 
                                                        strokeWidth="11" 
                                                        className="opacity-15 route-pulse" 
                                                        filter="url(#heavy-glow)"
                                                        strokeLinecap="round"
                                                    />
                                                )}

                                                {/* 2. Bright core path */}
                                                {fullPathD && (
                                                    <path 
                                                        d={fullPathD} 
                                                        fill="none" 
                                                        stroke="url(#route-gradient)" 
                                                        strokeWidth="3.5" 
                                                        className="opacity-60 route-pulse"
                                                        strokeLinecap="round"
                                                    />
                                                )}

                                                {/* 2.1 Animated Plasma magenta trail */}
                                                {fullPathD && (
                                                    <path 
                                                        d={fullPathD} 
                                                        fill="none" 
                                                        stroke="#EC4899" 
                                                        strokeWidth="14" 
                                                        strokeLinecap="round"
                                                        strokeDasharray={`140, ${pathLength}`}
                                                        filter="url(#heavy-glow)"
                                                        className="opacity-25"
                                                    >
                                                        <animate 
                                                            attributeName="stroke-dashoffset" 
                                                            from="140" 
                                                            to={`-${pathLength - 140}`} 
                                                            dur="8s" 
                                                            repeatCount="indefinite" 
                                                        />
                                                    </path>
                                                )}

                                                {/* 2.2 Wide cyan glow trail */}
                                                {fullPathD && (
                                                    <path 
                                                        d={fullPathD} 
                                                        fill="none" 
                                                        stroke="#06B6D4" 
                                                        strokeWidth="8" 
                                                        strokeLinecap="round"
                                                        strokeDasharray={`100, ${pathLength}`}
                                                        filter="url(#heavy-glow)"
                                                        className="opacity-45"
                                                    >
                                                        <animate 
                                                            attributeName="stroke-dashoffset" 
                                                            from="100" 
                                                            to={`-${pathLength - 100}`} 
                                                            dur="8s" 
                                                            repeatCount="indefinite" 
                                                        />
                                                    </path>
                                                )}

                                                {/* 2.3 Animated Glowing Trail (Electricity effect - White Core) */}
                                                {fullPathD && (
                                                    <path 
                                                        d={fullPathD} 
                                                        fill="none" 
                                                        stroke="#ffffff" 
                                                        strokeWidth="4" 
                                                        strokeLinecap="round"
                                                        strokeDasharray={`60, ${pathLength}`}
                                                        filter="url(#heavy-glow)"
                                                        className="opacity-95"
                                                    >
                                                        <animate 
                                                            attributeName="stroke-dashoffset" 
                                                            from="60" 
                                                            to={`-${pathLength - 60}`} 
                                                            dur="8s" 
                                                            repeatCount="indefinite" 
                                                        />
                                                    </path>
                                                )}

                                                {/* 3. Chevrons on each segment */}
                                                {segments.map((seg, idx) => (
                                                    <g key={`seg-chevrons-${idx}`}>
                                                        <path id={`seg-path-${idx}`} d={seg.d} fill="none" stroke="transparent" strokeWidth="1" />
                                                        <text className="fill-white/20 text-[7px] md:text-[8px] font-mono tracking-widest select-none" dy="2.5">
                                                            <textPath href={`#seg-path-${idx}`} startOffset="50%" textAnchor="middle">
                                                                ≫≫
                                                            </textPath>
                                                        </text>
                                                    </g>
                                                ))}

                                                {/* 4. Moving energy particle orb group (20px Glowing Sphere ☀ with Core, Rays and sparks) */}
                                                {fullPathD && (
                                                    <g>
                                                        <animateMotion dur="8s" repeatCount="indefinite" path={fullPathD} rotate="auto" />
                                                        
                                                        {/* Outer heavy bloom glow rings */}
                                                        <circle r="22" fill="#00F3FF" opacity="0.3" filter="url(#heavy-glow)" />
                                                        <circle r="14" fill="#64FFDA" opacity="0.5" filter="url(#heavy-glow)" />
                                                        
                                                        {/* Starburst rays ☀ */}
                                                        <g className="animate-pulse">
                                                            <path 
                                                                d="M-12,0 L12,0 M0,-12 L0,12 M-8,-8 L8,8 M-8,8 L8,-8" 
                                                                stroke="#ffffff" 
                                                                strokeWidth="2" 
                                                                strokeLinecap="round"
                                                                opacity="0.95" 
                                                            />
                                                            <path 
                                                                d="M-5,-10 L5,10 M-10,-5 L10,5" 
                                                                stroke="#64FFDA" 
                                                                strokeWidth="1.2" 
                                                                strokeLinecap="round"
                                                                opacity="0.8" 
                                                            />
                                                        </g>
                                                        
                                                        {/* White hot core */}
                                                        <circle r="6" fill="#ffffff" />
                                                        
                                                        {/* Local sparkling particles trailing behind the orb */}
                                                        <circle cx="-16" cy="-4" r="2" fill="#ffffff" opacity="0.8">
                                                            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.8s" repeatCount="indefinite" />
                                                            <animate attributeName="cx" values="-16;-20;-16" dur="1.2s" repeatCount="indefinite" />
                                                        </circle>
                                                        <circle cx="-12" cy="6" r="2.5" fill="#64FFDA" opacity="0.9">
                                                            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.6s" repeatCount="indefinite" />
                                                            <animate attributeName="cy" values="6;9;6" dur="0.9s" repeatCount="indefinite" />
                                                        </circle>
                                                        <circle cx="-22" cy="2" r="1.5" fill="#00F3FF" opacity="0.7">
                                                            <animate attributeName="opacity" values="0.1;0.7;0.1" dur="1.5s" repeatCount="indefinite" />
                                                            <animate attributeName="cx" values="-22;-26;-22" dur="1.5s" repeatCount="indefinite" />
                                                        </circle>
                                                        <circle cx="-8" cy="-8" r="1.8" fill="#ffffff" opacity="0.95">
                                                            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.5s" repeatCount="indefinite" />
                                                            <animate attributeName="cy" values="-8;-5;-8" dur="0.7s" repeatCount="indefinite" />
                                                        </circle>
                                                    </g>
                                                )}
                                            </svg>

                                            {/* Cards mapping in snaking alternating positions, spaced vertically using percentages */}
                                            {PERIODS.map((pId) => {
                                                const slot = todayData.slots.find((s: any) => s.id === pId);
                                                const isCurrent = statsInfo.activeId === pId;
                                                const isNext = statsInfo.nextId === pId;
                                                const isOdd = pId % 2 !== 0;
                                                const cardColors = getPeriodColors(pId);
                                                const subjectName = slot?.subjectId ? (subjects?.[slot.subjectId]?.name || slot.subjectId) : "Free Period / Prep";
                                                const isFree = !slot || slot.type === "FREE";
                                                const isSub = slot?.type === "SUBSTITUTION";
                                                const isLeave = slot?.type === "LEAVE";

                                                // Evenly distribute cards: first card at top, last at bottom
                                                // Each card center at: (i/(N-1)) * 100% of container height
                                                // We use margin% of half-card-height to avoid clipping edges
                                                const halfCardPct = (cardLayout.heightPx / 2 / (routeContainerHeight || 500)) * 100;
                                                const topPercent = totalPeriods > 1
                                                    ? halfCardPct + (pId - 1) * ((100 - 2 * halfCardPct) / (totalPeriods - 1))
                                                    : 50;

                                                return (
                                                    <div 
                                                        key={`timeline-slot-${pId}`} 
                                                        className={cn(
                                                            "absolute p-[1.5px] overflow-hidden transition-all duration-350 select-none hover:scale-[1.03] hover:shadow-2xl z-10 w-[38%]",
                                                            isOdd ? "left-[4%] rounded-[20px] rounded-tr-none" : "right-[4%] rounded-[20px] rounded-tl-none",
                                                            isCurrent ? "card-glow-active active-card-float" : ""
                                                        )}
                                                        style={{
                                                            top: `${topPercent}%`,
                                                            height: `${cardLayout.heightPx}px`,
                                                            transform: isCurrent ? undefined : 'translateY(-50%)',
                                                            boxShadow: isCurrent ? `0 0 25px ${cardColors.glow}` : `0 0 10px ${cardColors.glow}`,
                                                            position: 'absolute'
                                                        }}
                                                    >

                                                        {/* Rotating conic gradient border sweep for active period card */}
                                                        {isCurrent && (
                                                            <div 
                                                                className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#10B981,#06B6D4,#3B82F6,#7C3AED,#EC4899,#10B981)] animate-spin" 
                                                                style={{ animationDuration: '3.5s' }} 
                                                            />
                                                        )}

                                                        {/* Card Content body */}
                                                        <div 
                                                            className={cn(
                                                                "w-full h-full flex flex-row items-center gap-2 bg-[#09152b]/95 border backdrop-blur-md rounded-[19px] relative z-10",
                                                                isOdd ? "rounded-tr-none" : "rounded-tl-none",
                                                                cardLayout.padding,
                                                                isCurrent ? "border-white/20" : cardColors.border,
                                                                isLeave ? "opacity-60 line-through" : ""
                                                            )}
                                                        >
                                                            {/* Period Circle Badge */}
                                                            <div className={cn(
                                                                "rounded-full border border-white/10 flex items-center justify-center font-black font-mono shrink-0 bg-white/5",
                                                                cardLayout.badgeSize,
                                                                isCurrent ? "bg-white text-black" : "text-white"
                                                            )}>
                                                                P{pId}
                                                            </div>

                                                            {/* Details */}
                                                            <div className="flex-1 min-w-0 pr-1">
                                                                <h5 className={cn("text-white capitalize leading-tight truncate", cardLayout.titleClass)}>
                                                                    {isSub ? "Substitution" : isLeave ? "Leave (Suspended)" : subjectName}
                                                                </h5>
                                                                <p className={cn("text-neutral-400 font-mono mt-0.5 leading-none truncate", cardLayout.timeClass)}>
                                                                    {getPeriodTiming(pId)}
                                                                </p>
                                                                <span className={cn("text-neutral-500 block mt-1 leading-none truncate", cardLayout.metaClass)}>
                                                                    Class: {slot?.classId || "—"}
                                                                </span>
                                                            </div>

                                                            {/* Clock/Teacher Icon in Bottom Right */}
                                                            <div className="absolute bottom-1 right-1 text-neutral-500">
                                                                <Clock className="w-2.5 h-2.5" />
                                                            </div>

                                                            {/* Connection Node (Left Side) */}
                                                            <div 
                                                                id={!isOdd ? `node-p${pId}` : `node-outer-p${pId}`}
                                                                className={cn(
                                                                    "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 xs:w-4 xs:h-4 rounded-full border bg-[#050B1F] flex items-center justify-center z-20 shadow-md",
                                                                    cardColors.border,
                                                                    cardColors.text
                                                                )}
                                                                style={{
                                                                    animation: `node-flare 8s infinite ease-in-out`,
                                                                    animationDelay: `${totalPeriods > 1 ? (pId - 1) * (8 / (totalPeriods - 1)) : 0}s`
                                                                }}
                                                            >
                                                                <div className={cn("w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full node-pulse", cardColors.bg)} />
                                                                <div 
                                                                    className="absolute inset-0 rounded-full border-2 border-current opacity-0 pointer-events-none"
                                                                    style={{
                                                                        animation: `node-ripple 8s infinite cubic-bezier(0.1, 0.8, 0.3, 1)`,
                                                                        animationDelay: `${totalPeriods > 1 ? (pId - 1) * (8 / (totalPeriods - 1)) : 0}s`
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Connection Node (Right Side) */}
                                                            <div 
                                                                id={isOdd ? `node-p${pId}` : `node-outer-p${pId}`}
                                                                className={cn(
                                                                    "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 xs:w-4 xs:h-4 rounded-full border bg-[#050B1F] flex items-center justify-center z-20 shadow-md",
                                                                    cardColors.border,
                                                                    cardColors.text
                                                                )}
                                                                style={{
                                                                    animation: `node-flare 8s infinite ease-in-out`,
                                                                    animationDelay: `${totalPeriods > 1 ? (pId - 1) * (8 / (totalPeriods - 1)) : 0}s`
                                                                }}
                                                            >
                                                                <div className={cn("w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full node-pulse", cardColors.bg)} />
                                                                <div 
                                                                    className="absolute inset-0 rounded-full border-2 border-current opacity-0 pointer-events-none"
                                                                    style={{
                                                                        animation: `node-ripple 8s infinite cubic-bezier(0.1, 0.8, 0.3, 1)`,
                                                                        animationDelay: `${totalPeriods > 1 ? (pId - 1) * (8 / (totalPeriods - 1)) : 0}s`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
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
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#10B981]" />
                                        <h3 className="text-xs font-black uppercase text-[#10B981] tracking-widest font-display">Weekly Timetable</h3>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                                        Grid View • 10 Periods
                                    </span>
                                </div>

                                {/* Unified Weekly Timetable Matrix Grid (Visible on all screen sizes, horizontally scrollable on mobile) */}
                                <Card className="bg-[#09152b]/40 border border-white/5 backdrop-blur-md shadow-xl rounded-xl overflow-hidden">
                                    <div className="p-2 md:p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                                        <div className="flex flex-col space-y-2 min-w-[800px]">
                                            {/* Header Row */}
                                            <div className="flex items-center gap-2">
                                                {/* Corner label */}
                                                <div className="w-[80px] md:w-[110px] shrink-0 bg-[#09152b] rounded-lg border border-white/5 p-1 flex flex-col justify-center items-center h-10 shadow-inner">
                                                    <span className="text-[8px] font-black uppercase text-[#10B981] tracking-wider font-display">DAYS</span>
                                                    <div className="h-px bg-white/10 w-4 my-0.5" />
                                                    <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider font-display">PERIODS</span>
                                                </div>

                                                {/* Period Header Mapping */}
                                                <div className="flex flex-1 gap-1.5 min-w-0">
                                                    {PERIODS.map(pId => (
                                                        <div 
                                                            key={`weekly-header-${pId}`} 
                                                            className="flex-1 min-w-0 bg-white/5 rounded-lg border border-white/5 p-1 flex flex-col justify-center items-center h-10 shadow-inner"
                                                        >
                                                            <span className="font-bold text-white text-[9px] tracking-tight font-display">P{pId}</span>
                                                            <span className="text-[7.5px] text-neutral-400 font-bold font-mono block truncate w-full text-center mt-0.5">{getPeriodTiming(pId)}</span>
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
                                                    <div key={`weekly-row-${dayName}`} className="flex items-stretch gap-2">
                                                        {/* Day Label Header */}
                                                        <div 
                                                            className={`w-[80px] md:w-[110px] shrink-0 rounded-lg border flex flex-col justify-center items-center shadow-sm transition-all h-auto py-1 ${
                                                                isToday
                                                                    ? "bg-[#10B981] border-[#10B981]/30 text-black shadow-[#10B981]/10"
                                                                    : "bg-[#09152b]/60 border-white/5 text-white"
                                                            }`}
                                                        >
                                                            <span className="text-[10px] font-black uppercase tracking-wider font-display">{dayName.substring(0, 3)}</span>
                                                            <span className={`text-[8px] font-extrabold uppercase mt-0.5 ${isToday ? "text-white/80" : "text-neutral-400"}`}>
                                                                {dateLabel}
                                                            </span>
                                                        </div>

                                                        {/* Periods columns for this day */}
                                                        <div className="flex flex-1 gap-1.5 min-w-0">
                                                            {rowData.isHoliday ? (
                                                                <div className="flex-1 bg-amber-500/5 border border-amber-500/15 rounded-lg flex items-center justify-center gap-1.5 text-amber-500 px-3 shadow-inner">
                                                                    <Coffee className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="text-[9px] font-black uppercase tracking-wider font-display truncate">Holiday</span>
                                                                </div>
                                                            ) : (
                                                                PERIODS.map(pId => {
                                                                    const slot = rowData.slots.find((s: any) => s.id === pId);
                                                                    
                                                                    if (!slot || slot.type === "FREE") {
                                                                        return (
                                                                            <div 
                                                                                key={`matrix-slot-free-${dayName}-${pId}`} 
                                                                                className="flex-1 min-w-0 bg-white/[0.01] border border-dashed border-white/5 rounded-lg flex items-center justify-center text-neutral-600 text-[10px] font-mono"
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
                                                                            className={`flex-1 min-w-0 p-1.5 rounded-lg border transition-all duration-300 flex flex-col justify-between text-left relative overflow-hidden group min-h-[52px] ${
                                                                                isSub
                                                                                    ? "bg-yellow-500/10 border-yellow-500/25 shadow-md shadow-yellow-500/5 hover:border-yellow-500/40"
                                                                                    : isLeave
                                                                                    ? "bg-rose-500/5 border-rose-500/15 opacity-60 line-through"
                                                                                    : "bg-[#0A192F]/40 border-white/5 hover:border-white/15"
                                                                            }`}
                                                                        >
                                                                            <div className="flex justify-between items-center gap-0.5 shrink-0 select-none">
                                                                                <span className="text-[7px] font-bold text-neutral-500 font-mono leading-none">P{pId}</span>
                                                                                {isSub && (
                                                                                    <Badge className="text-[6px] bg-yellow-500 text-neutral-900 border-none font-black px-1 py-0 rounded leading-none shrink-0">
                                                                                        SUB
                                                                                    </Badge>
                                                                                )}
                                                                            </div>

                                                                            <div className="truncate mt-0.5">
                                                                                <h4 className="font-extrabold text-white tracking-tight capitalize truncate group-hover:text-[#3B82F6] transition-colors font-display text-[9px] leading-tight">
                                                                                    {isLeave ? "On Leave" : subjectName}
                                                                                </h4>
                                                                            </div>

                                                                            <div className="truncate shrink-0 leading-none">
                                                                                <span className="text-neutral-400 font-medium truncate block font-sans text-[8px] mt-0.5">
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
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                                        <h3 className="text-sm font-black uppercase text-[#3B82F6] tracking-widest font-display">Academic Planner</h3>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-start gap-2.5 bg-black/40 border border-white/10 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                                        <Button variant="ghost" size="icon" onClick={() => handlePlannerMonthChange(-1)} className="h-8 w-8 text-neutral-400 hover:text-white rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
                                        <span className="text-xs font-black uppercase font-mono px-2 text-white text-center flex-1 sm:flex-initial">
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
                                                <div key={day} className="text-[10px] font-black uppercase text-neutral-500 py-1.5 font-display">
                                                    <span className="hidden sm:inline">{day}</span>
                                                    <span className="sm:hidden">{day[0]}</span>
                                                </div>
                                            ))}

                                            {/* Calendar Days */}
                                            {plannerDays.map((dateObj, idx) => {
                                                if (!dateObj) {
                                                    return <div key={`empty-cell-${idx}`} className="bg-transparent aspect-square" />;
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
                                                        className={cn(
                                                            "border rounded-xl md:rounded-2xl aspect-square flex flex-col justify-between p-1.5 md:p-2 text-left relative overflow-hidden transition-all duration-200 select-none",
                                                            cellBg,
                                                            borderClass
                                                        )}
                                                    >
                                                        <span className={`text-[10px] md:text-[11px] font-mono font-black ${textClass}`}>{dateObj.getDate()}</span>
                                                        
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
                                {branding?.schoolName || "Spoorthy High School"}
                            </h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
                                Master Schedule • {teacherProfile?.name || "Teacher Portal"}
                            </p>
                        </div>
                        <p className="text-xs font-mono font-bold text-slate-400">
                            Academic Year: {currentYear} • Issued: {new Date().toLocaleDateString('en-GB')}
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
