"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Clock, Video, Coffee, AlertTriangle, FileText, ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function TeacherDashboard() {
    const { user, userData } = useAuth();
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [todaySlots, setTodaySlots] = useState<any[]>([]);
    const [notices, setNotices] = useState<any[]>([]);
    const [substitutionsToday, setSubstitutionsToday] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [upcomingSubs, setUpcomingSubs] = useState<any[]>([]);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { classSections, classes, sections, classSubjects, subjects, homeworkSubjects, loading: masterLoading } = useMasterData();

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        // setLoading(true); // Don't block UI on re-fetch if we wanted that, but here keeping initial load logic
        try {
            const token = await user?.getIdToken();
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            if (!user?.uid) return;

            // Parallel Execution
            const [scheduleRes, teacherSnap, leaveSnap] = await Promise.all([
                fetch("/api/timetable/my-schedule", { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()),
                getDocs(query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1))),
                getDocs(query(collection(db, "leave_requests"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"), limit(2))).catch(e => { console.warn("[Dashboard] Leaves fetch error:", e.message); return { docs: [] }; })
            ]);

            // 0. Process Teacher Profile
            if (!teacherSnap.empty) {
                const tData = teacherSnap.docs[0].data();
                setTeacherProfile({ id: teacherSnap.docs[0].id, ...tData });
            }

            // 1. Process Schedule
            if (scheduleRes.success) {
                setScheduleData(scheduleRes.data);

                // Process Today's Slots (Simple Helper)
                const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                const rawDay = scheduleRes.data.weeklySchedule?.[dayName] || {};
                const subs = scheduleRes.data.substitutions || [];

                const slots = [];
                for (let i = 1; i <= 8; i++) {
                    const amReplaced = subs.find((s: any) => s.date === todayKey && s.slotId === i && s.role === "ORIGINAL");
                    const amSub = subs.find((s: any) => s.date === todayKey && s.slotId === i && s.role === "SUBSTITUTE");

                    if (amSub) {
                        slots.push({ id: i, type: "SUBSTITUTION", classId: amSub.classId, note: "Sub Assigned" });
                    } else if (amReplaced) {
                        slots.push({ id: i, type: "LEAVE", classId: typeof rawDay[i] === 'object' ? rawDay[i].classId : rawDay[i] });
                    } else if (rawDay[i]) {
                        slots.push({
                            id: i,
                            type: "REGULAR",
                            classId: typeof rawDay[i] === 'object' ? rawDay[i].classId : rawDay[i],
                            subjectId: typeof rawDay[i] === 'object' ? rawDay[i].subjectId : null
                        });
                    }
                }
                setTodaySlots(slots);
                setSubstitutionsToday(subs.filter((s: any) => s.date === todayKey && s.role === "SUBSTITUTE"));

                // Upcoming Coverage (Next 7 days excluding today)
                setUpcomingSubs(subs.filter((s: any) => s.role === "SUBSTITUTE" && s.date > todayKey).sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || ""))));
            }
            // 2. Process Leaves
            // @ts-ignore - catch block handles real errors, this is safe fallback
            if (leaveSnap.docs) {
                // @ts-ignore
                setLeaves(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            // 3. Process Holidays
            const hQuery = query(collection(db, "notices"), where("type", "==", "HOLIDAY"), limit(3));
            const hSnap = await getDocs(hQuery).catch(e => ({ docs: [] }));
            // @ts-ignore
            if (hSnap.docs) {
                // @ts-ignore
                setHolidays(hSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            setNotices([]);

        } catch (e: any) {
            console.warn("[Dashboard] Data fetch error:", e.message);
        } finally {
            setLoading(false);
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
    // ----------------------------

    if (loading || masterLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-muted-foreground animate-pulse text-sm uppercase tracking-widest font-bold">Synchronizing Classroom Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in max-w-7xl mx-auto pb-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Teacher Dashboard</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-lg italic uppercase tracking-widest opacity-70">
                        {teacherProfile?.name ? `Welcome back, ${teacherProfile.name.split(' ')[0]}` : "Classroom Control"}
                    </p>
                </div>
            </div>

            {/* Class Teacher Desk */}
            {managedClasses.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 md:w-2 md:h-8 bg-amber-500 rounded-full"></div>
                        <h2 className="text-lg md:text-2xl font-display font-black text-white uppercase tracking-wider">Class Teacher Desk</h2>
                        <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 uppercase text-[9px] md:text-[10px] tracking-widest px-2 md:px-3 py-1">Action Required</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {managedClasses.map((cs: any) => {
                            const className = classes[cs.classId]?.name || cs.classId;
                            const sectionName = sections[cs.sectionId]?.name || cs.sectionId;
                            const classKey = cs.id;
                            const assignedSubjects = Object.keys(classSubjects[cs.classId] || {})
                                .filter(sid => classSubjects[cs.classId][sid] && subjects[sid]);

                            return (
                                <div key={cs.id} className="bg-black/40 border border-amber-500/20 rounded-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-top duration-500 shadow-xl">
                                    <div className="bg-amber-500/5 border-b border-amber-500/10 p-4 md:p-5 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 text-white/90">
                                                <GraduationCap className="w-5 h-5 text-amber-500" />
                                                {className} - {sectionName}
                                            </h3>
                                            <p className="text-[10px] md:text-xs text-amber-500/60 font-medium tracking-tight mt-0.5">Daily homework control</p>
                                        </div>
                                        <Badge className="bg-amber-500 text-black font-black uppercase text-[9px] tracking-widest shrink-0">Class Teacher</Badge>
                                    </div>
                                    <div className="p-4 md:p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {assignedSubjects.length > 0 ? assignedSubjects.map(sid => {
                                                const isGiving = homeworkSubjects[classKey]?.[sid];
                                                return (
                                                    <div
                                                        key={sid}
                                                        onClick={() => toggleHomeworkSubject(classKey, sid, isGiving)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group shadow-sm ${isGiving
                                                            ? "bg-[#10B981]/15 border-[#10B981]/40"
                                                            : "bg-white/5 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${isGiving ? "bg-[#10B981]/20 text-[#10B981]" : "bg-black/20 text-white/40"}`}>
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="font-bold text-sm text-white/90">{subjects[sid]?.name}</span>
                                                        </div>
                                                        {isGiving && <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]"></div>}
                                                    </div>
                                                );
                                            }) : (
                                                <div className="col-span-full py-6 text-center text-white/30 text-xs font-bold border border-dashed border-white/10 rounded-xl bg-black/20">
                                                    No subjects assigned to this class
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 1. Substitution Alert Banner */}
            {(substitutionsToday.length > 0 || upcomingSubs.length > 0) && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-blue-400 w-5 h-5" />
                        <div>
                            <h3 className="font-bold text-blue-400">
                                {substitutionsToday.length > 0 ? "Substitution Assigned for Today" : "Upcoming Substitution Assigned"}
                            </h3>
                            <p className="text-sm text-blue-400/80">
                                {substitutionsToday.length > 0
                                    ? `You have ${substitutionsToday.length} substitution class(es) assigned today.`
                                    : `You have ${upcomingSubs.length} coverage assignment(s) coming up this week.`
                                }
                            </p>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-400/10" asChild>
                        <Link href="/teacher/timetable">View My Schedule</Link>
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2. Today's Schedule (Priority) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4 h-fit">
                        <div className="flex flex-row items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="flex items-center gap-2 font-bold text-lg text-white"><Clock className="w-5 h-5 text-emerald-500" /> Today's Schedule</h3>
                            <Link href="/teacher/timetable" className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1 font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">
                                Full Timetable <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div>
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
                                    <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
                                    <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
                                    <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
                                </div>
                            ) : (
                                todaySlots.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
                                        No classes scheduled for today. Take a break!
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {todaySlots.map(slot => (
                                            <div key={slot.id} className={`p-4 rounded-xl flex items-center justify-between shadow-sm transition-all hover:scale-[1.01]
                                                ${slot.type === "SUBSTITUTION" ? "bg-yellow-500/10 border border-yellow-500/30" :
                                                    slot.type === "LEAVE" ? "bg-red-500/10 border border-red-500/20 opacity-90" : "bg-white/5 border border-white/10 hover:bg-white/10"}
                                            `}>
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 font-black text-white/80 shrink-0">
                                                        {slot.id}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-lg text-white/90 leading-tight">Class {slot.classId}</div>
                                                        <div className="text-[11px] font-medium text-white/50 tracking-wide uppercase mt-0.5">
                                                            {slot.type === "SUBSTITUTION" ? "Substitution" : (subjects[slot.subjectId]?.name || slot.subjectId || "Regular Class")}
                                                        </div>
                                                    </div>
                                                </div>
                                                {slot.type === "SUBSTITUTION" && <Badge className="bg-yellow-500 text-black font-black tracking-widest text-[9px]">SUB</Badge>}
                                                {slot.type === "LEAVE" && <Badge variant="destructive" className="scale-75 font-black uppercase">LEAVE</Badge>}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* 2b. Upcoming Coverage Card */}
                    {upcomingSubs.length > 0 && (
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
                            <div className="border-b border-blue-500/20 pb-3">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                                    <AlertTriangle className="w-5 h-5" /> Upcoming Coverage
                                </h3>
                                <p className="text-[11px] text-blue-300/60 mt-1 uppercase tracking-wider font-semibold">Coverage assignments for the coming days.</p>
                            </div>
                            <div className="space-y-3 pt-1">
                                {upcomingSubs.slice(0, 3).map((sub, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-300 uppercase tracking-widest text-center min-w-[50px]">
                                                {new Date(sub.date).toLocaleDateString([], { weekday: 'short' })}<br />
                                                <span className="text-white">{new Date(sub.date).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="font-bold text-base text-white/90 leading-tight">Class {sub.classId}</div>
                                                <div className="text-[11px] font-medium text-blue-300/60 uppercase tracking-wider mt-0.5">Period {sub.slotId} • Covering for {sub.originalTeacherId}</div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400 bg-blue-500/10 font-bold uppercase tracking-widest shrink-0">ASSIGNED</Badge>
                                    </div>
                                ))}
                                {upcomingSubs.length > 3 && (
                                    <p className="text-[10px] text-center text-blue-400/50 italic font-medium pt-2">And {upcomingSubs.length - 3} more assigned classes...</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Right Column: Quick Widgets */}
                <div className="space-y-6">

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/teacher/homework" className="group flex flex-col items-center justify-center gap-3 p-5 glass-panel-emerald rounded-2xl transition-all text-center aspect-square md:aspect-auto md:min-h-[120px]">
                            <div className="bg-emerald-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/10">
                                <Plus className="w-6 h-6 text-emerald-400" />
                            </div>
                            <span className="font-bold text-xs md:text-sm text-emerald-100 tracking-wide">Post Homework</span>
                        </Link>

                        <Link href="/teacher/notices" className="group flex flex-col items-center justify-center gap-3 p-5 glass-panel-blue rounded-2xl transition-all text-center aspect-square md:aspect-auto md:min-h-[120px]">
                            <div className="bg-blue-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
                                <FileText className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="font-bold text-xs md:text-sm text-blue-100 tracking-wide">Send Notice</span>
                        </Link>

                        {managedClasses.length > 0 && (
                            <Link href="/teacher/students/add" className="group flex flex-col items-center justify-center gap-3 p-5 glass-panel-accent rounded-2xl transition-all text-center aspect-square md:aspect-auto md:min-h-[120px]">
                                <div className="bg-accent/20 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-accent/10">
                                    <GraduationCap className="w-6 h-6 text-accent" />
                                </div>
                                <span className="font-bold text-xs md:text-sm text-accent tracking-wide">Add Student</span>
                            </Link>
                        )}

                        <Link href="/teacher/exams" className={cn(
                            "group flex flex-col items-center justify-center gap-3 p-5 glass-panel-purple rounded-2xl transition-all text-center md:min-h-[120px]",
                            managedClasses.length > 0 ? "aspect-square md:aspect-auto" : "col-span-2 h-auto py-6"
                        )}>
                            <div className="bg-purple-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10">
                                <FileText className="w-6 h-6 text-purple-400" />
                            </div>
                            <span className="font-bold text-xs md:text-sm text-purple-100 tracking-wide">Examinations & Results</span>
                        </Link>
                    </div>

                    {/* Student Leave Tracker */}
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-lg">Student Absences</h3>
                            <Link href="/teacher/leaves" className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg border border-white/5">
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Review and manage recent or pending leave requests from students enrolled in your class.
                        </p>
                        <Link href="/teacher/leaves" className="w-full">
                            <Button variant="outline" className="w-full text-xs h-10 border-white/10 hover:bg-white/10 hover:text-white transition-all rounded-xl shadow-sm">
                                Manage Student Leaves
                            </Button>
                        </Link>
                    </div>

                    {/* Leave Status (Self) */}
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="font-bold text-white text-lg">My Leave Status</h3>
                        </div>
                        <div className="space-y-3">
                            {leaves.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2 text-center border-y border-white/5 border-dashed">No recent requests.</p>
                            ) : leaves.map(l => (
                                <div key={l.id} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-xs text-white/90">{l.fromDate}</span>
                                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{l.type}</span>
                                    </div>
                                    <Badge variant="outline" className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border-opacity-50 ${l.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500' :
                                        l.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500' : 'bg-amber-500/10 text-amber-400 border-amber-500'
                                        }`}>
                                        {l.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                        <Link href="/teacher/leaves" className="w-full pt-2">
                            <Button variant="outline" className="w-full text-xs h-10 border-white/10 hover:bg-white/10 hover:text-white transition-all rounded-xl shadow-sm">
                                Request Leave
                            </Button>
                        </Link>
                    </div>

                    {/* Upcoming Holidays (Dynamic) */}
                    <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3">
                            <h3 className="font-bold text-emerald-400 text-lg">Upcoming Holidays</h3>
                        </div>
                        <div className="space-y-2">
                            {loading ? (
                                <Skeleton className="h-4 w-full bg-emerald-500/10" />
                            ) : holidays.length === 0 ? (
                                <p className="text-xs text-emerald-500/60 py-2 text-center border-y border-emerald-500/10 border-dashed">No holidays scheduled soon.</p>
                            ) : (
                                holidays.slice(0, 3).map((h: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
                                        <span className="truncate font-semibold text-xs text-emerald-100 mr-2">{h.title || h.name}</span>
                                        <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                                            {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) :
                                                h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "TBD"}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                        <Link href="/teacher/holidays" className="w-full pt-2">
                            <Button variant="outline" className="w-full text-xs h-10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all rounded-xl shadow-sm">
                                View Calendar
                            </Button>
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}
