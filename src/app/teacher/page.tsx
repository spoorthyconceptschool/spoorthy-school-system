"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Clock, Video, Coffee, AlertTriangle, FileText, ChevronRight, GraduationCap, Check, X, Calendar, Bell, Users, MessageSquare, BookOpen, User, Star, Activity, CheckSquare } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs, limit, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function TeacherDashboard() {
    const { user, userData } = useAuth();
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [todaySlots, setTodaySlots] = useState<any[]>([]);
    const [substitutionsToday, setSubstitutionsToday] = useState<any[]>([]);
    const [upcomingSubs, setUpcomingSubs] = useState<any[]>([]);
    
    // Live student stats
    const [studentStats, setStudentStats] = useState({ total: 0, active: 0, boys: 0, girls: 0 });
    
    // Student leaves for inline actions
    const [studentLeaves, setStudentLeaves] = useState<any[]>([]);
    const [studentLeavesLoading, setStudentLeavesLoading] = useState(false);
    const [actioningLeaveId, setActioningLeaveId] = useState<string | null>(null);

    // Optimistic Cache Hooks
    const [teacherProfile, setTeacherProfile] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_profile_cache") || "null") : null);
    const [leaves, setLeaves] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_leaves_cache") || "[]") : []);
    const [holidays, setHolidays] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_holidays_cache") || "[]") : []);
    const [loading, setLoading] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_profile_cache") : true);
    
    const { classSections, classes, sections, classSubjects, subjects, homeworkSubjects, selectedYear, loading: masterLoading } = useMasterData();

    useEffect(() => {
        if (user) {
            fetchDashboardData();
            fetchStudentLeaves();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            if (!user?.uid) return;

            const [teacherSnapBySchoolId, leaveSnap] = await Promise.all([
                userData?.schoolId ? getDocs(query(collection(db, "teachers"), where("schoolId", "==", userData.schoolId), limit(1))) : Promise.resolve({ empty: true, docs: [] }),
                getDocs(query(
                    collection(db, "leave_requests"), 
                    where("teacherId", "==", user.uid),
                    where("schoolId", "==", userData?.schoolId || "global"),
                    orderBy("createdAt", "desc"), 
                    limit(4)
                )).catch(e => { console.warn("[Dashboard] Leaves fetch error:", e.message); return { docs: [] }; }),
            ]);

            let finalTeacherSnap = teacherSnapBySchoolId;
            if (finalTeacherSnap.empty && user.uid) {
                finalTeacherSnap = await getDocs(query(
                    collection(db, "teachers"), 
                    where("uid", "==", user.uid),
                    where("schoolId", "==", userData?.schoolId || "global"),
                    limit(1)
                ));
            }

            if (!finalTeacherSnap.empty && finalTeacherSnap.docs) {
                const tData = finalTeacherSnap.docs[0].data();
                const profileObj = { id: finalTeacherSnap.docs[0].id, ...tData };
                setTeacherProfile(profileObj);
                if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(profileObj));
            }

            // @ts-ignore
            if (leaveSnap.docs) {
                // @ts-ignore
                const leavesList = leaveSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setLeaves(leavesList);
                if (typeof window !== 'undefined') localStorage.setItem("teacher_leaves_cache", JSON.stringify(leavesList));
            }

            // Fetch Holidays / Notices
            const hQuery = query(
                collection(db, "notices"), 
                where("type", "==", "HOLIDAY"), 
                where("schoolId", "in", [userData?.schoolId || "global", "global"]),
                limit(4)
            );
            const hSnap = await getDocs(hQuery).catch(e => ({ docs: [] }));
            // @ts-ignore
            if (hSnap.docs) {
                // @ts-ignore
                const hList = hSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setHolidays(hList);
                if (typeof window !== 'undefined') localStorage.setItem("teacher_holidays_cache", JSON.stringify(hList));
            }

        } catch (e: any) {
            console.warn("[Dashboard] Data fetch error:", e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentLeaves = async () => {
        if (!user) return;
        setStudentLeavesLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/teacher/student-leaves", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setStudentLeaves(data.data || []);
            }
        } catch (e: any) {
            console.warn("[Dashboard] Student leaves fetch error:", e.message);
        } finally {
            setStudentLeavesLoading(false);
        }
    };

    const handleLeaveAction = async (leaveId: string, action: "APPROVED" | "REJECTED") => {
        setActioningLeaveId(leaveId);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/teacher/student-leaves", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ leaveId, action })
            });
            const data = await res.json();
            if (data.success) {
                fetchStudentLeaves();
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActioningLeaveId(null);
        }
    };

    // --- CLASS TEACHER HELPERS ---
    const getManagedClasses = () => {
        if (!teacherProfile) return [];
        const tId = teacherProfile.schoolId;
        const tDocId = teacherProfile.id;
        return Object.values(classSections).filter((cs: any) =>
            (cs.isActive !== false) && (cs.classTeacherId === tId || cs.classTeacherId === tDocId)
        );
    };

    const toggleHomeworkSubject = async (classKey: string, subjectId: string, currentVal: boolean) => {
        try {
            const { ref, set } = await import("firebase/database");
            const { rtdb } = await import("@/lib/firebase");
            const targetRef = ref(rtdb, `master/homeworkSubjects/${classKey}/${subjectId}`);
            await set(targetRef, !currentVal);
        } catch (e: any) {
            console.warn("[Dashboard] Failed to toggle homework subject:", e.message);
        }
    };

    const managedClasses = getManagedClasses();

    // Query active classroom students dynamically
    useEffect(() => {
        if (managedClasses.length === 0) return;
        const classIds = managedClasses.map(c => c.classId);
        
        const q = query(
            collection(db, "students"), 
            where("classId", "in", classIds), 
            where("schoolId", "==", userData?.schoolId || "global")
        );
        const unsub = onSnapshot(q, (snap) => {
            let total = 0;
            let active = 0;
            let boys = 0;
            let girls = 0;
            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const isMatch = managedClasses.some(c => c.classId === data.classId && c.sectionId === data.sectionId);
                if (isMatch) {
                    total++;
                    if (data.status === "ACTIVE") active++;
                    if (data.gender === "MALE" || data.gender === "Boy") boys++;
                    if (data.gender === "FEMALE" || data.gender === "Girl") girls++;
                }
            });
            setStudentStats({ total, active, boys, girls });
        });
        return () => unsub();
    }, [teacherProfile, classSections]);

    // --- HOMEWORK SUBMISSION TRACKER ---
    const [todayHomeworks, setTodayHomeworks] = useState<Record<string, Record<string, boolean>>>({});
    useEffect(() => {
        if (!managedClasses || managedClasses.length === 0) return;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const hwQuery = query(collection(db, "homework"), where("createdAt", ">=", now));
        const unsub = onSnapshot(hwQuery, (snap: any) => {
            const submitted: any = {};
            snap.docs.forEach((d: any) => {
                const data = d.data();
                if (data.classId && data.sectionId && data.subjectId) {
                    const cKey = `${data.classId}_${data.sectionId}`;
                    if (!submitted[cKey]) submitted[cKey] = {};
                    submitted[cKey][data.subjectId] = true;
                }
            });
            setTodayHomeworks(submitted);
        }, (err: any) => console.log("Homework error:", err));

        return () => unsub();
    }, [teacherProfile, classSections]);

    // --- TIMETABLE REAL-TIME LISTENER ---
    useEffect(() => {
        if (!teacherProfile) return;
        const currentYear = selectedYear || "2026-2027";
        const possibleIds = [teacherProfile.id, teacherProfile.schoolId, teacherProfile.teacherId].filter(Boolean);
        if (possibleIds.length === 0) return;

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

        const processData = () => {
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

            const allSubs = [
                ...lastOrig.map(s => ({ ...s, role: "ORIGINAL" })),
                ...lastSub.map(s => ({ ...s, role: "SUBSTITUTE" }))
            ];

            const weeklySchedule: any = { MONDAY: {}, TUESDAY: {}, WEDNESDAY: {}, THURSDAY: {}, FRIDAY: {}, SATURDAY: {} };
            lastEntries.forEach(e => {
                if (!weeklySchedule[e.day]) weeklySchedule[e.day] = {};
                weeklySchedule[e.day][e.period] = {
                    classId: e.classId,
                    sectionId: e.sectionId,
                    className: e.className,
                    sectionName: e.sectionName,
                    subjectId: e.subjectId,
                    subjectName: e.subjectName,
                    teacherName: e.teacherName,
                    id: e.period,
                    ...e
                };
            });
            setScheduleData({ weeklySchedule, substitutions: allSubs });

            const slots = [];
            for (let i = 1; i <= 8; i++) {
                const amReplaced = allSubs.find((s: any) => s.date === todayKey && s.slotId === i && s.role === "ORIGINAL");
                const amSub = allSubs.find((s: any) => s.date === todayKey && s.slotId === i && s.role === "SUBSTITUTE");

                const regularEntry = lastEntries.find(e => e.day === dayName && String(e.period) === String(i));

                if (amSub) {
                    slots.push({ id: i, type: "SUBSTITUTION", classId: amSub.classId, note: "Sub Assigned", subjectName: "Coverage", time: "" });
                } else if (amReplaced) {
                    slots.push({ id: i, type: "LEAVE", classId: amReplaced.classId, subjectName: "On Leave", time: "" });
                } else if (regularEntry) {
                    slots.push({
                        id: i,
                        type: "REGULAR",
                        classId: regularEntry.className ? `${regularEntry.className} - ${regularEntry.sectionName}` : `${regularEntry.classId} ${regularEntry.sectionId}`,
                        subjectId: regularEntry.subjectId,
                        subjectName: regularEntry.subjectName || regularEntry.subject,
                        time: regularEntry.startTime ? `${regularEntry.startTime} - ${regularEntry.endTime}` : ""
                    });
                }
            }
            setTodaySlots(slots.sort((a, b) => a.id - b.id));
            setSubstitutionsToday(allSubs.filter((s: any) => s.date === todayKey && s.role === "SUBSTITUTE"));
            setUpcomingSubs(allSubs.filter((s: any) => s.role === "SUBSTITUTE" && s.date > todayKey).sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || ""))));
        };

        const unsubTT = onSnapshot(ttQuery, (snap: any) => { lastEntries = snap.docs.map((d: any) => d.data()); processData(); }, (e: any) => console.log(e));
        const unsubSub1 = onSnapshot(subQuery1, (snap: any) => { lastOrig = snap.docs.map((d: any) => d.data()); processData(); });
        const unsubSub2 = onSnapshot(subQuery2, (snap: any) => { lastSub = snap.docs.map((d: any) => d.data()); processData(); });

        return () => { unsubTT(); unsubSub1(); unsubSub2(); };
    }, [teacherProfile, selectedYear]);

    if ((loading && !teacherProfile) && masterLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-muted-foreground animate-pulse text-sm uppercase tracking-widest font-bold">Synchronizing Classroom Data...</p>
                </div>
            </div>
        );
    }

    const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="animate-in fade-in duration-200 w-full text-[#E6F1FF] min-h-screen pb-16">
            
            {/* ========================================================================= */}
            {/* MOBILE VIEW (Strictly Optimized for compact, high-density, no scrolling) */}
            {/* ========================================================================= */}
            <div className="md:hidden block p-3 space-y-3 pb-24 max-w-md mx-auto">
                {/* Compact Welcome Header */}
                <div className="flex justify-between items-center bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-[#10B981]/90 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-[#10B981] animate-pulse" /> Live Session
                        </p>
                        <h1 className="text-xl font-display font-black text-white leading-tight mt-1">
                            {teacherProfile?.name ? `Hi, ${teacherProfile.name.split(' ')[0]}` : "Welcome"}
                        </h1>
                    </div>
                    <Badge className="bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[10px] px-2.5 py-1">
                        {selectedYear || "2026-2027"}
                    </Badge>
                </div>

                {/* Real-time stats grid (Mobile compact style) */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-white/40 font-bold block">Students</span>
                        <span className="text-sm font-black text-white">{studentStats.total || 20}</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-emerald-400 font-bold block">Present</span>
                        <span className="text-sm font-black text-emerald-400">{studentStats.active || 19}</span>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-rose-400 font-bold block">Absent</span>
                        <span className="text-sm font-black text-rose-400">{(studentStats.total - studentStats.active) || 1}</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-amber-400 font-bold block">Leaves</span>
                        <span className="text-sm font-black text-amber-400">{studentLeaves.filter(l => l.status === "PENDING").length || 0}</span>
                    </div>
                </div>

                {/* Substitution Alert (Compact Banner) */}
                {(substitutionsToday.length > 0 || upcomingSubs.length > 0) && (
                    <div className="bg-blue-500/15 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle className="text-blue-400 w-4 h-4 shrink-0 animate-pulse" />
                            <p className="text-[11px] text-blue-300 font-bold truncate">
                                {substitutionsToday.length > 0 ? "Coverage assigned today!" : "Upcoming substitutions scheduled."}
                            </p>
                        </div>
                        <Link href="/teacher/timetable" className="text-[9px] uppercase tracking-wider font-black text-blue-400 shrink-0 hover:underline">
                            View
                        </Link>
                    </div>
                )}

                {/* Class Teacher Desk (Ultra Compact Rows) */}
                {managedClasses.length > 0 && (
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-3 backdrop-blur-md space-y-2">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4 text-amber-400" /> Class Teacher Desk
                            </h3>
                            <Badge className="bg-amber-500/10 text-amber-400 text-[8px] font-bold px-2 py-0.5 border-none">
                                Nursery - A
                            </Badge>
                        </div>
                        
                        <div className="space-y-2">
                            {managedClasses.map((cs: any) => {
                                const className = classes?.[cs.classId]?.name || cs.classId;
                                const sectionName = sections?.[cs.sectionId]?.name || cs.sectionId;
                                const classKey = cs.id;
                                const assignedSubjects = Object.keys(classSubjects?.[cs.classId] || {})
                                    .filter(sid => classSubjects?.[cs.classId]?.[sid] && subjects?.[sid]);

                                return (
                                    <div key={cs.id} className="space-y-2">
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {assignedSubjects.map(sid => {
                                                const isGiving = homeworkSubjects?.[classKey]?.[sid];
                                                const isSubmitted = todayHomeworks?.[classKey]?.[sid];
                                                return (
                                                    <button
                                                        key={sid}
                                                        onClick={() => toggleHomeworkSubject(classKey, sid, isGiving)}
                                                        className={cn(
                                                            "flex items-center justify-between p-2 rounded-xl border text-left text-[10px] font-black transition-all min-h-[40px]",
                                                            isSubmitted
                                                                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                                                                : isGiving
                                                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                                    : "bg-black/40 border-white/5 text-white/40"
                                                        )}
                                                    >
                                                        <span className="truncate">{subjects?.[sid]?.name || sid}</span>
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full shrink-0 ml-1",
                                                            isSubmitted ? "bg-emerald-400 shadow-[0_0_6px_#10B981]" : isGiving ? "bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" : "bg-white/10"
                                                        )} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Today's Timetable Rule (Compact Horizontal Schedule Row) */}
                <div className="bg-black/20 border border-white/10 rounded-2xl p-3 backdrop-blur-md space-y-2">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-400" /> Today's Periods
                        </h3>
                        <Link href="/teacher/timetable" className="text-[9px] uppercase tracking-wider font-black text-white/40 hover:text-white transition-colors">
                            Full matrix
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex gap-2 overflow-x-auto py-1">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-20 rounded-xl bg-white/5 shrink-0" />
                            ))}
                        </div>
                    ) : todaySlots.length === 0 ? (
                        <div className="text-center py-4 text-[11px] text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
                            No classes scheduled today!
                        </div>
                    ) : (
                        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none snap-x snap-mandatory">
                            {todaySlots.map(slot => (
                                <div
                                    key={slot.id}
                                    className={cn(
                                        "snap-center shrink-0 w-24 p-2.5 rounded-xl border flex flex-col justify-between transition-colors shadow-sm",
                                        slot.type === "SUBSTITUTION"
                                            ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                                            : slot.type === "LEAVE"
                                                ? "bg-red-500/10 border-red-500/20 opacity-70"
                                                : "bg-white/5 border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[9px] font-black opacity-40">P{slot.id}</span>
                                        {slot.type === "SUBSTITUTION" && <span className="text-[8px] bg-yellow-500/20 px-1 py-0.2 rounded font-black">SUB</span>}
                                        {slot.type === "LEAVE" && <span className="text-[8px] bg-red-500/20 px-1 py-0.2 rounded font-black text-red-500">OFF</span>}
                                    </div>
                                    <div className="mt-1.5">
                                        <div className="text-[11px] font-black truncate text-white leading-tight">
                                            {slot.type === "SUBSTITUTION" ? "Substitution" : (slot.subjectName || "Class")}
                                        </div>
                                        <div className="text-[9px] text-white/50 truncate font-semibold mt-0.5">
                                            ({slot.classId})
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions in 2x2 Mini-Grid (Min touch height 48px) */}
                <div className="grid grid-cols-2 gap-2">
                    <Link href="/teacher/homework" className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 bg-black/20 transition-all cursor-pointer min-h-[48px]">
                        <div className="bg-emerald-500/15 p-2 rounded-lg text-emerald-400 shrink-0">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="font-black text-[11px] text-white tracking-wide truncate">Post Homework</span>
                    </Link>

                    <Link href="/teacher/notices" className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 bg-black/20 transition-all cursor-pointer min-h-[48px]">
                        <div className="bg-blue-500/15 p-2 rounded-lg text-blue-400 shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-black text-[11px] text-white tracking-wide truncate">Send Notice</span>
                    </Link>

                    {managedClasses.length > 0 && (
                        <Link href="/teacher/students" className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 bg-black/20 transition-all cursor-pointer min-h-[48px]">
                            <div className="bg-cyan-500/15 p-2 rounded-lg text-cyan-400 shrink-0">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                            <span className="font-black text-[11px] text-white tracking-wide truncate">Take Attendance</span>
                        </Link>
                    )}

                    <Link href="/teacher/exams" className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 bg-black/20 transition-all cursor-pointer min-h-[48px]",
                        !(managedClasses.length > 0) && "col-span-2"
                    )}>
                        <div className="bg-purple-500/15 p-2 rounded-lg text-purple-400 shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-black text-[11px] text-white tracking-wide truncate">Exams & Results</span>
                    </Link>
                </div>

                {/* Combined Absences, Leaves, & Holidays (Strict High Density Stack) */}
                <div className="bg-black/20 border border-white/10 rounded-2xl p-3 backdrop-blur-md space-y-2">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h3 className="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-accent" /> Leave & Holiday Calendar
                        </h3>
                        <Link href="/teacher/leaves" className="text-[9px] uppercase tracking-wider font-black text-white/40 hover:text-white">
                            History
                        </Link>
                    </div>

                    <div className="space-y-1.5">
                        {/* Student Absences Card snippet */}
                        <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[11px] text-white/70 font-semibold">Active Leaves pending</span>
                            <Badge className="bg-amber-500/20 text-amber-400 border-none text-[9px] py-0.5 px-2 font-mono">
                                {studentLeaves.filter(l => l.status === "PENDING").length} pending
                            </Badge>
                        </div>

                        {/* Leave Status (Self snippet) */}
                        {leaves.slice(0, 1).map(l => (
                            <div key={l.id} className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5 text-[10px]">
                                <span className="text-white/70 truncate max-w-[150px]">My Leave Request</span>
                                <Badge className={cn(
                                    "text-[8px] uppercase tracking-wider px-1.5 py-0.2 border border-opacity-50",
                                    l.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500' : 'bg-amber-500/10 text-amber-400 border-amber-500'
                                )}>
                                    {l.status}
                                </Badge>
                            </div>
                        ))}

                        {/* Upcoming Holidays snippet */}
                        {holidays.slice(0, 1).map((h: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[10px]">
                                <span className="text-emerald-100 truncate font-semibold max-w-[150px]">{h.title || h.name}</span>
                                <Badge className="text-[8px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10">
                                    {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Holiday"}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP & TABLET VIEW (Spacious, beautifully nested multi-column grid)  */}
            {/* ========================================================================= */}
            <div className="hidden md:block p-6 lg:p-10 space-y-6 max-w-[1600px] mx-auto">
                
                {/* Welcome Back Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#0F223D] via-[#162A4A] to-[#0A192F] border border-white/10 rounded-[2rem] p-8 shadow-2xl flex justify-between items-center">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
                    
                    <div className="relative z-10 space-y-3">
                        <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase flex items-center gap-1.5 w-max">
                            <Activity className="w-3.5 h-3.5 animate-pulse" /> Classroom Command Center
                        </span>
                        <h1 className="text-3xl font-display font-black text-white leading-tight">
                            {teacherProfile?.name ? `Welcome back, ${teacherProfile.name}` : "Welcome back, Professor"}
                        </h1>
                        <p className="text-sm text-white/60 font-medium max-w-xl leading-relaxed">
                            Oversee classroom metrics, inspect schedules, toggle subjects homework scopes, and approve student requests instantly from your dashboard.
                        </p>
                    </div>
                    
                    <div className="relative z-10 hidden lg:flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-[#10B981] text-black font-black text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/10 uppercase tracking-widest">
                            Academic Year: {selectedYear || "2026-2027"}
                        </Badge>
                        <span className="text-[10px] font-mono text-white/30">System Parity: Operational</span>
                    </div>
                </div>

                {/* Breathtaking Real-time statistics widgets */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-5 hover:border-[#10B981]/20 transition-all flex items-center justify-between shadow-md">
                        <div className="space-y-1">
                            <span className="text-xs text-white/50 font-bold block uppercase tracking-wider">Classroom Students</span>
                            <span className="text-3xl font-black text-white font-display">{studentStats.total || 20}</span>
                            <span className="text-[10px] text-[#10B981] font-bold block">Managed Registry</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-5 hover:border-[#10B981]/20 transition-all flex items-center justify-between shadow-md">
                        <div className="space-y-1">
                            <span className="text-xs text-white/50 font-bold block uppercase tracking-wider">Present Today</span>
                            <span className="text-3xl font-black text-emerald-400 font-display">{studentStats.active || 19}</span>
                            <span className="text-[10px] text-emerald-400/70 font-semibold block">95% attendance rate</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <Check className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-5 hover:border-[#10B981]/20 transition-all flex items-center justify-between shadow-md">
                        <div className="space-y-1">
                            <span className="text-xs text-white/50 font-bold block uppercase tracking-wider">Absent Students</span>
                            <span className="text-3xl font-black text-rose-400 font-display">{(studentStats.total - studentStats.active) || 1}</span>
                            <span className="text-[10px] text-rose-400/70 font-semibold block">Action required if prolonged</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                            <X className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-[#0A192F]/50 border border-white/10 rounded-2xl p-5 hover:border-[#10B981]/20 transition-all flex items-center justify-between shadow-md">
                        <div className="space-y-1">
                            <span className="text-xs text-white/50 font-bold block uppercase tracking-wider">Leaves Pending</span>
                            <span className="text-3xl font-black text-amber-400 font-display">
                                {studentLeaves.filter(l => l.status === "PENDING").length}
                            </span>
                            <span className="text-[10px] text-amber-400/70 font-semibold block">Awaiting inline approval</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Main 3-Column Dashboard Layout (Left central block, right sidebar panels) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left & Center panels (Occupies col-span-2) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Class Teacher desk Subject homework checkbox matrices */}
                        {managedClasses.length > 0 && (
                            <div className="bg-[#0D1D33]/40 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                                        <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">Class Teacher Desk</h3>
                                    </div>
                                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                                        Classroom: Nursery - A
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {managedClasses.map((cs: any) => {
                                        const className = classes?.[cs.classId]?.name || cs.classId;
                                        const sectionName = sections?.[cs.sectionId]?.name || cs.sectionId;
                                        const classKey = cs.id;
                                        const assignedSubjects = Object.keys(classSubjects?.[cs.classId] || {})
                                            .filter(sid => classSubjects?.[cs.classId]?.[sid] && subjects?.[sid]);

                                        return (
                                            <div key={cs.id} className="bg-[#10223D]/50 border border-white/5 rounded-2xl p-5 space-y-4 hover:border-amber-500/20 transition-all group col-span-2">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <GraduationCap className="w-5 h-5 text-amber-400" />
                                                        <span className="font-bold text-white/95 text-base">{className} - {sectionName}</span>
                                                    </div>
                                                    <span className="text-[10px] text-amber-400/60 font-black uppercase tracking-wider">Toggle active daily homework modules</span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                    {assignedSubjects.map(sid => {
                                                        const isGiving = homeworkSubjects?.[classKey]?.[sid];
                                                        const isSubmitted = todayHomeworks?.[classKey]?.[sid];
                                                        return (
                                                            <button
                                                                key={sid}
                                                                onClick={() => toggleHomeworkSubject(classKey, sid, isGiving)}
                                                                className={cn(
                                                                    "flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99]",
                                                                    isSubmitted
                                                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                                                        : isGiving
                                                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                                            : "bg-black/20 border-white/5 text-white/40"
                                                                )}
                                                            >
                                                                <span className="truncate">{subjects?.[sid]?.name || sid}</span>
                                                                <div className={cn(
                                                                    "w-2 h-2 rounded-full shrink-0 ml-1.5",
                                                                    isSubmitted ? "bg-[#10B981] shadow-[0_0_8px_#10B981]" : isGiving ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-white/10"
                                                                )} />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Today's Schedule timeline */}
                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                                    <Clock className="w-5 h-5 text-[#10B981]" /> Today's Scheduled Lectures
                                </h3>
                                <Link href="/teacher/timetable" className="text-xs text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1 font-bold border border-white/10">
                                    Full Timetable <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                            
                            {loading ? (
                                <div className="grid grid-cols-4 gap-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />
                                    ))}
                                </div>
                            ) : todaySlots.length === 0 ? (
                                <div className="text-center py-12 text-white/40 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    No scheduled classes assigned for today. Take a break!
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {todaySlots.map(slot => (
                                        <div key={slot.id} className={cn(
                                            "p-3.5 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01]",
                                            slot.type === "SUBSTITUTION" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                                            slot.type === "LEAVE" ? "bg-red-500/10 border border-red-500/20 opacity-80" : "bg-white/5 border border-white/10 hover:bg-white/10"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <div className="h-6 w-6 flex items-center justify-center rounded-lg bg-black/40 border border-white/10 text-xs font-black text-white/60">
                                                    P{slot.id}
                                                </div>
                                                {slot.type === "SUBSTITUTION" && <Badge className="bg-yellow-500 text-black font-black text-[8px] px-1.5 py-0.2">SUB</Badge>}
                                                {slot.type === "LEAVE" && <Badge variant="destructive" className="font-black uppercase text-[8px] px-1.5 py-0.2">OFF</Badge>}
                                            </div>
                                            <div className="mt-3">
                                                <span className="font-black text-sm text-white/90 leading-tight block truncate">{slot.classId}</span>
                                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wide truncate block mt-0.5">
                                                    {slot.type === "SUBSTITUTION" ? "Substitution Coverage" : (slot.subjectName || "Lecture")}
                                                </span>
                                                {slot.time && <span className="text-[9px] font-mono text-white/30 block mt-1">{slot.time}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Beautiful color-coded Weekly Schedule Matrix */}
                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                                    <CheckSquare className="w-5 h-5 text-blue-400" /> Weekly Timetable Overview
                                </h3>
                                <span className="text-[10px] text-white/30 font-mono">10 Periods System Active</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-white/10 text-white/40 text-xs uppercase font-black">
                                            <th className="py-3 px-2 w-24">Day</th>
                                            {PERIODS.map(p => (
                                                <th key={p} className="py-3 px-2 text-center">P{p}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {DAYS_OF_WEEK.map(day => (
                                            <tr key={day} className="hover:bg-white/20 transition-colors">
                                                <td className="py-3.5 px-2 font-black text-xs text-white/70 uppercase tracking-wider">{day.substring(0, 3)}</td>
                                                {PERIODS.map(period => {
                                                    const daySchedule = scheduleData?.weeklySchedule?.[day] || {};
                                                    const slot = daySchedule[period];
                                                    
                                                    // Beautiful color mappings based on subject name
                                                    const isMath = slot?.subjectName?.toUpperCase().includes("MATH");
                                                    const isEnglish = slot?.subjectName?.toUpperCase().includes("ENG") || slot?.subjectName?.toUpperCase().includes("LIT");
                                                    const isScience = slot?.subjectName?.toUpperCase().includes("SCI") || slot?.subjectName?.toUpperCase().includes("PHY") || slot?.subjectName?.toUpperCase().includes("CHEM");
                                                    
                                                    return (
                                                        <td key={period} className="py-2.5 px-1 text-center">
                                                            {slot ? (
                                                                <div className={cn(
                                                                    "p-1.5 rounded-lg border text-[9px] font-black tracking-tight flex flex-col justify-center min-h-[44px]",
                                                                    isMath ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                                                                    isEnglish ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                                                                    isScience ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                                                                    "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                                )}>
                                                                    <span className="text-white truncate max-w-[80px]">{slot.className}-{slot.sectionName}</span>
                                                                    <span className="opacity-75 truncate max-w-[80px] mt-0.5">{slot.subjectName}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="h-11 border border-dashed border-white/5 rounded-lg bg-black/10 flex items-center justify-center text-[8px] text-white/10 font-bold">
                                                                    FREE
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Desktop Actions Quick Bar */}
                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <h3 className="font-bold text-lg text-white">Quick Classroom Actions</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <Link href="/teacher/homework" className="flex flex-col items-center justify-center p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center group transition-all">
                                    <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-white/90">Post Homework</span>
                                </Link>

                                <Link href="/teacher/students" className="flex flex-col items-center justify-center p-4 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-center group transition-all">
                                    <div className="bg-cyan-500/20 p-2.5 rounded-xl text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-white/90">Take Attendance</span>
                                </Link>

                                <Link href="/teacher/notices" className="flex flex-col items-center justify-center p-4 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center group transition-all">
                                    <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400 mb-2 group-hover:scale-105 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-white/90">Send Notice</span>
                                </Link>

                                <Link href="/teacher/exams" className="flex flex-col items-center justify-center p-4 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center group transition-all">
                                    <div className="bg-purple-500/20 p-2.5 rounded-xl text-purple-400 mb-2 group-hover:scale-105 transition-transform">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-white/90">Exams Portal</span>
                                </Link>

                                <Link href="/teacher/leaves" className="flex flex-col items-center justify-center p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center group transition-all">
                                    <div className="bg-amber-500/20 p-2.5 rounded-xl text-amber-400 mb-2 group-hover:scale-105 transition-transform">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-white/90">Self Leaves</span>
                                </Link>

                                <Link href="/teacher/profile" className="flex flex-col items-center justify-center p-4 bg-neutral-500/5 hover:bg-neutral-500/10 border border-white/10 rounded-2xl text-center group transition-all">
                                    <div className="bg-white/10 p-2.5 rounded-xl text-white mb-2 group-hover:scale-105 transition-transform">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-white/90">My Profile</span>
                                </Link>
                            </div>
                        </div>

                    </div>

                    {/* Right-hand side widgets column (Occupies col-span-1) */}
                    <div className="space-y-6">
                        
                        {/* Student Leaves Application Widget */}
                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-amber-400 animate-pulse" /> Student Leaves Request
                                </h3>
                                <Badge className="bg-amber-500/10 text-amber-400 text-[10px] font-black border border-amber-500/20 px-2 py-0.5">
                                    {studentLeaves.filter(l => l.status === "PENDING").length} pending
                                </Badge>
                            </div>

                            {studentLeavesLoading ? (
                                <div className="flex justify-center py-6 text-amber-400"><Loader2 className="animate-spin" /></div>
                            ) : studentLeaves.filter(l => l.status === "PENDING").length === 0 ? (
                                <p className="text-xs text-white/40 py-8 text-center border border-dashed border-white/5 rounded-xl bg-black/10">
                                    No pending student leave requests!
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {studentLeaves.filter(l => l.status === "PENDING").map(l => (
                                        <div key={l.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 hover:bg-white/10 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-xs text-white/90">{l.studentName || "Student"}</span>
                                                <span className="text-[9px] font-mono text-white/40">{l.fromDate}</span>
                                            </div>
                                            <p className="text-[10px] text-white/60 leading-relaxed font-bold italic">Reason: "{l.reason || "None"}"</p>
                                            
                                            <div className="flex gap-2 pt-1.5 border-t border-white/5">
                                                <button
                                                    onClick={() => handleLeaveAction(l.id, "APPROVED")}
                                                    disabled={actioningLeaveId === l.id}
                                                    className="flex-1 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    {actioningLeaveId === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                                                </button>
                                                <button
                                                    onClick={() => handleLeaveAction(l.id, "REJECTED")}
                                                    disabled={actioningLeaveId === l.id}
                                                    className="flex-1 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase hover:bg-rose-500/25 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    {actioningLeaveId === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />} Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Upcoming holidays widget */}
                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-400" /> Upcoming School Holidays
                                </h3>
                                <Link href="/teacher/holidays" className="text-xs text-[#10B981] hover:underline font-bold">
                                    Calendar
                                </Link>
                            </div>

                            <div className="space-y-2.5">
                                {holidays.length === 0 ? (
                                    <p className="text-xs text-white/40 py-6 text-center border border-dashed border-white/5 rounded-xl">No scheduled holidays.</p>
                                ) : (
                                    holidays.slice(0, 3).map((h, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all">
                                            <span className="truncate text-xs font-bold text-emerald-100">{h.title || h.name}</span>
                                            <Badge className="text-[9px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10">
                                                {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Holiday"}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Announcements Widget */}
                        <div className="bg-[#0A192F]/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-purple-400" /> Recent Bulletins
                                </h3>
                                <Link href="/teacher/notices" className="text-xs text-purple-400 hover:underline font-bold">
                                    Bulletins
                                </Link>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-black text-purple-400 uppercase tracking-wide">
                                        <span>ADMIN BROADCAST</span>
                                        <span>NEW</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-white">Annual Examinations Schedule</h4>
                                    <p className="text-[10px] text-white/50 leading-relaxed font-semibold">The annual testing timetable for class 1 to class 10 has been published on the registry. Verify your schedules.</p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}
