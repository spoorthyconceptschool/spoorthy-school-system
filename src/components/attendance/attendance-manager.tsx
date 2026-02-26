
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
    const { user } = useAuth();
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

    const fetchStats = async () => {
        if (!classId || !sectionId) return;
        setLoading(true);
        try {
            // 1. Fetch Students for this class/section first
            const sQ = query(
                collection(db, "students"),
                where("classId", "==", classId),
                where("sectionId", "==", sectionId),
                where("status", "==", "ACTIVE")
            );
            const sSnap = await getDocs(sQ);
            const sList = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
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
                // 1. Fetch Students for this class/section locally
                const sQ = query(
                    collection(db, "students"),
                    where("classId", "==", classId),
                    where("sectionId", "==", sectionId),
                    where("status", "==", "ACTIVE")
                );
                const sSnap = await getDocs(sQ);
                const sList = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
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
                    where("status", "==", "APPROVED")
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
        setSubmitting(true);
        try {
            const res = await fetch("/api/attendance/mark", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

            toast({
                title: alreadyMarked ? "Attendance Updated" : "Attendance Submitted",
                description: `Updated ${data.changesCount || 0}. Sent ${data.notifCount || 0} notifications.${data.skippedCount ? ` (${data.skippedCount} users have no account)` : ''}`,
                type: "success"
            });

            setAlreadyMarked(true);
            setIsModified(false);
            setTouched(new Set());
        } catch (e: any) {
            console.error(e);
            toast({ title: "Failed", description: e.message, type: "error" });
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
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-black/20 border-white/10 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Total Students</div>
                            <div className="text-2xl font-bold">{loading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded" /> : stats.total}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
                <Card className="bg-black/20 border-white/10 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-l-4 border-emerald-500">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Present</div>
                            <div className="text-2xl font-bold text-emerald-500">{loading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded" /> : stats.present}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Check className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
                <Card className="bg-black/20 border-white/10 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-l-4 border-red-500">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Absent</div>
                            <div className="text-2xl font-bold text-red-500">{loading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded" /> : stats.absent}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <X className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* List */}
            <Card className="bg-black/20 border-white/10">
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewStats(false)}
                            className={!viewStats ? "bg-emerald-500/20 text-emerald-500" : "text-muted-foreground hover:text-white"}
                        >
                            Daily View
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewStats(true)}
                            className={viewStats ? "bg-blue-500/20 text-blue-500" : "text-muted-foreground hover:text-white"}
                        >
                            Overall Stats
                        </Button>

                        {viewStats && (
                            <>
                                <Select value={statsMonth} onValueChange={setStatsMonth}>
                                    <SelectTrigger className="w-[140px] h-8 bg-transparent border-white/10 text-xs">
                                        <SelectValue placeholder="Period" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10">
                                        <SelectItem value="ALL">Full Year {new Date().getFullYear()}</SelectItem>
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
                                    className="h-8 border-white/10 hover:bg-white/5 gap-2 px-3"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-3 h-3" /> Print Report
                                </Button>
                            </>
                        )}
                    </div>

                    {!viewStats && (
                        <div className="relative flex-1 w-full md:max-w-xs">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 bg-black/40 border-white/10 w-full"
                            />
                        </div>
                    )}
                </div>

                <CardContent className="p-0">
                    <DataTable
                        data={viewStats ? statsData : filteredStudents}
                        isLoading={loading}
                        columns={viewStats ? [
                            {
                                key: "rollNumber",
                                header: "Roll",
                                render: (s: any, idx?: number) => (
                                    <span className="font-mono text-sm">{s.rollNumber || (idx ?? 0) + 1}</span>
                                )
                            },
                            {
                                key: "studentName",
                                header: "Student Name",
                                render: (s: any) => (
                                    <div>
                                        <div className="font-medium text-white">{s.studentName}</div>
                                        <div className="text-[10px] text-white/40 uppercase">{s.schoolId}</div>
                                    </div>
                                )
                            },
                            {
                                key: "totalDays",
                                header: "Total",
                                cellClassName: "text-center",
                                render: (s: any) => <span className="font-mono">{s.totalDays}</span>
                            },
                            {
                                key: "presentDays",
                                header: "Present",
                                cellClassName: "text-center",
                                render: (s: any) => <span className="font-bold text-emerald-400">{s.presentDays}</span>
                            },
                            {
                                key: "percentage",
                                header: "Attendance %",
                                cellClassName: "text-center",
                                render: (s: any) => (
                                    <div className="flex flex-col items-center min-w-[80px]">
                                        <span className={`font-bold ${Number(s.percentage) < 75 ? "text-red-400" : "text-emerald-400"}`}>
                                            {s.percentage}%
                                        </span>
                                        <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden max-w-[60px]">
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
                                        "text-[8px] uppercase font-black tracking-tighter",
                                        Number(s.percentage) < 75 ? "text-red-400 border-red-500/30" : "text-emerald-400 border-emerald-500/30"
                                    )}>
                                        {Number(s.percentage) < 75 ? "Low" : "Good"}
                                    </Badge>
                                )
                            }
                        ] : [
                            {
                                key: "rollNumber",
                                header: "Roll",
                                render: (s: any, idx?: number) => (
                                    <span className="font-mono text-sm">{s.rollNumber || (idx ?? 0) + 1}</span>
                                )
                            },
                            {
                                key: "studentName",
                                header: "Student Name",
                                render: (s: any) => (
                                    <div>
                                        <div className="font-medium text-white">{s.studentName}</div>
                                        <div className="text-[10px] text-white/40 uppercase">{s.schoolId}</div>
                                    </div>
                                )
                            },
                            {
                                key: "attendanceStatus",
                                header: "Status",
                                cellClassName: "text-center",
                                render: (s: any) => (
                                    <Badge className={cn(
                                        "font-black uppercase tracking-tighter text-[9px]",
                                        attendance[s.id] === 'P' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                    )}>
                                        {attendance[s.id] === 'P' ? "Present" : "Absent"}
                                    </Badge>
                                )
                            },
                            {
                                key: "action",
                                header: "Action",
                                cellClassName: "text-right",
                                render: (s: any) => (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className={cn(
                                            "h-8 text-[10px] font-black uppercase tracking-tighter px-3 rounded-lg",
                                            attendance[s.id] === 'P'
                                                ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                        )}
                                        onClick={() => toggleStatus(s.id)}
                                    >
                                        {attendance[s.id] === 'P' ? "Mark Absent" : "Mark Present"}
                                    </Button>
                                )
                            }
                        ]}
                    />
                </CardContent>
            </Card>

            {!viewStats && (
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="text-sm text-muted-foreground">
                        {alreadyMarked
                            ? (isModified ? "You have unsaved changes." : `Attendance already marked by ${user?.uid === "admin" ? "Admin" : "Teacher"}`)
                            : "Ready to submit."
                        }
                    </div>
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={submitting || (alreadyMarked && !isModified)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {alreadyMarked ? "Update Attendance" : "Submit Attendance"}
                    </Button>
                </div>
            )}
        </div>
    );
}
