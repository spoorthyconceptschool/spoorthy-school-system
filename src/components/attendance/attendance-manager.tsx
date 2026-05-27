
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
    const DEFAULT_STUDENTS = [
        { id: "std_1", rollNumber: 1, studentName: "Aarav Sharma", schoolId: "SCH-001", status: "ACTIVE", parentMobile: "+91 99887 76655", gender: "MALE" },
        { id: "std_2", rollNumber: 2, studentName: "Ananya Reddy", schoolId: "SCH-002", status: "ACTIVE", parentMobile: "+91 88776 65544", gender: "FEMALE" },
        { id: "std_3", rollNumber: 3, studentName: "Vihaan Patel", schoolId: "SCH-003", status: "ACTIVE", parentMobile: "+91 77665 54433", gender: "MALE" },
        { id: "std_4", rollNumber: 4, studentName: "Sai Kumar", schoolId: "SCH-004", status: "ACTIVE", parentMobile: "+91 66554 43322", gender: "MALE" },
        { id: "std_5", rollNumber: 5, studentName: "Diya Sen", schoolId: "SCH-005", status: "ACTIVE", parentMobile: "+91 55443 32211", gender: "FEMALE" }
    ];

    const DEFAULT_ATTENDANCE = {
        "std_1": "P",
        "std_2": "P",
        "std_3": "P",
        "std_4": "P",
        "std_5": "P"
    } as any;

    const { classes, branding, students: globalStudents } = useMasterData();

    const date = defaultDate || new Date().toISOString().split('T')[0];

    const [students, setStudents] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_STUDENTS;
        const cached = localStorage.getItem(`attendance_students_${classId}_${sectionId}`);
        return cached ? JSON.parse(cached) : DEFAULT_STUDENTS;
    });
    const [attendance, setAttendance] = useState<Record<string, 'P' | 'A'>>(() => {
        if (typeof window === 'undefined') return DEFAULT_ATTENDANCE;
        const cached = localStorage.getItem(`attendance_records_${classId}_${sectionId}_${date}`);
        return cached ? JSON.parse(cached) : DEFAULT_ATTENDANCE;
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyMarked, setAlreadyMarked] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(`attendance_already_marked_${classId}_${sectionId}_${date}`) === "true";
    });
    const [isModified, setIsModified] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStats, setViewStats] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [statsMonth, setStatsMonth] = useState<string>("ALL");

    const [holidays, setHolidays] = useState<any[]>([]);
    const [isHoliday, setIsHoliday] = useState(false);

    useEffect(() => {
        let isM = true;
        const fetchH = async () => {
            try {
                const q = query(
                    collection(db, "notices"), 
                    where("type", "==", "HOLIDAY")
                );
                const snap = await getDocs(q);
                if (isM) {
                    const filtered = snap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter((h: any) => h.schoolId === "global" || h.schoolId === userData?.schoolId);
                    setHolidays(filtered);
                }
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

    const fetchStats = async (quiet = false) => {
        if (!classId || !sectionId) return;
        if (!quiet) setLoading(true);
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
                .sort((a: any, b: any) => (a.rollNumber || 0) - (b.rollNumber || 0));
            setStudents(sList);

            // 2. Fetch Attendance and filter locally to bypass complex indices and document ID issues
            const q = query(
                collection(db, "attendance_daily"),
                where("classId", "==", classId),
                where("sectionId", "==", sectionId)
            );
            const snap = await getDocs(q);
            const studentStats: Record<string, { total: number, present: number }> = {};
            const currentYear = new Date().getFullYear().toString();

            snap.docs.forEach((doc) => {
                const data = doc.data();
                const docDate = data.date; // e.g. "2026-05-24"
                if (!docDate || !docDate.startsWith(currentYear)) return;

                if (statsMonth !== "ALL") {
                    if (!docDate.startsWith(`${currentYear}-${statsMonth}`)) return;
                }

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
            if (!quiet) setLoading(false);
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
            const hasCache = typeof window !== 'undefined' && localStorage.getItem(`attendance_students_${classId}_${sectionId}`);
            if (!hasCache) {
                setLoading(true);
            }
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
                    .sort((a: any, b: any) => (a.rollNumber || 0) - (b.rollNumber || 0));

                if (isMounted) {
                    setStudents(sList);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(`attendance_students_${classId}_${sectionId}`, JSON.stringify(sList));
                    }
                }

                if (sList.length === 0) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch Leaves
                const lQuery = query(
                    collection(db, "student_leaves"),
                    where("classId", "==", classId)
                );

                const attId = `${date}_${classId}_${sectionId}`;

                const lSnap = await getDocs(lQuery);
                const absentIds = new Set<string>();
                lSnap.forEach(ld => {
                    const l = ld.data();
                    if (l.status === "APPROVED" && l.schoolId === (userData?.schoolId || "global")) {
                        if (l.fromDate <= date && l.toDate >= date) {
                            if (!l.sectionId || l.sectionId === sectionId) {
                                absentIds.add(l.studentId);
                            }
                        }
                    }
                });

                unsubAttendance = onSnapshot(doc(db, "attendance_daily", attId), (attSnap) => {
                    if (!isMounted) return;
                    if (attSnap.exists()) {
                        setAlreadyMarked(true);
                        const loaded = attSnap.data().records || {};
                        const merged: Record<string, 'P' | 'A'> = {};
                        sList.forEach((s: any) => {
                            merged[s.id] = loaded[s.id] || 'P';
                        });
                        setAttendance(merged);
                        if (typeof window !== 'undefined') {
                            localStorage.setItem(`attendance_records_${classId}_${sectionId}_${date}`, JSON.stringify(merged));
                            localStorage.setItem(`attendance_already_marked_${classId}_${sectionId}_${date}`, "true");
                        }
                    } else {
                        setAlreadyMarked(false);
                        const initial: Record<string, 'P' | 'A'> = {};
                        sList.forEach((s: any) => {
                            const isOnLeave = absentIds.has(s.id) || (s.schoolId && absentIds.has(s.schoolId));
                            initial[s.id] = isOnLeave ? 'A' : 'P';
                        });
                        setAttendance(initial);
                        if (typeof window !== 'undefined') {
                            localStorage.setItem(`attendance_records_${classId}_${sectionId}_${date}`, JSON.stringify(initial));
                            localStorage.setItem(`attendance_already_marked_${classId}_${sectionId}_${date}`, "false");
                        }
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
        setAttendance(prev => {
            const currentVal = prev[studentId] || 'P';
            return {
                ...prev,
                [studentId]: currentVal === 'P' ? 'A' : 'P'
            };
        });
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

        // INSTANT OPTIMISTIC UI UPDATE (Zero Latency)
        setAlreadyMarked(true);
        setIsModified(false);
        setTouched(new Set());
        setSubmitting(false); // Zero latency, no loading indicators or disabled states

        toast({
            title: prevAlreadyMarked ? "Attendance Updated" : "Attendance Saved",
            description: "Saved successfully.",
            type: "success"
        });

        // Instant local stats recalculation quietly
        fetchStats(true);

        // Perform Firestore REST synchronization asynchronously in the background
        (async () => {
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
                        isModification: prevAlreadyMarked,
                        touchedIds: Array.from(prevTouched)
                    })
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.error);
                console.log(`[Optimistic Attendance] Synced successfully.`);
            } catch (e: any) {
                console.error("[Optimistic Attendance] Background sync failed, reverting:", e);
                // Revert state quietly on sync error
                setAlreadyMarked(prevAlreadyMarked);
                setIsModified(prevIsModified);
                setTouched(prevTouched);
                toast({ title: "Sync Error", description: "Offline sync failed. Please try again.", type: "error" });
            }
        })();
    };

    // SEARCH FILTER
    const filteredStudents = students.filter(s =>
        (s.studentName || s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.schoolId && s.schoolId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.rollNumber && String(s.rollNumber).includes(searchQuery))
    );

    const stats = {
        total: students.length,
        present: students.filter(s => (attendance[s.id] || 'P') === 'P').length,
        absent: students.filter(s => (attendance[s.id] || 'P') === 'A').length
    };

    return (
        <div className="w-full text-[#E6F1FF]">
            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT (Optimized, High-density, Touch-ready list & dual buttons) */}
            {/* ========================================================================= */}
            <div className="lg:hidden block space-y-4">
                {/* 3-Column Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-[#0b172c] border-[#1e293b] p-3 rounded-2xl flex flex-col justify-center shadow-none relative overflow-hidden">
                        <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Total</div>
                        <div className="text-2xl font-black text-blue-500">
                            {loading ? <span className="text-xs opacity-50">...</span> : stats.total}
                        </div>
                        <div className="absolute right-3 top-3 text-blue-500">
                            <Users className="w-5 h-5" />
                        </div>
                    </Card>
                    <Card className="bg-[#0b172c] border-[#1e293b] p-3 rounded-2xl flex flex-col justify-center shadow-none relative overflow-hidden">
                        <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Present</div>
                        <div className="text-2xl font-black text-[#10B981]">
                            {loading ? <span className="text-xs opacity-50">...</span> : stats.present}
                        </div>
                        <div className="absolute right-3 top-3 text-[#10B981]">
                            <Check className="w-5 h-5" />
                        </div>
                    </Card>
                    <Card className="bg-[#0b172c] border-[#1e293b] p-3 rounded-2xl flex flex-col justify-center shadow-none relative overflow-hidden">
                        <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Absent</div>
                        <div className="text-2xl font-black text-red-500">
                            {loading ? <span className="text-xs opacity-50">...</span> : stats.absent}
                        </div>
                        <div className="absolute right-3 top-3 text-red-500">
                            <User className="w-5 h-5" />
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
                    <div className="space-y-4">
                        {/* Tab Switcher */}
                        <div className="flex bg-[#0b172c] p-1 rounded-xl border border-[#1e293b]">
                            <button
                                onClick={() => setViewStats(false)}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                    !viewStats ? "bg-[#10B981] text-white shadow-md" : "text-white/50 hover:text-white"
                                )}
                            >
                                Daily Roll Call
                            </button>
                            <button
                                onClick={() => setViewStats(true)}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                    viewStats ? "bg-[#10B981] text-white shadow-md" : "text-white/50 hover:text-white"
                                )}
                            >
                                Overall Stats
                            </button>
                        </div>

                        {/* Search / Filters Row */}
                        {viewStats ? (
                            <div className="flex items-center gap-2">
                                <Select value={statsMonth} onValueChange={setStatsMonth}>
                                    <SelectTrigger className="flex-1 h-10 bg-[#0b172c] border-[#1e293b] text-xs font-bold rounded-xl shadow-none">
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0b172c] border-[#1e293b] text-white rounded-2xl">
                                        <SelectItem value="ALL" className="font-bold text-xs py-2">Full Academic Year</SelectItem>
                                        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => (
                                            <SelectItem key={m} value={m} className="font-bold text-xs py-2">
                                                {new Date(2000, Number(m) - 1).toLocaleString('default', { month: 'long' })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 bg-[#0b172c] border-[#1e293b] text-white text-xs font-bold rounded-xl shadow-none"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-4 h-4 mr-1" /> Print
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                                <Input
                                    placeholder="Quick search student name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10 bg-[#0b172c] border-[#1e293b] text-sm font-medium text-white rounded-xl shadow-none placeholder:text-white/30"
                                />
                            </div>
                        )}

                        {/* List Area */}
                        {loading ? (
                            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-[#10B981] w-8 h-8" /></div>
                        ) : viewStats ? (
                            /* Mobile Stats List */
                            <div className="space-y-2 pb-24">
                                {statsData.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-white/40 italic">No historical stats found.</div>
                                ) : (
                                    statsData.map((s: any, idx: number) => (
                                        <div key={s.id} className="p-3 bg-[#0b172c] border border-[#1e293b] rounded-2xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#053d2c] text-[#10B981] font-mono font-black text-xs shrink-0">
                                                    #{s.rollNumber || idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white truncate text-sm">{s.studentName}</div>
                                                    <div className="text-[10px] font-mono text-white/40 mt-0.5 tracking-wider">{s.schoolId}</div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={cn(
                                                    "text-sm font-black",
                                                    Number(s.percentage) < 75 ? "text-red-500" : "text-[#10B981]"
                                                )}>
                                                    {s.percentage}%
                                                </div>
                                                <div className="text-[9px] text-white/40 font-bold uppercase mt-0.5">{s.presentDays}/{s.totalDays} Days</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Mobile Daily Attendance List */
                            <div className="space-y-2 pb-6">
                                {filteredStudents.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-white/40 italic">No matching students found.</div>
                                ) : (
                                    filteredStudents.map((s: any, idx: number) => {
                                        const isPresent = (attendance[s.id] || 'P') === 'P';
                                        return (
                                            <div
                                                key={s.id}
                                                className="p-3 rounded-2xl bg-[#0b172c] border border-[#1e293b] flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="text-[#10B981] font-black text-xs shrink-0 w-5 text-center">
                                                        #{s.rollNumber || idx + 1}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-white/5 flex items-center justify-center text-white font-black text-[10px] uppercase shrink-0">
                                                        {(s.studentName || "S").split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white text-sm truncate">{s.studentName}</div>
                                                        <div className="text-[10px] text-white/40 font-mono mt-0.5">{s.schoolId || "PENDING"}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 bg-[#070F1E] p-1 rounded-xl">
                                                    <button
                                                        onClick={() => (attendance[s.id] || 'P') !== 'P' && toggleStatus(s.id)}
                                                        className={cn(
                                                            "w-9 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center",
                                                            isPresent
                                                                ? "bg-[#10B981] text-white shadow-lg shadow-emerald-500/25"
                                                                : "text-white/30 hover:text-white"
                                                        )}
                                                    >
                                                        P
                                                    </button>
                                                    <button
                                                        onClick={() => (attendance[s.id] || 'P') !== 'A' && toggleStatus(s.id)}
                                                        className={cn(
                                                            "w-9 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center",
                                                            !isPresent
                                                                ? "bg-[#EF4444] text-white shadow-lg shadow-red-500/25"
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

                                {/* Static inline save row at the bottom of the list for mobile */}
                                <div className="mt-4 p-3 bg-[#0b172c] border border-white/5 rounded-2xl flex items-center justify-between shadow-none animate-in fade-in duration-300">
                                    <span className="text-xs font-bold text-white/60">
                                        {!alreadyMarked ? "Daily Roll Call" : (isModified ? "Changes pending" : "All saved")}
                                    </span>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting || (alreadyMarked && !isModified)}
                                        className="bg-[#10B981] hover:bg-emerald-600 text-black text-xs font-black uppercase tracking-widest px-6 h-10 rounded-xl transition-all"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        {alreadyMarked ? "Update" : "Save"}
                                    </Button>
                                </div>
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
                                                (attendance[s.id] || 'P') === 'P' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                            )}>
                                                {(attendance[s.id] || 'P') === 'P' ? "Present" : "Absent"}
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
                                                        (attendance[s.id] || 'P') === 'P'
                                                            ? "bg-[#10B981] text-black border-transparent hover:bg-emerald-600 hover:text-black"
                                                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                                    )}
                                                    onClick={() => (attendance[s.id] || 'P') !== 'P' && toggleStatus(s.id)}
                                                >
                                                    P
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={cn(
                                                        "h-8 text-[10px] font-black uppercase tracking-wider px-3 rounded-lg border-white/5",
                                                        (attendance[s.id] || 'P') === 'A'
                                                            ? "bg-red-500 text-white border-transparent hover:bg-red-600 hover:text-white"
                                                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                                    )}
                                                    onClick={() => (attendance[s.id] || 'P') !== 'A' && toggleStatus(s.id)}
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
