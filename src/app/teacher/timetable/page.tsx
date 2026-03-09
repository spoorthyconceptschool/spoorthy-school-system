"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Loader2, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { collection, query, getDocs, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";

export default function TeacherTimetablePage() {
    const { user } = useAuth();
    const { subjects, selectedYear } = useMasterData();
    const [schedule, setSchedule] = useState<any>(null); // weeklySchedule
    const [substitutions, setSubstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
    const [holidays, setHolidays] = useState<any[]>([]);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);

    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

    useEffect(() => {
        if (user) {
            fetchTeacherProfile();
            fetchTeachers();
            fetchHolidays();
        }
    }, [user]);

    const fetchTeacherProfile = async () => {
        if (!user?.uid) return;
        const q = query(collection(db, "teachers"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
            setTeacherProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
    };

    // Real-time Timetable Listener
    useEffect(() => {
        if (!teacherProfile) return;

        const currentYear = selectedYear || "2025-2026";
        const possibleIds = [teacherProfile.id, teacherProfile.schoolId, teacherProfile.teacherId].filter(Boolean);
        if (possibleIds.length === 0) return;

        setLoading(true);

        const ttQuery = query(
            collection(db, "timetable_entries"),
            where("teacherId", "in", possibleIds),
            where("academicYear", "==", currentYear)
        );
        const subQuery1 = query(collection(db, "substitutions"), where("originalTeacherId", "in", possibleIds));
        const subQuery2 = query(collection(db, "substitutions"), where("substituteTeacherId", "in", possibleIds));

        let lastEntries = [] as any[];
        let lastOrig = [] as any[];
        let lastSub = [] as any[];

        const processAll = () => {
            const weekly: any = {};
            lastEntries.forEach(entry => {
                if (!weekly[entry.day]) weekly[entry.day] = {};
                weekly[entry.day][entry.period] = {
                    classId: entry.classKey || `${entry.classId}_${entry.sectionId}`,
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
            const hQuery = query(collection(db, "notices"), where("type", "==", "HOLIDAY"));
            const hSnap = await getDocs(hQuery);
            setHolidays(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.warn("[Timetable] Holiday Fetch Error", e); }
    };

    const fetchTeachers = async () => {
        try {
            const q = query(collection(db, "teachers"));
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
            const start = h.date?.seconds ? new Date(h.date.seconds * 1000) : (h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000) : new Date());
            const end = h.expiresAt?.seconds ? new Date(h.expiresAt.seconds * 1000) : new Date();
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        });
    };

    const getTodaySchedule = () => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        const dateKey = today.toISOString().split('T')[0];

        const isHoliday = isDateHoliday(today);
        if (isHoliday) return { dayName, dateKey, slots: [], isHoliday: true };

        if (!schedule || !schedule[dayName]) return { dayName, dateKey, slots: [] };

        const todaySlots = [];
        const rawDay = schedule[dayName] || {};
        const maxSlots = 8;

        for (let i = 1; i <= maxSlots; i++) {
            // Check Substitutions first (Am I covering? Or am I replaced?)
            const origSub = substitutions.find(s => s.date === dateKey && s.slotId === i && s.role === "ORIGINAL");
            const coverSub = substitutions.find(s => s.date === dateKey && s.slotId === i && s.role === "SUBSTITUTE");

            if (coverSub) {
                todaySlots.push({ id: i, type: "SUBSTITUTION", classId: coverSub.classId, note: "Substitution", originalTeacherId: coverSub.originalTeacherId });
                continue;
            }
            if (origSub) {
                todaySlots.push({ id: i, type: "LEAVE", ...rawDay[i], note: origSub.resolutionType === "LEISURE" ? "Marked Leisure" : "Subst. Assigned" });
                continue;
            }
            const base = rawDay[i];
            if (base) {
                const classId = typeof base === 'string' ? base : base.classId;
                const subjectId = typeof base === 'object' ? base.subjectId : null;
                todaySlots.push({ id: i, type: "REGULAR", classId, subjectId });
            }
        }

        return { dayName, dateKey, slots: todaySlots, isHoliday: false };
    };

    const todayData = getTodaySchedule();

    if (loading && !schedule) return <div className="p-10 flex justify-center bg-transparent"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="space-y-6 max-w-full mx-auto p-4 md:p-6 animate-in fade-in">
            <div>
                <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-display font-bold">My Schedule</h1>
                <p className="text-muted-foreground">Teacher Portal</p>
            </div>

            {/* TODAY */}
            <Card className={`overflow-hidden relative border-white/10 ${todayData.isHoliday ? "bg-red-500/10 border-red-500/20" : "bg-black/20"}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${todayData.isHoliday ? "bg-red-500" : "bg-blue-500"}`}></div>
                <CardHeader>
                    <CardTitle className="flex justify-between">
                        <span>Today ({todayData.dayName})</span>
                        <span className="text-sm font-normal text-muted-foreground">{todayData.dateKey}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {todayData.isHoliday ? (
                        <div className="py-12 flex flex-col items-center justify-center text-red-400 gap-4">
                            <Calendar className="w-12 h-12 opacity-90" />
                            <div className="text-center">
                                <h3 className="text-2xl font-bold uppercase tracking-widest">Holiday</h3>
                                <p className="text-sm text-red-400/60 mt-1">School is closed for today. Enjoy your rest!</p>
                            </div>
                        </div>
                    ) : (
                        todayData.slots.length === 0 ? <p className="text-muted-foreground text-center py-8">No classes today.</p> : (
                            <div className="space-y-2">
                                {todayData.slots.map((slot: any) => (
                                    <div key={slot.id} className={`p-4 rounded border flex items-center justify-between
                                         ${slot.type === "SUBSTITUTION" ? "bg-blue-500/10 border-blue-500/30" :
                                            slot.type === "LEAVE" ? "bg-red-500/10 border-red-500/30 opacity-60 dashed-border" : "bg-white/5 border-white/10"}
                                     `}>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5">
                                                {slot.id}
                                            </Badge>
                                            <div>
                                                {slot.type === "LEAVE" ? (
                                                    <div className="line-through text-muted-foreground">Class {slot.classId}</div>
                                                ) : (
                                                    <div className="font-bold text-lg">Class {slot.classId}</div>
                                                )}

                                                <div className="text-xs text-muted-foreground">
                                                    {slot.type === "SUBSTITUTION" ? <span className="text-blue-400">Covering for {teacherMap[slot.originalTeacherId] || slot.originalTeacherId}</span> :
                                                        slot.type === "LEAVE" ? <span className="text-red-400">On Leave ({slot.note})</span> :
                                                            (subjects[slot.subjectId]?.name || slot.subjectId || "Regular Class")}
                                                </div>
                                            </div>
                                        </div>
                                        {slot.type === "SUBSTITUTION" && <Badge>SUBSTITUTION</Badge>}
                                        {slot.type === "LEAVE" && <Badge variant="destructive">ON LEAVE</Badge>}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            {/* WEEKLY */}
            <Card className="bg-black/20 border-white/10">
                <CardHeader><CardTitle>Weekly Overview</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="p-3 text-left">Day</th>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <th key={i} className="p-3 text-center">P{i}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((day, dIdx) => {
                                    const today = new Date();
                                    const currentDay = today.getDay();
                                    const distance = (dIdx + 1) - currentDay;
                                    const targetDate = new Date(today);
                                    targetDate.setDate(today.getDate() + distance);
                                    const isHoliday = isDateHoliday(targetDate);

                                    return (
                                        <tr key={day} className={`border-b border-white/5 transition-colors ${isHoliday ? "bg-red-500/5 text-red-400/50" : "hover:bg-white/5"}`}>
                                            <td className="p-3 font-medium text-muted-foreground flex flex-col">
                                                <span>{day.substring(0, 3)}</span>
                                                <span className="text-[10px] opacity-40 font-normal">{targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                            </td>
                                            {isHoliday ? (
                                                <td colSpan={8} className="p-3 text-center text-red-500/50 font-bold uppercase tracking-widest text-[10px]">Holiday</td>
                                            ) : (
                                                [1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                                    const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
                                                    const origSub = substitutions.find(s => s.date === dateKey && s.slotId === i && s.role === "ORIGINAL");
                                                    const coverSub = substitutions.find(s => s.date === dateKey && s.slotId === i && s.role === "SUBSTITUTE");

                                                    if (coverSub) {
                                                        return (
                                                            <td key={i} className="p-3 text-center border-l border-white/5 bg-blue-500/10">
                                                                <div className="font-bold text-blue-400">{coverSub.classId}</div>
                                                                <div className="text-[10px] uppercase font-bold text-blue-500/60">Covering</div>
                                                            </td>
                                                        );
                                                    }

                                                    if (origSub) {
                                                        return (
                                                            <td key={i} className="p-3 text-center border-l border-white/5 bg-red-500/10 opacity-40">
                                                                <div className="font-bold line-through text-red-500/50">OFF</div>
                                                                <div className="text-[10px] uppercase font-bold text-red-500/40">On Leave</div>
                                                            </td>
                                                        );
                                                    }

                                                    const slot = schedule?.[day]?.[i];
                                                    if (!slot) return <td key={i} className="p-3 border-l border-white/5"></td>;
                                                    const classId = typeof slot === 'object' ? slot.classId : slot;
                                                    const subjectId = typeof slot === 'object' ? slot.subjectId : null;
                                                    return (
                                                        <td key={i} className="p-3 text-center border-l border-white/5">
                                                            <div className="font-bold">{classId}</div>
                                                            {subjectId && <div className="text-[10px] text-muted-foreground">{subjects[subjectId]?.name || subjectId}</div>}
                                                        </td>
                                                    );
                                                })
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
