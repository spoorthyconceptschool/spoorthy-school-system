"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
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

    const [teachers, setTeachers] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, 'P' | 'A'>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyMarked, setAlreadyMarked] = useState(false);
    const [isModified, setIsModified] = useState(false);
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [leavesMap, setLeavesMap] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [viewStats, setViewStats] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [statsMonth, setStatsMonth] = useState<string>("ALL");

    const date = defaultDate || new Date().toISOString().split('T')[0];

    // 1. Sync Teachers from Global Cache
    useEffect(() => {
        if (globalTeachers?.length > 0) {
            const list = globalTeachers.map(d => ({
                id: d.id,
                schoolId: d.schoolId || d.id,
                name: d.name,
                uid: d.uid
            })).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
            setTeachers(list);
        }
    }, [globalTeachers]);

    // 2. Sync Attendance (Real-time & Offline-first)
    useEffect(() => {
        if (!user || teachers.length === 0) return;

        if (viewStats) {
            fetchStats();
        } else {
            setLoading(true);
            const attId = `TEACHERS_${date}`;
            const unsub = onSnapshot(doc(db, "attendance_daily", attId), (snap) => {
                if (snap.exists()) {
                    setAlreadyMarked(true);
                    setAttendance(snap.data().records || {});
                } else {
                    setAlreadyMarked(false);
                    const initial: Record<string, 'P' | 'A'> = {};
                    teachers.forEach((t: any) => { initial[t.schoolId] = 'P'; });
                    setAttendance(initial);
                }
                setLoading(false);
            }, (err) => {
                console.error("Attendance Sync Error:", err);
                setLoading(false);
            });

            // Sync leaves
            const leavesQ = query(
                collection(db, "leaves"),
                where("status", "==", "APPROVED"),
                where("startDate", "<=", date),
                where("endDate", ">=", date)
            );
            const leavesUnsub = onSnapshot(leavesQ, (snap) => {
                const lMap: Record<string, boolean> = {};
                snap.docs.forEach(d => {
                    if (d.data().teacherId) lMap[d.data().teacherId] = true;
                });
                setLeavesMap(lMap);
            });

            return () => { unsub(); leavesUnsub(); };
        }
    }, [date, viewStats, statsMonth, teachers, user]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const tList = teachers;
            const currentYear = new Date().getFullYear();
            let startKey, endKey;
            if (statsMonth === "ALL") {
                startKey = `TEACHERS_${currentYear}-01-01`;
                endKey = `TEACHERS_${currentYear}-12-31`;
            } else {
                startKey = `TEACHERS_${currentYear}-${statsMonth}-01`;
                endKey = `TEACHERS_${currentYear}-${statsMonth}-31`;
            }
            const q = query(collection(db, "attendance_daily"), where(documentId(), ">=", startKey), where(documentId(), "<=", endKey));
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
                return { ...t, totalDays: st.total, presentDays: st.present, percentage: st.total > 0 ? ((st.present / st.total) * 100).toFixed(1) : "0.0" };
            });
            setStatsData(data);
        } catch (error: any) {
            console.error("Stats error", error);
            toast({ title: "Error", description: "Failed to load stats", type: "error" });
        } finally {
            setLoading(false);
        }
    };

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

    const handlePrint = () => {
        const period = statsMonth === "ALL" ? `Annual Report ${new Date().getFullYear()}` : `Monthly Report - ${new Date(2000, Number(statsMonth) - 1).toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
        const html = `
            <html>
            <head>
                <title>Teacher Attendance Report - ${period}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #333; }
                    .header { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .logo { height: 80px; width: auto; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f8f9fa; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                    <div>
                        <h1>${branding?.schoolName || 'Attendance Report'}</h1>
                        <div>Teacher Attendance - ${period}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Teacher Name</th>
                            <th class="text-center">Total Days</th>
                            <th class="text-center">Present</th>
                            <th class="text-center">Attendance %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statsData.map((s, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${s.name}</td>
                                <td class="text-center">${s.totalDays}</td>
                                <td class="text-center">${s.presentDays}</td>
                                <td class="text-center">${s.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script>window.print(); window.onafterprint = () => window.close();</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        win?.document.write(html);
        win?.document.close();
    };

    const filteredTeachers = teachers.filter(t =>
        (t.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && teachers.length === 0) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-white" /></div>;

    const stats = {
        total: teachers.length,
        present: Object.values(attendance).filter(v => v === 'P').length,
        absent: Object.values(attendance).filter(v => v === 'A').length
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-black/20 border-white/10">
                    <div className="p-4 flex items-center gap-4">
                        <Users className="text-blue-400" />
                        <div>
                            <div className="text-xs text-muted-foreground">TOTAL</div>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </div>
                    </div>
                </Card>
                <Card className="bg-black/20 border-white/10 border-l-4 border-emerald-500">
                    <div className="p-4 flex items-center gap-4">
                        <Check className="text-emerald-500" />
                        <div>
                            <div className="text-xs text-muted-foreground">PRESENT</div>
                            <div className="text-2xl font-bold text-emerald-500">{stats.present}</div>
                        </div>
                    </div>
                </Card>
                <Card className="bg-black/20 border-white/10 border-l-4 border-red-500">
                    <div className="p-4 flex items-center gap-4">
                        <X className="text-red-500" />
                        <div>
                            <div className="text-xs text-muted-foreground">ABSENT</div>
                            <div className="text-2xl font-bold text-red-500">{stats.absent}</div>
                        </div>
                    </div>
                </Card>
                <Card className="bg-black/20 border-white/10">
                    <div className="p-4 flex items-center gap-4">
                        <UserX className="text-yellow-500" />
                        <div>
                            <div className="text-xs text-muted-foreground">ON LEAVE</div>
                            <div className="text-2xl font-bold text-yellow-500">{Object.keys(leavesMap).length}</div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="bg-black/20 border-white/10">
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setViewStats(false)} className={!viewStats ? "bg-emerald-500/20 text-emerald-500" : ""}>Daily</Button>
                        <Button variant="ghost" size="sm" onClick={() => setViewStats(true)} className={viewStats ? "bg-blue-500/20 text-blue-500" : ""}>Stats</Button>
                        {viewStats && (
                            <Select value={statsMonth} onValueChange={setStatsMonth}>
                                <SelectTrigger className="w-[120px] h-8 bg-transparent border-white/10 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    <SelectItem value="ALL">Full Year</SelectItem>
                                    {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => (
                                        <SelectItem key={m} value={m}>{new Date(2000, Number(m) - 1).toLocaleString('default', { month: 'short' })}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {viewStats && <Button size="sm" variant="outline" className="h-8 border-white/10" onClick={handlePrint}><Printer className="w-3 h-3 mr-2" />Print</Button>}
                    </div>
                    {!viewStats && (
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search teachers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 bg-black/40 border-white/10" />
                        </div>
                    )}
                </div>

                <CardContent className="p-0">
                    <DataTable
                        data={viewStats ? statsData : filteredTeachers}
                        isLoading={loading}
                        columns={viewStats ? [
                            { key: "name", header: "Teacher", render: (s: any) => <div><div className="font-medium text-white">{s.name}</div></div> },
                            { key: "totalDays", header: "Total", render: (s: any) => s.totalDays },
                            { key: "presentDays", header: "Present", render: (s: any) => <span className="text-emerald-400 font-bold">{s.presentDays}</span> },
                            { key: "percentage", header: "%", render: (s: any) => <span className={Number(s.percentage) < 80 ? "text-red-400" : "text-emerald-400"}>{s.percentage}%</span> }
                        ] : [
                            {
                                key: "name", header: "Teacher", render: (s: any) => (
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <div className="font-medium text-white">{s.name}</div>
                                            {leavesMap[s.schoolId] && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 text-[8px] h-4">On Leave</Badge>}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: "status", header: "Status", render: (s: any) => (
                                    <Badge className={attendance[s.schoolId] === 'P' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}>
                                        {attendance[s.schoolId] === 'P' ? "Present" : "Absent"}
                                    </Badge>
                                )
                            },
                            {
                                key: "action", header: "Action", cellClassName: "text-right", render: (s: any) => (
                                    <Button size="sm" variant="ghost" className={attendance[s.schoolId] === 'P' ? "text-red-400" : "text-emerald-400"} onClick={() => toggleStatus(s.schoolId)}>
                                        Mark {attendance[s.schoolId] === 'P' ? "Absent" : "Present"}
                                    </Button>
                                )
                            }
                        ]}
                    />
                </CardContent>
            </Card>

            {!viewStats && (
                <div className="flex justify-end bg-white/5 p-4 rounded-lg border border-white/10">
                    <Button size="lg" onClick={handleSubmit} disabled={submitting || (alreadyMarked && !isModified)} className="bg-emerald-600 hover:bg-emerald-700">
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        {alreadyMarked ? "Update Attendance" : "Submit Attendance"}
                    </Button>
                </div>
            )}
        </div>
    );
}
