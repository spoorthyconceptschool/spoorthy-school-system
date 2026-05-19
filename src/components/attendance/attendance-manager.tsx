
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, documentId, onSnapshot } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Loader2, Check, X, Save, Search, Printer, Users } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { useMasterData } from "@/context/MasterDataContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, User, CalendarDays, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AttendanceManager({
    classId,
    sectionId,
    defaultDate
}: {
    classId: string;
    sectionId: string;
    defaultDate?: string;
}) {
    const { user, userData } = useAuth();
    const { classes, branding, students: globalStudents } = useMasterData();

    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, 'P' | 'A'>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyMarked, setAlreadyMarked] = useState(false);
    const [isModified, setIsModified] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStats, setViewStats] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [statsMonth, setStatsMonth] = useState<string>("ALL");

    const date = defaultDate || new Date().toISOString().split('T')[0];

    const [holidays, setHolidays] = useState<any[]>([]);
    const [isHoliday, setIsHoliday] = useState(false);

    useEffect(() => {
        let isM = true;
        const fetchH = async () => {
            try {
                const q = query(
                    collection(db, "notices"), 
                    where("type", "==", "HOLIDAY"),
                    where("schoolId", "in", [userData?.schoolId || "global", "global"])
                );
                const snap = await getDocs(q);
                if (isM) setHolidays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (e) {}
        };
        fetchH();
        return () => { isM = false; };
    }, []);

    useEffect(() => {
        const checkDate = new Date(`${date}T12:00:00`);
        const isH = holidays.some(h => {
             const start = h.startDate?.seconds ? new Date(h.startDate.seconds * 1000) : (h.date?.seconds ? new Date(h.date.seconds * 1000) : (h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000) : new Date()));
             const end = h.endDate?.seconds ? new Date(h.endDate.seconds * 1000) : new Date(start.getTime());
             start.setHours(0, 0, 0, 0);
             end.setHours(23, 59, 59, 999);
             return checkDate >= start && checkDate <= end;
        });
        setIsHoliday(isH);
    }, [date, holidays]);

    const fetchStats = async () => {
        if (!classId || !sectionId) return;
        setLoading(true);
        try {
            // 1. Fetch Students for this class/section locally, avoid complex index requirements
            const sQ = query(
                collection(db, "students"),
                where("classId", "==", classId),
                where("sectionId", "==", sectionId)
            );
            const sSnap = await getDocs(sQ);
            
            const schoolId = userData?.schoolId || "global";
            const isGlobal = schoolId === "global";

            const sList = sSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((s: any) => s.status === "ACTIVE")
                .filter((s: any) => isGlobal || s.schoolId === schoolId || !s.schoolId || s.branchId === schoolId)
                .sort((a: any, b: any) => (a.rollNumber || 0) - (b.rollNumber || 0));
            setStudents(sList);

            // 2. Fetch Attendance in range
            const currentYear = new Date().getFullYear();
            let startKey, endKey;

            if (statsMonth === "ALL") {
                startKey = `${currentYear}-01-01_${classId}_${sectionId}`;
                endKey = `${currentYear}-12-31_${classId}_${sectionId}`;
            } else {
                startKey = `${currentYear}-${statsMonth}-01_${classId}_${sectionId}`;
                endKey = `${currentYear}-${statsMonth}-31_${classId}_${sectionId}`;
            }

            const q = query(
                collection(db, "attendance_daily"),
                where(documentId(), ">=", startKey),
                where(documentId(), "<=", endKey)
            );
            const snap = await getDocs(q);
            const studentStats: Record<string, { total: number, present: number }> = {};

            snap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.records) {
                    Object.entries(data.records).forEach(([sid, status]: [string, any]) => {
                        if (!studentStats[sid]) studentStats[sid] = { total: 0, present: 0 };
                        if (status === 'P' || status === 'A') {
                            studentStats[sid].total++;
                            if (status === 'P') studentStats[sid].present++;
                        }
                    });
                }
            });

            const data = sList.map(s => {
                const st = studentStats[s.id] || { total: 0, present: 0 };
                return {
                    ...s,
                    totalDays: st.total,
                    presentDays: st.present,
                    percentage: st.total > 0 ? ((st.present / st.total) * 100).toFixed(1) : "0.0"
                };
            });
            setStatsData(data);
        } catch (error: any) {
            console.error("Stats error", error);
            toast({ title: "Error", description: "Failed to load stats", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const classObj = Object.values(classes).find((c: any) => c.id === classId);
        const period = statsMonth === "ALL" ? `Annual Report ${new Date().getFullYear()}` : `Monthly Report - ${new Date(2000, Number(statsMonth) - 1).toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;

        const html = `
            <html>
            <head>
                <title>Student Attendance Report - ${classObj?.name} - ${period}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    .header { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .logo { height: 80px; width: auto; object-fit: contain; }
                    .header-text { text-align: left; }
                    h1 { margin: 0; font-size: 28px; }
                    .details { font-size: 14px; color: #666; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 12px; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .percentage { font-weight: bold; }
                    .low { color: #dc3545; }
                    .good { color: #28a745; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                    <div class="header-text">
                        <h1 style="margin: 0;">${branding?.schoolName || 'Attendance Report'}</h1>
                        <div class="details" style="font-weight: bold; color: #333;">Student Attendance Report</div>
                        <div class="details">Class: ${classObj?.name} (${sectionId}) - ${period}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">Roll</th>
                            <th>Student Name</th>
                            <th class="text-center">ID</th>
                            <th class="text-center">Total Days</th>
                            <th class="text-center">Present</th>
                            <th class="text-center">Absents</th>
                            <th class="text-center">Attendance %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statsData.map((s, idx) => `
                            <tr>
                                <td>${s.rollNumber || idx + 1}</td>
                                <td class="font-bold">${s.studentName}</td>
                                <td class="text-center">${s.schoolId}</td>
                                <td class="text-center">${s.totalDays}</td>
                                <td class="text-center" style="color: #28a745; font-weight: bold;">${s.presentDays}</td>
                                <td class="text-center">${s.totalDays - s.presentDays}</td>
                                <td class="text-center percentage ${Number(s.percentage) < 75 ? 'low' : 'good'}">${s.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <div>Generated on: ${new Date().toLocaleString()}</div>
                    <div>School Management System</div>
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        window.onafterprint = () => window.close();
                    };
                </script>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        win?.document.write(html);
        win?.document.close();
    };

    useEffect(() => {
        if (!classId || !sectionId) return;

        if (viewStats) {
            fetchStats();
            return;
        }

        let isMounted = true;
        let unsubAttendance: (() => void) | null = null;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Students for this class/section locally, avoid complex index requirements
                const sQ = query(
                    collection(db, "students"),
                    where("classId", "==", classId),
                    where("sectionId", "==", sectionId)
                );
                const sSnap = await getDocs(sQ);

                const schoolId = userData?.schoolId || "global";
                const isGlobal = schoolId === "global";

                const sList = sSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((s: any) => s.status === "ACTIVE")
                    .filter((s: any) => isGlobal || s.schoolId === schoolId || !s.schoolId || s.branchId === schoolId)
                    .sort((a: any, b: any) => (a.rollNumber || 0) - (b.rollNumber || 0));

                if (isMounted) setStudents(sList);

                if (sList.length === 0) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch Leaves
                const lQuery = query(
                    collection(db, "student_leaves"),
                    where("classId", "==", classId),
                    where("status", "==", "APPROVED"),
                    where("schoolId", "==", userData?.schoolId || "global")
                );

                const attId = `${date}_${classId}_${sectionId}`;

                const lSnap = await getDocs(lQuery);
                const absentIds = new Set<string>();
                lSnap.forEach(ld => {
                    const l = ld.data();
                    if (l.fromDate <= date && l.toDate >= date) {
                        if (!l.sectionId || l.sectionId === sectionId) {
                            absentIds.add(l.studentId);
                        }
                    }
                });

                unsubAttendance = onSnapshot(doc(db, "attendance_daily", attId), (attSnap) => {
                    if (!isMounted) return;
                    if (attSnap.exists()) {
                        setAlreadyMarked(true);
                        setAttendance(attSnap.data().records || {});
                    } else {
                        setAlreadyMarked(false);
                        const initial: Record<string, 'P' | 'A'> = {};
                        sList.forEach((s: any) => {
                            const isOnLeave = absentIds.has(s.id) || (s.schoolId && absentIds.has(s.schoolId));
                            initial[s.id] = isOnLeave ? 'A' : 'P';
                        });
                        setAttendance(initial);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error("Attendance listener error", err);
                    setLoading(false);
                });

            } catch (e: any) {
                console.error(e);
                toast({ title: "Error", description: "Failed to fetch data.", type: "error" });
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            if (unsubAttendance) unsubAttendance();
        };
    }, [classId, sectionId, date, viewStats, statsMonth]);

    const [touched, setTouched] = useState<Set<string>>(new Set());

    const toggleStatus = (studentId: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'P' ? 'A' : 'P'
        }));
        setTouched(prev => {
            const next = new Set(prev);
            next.add(studentId);
            return next;
        });
        setIsModified(true); // Track local modifications for UI feedback
    };

    const handleSubmit = async () => {
        const prevAlreadyMarked = alreadyMarked;
        const prevIsModified = isModified;
        const prevTouched = new Set(touched);

        // Optimistic UI updates
        setAlreadyMarked(true);
        setIsModified(false);
        setTouched(new Set());
        setSubmitting(true);

        toast({
            title: alreadyMarked ? "Attendance Updated" : "Attendance Submitted",
            description: "Synchronizing with cloud databases...",
            type: "success"
        });

        try {
            const token = await user?.getIdToken(true);
            const res = await fetch("/api/attendance/mark", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    classId,
                    sectionId,
                    date,
                    records: attendance,
                    markedBy: user?.uid,
                    markedByName: user?.displayName || "Admin",
                    isModification: alreadyMarked,
                    touchedIds: Array.from(touched) // Send explicit list of modified students
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            // Optional background confirmation toast if statistics change
            console.log(`[Optimistic Attendance] Successfully synchronized. Changes: ${data.changesCount || 0}`);
        } catch (e: any) {
            console.error("[Optimistic Attendance] Sync failed, reverting state:", e);
            // Revert state on failure
            setAlreadyMarked(prevAlreadyMarked);
            setIsModified(prevIsModified);
            setTouched(prevTouched);
            toast({ title: "Sync Failed", description: e.message, type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // SEARCH FILTER
    const filteredStudents = students.filter(s =>
        (s.studentName || s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.schoolId && s.schoolId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.rollNumber && String(s.rollNumber).includes(searchQuery))
    );

    const stats = {
        total: students.length,
        present: Object.values(attendance).filter(v => v === 'P').length,
        absent: Object.values(attendance).filter(v => v === 'A').length
    };

    return (
        <div className="w-full text-[#E6F1FF]">
            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT (Optimized, High-density, Touch-ready list & dual buttons) */}
            {/* ========================================================================= */}
            <div className="lg:hidden block space-y-3">
                {/* 3-Column Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <Card className="bg-black/25 border-white/5 p-2 rounded-xl text-center flex flex-col justify-center">
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-black">Total</div>
                        <div className="text-base font-bold text-white mt-0.5">
                            {loading ? <span className="text-xs opacity-50">...</span> : stats.total}
                        </div>
                    </Card>
                    <Card className="bg-black/25 border border-emerald-500/10 p-2 rounded-xl text-center flex flex-col justify-center border-l-2 border-l-emerald-500">
                        <div className="text-[9px] uppercase tracking-wider text-emerald-500/60 font-black">Present</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">
                            {loading ? <span className="text-xs opacity-50">...</span> : stats.present}
                        </div>
                    </Card>
                    <Card className="bg-black/25 border border-red-500/10 p-2 rounded-xl text-center flex flex-col justify-center border-l-2 border-l-red-500">
                        <div className="text-[9px] uppercase tracking-wider text-red-500/60 font-black">Absent</div>
                        <div className="text-base font-bold text-red-400 mt-0.5">
                            {loading ? <span className="text-xs opacity-50">...</span> : stats.absent}
                        </div>
                    </Card>
                </div>

                {isHoliday && !viewStats ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-8 rounded-2xl text-center space-y-2 mt-4">
                        <CalendarDays className="w-8 h-8 mx-auto text-amber-400" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">Official School Holiday</h4>
                        <p className="text-[10px] text-amber-400/60 leading-normal">Attendance is locked for today.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Tab Switcher & Action Row */}
                        <div className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded-2xl p-2">
                            <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setViewStats(false)}
                                    className={cn(
                                        "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                        !viewStats ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/10" : "text-white/60 hover:text-white"
                                    )}
                                >
                                    Daily Roll Call
                                </button>
                                <button
                                    onClick={() => setViewStats(true)}
                                    className={cn(
                                        "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                        viewStats ? "bg-blue-500 text-white shadow-md shadow-blue-500/10" : "text-white/60 hover:text-white"
                                    )}
                                >
                                    Overall Stats
                                </button>
                            </div>

                            {/* Filters based on view mode */}
                            {viewStats ? (
                                <div className="flex items-center gap-1.5 justify-between">
                                    <Select value={statsMonth} onValueChange={setStatsMonth}>
                                        <SelectTrigger className="flex-1 h-8 bg-black/40 border-white/10 text-[10px] rounded-lg">
                                            <SelectValue placeholder="Select Month" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="ALL">Full Academic Year</SelectItem>
                                            {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => (
                                                <SelectItem key={m} value={m}>
                                                    {new Date(2000, Number(m) - 1).toLocaleString('default', { month: 'long' })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-white/10 text-[10px] uppercase font-black tracking-wider rounded-lg"
                                        onClick={handlePrint}
                                    >
                                        <Printer className="w-3.5 h-3.5 mr-1" /> Print
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/30" />
                                    <Input
                                        placeholder="Quick search student name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-8 bg-black/40 border-white/10 text-xs rounded-lg"
                                    />
                                </div>
                            )}
                        </div>

                        {/* List Area */}
                        {loading ? (
                            <div className="py-12 flex justify-center bg-transparent"><Loader2 className="animate-spin text-emerald-500 w-8 h-8" /></div>
                        ) : viewStats ? (
                            /* Mobile Stats List */
                            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                                {statsData.length === 0 ? (
                                    <div className="text-center py-8 text-[11px] text-white/40 italic">No historical stats found.</div>
                                ) : (
                                    statsData.map((s: any, idx: number) => (
                                        <div key={s.id} className="p-2 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 shrink-0">
                                                    #{s.rollNumber || idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white truncate text-xs">{s.studentName}</div>
                                                    <div className="text-[9px] text-white/40 mt-0.5">Present: {s.presentDays}/{s.totalDays} days</div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={cn(
                                                    "text-[10px] font-mono font-black",
                                                    Number(s.percentage) < 75 ? "text-red-400" : "text-emerald-400"
                                                )}>
                                                    {s.percentage}%
                                                </div>
                                                <div className="w-12 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full",
                                                            Number(s.percentage) < 75 ? "bg-red-500" : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${s.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Mobile Daily Attendance List with interactive P / A Dual Toggle */
                            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                                {filteredStudents.length === 0 ? (
                                    <div className="text-center py-8 text-[11px] text-white/40 italic">No matching students found.</div>
                                ) : (
                                    filteredStudents.map((s: any, idx: number) => {
                                        const isPresent = attendance[s.id] === 'P';
                                        return (
                                            <div
                                                key={s.id}
                                                className={cn(
                                                    "p-2 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                                                    isPresent ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono text-white/60 shrink-0">
                                                        #{s.rollNumber || idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white truncate text-xs leading-snug">{s.studentName}</div>
                                                        <div className="text-[9px] text-white/40 font-mono leading-none mt-0.5">{s.schoolId || "STUDENT"}</div>
                                                    </div>
                                                </div>

                                                {/* P / A Dual Click Toggle Button Pair */}
                                                <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded-lg shrink-0">
                                                    <button
                                                        onClick={() => attendance[s.id] !== 'P' && toggleStatus(s.id)}
                                                        className={cn(
                                                            "w-7 h-6 rounded-md text-[10px] font-black transition-all",
                                                            isPresent
                                                                ? "bg-emerald-500 text-black shadow"
                                                                : "text-white/30 hover:text-white"
                                                        )}
                                                    >
                                                        P
                                                    </button>
                                                    <button
                                                        onClick={() => attendance[s.id] !== 'A' && toggleStatus(s.id)}
                                                        className={cn(
                                                            "w-7 h-6 rounded-md text-[10px] font-black transition-all",
                                                            !isPresent
                                                                ? "bg-red-500 text-white shadow"
                                                                : "text-white/30 hover:text-white"
                                                        )}
                                                    >
                                                        A
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* Floating bottom status & save row for mobile */}
                        {!viewStats && (alreadyMarked || isModified) && (
                            <div className="bg-black/80 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-2xl backdrop-blur-md">
                                <span className="text-[10px] font-bold text-white/60">
                                    {isModified ? "Modified unsaved rows" : "All matches saved"}
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={submitting || !isModified}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-black uppercase tracking-wider py-1 px-4 rounded-lg"
                                >
                                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                    Save
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEWPORT (Wide, professional, feature-rich dashboard layout)      */}
            {/* ========================================================================= */}
            <div className="hidden lg:block space-y-6">
                {/* 3-Column Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-black/20 border-white/10 overflow-hidden rounded-[2rem]">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Total Students</div>
                                <div className="text-3xl font-bold mt-1">
                                    {loading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded" /> : stats.total}
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="bg-black/20 border-white/10 overflow-hidden rounded-[2rem] border-l-4 border-l-emerald-500">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Present Today</div>
                                <div className="text-3xl font-bold text-emerald-500 mt-1">
                                    {loading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded" /> : stats.present}
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Check className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                    <Card className="bg-black/20 border-white/10 overflow-hidden rounded-[2rem] border-l-4 border-l-red-500">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Absent Today</div>
                                <div className="text-3xl font-bold text-red-500 mt-1">
                                    {loading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded" /> : stats.absent}
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                                <X className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                </div>

                {isHoliday && !viewStats ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-10 rounded-[2rem] text-center space-y-4 max-w-lg mx-auto my-10 backdrop-blur-md shadow-2xl animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                            <CalendarDays className="w-10 h-10" />
                        </div>
                        <h3 className="text-3xl font-display font-bold">Holiday</h3>
                        <p className="text-sm uppercase tracking-widest font-black opacity-60">Classes dismissed. Attendance locked.</p>
                    </div>
                ) : (
                    <Card className="bg-black/20 border-white/10 shadow-2xl rounded-[2rem]">
                        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4 items-center">
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewStats(false)}
                                    className={cn(
                                        "rounded-lg px-4 h-9 font-bold text-xs uppercase tracking-wider transition-all",
                                        !viewStats ? "bg-emerald-500/20 text-emerald-500 hover:text-emerald-400" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Daily View
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewStats(true)}
                                    className={cn(
                                        "rounded-lg px-4 h-9 font-bold text-xs uppercase tracking-wider transition-all",
                                        viewStats ? "bg-blue-500/20 text-blue-500 hover:text-blue-400" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Overall Stats
                                </Button>

                                {viewStats && (
                                    <>
                                        <Select value={statsMonth} onValueChange={setStatsMonth}>
                                            <SelectTrigger className="w-[180px] h-9 bg-transparent border-white/10 text-xs font-bold rounded-lg ml-2">
                                                <SelectValue placeholder="Period" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="ALL">Full Academic Year</SelectItem>
                                                <SelectItem value="01">January</SelectItem>
                                                <SelectItem value="02">February</SelectItem>
                                                <SelectItem value="03">March</SelectItem>
                                                <SelectItem value="04">April</SelectItem>
                                                <SelectItem value="05">May</SelectItem>
                                                <SelectItem value="06">June</SelectItem>
                                                <SelectItem value="07">July</SelectItem>
                                                <SelectItem value="08">August</SelectItem>
                                                <SelectItem value="09">September</SelectItem>
                                                <SelectItem value="10">October</SelectItem>
                                                <SelectItem value="11">November</SelectItem>
                                                <SelectItem value="12">December</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 border-white/10 hover:bg-white/5 gap-2 px-4 rounded-lg text-xs font-bold"
                                            onClick={handlePrint}
                                        >
                                            <Printer className="w-4 h-4" /> Print Report
                                        </Button>
                                    </>
                                )}
                            </div>

                            {!viewStats && (
                                <div className="relative flex-1 w-full md:max-w-xs">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search students..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-10 bg-black/40 border-white/10 w-full rounded-xl text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        <CardContent className="p-6">
                            <DataTable
                                data={viewStats ? statsData : filteredStudents}
                                isLoading={loading}
                                columns={viewStats ? [
                                    {
                                        key: "rollNumber",
                                        header: "Roll",
                                        render: (s: any, idx?: number) => (
                                            <span className="font-mono text-sm font-semibold">{s.rollNumber || (idx ?? 0) + 1}</span>
                                        )
                                    },
                                    {
                                        key: "studentName",
                                        header: "Student Name",
                                        render: (s: any) => (
                                            <div>
                                                <div className="font-bold text-white text-sm">{s.studentName}</div>
                                                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider mt-0.5">{s.schoolId}</div>
                                            </div>
                                        )
                                    },
                                    {
                                        key: "totalDays",
                                        header: "Total Days",
                                        cellClassName: "text-center",
                                        render: (s: any) => <span className="font-mono font-medium">{s.totalDays}</span>
                                    },
                                    {
                                        key: "presentDays",
                                        header: "Present Days",
                                        cellClassName: "text-center",
                                        render: (s: any) => <span className="font-bold text-emerald-400 font-mono">{s.presentDays}</span>
                                    },
                                    {
                                        key: "percentage",
                                        header: "Attendance %",
                                        cellClassName: "text-center",
                                        render: (s: any) => (
                                            <div className="flex flex-col items-center min-w-[100px] justify-center mx-auto">
                                                <span className={`font-bold font-mono text-sm ${Number(s.percentage) < 75 ? "text-red-400" : "text-emerald-400"}`}>
                                                    {s.percentage}%
                                                </span>
                                                <div className="w-full h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden max-w-[80px]">
                                                    <div
                                                        className={`h-full ${Number(s.percentage) < 75 ? "bg-red-500" : "bg-emerald-500"}`}
                                                        style={{ width: `${s.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        key: "statsStatus",
                                        header: "Status",
                                        cellClassName: "text-right",
                                        render: (s: any) => (
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5",
                                                Number(s.percentage) < 75 ? "text-red-400 border-red-500/30 bg-red-500/5" : "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                                            )}>
                                                {Number(s.percentage) < 75 ? "Low" : "Good"}
                                            </Badge>
                                        )
                                    }
                                ] : [
                                    {
                                        key: "rollNumber",
                                        header: "Roll Number",
                                        render: (s: any, idx?: number) => (
                                            <span className="font-mono text-sm font-semibold">{s.rollNumber || (idx ?? 0) + 1}</span>
                                        )
                                    },
                                    {
                                        key: "studentName",
                                        header: "Student Name",
                                        render: (s: any) => (
                                            <div>
                                                <div className="font-bold text-white text-sm">{s.studentName}</div>
                                                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider mt-0.5">{s.schoolId}</div>
                                            </div>
                                        )
                                    },
                                    {
                                        key: "attendanceStatus",
                                        header: "Roll Status",
                                        cellClassName: "text-center",
                                        render: (s: any) => (
                                            <Badge className={cn(
                                                "font-black uppercase tracking-wider text-[9px] px-3 py-1",
                                                attendance[s.id] === 'P' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                            )}>
                                                {attendance[s.id] === 'P' ? "Present" : "Absent"}
                                            </Badge>
                                        )
                                    },
                                    {
                                        key: "action",
                                        header: "Marking Actions",
                                        cellClassName: "text-right",
                                        render: (s: any) => (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={cn(
                                                        "h-8 text-[10px] font-black uppercase tracking-wider px-3 rounded-lg border-white/5",
                                                        attendance[s.id] === 'P'
                                                            ? "bg-emerald-500 text-black border-transparent hover:bg-emerald-600 hover:text-black"
                                                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                                    )}
                                                    onClick={() => attendance[s.id] !== 'P' && toggleStatus(s.id)}
                                                >
                                                    P
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={cn(
                                                        "h-8 text-[10px] font-black uppercase tracking-wider px-3 rounded-lg border-white/5",
                                                        attendance[s.id] === 'A'
                                                            ? "bg-red-500 text-white border-transparent hover:bg-red-600 hover:text-white"
                                                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                                    )}
                                                    onClick={() => attendance[s.id] !== 'A' && toggleStatus(s.id)}
                                                >
                                                    A
                                                </Button>
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Desktop Save controls footer bar */}
                {!viewStats && !isHoliday && (
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-[2rem] border border-white/10 shadow-xl">
                        <div className="text-sm text-muted-foreground font-medium">
                            {alreadyMarked
                                ? (isModified ? "You have modified unsaved rows. Please hit save." : `Attendance registered successfully.`)
                                : "Awaiting submission."
                            }
                        </div>
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={submitting || (alreadyMarked && !isModified)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 rounded-xl transition-all shadow-md shadow-emerald-500/10 min-w-[220px]"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            {alreadyMarked ? "Update Records" : "Submit Attendance"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
