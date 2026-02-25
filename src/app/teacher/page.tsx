"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Clock, Video, Coffee, AlertTriangle, FileText, ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";

import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherDashboard() {
    const { user } = useAuth();
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [todaySlots, setTodaySlots] = useState<any[]>([]);
    const [notices, setNotices] = useState<any[]>([]);
    const [substitutionsToday, setSubstitutionsToday] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [upcomingSubs, setUpcomingSubs] = useState<any[]>([]);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { classSections, classes, sections, classSubjects, subjects, homeworkSubjects } = useMasterData();

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
                getDocs(query(collection(db, "leave_requests"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"), limit(2))).catch(e => ({ docs: [] })) // Graceful fail
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

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- CLASS TEACHER HELPERS ---
    const getManagedClasses = () => {
        if (!teacherProfile) return [];
        const tId = teacherProfile.schoolId || teacherProfile.id;
        return Object.values(classSections).filter((cs: any) => cs.active && cs.classTeacherId === tId);
    };

    const toggleHomeworkSubject = async (classKey: string, subjectId: string, currentVal: boolean) => {
        try {
            const { ref, set } = await import("firebase/database");
            const { rtdb } = await import("@/lib/firebase");
            const targetRef = ref(rtdb, `master/homeworkSubjects/${classKey}/${subjectId}`);
            await set(targetRef, !currentVal);
        } catch (e) {
            console.error("Failed to toggle homework subject", e);
        }
    };

    const managedClasses = getManagedClasses();
    // ----------------------------

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
                                <Card key={cs.id} className="bg-black/40 border-amber-500/20 backdrop-blur-md overflow-hidden animate-in slide-in-from-top duration-500">
                                    <div className="bg-amber-500/5 border-b border-amber-500/10 p-3 md:p-4 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-white">
                                                <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                                                {className} - {sectionName}
                                            </h3>
                                            <p className="text-[10px] md:text-xs text-amber-500/60 font-medium tracking-tight">Daily homework control</p>
                                        </div>
                                        <Badge className="bg-amber-500 text-black font-black uppercase text-[8px] md:text-[9px] tracking-widest shrink-0">Class Teacher</Badge>
                                    </div>
                                    <CardContent className="p-3 md:p-4 space-y-4">
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {assignedSubjects.length > 0 ? assignedSubjects.map(sid => {
                                                    const isGiving = homeworkSubjects[classKey]?.[sid];
                                                    return (
                                                        <div
                                                            key={sid}
                                                            onClick={() => toggleHomeworkSubject(classKey, sid, isGiving)}
                                                            className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all group ${isGiving
                                                                ? "bg-[#10B981]/10 border-[#10B981]/30"
                                                                : "bg-white/5 border-white/10 opacity-60 hover:opacity-100"
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-1.5 rounded-lg ${isGiving ? "bg-[#10B981]/20 text-[#10B981]" : "bg-white/5 text-white/20"}`}>
                                                                    <FileText className="w-3 h-3" />
                                                                </div>
                                                                <span className="font-bold text-xs text-white/90">{subjects[sid]?.name}</span>
                                                            </div>
                                                            {isGiving && <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]"></div>}
                                                        </div>
                                                    );
                                                }) : (
                                                    <div className="col-span-full py-4 text-center text-white/20 text-[10px] uppercase font-bold border border-dashed border-white/10 rounded-xl">
                                                        No subjects assigned to this class
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
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
                    <Card className="bg-black/20 border-white/10 h-fit">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" /> Today's Schedule</CardTitle>
                            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                                <Link href="/teacher/timetable">Full Timetable <ChevronRight className="w-4 h-4" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                    <Skeleton className="h-24 w-full rounded-lg" />
                                </div>
                            ) : (
                                todaySlots.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No classes scheduled for today.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {todaySlots.map(slot => (
                                            <div key={slot.id} className={`p-4 rounded-lg flex items-center justify-between
                                                ${slot.type === "SUBSTITUTION" ? "bg-yellow-500/10 border border-yellow-500/20" :
                                                    slot.type === "LEAVE" ? "bg-red-500/5 border border-red-500/10 opacity-90" : "bg-white/5 border border-white/10"}
                                            `}>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border-white/10">
                                                        {slot.id}
                                                    </Badge>
                                                    <div>
                                                        <div className="font-bold text-lg">Class {slot.classId}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {slot.type === "SUBSTITUTION" ? "Substitution" : (subjects[slot.subjectId]?.name || slot.subjectId || "Regular Class")}
                                                        </div>
                                                    </div>
                                                </div>
                                                {slot.type === "SUBSTITUTION" && <Badge className="bg-yellow-500 text-black">SUB</Badge>}
                                                {slot.type === "LEAVE" && <Badge variant="destructive" className="scale-75">LEAVE</Badge>}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>

                    {/* 2b. Upcoming Coverage Card */}
                    {upcomingSubs.length > 0 && (
                        <Card className="bg-blue-600/5 border-blue-500/20">
                            <CardHeader className="py-4">
                                <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                                    <AlertTriangle className="w-5 h-5" /> Upcoming Coverage
                                </CardTitle>
                                <CardDescription className="text-blue-300/60">Coverage assignments for the coming days.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {upcomingSubs.slice(0, 3).map((sub, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-500/20 px-2 py-1 rounded text-[10px] font-bold text-blue-400 uppercase">
                                                    {new Date(sub.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-white/90">Class {sub.classId}</div>
                                                    <div className="text-[10px] text-muted-foreground">Period {sub.slotId} • Covering for {sub.originalTeacherId}</div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">ASSIGNED</Badge>
                                        </div>
                                    ))}
                                    {upcomingSubs.length > 3 && (
                                        <p className="text-[10px] text-center text-muted-foreground italic">And {upcomingSubs.length - 3} more assigned classes...</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* 3. Right Column: Quick Widgets */}
                <div className="space-y-6">

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button className="h-24 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700" asChild>
                            <Link href="/teacher/homework">
                                <Plus className="w-6 h-6" />
                                <span>Post Homework</span>
                            </Link>
                        </Button>
                        <Button className="h-24 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700" asChild>
                            <Link href="/teacher/notices">
                                <FileText className="w-6 h-6" />
                                <span>Send Notice</span>
                            </Link>
                        </Button>
                        <Button className="h-24 flex flex-col gap-2 bg-purple-600 hover:bg-purple-700 col-span-2" asChild>
                            <Link href="/teacher/exams">
                                <FileText className="w-6 h-6" />
                                <span>Examinations & Results</span>
                            </Link>
                        </Button>
                    </div>

                    {/* Student Leave Tracker */}
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Student Absences</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/teacher/leaves"><ChevronRight className="w-4 h-4" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="py-2">
                            <p className="text-[10px] text-muted-foreground mb-2">Recent/Pending leaves in your class.</p>
                            <Button variant="outline" className="w-full text-xs h-8 border-white/5" asChild>
                                <Link href="/teacher/leaves">View Student Leaves</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Leave Status (Self) */}
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader className="py-4"><CardTitle className="text-base line-clamp-1">My Leave Status</CardTitle></CardHeader>
                        <CardContent className="py-2 space-y-3">
                            {leaves.length === 0 ? <p className="text-xs text-muted-foreground">No recent requests.</p> : leaves.map(l => (
                                <div key={l.id} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-xs">{l.fromDate}</span>
                                        <span className="text-[10px] text-muted-foreground">{l.type}</span>
                                    </div>
                                    <Badge variant={l.status === 'APPROVED' ? 'default' : l.status === 'REJECTED' ? 'destructive' : 'secondary'} className="text-[10px]">
                                        {l.status}
                                    </Badge>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full text-xs mt-2" asChild>
                                <Link href="/teacher/leaves">Request Leave</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Upcoming Holidays (Dynamic) */}
                    <Card className="bg-emerald-900/10 border-emerald-500/20">
                        <CardHeader className="py-4"><CardTitle className="text-base text-emerald-500">Upcoming Holidays</CardTitle></CardHeader>
                        <CardContent className="py-2">
                            <div className="space-y-2">
                                {loading ? (
                                    <Skeleton className="h-4 w-full" />
                                ) : holidays.length === 0 ? (
                                    <p className="text-xs text-muted-foreground whitespace-normal">No holidays scheduled soon.</p>
                                ) : (
                                    holidays.slice(0, 2).map((h: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="truncate mr-2">{h.title || h.name}</span>
                                            <span className="text-muted-foreground whitespace-nowrap">
                                                {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) :
                                                    h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "TBD"}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <Button variant="link" className="text-xs text-emerald-500 px-0 mt-2 block" asChild>
                                <Link href="/teacher/holidays">View Calendar</Link>
                            </Button>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
