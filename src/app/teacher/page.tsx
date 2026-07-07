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
    const [scheduleData, setScheduleData] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_schedule_data_cache") || "null") : null);
    const [todaySlots, setTodaySlots] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_today_slots_cache") || "[]") : []);
    const [substitutionsToday, setSubstitutionsToday] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_substitutions_today_cache") || "[]") : []);
    const [upcomingSubs, setUpcomingSubs] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_upcoming_subs_cache") || "[]") : []);
    
    // Live student stats
    const [studentStats, setStudentStats] = useState(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_student_stats_cache") || '{"total": 0, "active": 0, "boys": 0, "girls": 0}') : { total: 0, active: 0, boys: 0, girls: 0 });
    
    // Student leaves for inline actions
    const [studentLeaves, setStudentLeaves] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_student_leaves_cache") || "[]") : []);
    const [studentLeavesLoading, setStudentLeavesLoading] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_student_leaves_cache") : true);
    const [actioningLeaveId, setActioningLeaveId] = useState<string | null>(null);

    // Optimistic Cache Hooks
    const [teacherProfile, setTeacherProfile] = useState<any>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_profile_cache") || "null") : null);
    const [leaves, setLeaves] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_leaves_cache") || "[]") : []);
    const [holidays, setHolidays] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_holidays_cache") || "[]") : []);
    const [loading, setLoading] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_profile_cache") : true);
    
    const [activeTab, setActiveTab] = useState<"NOTICES" | "SCHEDULE">("NOTICES");
    const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_announcements_cache") || "[]") : []);
    
    const { classSections, classes, sections, classSubjects, subjects, homeworkSubjects, subjectTeachers, selectedYear, loading: masterLoading } = useMasterData();

    useEffect(() => {
        if (user && userData?.schoolId) {
            fetchDashboardData();
            fetchStudentLeaves();
        }
    }, [user, userData?.schoolId]);

    const fetchDashboardData = async () => {
        try {
            if (!user?.uid) return;

            const [teacherSnapBySchoolId, leaveSnap] = await Promise.all([
                userData?.schoolId ? getDocs(query(collection(db, "teachers"), where("uid", "==", user.uid), where("schoolId", "==", userData.schoolId), limit(1))) : Promise.resolve({ empty: true, docs: [] }),
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
                const list = data.data || [];
                setStudentLeaves(list);
                if (typeof window !== 'undefined') {
                    localStorage.setItem("teacher_student_leaves_cache", JSON.stringify(list));
                }
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
        const tId = teacherProfile.teacherId || teacherProfile.id;
        const tDocId = teacherProfile.id;
        return Object.values(classSections).filter((cs: any) =>
            (cs.isActive !== false) && (cs.classTeacherId === tId || cs.classTeacherId === tDocId)
        );
    };

    const getTeachingAssignments = () => {
        if (!teacherProfile || !subjectTeachers || !classSections) return [];
        const tId = teacherProfile.teacherId || teacherProfile.id;
        
        const groups: Record<string, {
            subjectId: string;
            subjectName: string;
            classes: {
                classId: string;
                sectionId: string;
                className: string;
                sectionName: string;
                key: string;
            }[];
        }> = {};

        // 1. Gather from subjectTeachers master mapping
        Object.keys(subjectTeachers).forEach(classSectionId => {
            const subjectsObj = subjectTeachers[classSectionId] || {};
            Object.keys(subjectsObj).forEach(subId => {
                if (subjectsObj[subId] === tId) {
                    const cs = classSections[classSectionId];
                    if (!cs || cs.isActive === false) return;
                    
                    const cId = cs.classId;
                    const sId = cs.sectionId;
                    const cName = classes?.[cId]?.name || cId;
                    const sName = sections?.[sId]?.name || sId;
                    const subName = subjects?.[subId]?.name || subId;

                    if (!groups[subId]) {
                        groups[subId] = {
                            subjectId: subId,
                            subjectName: subName,
                            classes: []
                        };
                    }

                    const exists = groups[subId].classes.some(c => c.key === classSectionId);
                    if (!exists) {
                        groups[subId].classes.push({
                            classId: cId,
                            sectionId: sId,
                            className: cName,
                            sectionName: sName,
                            key: classSectionId
                        });
                    }
                }
            });
        });

        // 2. Supplement from timetableEntries
        timetableEntries.forEach((entry: any) => {
            const subId = entry.subjectId;
            if (!subId) return;

            const cId = entry.classId;
            const sId = entry.sectionId;
            const cName = classes?.[cId]?.name || entry.className || cId;
            const sName = sections?.[sId]?.name || entry.sectionName || sId;
            const classSectionId = `${cId}_${sId}`;

            const subName = subjects?.[subId]?.name || entry.subjectName || subId;
            if (!groups[subId]) {
                groups[subId] = {
                    subjectId: subId,
                    subjectName: subName,
                    classes: []
                };
            }

            const exists = groups[subId].classes.some(c => c.key === classSectionId);
            if (!exists) {
                groups[subId].classes.push({
                    classId: cId,
                    sectionId: sId,
                    className: cName,
                    sectionName: sName,
                    key: classSectionId
                });
            }
        });

        // Sort subjects by name
        return Object.values(groups).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
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
    const teachingAssignments = getTeachingAssignments();

    // Query active classroom students dynamically
    useEffect(() => {
        if (managedClasses.length === 0 || !userData?.schoolId) return;
        const classIds = managedClasses.map(c => c.classId);
        
        const q = query(
            collection(db, "students"), 
            where("classId", "in", classIds), 
            where("branchId", "==", userData.schoolId)
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
            const statsObj = { total, active, boys, girls };
            setStudentStats(statsObj);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_student_stats_cache", JSON.stringify(statsObj));
            }
        }, (err) => {
            console.warn("[Dashboard] Student stats sync error:", err.message);
        });
        return () => unsub();
    }, [teacherProfile, classSections, userData?.schoolId]);

    // --- HOMEWORK SUBMISSION TRACKER ---
    const [todayHomeworks, setTodayHomeworks] = useState<Record<string, Record<string, boolean>>>({});
    useEffect(() => {
        if (!teacherProfile) return;
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
    }, [teacherProfile]);

    // --- TIMETABLE REAL-TIME LISTENER ---
    useEffect(() => {
        if (!teacherProfile || !userData?.schoolId) return;
        const currentYear = selectedYear || "2026-2027";
        const possibleIds = [teacherProfile.id, teacherProfile.schoolId, teacherProfile.teacherId].filter(Boolean);
        if (possibleIds.length === 0) return;

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
            const scheduleObj = { weeklySchedule, substitutions: allSubs };
            setScheduleData(scheduleObj);

            const slots = [];
            for (let i = 1; i <= 10; i++) {
                const amReplaced = allSubs.find((s: any) => s.date === todayKey && s.slotId === i && s.role === "ORIGINAL");
                const amSub = allSubs.find((s: any) => s.date === todayKey && s.slotId === i && s.role === "SUBSTITUTE");

                const regularEntry = lastEntries.find(e => e.day === dayName && String(e.period) === String(i));

                if (amSub) {
                    slots.push({ id: i, type: "SUBSTITUTION", classId: amSub.classId, note: "Sub Assigned", subjectName: "Coverage", time: getPeriodTiming(i) });
                } else if (amReplaced) {
                    slots.push({ id: i, type: "LEAVE", classId: amReplaced.classId, subjectName: "On Leave", time: getPeriodTiming(i) });
                } else if (regularEntry) {
                    slots.push({
                        id: i,
                        type: "REGULAR",
                        classId: regularEntry.className ? `${regularEntry.className} - ${regularEntry.sectionName}` : `${regularEntry.classId} ${regularEntry.sectionId}`,
                        subjectId: regularEntry.subjectId,
                        subjectName: regularEntry.subjectName || regularEntry.subject,
                        time: regularEntry.startTime ? `${regularEntry.startTime} - ${regularEntry.endTime}` : getPeriodTiming(i)
                    });
                }
            }
            const sortedSlots = slots.sort((a, b) => a.id - b.id);
            setTodaySlots(sortedSlots);
            const subsTodayList = allSubs.filter((s: any) => s.date === todayKey && s.role === "SUBSTITUTE");
            setSubstitutionsToday(subsTodayList);
            const upcomingSubsList = allSubs.filter((s: any) => s.role === "SUBSTITUTE" && s.date > todayKey).sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")));
            setUpcomingSubs(upcomingSubsList);

            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_schedule_data_cache", JSON.stringify(scheduleObj));
                localStorage.setItem("teacher_today_slots_cache", JSON.stringify(sortedSlots));
                localStorage.setItem("teacher_substitutions_today_cache", JSON.stringify(subsTodayList));
                localStorage.setItem("teacher_upcoming_subs_cache", JSON.stringify(upcomingSubsList));
            }
        };

        const unsubTT = onSnapshot(ttQuery, (snap: any) => { 
            const entries = snap.docs.map((d: any) => d.data());
            lastEntries = entries; 
            setTimetableEntries(entries);
            processData(); 
        }, (e: any) => console.warn("[Dashboard] Timetable sync error:", e.message));
        const unsubSub1 = onSnapshot(subQuery1, (snap: any) => { lastOrig = snap.docs.map((d: any) => d.data()); processData(); }, (e: any) => console.warn("[Dashboard] Substitutions (orig) sync error:", e.message));
        const unsubSub2 = onSnapshot(subQuery2, (snap: any) => { lastSub = snap.docs.map((d: any) => d.data()); processData(); }, (e: any) => console.warn("[Dashboard] Substitutions (sub) sync error:", e.message));

        return () => { unsubTT(); unsubSub1(); unsubSub2(); };
    }, [teacherProfile, selectedYear, userData?.schoolId]);

    // --- ANNOUNCEMENTS REAL-TIME LISTENER ---
    useEffect(() => {
        if (!user?.uid) return;
        
        const qInbox = query(
            collection(db, "notices"), 
            where("target", "in", ["ALL", "TEACHERS"]), 
            where("schoolId", "in", [userData?.schoolId || "global", "global"]),
            orderBy("createdAt", "desc"),
            limit(10)
        );

        const unsubInbox = onSnapshot(qInbox, (snap) => {
            const now = Date.now();
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter((n: any) => {
                    if (n.senderId === user.uid) return false;
                    if (n.expiresAt && n.expiresAt.seconds * 1000 < now) return false;
                    return true;
                });
            setAnnouncements(list);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_announcements_cache", JSON.stringify(list));
            }
        }, (err) => {
            console.warn("[Dashboard] Announcements stream error, using fallback query:", err.message);
            // Fallback without orderBy if index is missing
            const fallbackQ = query(
                collection(db, "notices"), 
                where("target", "in", ["ALL", "TEACHERS"]), 
                where("schoolId", "in", [userData?.schoolId || "global", "global"])
            );
            onSnapshot(fallbackQ, (snap) => {
                const now = Date.now();
                let list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter((n: any) => {
                        if (n.senderId === user.uid) return false;
                        if (n.expiresAt && n.expiresAt.seconds * 1000 < now) return false;
                        return true;
                    });
                list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setAnnouncements(list.slice(0, 10));
                if (typeof window !== 'undefined') {
                    localStorage.setItem("teacher_announcements_cache", JSON.stringify(list.slice(0, 10)));
                }
            }, (fallbackErr) => {
                console.warn("[Dashboard] Announcements fallback stream error:", fallbackErr.message);
            });
        });

        return () => unsubInbox();
    }, [user, userData]);

    const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

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

    const getTodayCardStyles = (count: number) => {
        if (count <= 5) {
            return {
                gridClass: "grid w-full gap-2 sm:gap-4",
                cardClass: "p-2.5 sm:p-4.5 min-h-[95px] sm:min-h-[125px] rounded-xl sm:rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
                periodNum: "text-[9px] sm:text-xs font-black",
                mainText: "text-xs sm:text-sm font-black tracking-tight",
                subText: "text-[8px] sm:text-[10px] font-bold mt-0.5 sm:mt-1",
                timeText: "text-[7.5px] sm:text-[9.5px] font-mono mt-0.5 sm:mt-1"
            };
        }
        if (count <= 7) {
            return {
                gridClass: "grid w-full gap-1.5 sm:gap-3",
                cardClass: "p-2 sm:p-3.5 min-h-[85px] sm:min-h-[110px] rounded-lg sm:rounded-xl shadow-[0_3px_8px_rgba(0,0,0,0.12)]",
                periodNum: "text-[8px] sm:text-xs font-black",
                mainText: "text-[10px] sm:text-xs font-black tracking-tight",
                subText: "text-[7.5px] sm:text-[9px] font-bold mt-0.5",
                timeText: "text-[7px] sm:text-[8px] font-mono mt-0.5"
            };
        }
        return {
            gridClass: "grid w-full gap-0.5 xs:gap-1 sm:gap-2 md:gap-3",
            cardClass: "p-0.5 xs:p-1.5 sm:p-2.5 min-h-[70px] xs:min-h-[85px] sm:min-h-[105px] rounded-md xs:rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.1)]",
            periodNum: "text-[6.5px] xs:text-[8px] sm:text-[10px] font-black",
            mainText: "text-[7.5px] xs:text-[9.5px] sm:text-xs font-black tracking-tight leading-tight",
            subText: "text-[6px] xs:text-[7.5px] sm:text-[9px] font-bold mt-0.5",
            timeText: "text-[5.5px] xs:text-[7px] sm:text-[8px] font-mono mt-0.5"
        };
    };

    const getWeeklyTableStyles = (count: number) => {
        if (count <= 5) {
            return {
                cellPadding: "p-3 sm:p-4",
                dayColWidth: "w-20 sm:w-28",
                dayTitle: "text-[11px] sm:text-xs",
                daySub: "text-[8px] sm:text-[9px]",
                periodTitle: "text-[10px] sm:text-xs",
                periodTime: "text-[8px] sm:text-[9px]",
                cellText: "text-[10px] sm:text-xs",
                cellSub: "text-[8px] sm:text-[9px]",
                slotClass: "p-2 rounded-xl min-h-[48px]"
            };
        }
        if (count <= 7) {
            return {
                cellPadding: "p-2 sm:p-3.5",
                dayColWidth: "w-16 sm:w-24",
                dayTitle: "text-[9.5px] sm:text-xs",
                daySub: "text-[7.5px] sm:text-[8.5px]",
                periodTitle: "text-[9px] sm:text-xs",
                periodTime: "text-[7.5px] sm:text-[8px]",
                cellText: "text-[9px] sm:text-[11px]",
                cellSub: "text-[7.5px] sm:text-[8.5px]",
                slotClass: "p-1.5 rounded-lg min-h-[42px]"
            };
        }
        return {
            cellPadding: "p-0.5 xs:p-1.5 sm:p-2.5",
            dayColWidth: "w-10 xs:w-16 sm:w-24",
            dayTitle: "text-[8px] xs:text-[9.5px] sm:text-[11px]",
            daySub: "text-[6px] xs:text-[7px] sm:text-[8px]",
            periodTitle: "text-[7.5px] xs:text-[9px] sm:text-[10px]",
            periodTime: "text-[6px] xs:text-[7px] sm:text-[8px]",
            cellText: "text-[7.5px] xs:text-[9.5px] sm:text-[10px]",
            cellSub: "text-[6.5px] xs:text-[7.5px] sm:text-[8px]",
            slotClass: "p-0.5 xs:p-1 sm:p-2 rounded-lg min-h-[34px] xs:min-h-[40px] sm:min-h-[48px]"
        };
    };

    const todaySlotCount = todaySlots.length || 8;
    const cardStyles = getTodayCardStyles(todaySlotCount);
    const tableStyles = getWeeklyTableStyles(PERIODS.length || 8);

    return (
        <div className="animate-in fade-in duration-200 w-full text-[#E6F1FF] min-h-screen pb-16 bg-gradient-to-b from-[#030712] via-[#09152b] to-[#030712]">
            
            {/* ========================================================================= */}
            {/* MOBILE VIEW (Strictly Optimized for compact, high-density, no scrolling) */}
            {/* ========================================================================= */}
            <div className="md:hidden flex flex-col h-[calc(100dvh-8.5rem)] p-3 space-y-3 w-full">
                {/* Compact Welcome Header */}
                <div className="flex-none flex justify-between items-center bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-[#10B981]/90 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-[#10B981] animate-pulse" /> Live Session
                        </p>
                        <h1 className="text-xl font-display font-black text-white leading-tight mt-1">
                            {teacherProfile?.name ? `Hi, ${teacherProfile.name}` : "Welcome"}
                        </h1>
                    </div>
                    <Badge className="bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[10px] px-2.5 py-1">
                        {selectedYear || "2026-2027"}
                    </Badge>
                </div>

                {/* Substitution Alert (Compact Banner) */}
                {(substitutionsToday.length > 0 || upcomingSubs.length > 0) && (
                    <div className="flex-none bg-blue-500/15 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between gap-2">
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

                {/* Notices / Schedule tab switcher section */}
                <div className="flex-1 flex flex-col min-h-0 bg-black/20 border border-white/10 rounded-2xl p-3 backdrop-blur-md space-y-3">
                    <div className="flex-none flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                        <button
                            onClick={() => setActiveTab("NOTICES")}
                            className={cn(
                                "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5",
                                activeTab === "NOTICES"
                                    ? "bg-[#64FFDA] text-black shadow-md shadow-[#64FFDA]/15"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <Bell className="w-3.5 h-3.5" /> Notices
                        </button>
                        <button
                            onClick={() => setActiveTab("SCHEDULE")}
                            className={cn(
                                "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5",
                                activeTab === "SCHEDULE"
                                    ? "bg-[#64FFDA] text-black shadow-md shadow-[#64FFDA]/15"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <Clock className="w-3.5 h-3.5" /> Schedule
                        </button>
                    </div>

                    {activeTab === "NOTICES" ? (
                        <div className="flex-1 space-y-2 overflow-y-auto pr-1 hide-scrollbar">
                            {announcements.length === 0 ? (
                                <div className="text-center py-6 text-[10px] text-white/40 italic">
                                    No active notices.
                                </div>
                            ) : (
                                announcements.map(ann => (
                                    <div key={ann.id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                                        <div className="flex justify-between items-center text-[8px] font-mono text-white/40">
                                            <span className="text-emerald-400 font-bold uppercase">{ann.type || "ALERT"}</span>
                                            <span>{ann.createdAt ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString('en-GB') : ""}</span>
                                        </div>
                                        <h4 className="text-xs font-bold text-white leading-tight">{ann.title}</h4>
                                        <p className="text-[10px] text-white/65 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                                        <div className="pt-1.5 border-t border-white/5 text-[7px] text-white/30 font-black uppercase tracking-wider flex justify-between">
                                            <span>From: {ann.senderName || "Admin"}</span>
                                            <span>To: {ann.target || "All"}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 space-y-2 overflow-y-auto pr-1 hide-scrollbar">
                            {todaySlots.length === 0 || todaySlots.every(s => s.type === "FREE") ? (
                                <div className="text-center py-8 text-[10px] text-white/40 italic flex flex-col items-center gap-2">
                                    <Coffee className="w-6 h-6 text-white/20" />
                                    No classes scheduled today!
                                </div>
                            ) : (
                                todaySlots.filter(s => s.type !== "FREE").map(slot => {
                                    const isSub = slot.type === "SUBSTITUTION";
                                    const isLeave = slot.type === "LEAVE";
                                    return (
                                        <div key={slot.id} className={cn(
                                            "relative p-3 rounded-[1.25rem] flex items-center justify-between gap-3 overflow-hidden border backdrop-blur-md group hover:scale-[1.01] transition-transform",
                                            isSub ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent" :
                                            isLeave ? "border-rose-500/30 bg-rose-500/5 opacity-60" :
                                            "border-emerald-500/20 bg-gradient-to-br from-[#0A192F] to-[#040A15]"
                                        )}>
                                            {/* Glow Accent */}
                                            {!isLeave && !isSub && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-[#06B6D4]" />}
                                            {isSub && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500" />}

                                            <div className="flex items-center gap-3 min-w-0 z-10 pl-2">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex flex-col items-center justify-center font-mono font-black text-xs shrink-0 shadow-inner border border-white/10",
                                                    isSub ? "bg-amber-500/20 text-amber-300" : isLeave ? "bg-white/5 text-white/40" : "bg-emerald-500/20 text-[#64FFDA]"
                                                )}>
                                                    <span>P{slot.id}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className={cn(
                                                        "text-[13px] font-black block truncate leading-tight tracking-wide",
                                                        isLeave ? "line-through text-white/40" : "text-white"
                                                    )}>
                                                        {isLeave ? "On Leave" : slot.subjectName}
                                                    </span>
                                                    <span className="text-[10px] text-white/50 block mt-1 font-mono">
                                                        Class: <span className="font-bold text-white/80">{slot.classId}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 z-10">
                                                <span className="text-[9px] font-mono font-bold text-[#64FFDA] block bg-[#64FFDA]/10 px-2 py-0.5 rounded-full border border-[#64FFDA]/20">{slot.time}</span>
                                                {isSub && <Badge className="bg-amber-500 text-black border-none font-black text-[8px] px-2 py-0.5 rounded-md mt-1.5 shadow-[0_0_8px_#f59e0b]">COVERAGE</Badge>}
                                                {isLeave && <Badge className="bg-rose-500/20 text-rose-400 border-none font-bold text-[8px] px-2 py-0.5 rounded-md mt-1.5">LEAVE</Badge>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP & TABLET VIEW (Spacious, beautifully nested multi-column grid)  */}
            {/* ========================================================================= */}
            <div className="hidden md:block p-6 lg:p-10 space-y-6 max-w-[1600px] mx-auto">
                
                {/* Welcome Back Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#09152b] via-[#0D1F3D] to-[#09152b] border border-white/10 rounded-[2rem] p-8 shadow-2xl flex justify-between items-center">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#64FFDA]/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
                    
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

                {/* Bulletins Panel (Notices display directly on Home page) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left & Center panels (Occupies col-span-2) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        <div className="bg-[#0D1F3D]/30 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-6 w-full animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                        {activeTab === "NOTICES" ? (
                                            <>
                                                <Bell className="w-5 h-5 text-[#64FFDA] animate-swing" /> Recent Notices & Bulletins
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-5 h-5 text-[#64FFDA]" /> Today's Period Schedule
                                            </>
                                        )}
                                    </h3>
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner shrink-0">
                                    <button
                                        onClick={() => setActiveTab("NOTICES")}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-2",
                                            activeTab === "NOTICES"
                                                ? "bg-[#64FFDA] text-black shadow-md shadow-[#64FFDA]/15"
                                                : "text-white/60 hover:text-white"
                                        )}
                                    >
                                        <Bell className="w-3.5 h-3.5" /> Notices
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("SCHEDULE")}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-2",
                                            activeTab === "SCHEDULE"
                                                ? "bg-[#64FFDA] text-black shadow-md shadow-[#64FFDA]/15"
                                                : "text-white/60 hover:text-white"
                                        )}
                                    >
                                        <Clock className="w-3.5 h-3.5" /> Schedule
                                    </button>
                                </div>
                            </div>

                            {activeTab === "NOTICES" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                                    {announcements.length === 0 ? (
                                        <div className="col-span-2 py-12 text-center text-white/40 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                            No school notices or announcements.
                                        </div>
                                    ) : (
                                        announcements.map(ann => (
                                            <div key={ann.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2 hover:bg-white/10 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                                        {ann.type || "BROADCAST"}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-white/40">
                                                        {ann.createdAt ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString('en-GB') : ""}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-white leading-snug">{ann.title}</h4>
                                                <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                                                <div className="pt-2 border-t border-white/5 text-[9px] text-white/30 font-black uppercase tracking-wider flex justify-between">
                                                    <span>Sender: {ann.senderName || "School Administration"}</span>
                                                    <span>Recipient: {ann.target || "All"}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
                                    {todaySlots.length === 0 || todaySlots.every(s => s.type === "FREE") ? (
                                        <div className="col-span-full py-16 text-center text-white/40 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                                            <Coffee className="w-8 h-8 text-white/20" />
                                            <h4 className="font-bold text-white">No Classes Today</h4>
                                            <p className="text-xs text-white/40">You have no periods scheduled for today. Enjoy your preparation time!</p>
                                        </div>
                                    ) : (
                                        todaySlots.filter(s => s.type !== "FREE").map(slot => {
                                            const isSub = slot.type === "SUBSTITUTION";
                                            const isLeave = slot.type === "LEAVE";
                                            return (
                                                <div key={slot.id} className={cn(
                                                    "p-4 bg-white/5 border rounded-2xl flex flex-col justify-between gap-3 hover:bg-white/10 transition-colors",
                                                    isSub ? "border-amber-500/25 bg-amber-500/5 text-amber-400" :
                                                    isLeave ? "border-rose-500/25 bg-rose-500/5 opacity-60 text-rose-400 font-mono" :
                                                    "border-white/5"
                                                )}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-mono font-black text-xs text-white/80">
                                                                P{slot.id}
                                                            </div>
                                                            <div>
                                                                <h4 className={cn(
                                                                    "text-sm font-bold text-white capitalize leading-none",
                                                                    isLeave && "line-through text-white/40"
                                                                )}>
                                                                    {isLeave ? "On Leave" : slot.subjectName}
                                                                </h4>
                                                                <span className="text-[10px] text-white/40 block mt-1.5 font-mono">{slot.time}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            {isSub && <Badge className="bg-amber-500/25 text-amber-400 border-none font-bold text-[8px] px-1.5 py-0.5 rounded leading-none">SUB</Badge>}
                                                            {isLeave && <Badge className="bg-rose-500/20 text-rose-400 border-none font-bold text-[8px] px-1.5 py-0.5 rounded leading-none">LEAVE</Badge>}
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                                                        <span className="text-white/60 font-semibold">Class Assigned</span>
                                                        <span className="text-[#64FFDA] font-bold">{slot.classId}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Right-hand side widgets column (Occupies col-span-1) */}
                    <div className="space-y-6">
                        
                        {/* Student Leaves Application Widget */}
                        <div className="bg-[#0D1F3D]/30 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-amber-400 animate-pulse" /> Student Leaves Request
                                </h3>
                                <Badge className="bg-amber-500/10 text-amber-400 text-[10px] font-black border border-amber-500/20 px-2 py-0.5">
                                    {studentLeaves.filter(l => l.status === "PENDING").length} pending
                                </Badge>
                            </div>

                            {studentLeavesLoading && studentLeaves.length === 0 ? (
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
                        <div className="bg-[#0D1F3D]/30 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md shadow-xl space-y-4">
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

                    </div>

                </div>

            </div>

        </div>
    );
}
