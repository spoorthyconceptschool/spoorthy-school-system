
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Save, UserX, Search, Download, Printer, Users } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { BarChart3, User, CalendarDays, FileText } from "lucide-react";
import { documentId } from "firebase/firestore";
import { useMasterData } from "@/context/MasterDataContext";

export default function TeacherAttendanceManager({
    defaultDate
}: {
    defaultDate?: string;
}) {
    const { user } = useAuth();
    const { branding, teachers: globalTeachers } = useMasterData();

    // Memoize the mapped teacher list to prevent unnecessary re-renders/re-fetches
    const [teachers, setTeachers] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, 'P' | 'A'>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyMarked, setAlreadyMarked] = useState(false);
    const [isModified, setIsModified] = useState(false);
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [leavesMap, setLeavesMap] = useState<Record<string, boolean>>({}); // schoolId -> true if on leave
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStats, setViewStats] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [statsMonth, setStatsMonth] = useState<string>("ALL"); // ALL or "01", "02", etc.

    const date = defaultDate || new Date().toISOString().split('T')[0];

    const fetchStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch Teachers first
            const tQ = query(collection(db, "teachers"), where("status", "==", "ACTIVE"));
            const tSnap = await getDocs(tQ);
            const tList = tSnap.docs.map(d => ({
                id: d.id,
                schoolId: d.data().schoolId || d.id,
                name: d.data().name,
                uid: d.data().uid
            })).sort((a, b) => a.name.localeCompare(b.name));
            setTeachers(tList);

            // 2. Fetch Attendance in range
            const currentYear = new Date().getFullYear();
            let startKey, endKey;

            if (statsMonth === "ALL") {
                startKey = `TEACHERS_${currentYear}-01-01`;
                endKey = `TEACHERS_${currentYear}-12-31`;
            } else {
                startKey = `TEACHERS_${currentYear}-${statsMonth}-01`;
                endKey = `TEACHERS_${currentYear}-${statsMonth}-31`;
            }

            const q = query(
                collection(db, "attendance"),
                where(documentId(), ">=", startKey),
                where(documentId(), "<=", endKey)
            );
            const snap = await getDocs(q);
            const teacherStats: Record<string, { total: number, present: number }> = {};

            snap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.records) {
                    Object.entries(data.records).forEach(([tid, status]: [string, any]) => {
                        if (!teacherStats[tid]) teacherStats[tid] = { total: 0, present: 0 };
                        if (status === 'P' || status === 'A') {
                            teacherStats[tid].total++;
                            if (status === 'P') teacherStats[tid].present++;
                        }
                    });
                }
            });

            const data = tList.map(t => {
                const st = teacherStats[t.schoolId] || { total: 0, present: 0 };
                return {
                    ...t,
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
        const period = statsMonth === "ALL" ? `Annual Report ${new Date().getFullYear()}` : `Monthly Report - ${new Date(2000, Number(statsMonth) - 1).toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;

        const html = `
            <html>
            <head>
                <title>Teacher Attendance Report - ${period}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    .header { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .logo { height: 80px; width: auto; object-fit: contain; }
                    .header-text { text-align: left; }
                    h1 { margin: 0; font-size: 28px; }
                    .period { font-size: 14px; color: #666; margin-top: 2px; }
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
                        <div class="period">Teacher Attendance - ${period}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            <th>Teacher Name</th>
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
                                <td>${idx + 1}</td>
                                <td class="font-bold">${s.name}</td>
                                <td class="text-center">${s.schoolId}</td>
                                <td class="text-center">${s.totalDays}</td>
                                <td class="text-center" style="color: #28a745; font-weight: bold;">${s.presentDays}</td>
                                <td class="text-center">${s.totalDays - s.presentDays}</td>
                                <td class="text-center percentage ${Number(s.percentage) < 80 ? 'low' : 'good'}">${s.percentage}%</td>
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

    const fetchDailyData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Teachers locally
            const tQ = query(collection(db, "teachers"), where("status", "==", "ACTIVE"));
            const tSnap = await getDocs(tQ);
            const tList = tSnap.docs.map(d => ({
                id: d.id,
                schoolId: d.data().schoolId || d.id,
                name: d.data().name,
                uid: d.data().uid
            })).sort((a, b) => a.name.localeCompare(b.name));
            setTeachers(tList);

            if (tList.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch Leaves and Attendance
            const lQuery = query(
                collection(db, "leave_requests"),
                where("status", "==", "APPROVED")
            );

            const attId = `TEACHERS_${date}`;

            const [lSnap, attSnap] = await Promise.all([
                getDocs(lQuery),
                getDoc(doc(db, "attendance", attId))
            ]);

            const leaveMap: Record<string, boolean> = {}; // using schoolId as key
            const uidToSchoolId: Record<string, string> = {};
            tList.forEach(t => { if (t.uid) uidToSchoolId[t.uid] = t.schoolId; });

            lSnap.forEach(doc => {
                const l = doc.data();
                if (l.fromDate <= date && l.toDate >= date) {
                    const sid = uidToSchoolId[l.teacherId];
                    if (sid) leaveMap[sid] = true;
                }
            });
            setLeavesMap(leaveMap);

            if (attSnap.exists()) {
                setAlreadyMarked(true);
                setAttendance(attSnap.data().records || {});
            } else {
                setAlreadyMarked(false);
                const initial: Record<string, 'P' | 'A'> = {};
                tList.forEach((t: any) => {
                    const isOnLeave = leaveMap[t.schoolId];
                    initial[t.schoolId] = isOnLeave ? 'A' : 'P';
                });
                setAttendance(initial);
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: "Failed to fetch data.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewStats) {
            fetchStats();
        } else {
            fetchDailyData();
        }
    }, [date, viewStats, statsMonth]);

    const toggleStatus = (schoolId: string) => {
        setAttendance(prev => ({
            ...prev,
            [schoolId]: prev[schoolId] === 'P' ? 'A' : 'P'
        }));
        setTouched(prev => {
            const next = new Set(prev);
            next.add(schoolId);
            return next;
        });
        setIsModified(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/attendance/teachers/mark", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date,
                    records: attendance,
                    markedBy: user?.uid,
                    markedByName: user?.displayName || "Admin",
                    isModification: alreadyMarked,
                    touchedIds: Array.from(touched)
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            toast({
                title: alreadyMarked ? "Attendance Updated" : "Attendance Submitted",
                description: `Updated ${data.changesCount || 0} records.`,
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

    // Filter Teachers
    const filteredTeachers = teachers.filter(t =>
        (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.schoolId || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: teachers.length,
        present: Object.values(attendance).filter(v => v === 'P').length,
        absent: Object.values(attendance).filter(v => v === 'A').length
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-black/20 border-white/10 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase font-black opacity-50 tracking-tighter">Total Teachers</div>
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
                            <div className="text-xs text-muted-foreground uppercase font-black opacity-50 tracking-tighter">Present</div>
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
                            <div className="text-xs text-muted-foreground uppercase font-black opacity-50 tracking-tighter">Absent</div>
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
                    <div className="flex flex-wrap bg-black/40 p-1 rounded-lg border border-white/10 items-center gap-2">
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
                                placeholder="Search teachers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 bg-black/40 border-white/10 w-full"
                            />
                        </div>
                    )}
                </div>

                <CardContent className="p-0">
                    <DataTable
                        data={viewStats ? statsData : filteredTeachers}
                        isLoading={loading}
                        columns={viewStats ? [
                            {
                                key: "index",
                                header: "#",
                                render: (_: any, idx?: number) => <span className="font-mono text-sm">{(idx ?? 0) + 1}</span>
                            },
                            {
                                key: "name",
                                header: "Teacher Name",
                                render: (s: any) => (
                                    <div>
                                        <div className="font-medium text-white">{s.name}</div>
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
                                        <span className={`font-bold ${Number(s.percentage) < 80 ? "text-red-400" : "text-emerald-400"}`}>
                                            {s.percentage}%
                                        </span>
                                        <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden max-w-[60px]">
                                            <div
                                                className={`h-full ${Number(s.percentage) < 80 ? "bg-red-500" : "bg-emerald-500"}`}
                                                style={{ width: `${s.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: "leaves",
                                header: "Leaves",
                                cellClassName: "text-right",
                                render: (s: any) => <span className="text-white/40">{(s.totalDays - s.presentDays)}</span>
                            }
                        ] : [
                            {
                                key: "index",
                                header: "#",
                                render: (_: any, idx?: number) => <span className="font-mono text-sm">{(idx ?? 0) + 1}</span>
                            },
                            {
                                key: "name",
                                header: "Teacher Name",
                                render: (t: any) => {
                                    const isOnLeave = leavesMap[t.schoolId];
                                    return (
                                        <div>
                                            <div className="font-medium flex items-center gap-2 text-white">
                                                {t.name}
                                                {isOnLeave && (
                                                    <Badge variant="outline" className="text-[8px] md:text-[10px] border-yellow-500/50 text-yellow-500 bg-yellow-500/10 gap-1 px-1 py-0 uppercase font-black">
                                                        <UserX className="w-3 h-3" /> Leave
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-white/40 uppercase">{t.schoolId}</div>
                                        </div>
                                    );
                                }
                            },
                            {
                                key: "attendanceStatus",
                                header: "Status",
                                cellClassName: "text-center",
                                render: (t: any) => {
                                    const status = attendance[t.schoolId];
                                    return (
                                        <Badge className={cn(
                                            "font-black uppercase tracking-tighter text-[9px]",
                                            status === 'P' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                        )}>
                                            {status === 'P' ? "Present" : "Absent"}
                                        </Badge>
                                    );
                                }
                            },
                            {
                                key: "action",
                                header: "Action",
                                cellClassName: "text-right",
                                render: (t: any) => {
                                    const status = attendance[t.schoolId];
                                    return (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className={cn(
                                                "h-8 text-[10px] font-black uppercase tracking-tighter px-3 rounded-lg",
                                                status === 'P'
                                                    ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                            )}
                                            onClick={() => toggleStatus(t.schoolId)}
                                        >
                                            {status === 'P' ? "Mark Absent" : "Mark Present"}
                                        </Button>
                                    );
                                }
                            }
                        ]}
                    />
                </CardContent>
            </Card>

            {!viewStats && (
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="text-sm text-muted-foreground">
                        {alreadyMarked
                            ? (isModified ? "You have unsaved changes." : `Attendance already marked by ${user?.uid === "admin" ? "Admin" : "System"}`)
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
