"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Coffee, ArrowRight, Printer } from "lucide-react";
import { collection, query, getDocs, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";

export default function StudentTimetablePage() {
    const { user } = useAuth();
    const { subjects, classes, sections } = useMasterData();
    const [schedule, setSchedule] = useState<any>(null); // weeklySchedule
    const [substitutions, setSubstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
    const [holidays, setHolidays] = useState<any[]>([]);

    // Day Ordering
    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

    useEffect(() => {
        if (user) {
            fetchMySchedule();
            fetchTeachers();
            fetchHolidays();
        }
    }, [user]);

    const fetchHolidays = async () => {
        try {
            const hQuery = query(collection(db, "notices"), where("type", "==", "HOLIDAY"));
            const hSnap = await getDocs(hQuery);
            setHolidays(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.error(e); }
    };

    const fetchTeachers = async () => {
        try {
            const q = query(collection(db, "teachers"));
            const snap = await getDocs(q);
            const map: Record<string, string> = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.schoolId) map[data.schoolId] = data.name;
                // Also map by doc ID just in case
                map[d.id] = data.name;
            });
            setTeacherMap(map);
        } catch (e) { console.error("Error fetching teachers:", e); }
    };

    const fetchMySchedule = async () => {
        try {
            const res = await fetch("/api/timetable/my-schedule", {
                headers: { "Authorization": `Bearer ${await user?.getIdToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                setSchedule(data.data.weeklySchedule || {});
                setSubstitutions(data.data.substitutions || []);
                setClassId(data.data.classId);
                setSectionId(data.data.sectionId);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
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
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const isHoliday = isDateHoliday(today);
        if (isHoliday) return { dayName, dateKey, slots: [], isHoliday: true };

        if (!schedule || !schedule[dayName]) return { dayName, slots: [] };

        const todaySlots = [];
        const rawDay = schedule[dayName] || {};
        const maxSlots = 8;

        for (let i = 1; i <= maxSlots; i++) {
            const base = rawDay[i];
            if (!base) continue;

            const sub = substitutions.find(s => s.date === dateKey && s.slotId === i);
            todaySlots.push({
                id: i,
                ...base,
                substitution: sub
            });
        }

        return { dayName, dateKey, slots: todaySlots, isHoliday: false };
    };

    const todayData = getTodaySchedule();

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">My Timetable</h1>
                    <p className="text-muted-foreground">
                        {classes[classId]?.name || `Class ${classId}`}
                        {sectionId && sections && sections[sectionId] ? ` (${sections[sectionId].name})` : ""}
                    </p>
                </div>
                <Button onClick={() => window.print()} variant="outline" className="gap-2 print:hidden bg-white/5 border-white/10 hover:bg-white/10 hover:text-white">
                    <Printer className="w-4 h-4" /> Print Timetable
                </Button>
            </div>

            {/* TODAY'S EFFECTIVE VIEW */}
            <Card className={`print:hidden overflow-hidden relative border-white/10 ${todayData.isHoliday ? "bg-red-500/10 border-red-500/20" : "bg-black/20"}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${todayData.isHoliday ? "bg-red-500" : "bg-emerald-500"}`}></div>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Today ({todayData.dayName})</span>
                        <span className="text-sm font-normal text-muted-foreground">{todayData.dateKey}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {todayData.isHoliday ? (
                        <div className="py-12 flex flex-col items-center justify-center text-red-400 gap-4">
                            <Coffee className="w-12 h-12 opacity-50" />
                            <div className="text-center">
                                <h3 className="text-2xl font-bold uppercase tracking-widest">Holiday</h3>
                                <p className="text-sm text-red-400/60 mt-1">School is closed for today. Enjoy your break!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {todayData.slots.length === 0 ? <p className="text-muted-foreground">No classes scheduled for today.</p> :
                                todayData.slots.map((slot: any) => {
                                    const isSub = !!slot.substitution;
                                    const isLeisure = isSub && slot.substitution.resolutionType === "LEISURE";
                                    const rawSubjectId = isLeisure ? "leisure" : (slot.subjectId === "leisure" ? "leisure" : slot.subjectId);
                                    const subjectName = subjects[rawSubjectId]?.name || rawSubjectId;

                                    const getTeacherDisplay = () => {
                                        if (isSub && slot.substitution.substituteTeacherId) {
                                            return teacherMap[slot.substitution.substituteTeacherId] || slot.substitution.substituteTeacherId;
                                        }
                                        return teacherMap[slot.teacherId] || slot.teacherId || "No Teacher";
                                    };

                                    return (
                                        <div key={slot.id} className={`p-4 rounded-lg border flex flex-col gap-2 ${isSub ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/5 border-white/10"}`}>
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-bold text-muted-foreground">Period {slot.id}</span>
                                                {isSub && <Badge variant="outline" className="text-[10px] bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Changed</Badge>}
                                            </div>
                                            <div className="font-bold text-lg truncate">
                                                {isLeisure || rawSubjectId === "leisure" ? (
                                                    <span className="flex items-center gap-2 text-emerald-400 font-medium">
                                                        <Coffee className="w-5 h-5" /> Free Period
                                                    </span>
                                                ) : <span className="capitalize">{subjectName}</span>}
                                            </div>
                                            {!isLeisure && rawSubjectId !== "leisure" && (
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Users className="w-3 h-3" />
                                                    <span className="truncate">{getTeacherDisplay()}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* WEEKLY STANDARD VIEW */}
            <Card className="bg-black/20 border-white/10">
                <CardHeader><CardTitle>Weekly Schedule</CardTitle></CardHeader>
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
                                    // Calculate date for this day of current week
                                    const today = new Date();
                                    const currentDay = today.getDay();
                                    const distance = (dIdx + 1) - currentDay;
                                    const targetDate = new Date(today);
                                    targetDate.setDate(today.getDate() + distance);
                                    const isHoliday = isDateHoliday(targetDate);

                                    return (
                                        <tr key={day} className={`border-b border-white/5 transition-colors ${isHoliday ? "bg-red-500/5" : "hover:bg-white/5"}`}>
                                            <td className="p-3 font-medium text-muted-foreground flex flex-col">
                                                <span>{day.substring(0, 3)}</span>
                                                <span className="text-[10px] opacity-40 font-normal">{targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                            </td>
                                            {isHoliday ? (
                                                <td colSpan={8} className="p-3 text-center text-red-400/80 font-bold uppercase tracking-widest text-[10px]">Holiday</td>
                                            ) : (
                                                [1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                                    const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
                                                    const sub = substitutions.find(s => s.date === dateKey && s.slotId === i);
                                                    const slot = schedule?.[day]?.[i];

                                                    if (sub) {
                                                        const isLeisure = sub.resolutionType === "LEISURE";
                                                        return (
                                                            <td key={i} className="p-3 text-center border-l border-white/5 bg-yellow-500/10">
                                                                <div className="font-semibold text-yellow-500">
                                                                    {isLeisure ? "Free Period" : (subjects[slot?.subjectId]?.name || slot?.subjectId)}
                                                                </div>
                                                                {!isLeisure && (
                                                                    <div className="text-[10px] text-yellow-500/60 font-medium">
                                                                        {teacherMap[sub.substituteTeacherId] || sub.substituteTeacherId}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    if (!slot) return <td key={i} className="p-3"></td>;
                                                    if (slot.type === "BREAK") return <td key={i} className="p-3 bg-white/5 text-center text-[10px] diagonal-stripe opacity-50"></td>;
                                                    return (
                                                        <td key={i} className="p-3 text-center border-l border-white/5">
                                                            <div className="font-semibold">{slot.subjectId === "leisure" ? "Leisure" : (subjects[slot.subjectId]?.name || slot.subjectId)}</div>
                                                            <div className="text-[10px] text-muted-foreground">{teacherMap[slot.teacherId] || slot.teacherId}</div>
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
