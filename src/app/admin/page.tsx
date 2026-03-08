"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where, doc, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { KPICard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Download, IndianRupee, Users, Database,
    Calendar, Clock, AlertTriangle, Layers, GraduationCap,
    BookOpen, Bell, Briefcase, FileText, ClipboardList,
    TrendingUp, CheckCircle, ArrowRight, BarChart3, ChevronRight, Sparkle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddStudentModal } from "@/components/admin/add-student-modal";

interface Student {
    id: string;
    fullName?: string;
    studentName?: string;
    classId?: string;
    className?: string;
    admissionNumber?: string;
    schoolId?: string;
    createdAt?: { seconds: number };
    status?: string;
}

interface LeaveRequest {
    id: string;
    teacherName: string;
    type: string;
    fromDate: string;
    status: string;
    createdAt?: { seconds: number };
}

interface DashboardStats {
    totalStudents: number;
    pendingFees: number;
    leaveRequests: number;
    totalLeaves: number;
    todayCollection: number;
    totalStaff: number;
    staffPresent: number;
}

export default function AdminDashboard() {
    const { user, role: authRole } = useAuth();
    const { selectedYear, classes } = useMasterData();
    const router = useRouter();

    // Admin State
    const [recentStudents, setRecentStudents] = useState<Student[]>([]);
    const [pendingLeavesList, setPendingLeavesList] = useState<LeaveRequest[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        pendingFees: 0,
        leaveRequests: 0,
        totalLeaves: 0,
        todayCollection: 0,
        totalStaff: 0,
        staffPresent: 0
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchEnterpriseStats = async () => {
            try {
                const currentYear = selectedYear || "2026-2027";
                const req = await fetch(`/api/admin/dashboard/stats?year=${encodeURIComponent(currentYear)}`);
                const res = await req.json();
                console.log("[AdminDashboard] Stats API response:", res);
                if (res.success) {
                    setStats(prev => ({
                        ...prev,
                        ...res.data
                    }));
                } else {
                    console.error("[AdminDashboard] Stats API error:", res.error);
                }
                setLoading(false);
            } catch (e) {
                console.error("[AdminDashboard] Fetch Enterprise Stats Error", e);
                setLoading(false);
            }
        };

        fetchEnterpriseStats();
    }, [user, selectedYear]);

    // We maintain simple non-aggregated paginated sub-lists if needed,
    // like recent leaves.
    useEffect(() => {
        if (!user) return;

        const qLeaves = query(collection(db, "leave_requests"), where("status", "==", "PENDING"), limit(5));
        const unsubLeaves = onSnapshot(qLeaves, (snap) => {
            const leaves = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));
            leaves.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPendingLeavesList(leaves);
        });

        return () => {
            unsubLeaves();
        };
    }, [user, selectedYear]);

    // Recent Students Listener (replaces applications — shows real enrolled students)
    useEffect(() => {
        if (!user || authRole === "TIMETABLE_EDITOR") return;

        const studentsQ = query(
            collection(db, "students"),
            orderBy("createdAt", "desc"),
            limit(10)
        );
        const unsubscribe = onSnapshot(studentsQ, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, schoolId: doc.id, ...doc.data() } as Student));
            console.log("[AdminDashboard] Recent students fetched:", list.length);
            setRecentStudents(list);
        }, (err) => {
            console.error("[AdminDashboard] Students listener error:", err);
        });

        return () => unsubscribe();
    }, [user, authRole]);

    const columns = [
        {
            key: "fullName",
            header: "Student Name",
            render: (s: Student) => <span className="font-bold text-white italic">{s.fullName || s.studentName || "—"}</span>
        },
        {
            key: "classId",
            header: "Class",
            render: (s: Student) => {
                const cls = (classes as any)?.[s.classId || ""];
                return <span className="text-white/70">{cls ? cls.name : (s.className || s.classId || "—")}</span>
            }
        },
        {
            key: "admissionNumber",
            header: "Adm. No.",
            render: (s: any) => {
                const adm = (!s.admissionNumber || s.admissionNumber === "PENDING") ? null : s.admissionNumber;
                return <span className="font-mono text-xs text-white/60">{adm || s.schoolId || "PENDING"}</span>
            }
        },
        {
            key: "createdAt",
            header: "Enrolled On",
            render: (s: Student) => (
                <span className="text-xs text-white/40 font-mono">
                    {s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : "—"}
                </span>
            )
        }
    ];

    // === MANAGER DASHBOARD VIEW ===
    if (authRole === "MANAGER") {
        return (
            <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <Sparkle className="w-3 h-3 text-blue-400 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Enterprise Dashboard</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter text-white italic drop-shadow-2xl leading-none">
                            Management <span className="text-blue-500">Overview</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-[9px] md:text-xs tracking-[0.2em] uppercase font-black opacity-60 leading-tight md:leading-relaxed">
                                <span>Financial Index</span>
                                <div className="w-1 h-1 bg-blue-500 rounded-full mb-0.5" />
                                <span>Operations</span>
                                <div className="w-1 h-1 bg-blue-500 rounded-full mb-0.5" />
                                <span>Growth Metrics</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 px-3 md:px-0">
                    <KPICard
                        title="Today's Collection"
                        value={`₹${stats.todayCollection.toLocaleString()}`}
                        icon={<IndianRupee className="w-6 h-6 text-emerald-400" />}
                        trend="Live Sync"
                        className="glass-panel-emerald group border-emerald-500/10 rounded-2xl md:rounded-[2rem] hover:border-emerald-500/30"
                        onClick={() => router.push("/admin/payments")}
                    />
                    <KPICard
                        title="Pending Fees"
                        value={`₹${stats.pendingFees.toLocaleString()}`}
                        icon={<Database className="w-6 h-6 text-rose-400" />}
                        trend="Total Dues"
                        className="glass-panel-rose group border-rose-500/10 rounded-2xl md:rounded-[2rem] hover:border-rose-500/30"
                        onClick={() => router.push("/admin/fees/pending")}
                    />
                    <KPICard
                        title="Total Faculty"
                        value={stats.totalStaff}
                        icon={<Users className="w-6 h-6 text-blue-400" />}
                        trend="Staff Strength"
                        className="glass-panel-blue group border-blue-500/10 rounded-2xl md:rounded-[2rem] hover:border-blue-500/30"
                        onClick={() => router.push("/admin/faculty")}
                    />
                    <KPICard
                        title="Total Students"
                        value={stats.totalStudents}
                        icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
                        trend="Enrollment"
                        className="glass-panel-purple group border-purple-500/10 rounded-2xl md:rounded-[2rem] hover:border-purple-500/30"
                        onClick={() => router.push("/admin/students")}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 px-2 md:px-0">
                    <div className="lg:col-span-2 space-y-10">
                        <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-blue-600/10 via-white/[0.02] to-transparent border border-white/5 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -z-10 group-hover:bg-blue-500/20 transition-all duration-700" />

                            <div className="relative z-10 space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 md:w-2 md:h-10 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
                                    <h2 className="text-xl md:text-3xl font-display font-black italic tracking-tight text-white">
                                        Academic Management
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                    {[
                                        { label: "Faculty Directory", desc: "Staff profiles & records", href: "/admin/faculty", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                                        { label: "Master Records", desc: "Classes, sections & setup", href: "/admin/master-data", icon: Database, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                        { label: "Timetable & Roaster", desc: "Weekly schedules & classes", href: "/admin/timetable/manage", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
                                        { label: "Exam Portal", desc: "Assessments & results", href: "/admin/exams", icon: ClipboardList, color: "text-purple-400", bg: "bg-purple-500/10" }
                                    ].map((action, i) => (
                                        <Link key={i} href={action.href} className="flex items-start gap-4 md:gap-5 p-5 md:p-6 rounded-2xl md:rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all group/card shadow-xl hover:-translate-y-1.5 active:scale-95 duration-300">
                                            <div className={cn("p-4 md:p-5 rounded-2xl transition-all duration-500 group-hover/card:scale-110 group-hover/card:rotate-3 shadow-lg", action.bg, action.color)}>
                                                <action.icon className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            <div className="pt-1">
                                                <div className="font-black text-white text-base md:text-lg mb-0.5 md:mb-1 tracking-tight leading-tight">{action.label}</div>
                                                <div className="text-[9px] md:text-[11px] text-white/30 font-medium leading-relaxed uppercase tracking-wider">{action.desc}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={24} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                                    <h3 className="text-2xl font-display font-black italic text-white/90 tracking-tight">
                                        Recent Enrollments
                                    </h3>
                                </div>
                                <Link href="/admin/students" className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/60 hover:text-accent transition-colors border-b border-accent/20 pb-1">
                                    Access Directory
                                </Link>
                            </div>
                            <div className="rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl transition-all hover:border-white/20">
                                <DataTable
                                    data={recentStudents.filter(s => s.classId && (classes as any)?.[s.classId]).slice(0, 5)}
                                    columns={columns}
                                    isLoading={false}
                                    onRowClick={(s) => router.push(`/admin/students`)}
                                    className="border-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="p-8 md:p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-accent flex items-center gap-3">
                                <div className="w-1.5 h-5 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]" />
                                Controls
                            </h3>
                            <div className="grid gap-5">
                                <Link href="/admin/attendance" className="group flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-accent/40 hover:bg-accent/5 transition-all duration-300">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-accent/10 rounded-xl text-accent group-hover:scale-110 group-hover:rotate-3 transition-all">
                                            <Clock size={22} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-white text-lg tracking-tight">Attendance</span>
                                            <span className="text-[9px] text-accent/60 font-black uppercase tracking-widest leading-none">Daily Verification</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="text-white/10 group-hover:text-accent group-hover:translate-x-1.5 transition-all" />
                                </Link>

                                <Link href="/admin/payments" className="group flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-all duration-300">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-emerald-400/10 rounded-xl text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all">
                                            <IndianRupee size={22} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-white text-lg tracking-tight">Payments</span>
                                            <span className="text-[9px] text-emerald-400/60 font-black uppercase tracking-widest leading-none">Fee Ingestion</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="text-white/10 group-hover:text-emerald-400 group-hover:translate-x-1.5 transition-all" />
                                </Link>

                                <div onClick={() => router.push("/admin/students")} className="group flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-400/40 hover:bg-blue-400/5 transition-all duration-300 cursor-pointer">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-blue-400/10 rounded-xl text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-all">
                                            <Plus size={22} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-white text-lg tracking-tight">Admission</span>
                                            <span className="text-[9px] text-blue-400/60 font-black uppercase tracking-widest leading-none">New Candidate</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="text-white/10 group-hover:text-blue-400 group-hover:translate-x-1.5 transition-all" />
                                </div>
                            </div>
                        </div>

                        {pendingLeavesList.length > 0 ? (
                            <div className="p-10 rounded-[2.5rem] bg-amber-500/[0.03] border border-amber-500/20 backdrop-blur-3xl shadow-2xl space-y-8 overflow-hidden relative group/alerts">
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] group-hover/alerts:bg-amber-500/20 transition-all duration-1000" />
                                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-amber-500 flex items-center gap-3">
                                    <div className="w-1.5 h-5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                    System Alerts
                                </h3>
                                <div className="space-y-5">
                                    {pendingLeavesList.slice(0, 4).map((leave: LeaveRequest) => (
                                        <div key={leave.id} className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between hover:bg-black/60 transition-all cursor-pointer group/leave" onClick={() => router.push("/admin/faculty?tab=leaves")}>
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black text-base capitalize border border-amber-500/20 group-hover/leave:scale-110 group-hover/leave:rotate-6 transition-all">
                                                    {leave.teacherName?.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white text-lg tracking-tight">{leave.teacherName}</span>
                                                    <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.15em]">{leave.type}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest mb-1">{leave.fromDate}</div>
                                                <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-500 uppercase px-3 py-1 bg-amber-500/5 font-black">PENDING</Badge>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" className="w-full text-[11px] font-black uppercase tracking-[0.2em] text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/10 rounded-2xl h-14 transition-all" asChild>
                                        <Link href="/admin/faculty">Review All Requests</Link>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 rounded-[2.5rem] bg-emerald-500/[0.03] border border-emerald-500/20 backdrop-blur-3xl shadow-xl text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20 shadow-lg">
                                    <CheckCircle size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-white uppercase tracking-tight text-xl">All Tasks Finished</h4>
                                    <p className="text-[11px] text-white/30 uppercase font-black tracking-[0.2em]">0 Pending Issues Required Action</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (authRole === "TIMETABLE_EDITOR") {
        return (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className="flex flex-col gap-4 px-2 md:px-0">
                    <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter text-white italic drop-shadow-2xl leading-none">
                        Scheduling <span className="text-accent underline decoration-accent/20 underline-offset-8">Unit</span>
                    </h1>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/40">Spoorthy Schools Enterprise • Status: Online</p>
                </div>

                <div className="p-16 rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl text-center space-y-8 shadow-2xl relative overflow-hidden group mx-2 md:mx-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                    <div className="w-24 h-24 bg-accent/10 rounded-[2rem] flex items-center justify-center text-accent mx-auto border border-accent/20 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Calendar className="w-12 h-12" />
                    </div>
                    <div className="max-w-md mx-auto space-y-4">
                        <h2 className="text-2xl font-display font-black text-white italic">Welcome, Administrator.</h2>
                        <p className="text-sm text-white/40 leading-relaxed font-medium">Access staff coverage, master rosters and real-time scheduling tools from the operations sidebar.</p>
                    </div>
                    <Button asChild className="h-16 px-10 bg-accent text-accent-foreground hover:bg-accent/90 rounded-[1.5rem] font-black text-lg shadow-[0_20px_40px_-10px_rgba(100,255,218,0.3)] transform transition-all active:scale-95">
                        <Link href="/admin/faculty?tab=coverage">
                            Manage Coverage <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    // === ADMIN VIEW ===
    return (
        <div className="space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2 md:px-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-5xl md:text-9xl font-display font-black tracking-tighter italic leading-none text-white drop-shadow-2xl">
                        Admin <span className="text-accent">Dashboard</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                            Standard Edition
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]" />
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-500/80">System Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4">
                    <Button variant="outline" className="h-16 px-10 border-white/10 bg-black/40 hover:bg-white/5 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl backdrop-blur-3xl shadow-xl transition-all active:scale-95 group">
                        <Download className="mr-3 w-5 h-5 text-accent group-hover:scale-110 transition-transform" /> Download Reports
                    </Button>
                    <AddStudentModal />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Students"
                    value={stats.totalStudents}
                    icon={<Users className="w-7 h-7 text-blue-400" />}
                    trend="+12%"
                    trendLabel="Enrolled"
                    className="glass-panel group border-blue-500/10 hover:border-blue-500/30 rounded-[2.5rem] transition-all duration-500"
                    onClick={() => router.push("/admin/students")}
                />
                <KPICard
                    title="Fee Collection"
                    value={`₹${stats.todayCollection.toLocaleString()}`}
                    icon={<IndianRupee className="w-7 h-7 text-emerald-400" />}
                    trend="+5.4%"
                    trendLabel="Today"
                    className="glass-panel group border-emerald-500/10 hover:border-emerald-500/30 rounded-[2.5rem] transition-all duration-500"
                    onClick={() => router.push("/admin/payments")}
                />
                <KPICard
                    title="Staff Members"
                    value={stats.totalStaff}
                    icon={<Briefcase className="w-7 h-7 text-indigo-400" />}
                    trend="Stable"
                    trendLabel="Active"
                    className="glass-panel group border-indigo-500/10 hover:border-indigo-500/30 rounded-[2.5rem] transition-all duration-500"
                    onClick={() => router.push("/admin/faculty")}
                />
                <KPICard
                    title="Pending Tasks"
                    value={stats.leaveRequests}
                    icon={<Clock className="w-7 h-7 text-amber-500" />}
                    trend={stats.leaveRequests > 0 ? "Action Req" : "No Pending"}
                    trendLabel="Reviews"
                    className={cn(
                        "glass-panel group rounded-[2.5rem] transition-all duration-500",
                        stats.leaveRequests > 0 ? "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40" : "border-amber-500/10 hover:border-amber-500/30"
                    )}
                    onClick={() => router.push("/admin/faculty?tab=leaves")}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {pendingLeavesList.length > 0 && (
                        <div className="space-y-6 animate-in slide-in-from-top-6 duration-700 bg-rose-500/[0.03] rounded-[2.5rem] border border-rose-500/20 p-8 backdrop-blur-3xl relative overflow-hidden group/alert">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] -z-10 group-hover/alert:bg-rose-500/20 transition-all duration-1000" />
                            <div className="flex items-center justify-between border-b border-rose-500/10 pb-6">
                                <h2 className="text-xl font-display font-black flex items-center gap-4 text-rose-400 italic">
                                    <div className="w-2 h-8 bg-rose-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                                    Urgent Action Required
                                </h2>
                                <Link href="/admin/faculty?tab=leaves" className="text-[10px] text-white/40 hover:text-white transition-colors uppercase font-black tracking-[0.3em]">Review All</Link>
                            </div>
                            <div className="grid gap-4 pt-2">
                                {pendingLeavesList.slice(0, 3).map((leave: LeaveRequest) => (
                                    <div key={leave.id} onClick={() => router.push("/admin/faculty?tab=leaves")} className="flex items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-rose-500/30 transition-all group/item cursor-pointer shadow-lg hover:-translate-y-1">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 font-black text-base border border-rose-500/20 group-hover/item:scale-110 transition-transform">
                                                {leave.teacherName?.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black text-white group-hover:text-rose-400 transition-colors tracking-tight leading-tight">{leave.teacherName}</span>
                                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-3">
                                                    {leave.type} <div className="w-1 h-1 rounded-full bg-white/10" /> {leave.fromDate}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight size={20} className="text-white/10 group-hover:text-rose-500 group-hover:translate-x-1.5 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-8">
                        <div className="flex items-center justify-between px-4">
                            <h2 className="text-3xl font-display font-black italic text-white flex items-center gap-4">
                                <GraduationCap size={28} className="text-blue-400" />
                                Latest Enrollments
                            </h2>
                            <Link href="/admin/students" className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/60 hover:text-accent transition-colors border-b border-accent/20 pb-1">Access Directory</Link>
                        </div>

                        <div className="rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-3xl overflow-hidden transition-all hover:border-white/20">
                            <DataTable
                                data={recentStudents.filter(s => s.classId && (classes as any)?.[s.classId]).slice(0, 7)}
                                columns={columns}
                                isLoading={false}
                                onRowClick={() => router.push("/admin/students")}
                                className="border-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -mr-24 -mt-24 blur-[80px] group-hover:bg-accent/10 transition-all duration-1000" />
                        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] mb-10 text-accent/40 flex items-center gap-3">
                            <div className="w-1.5 h-5 bg-accent rounded-full" />
                            Quick Actions
                        </h3>
                        <div className="space-y-5 relative z-10">
                            {[
                                { href: "/admin/payments", icon: IndianRupee, text: "Finance Hub", color: "emerald", desc: "Fee Management" },
                                { href: "/admin/notices", icon: AlertTriangle, text: "Notices", color: "amber", desc: "School Alerts" },
                                { href: "/admin/timetable/manage", icon: Clock, text: "Timetable", color: "blue", desc: "Schedule Manager" }
                            ].map((btn, i) => (
                                <Link
                                    key={i}
                                    href={btn.href}
                                    className="flex items-center justify-between p-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-[1.5rem] transition-all group/btn shadow-xl hover:-translate-y-1.5 active:scale-95 duration-300"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={cn("p-4 rounded-xl transition-all duration-500 group-hover/btn:scale-110 group-hover/btn:rotate-3 shadow-lg", `bg-${btn.color}-500/10 text-${btn.color}-400 border border-${btn.color}-500/20 shadow-${btn.color}-500/5`)}>
                                            <btn.icon size={22} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-white text-lg tracking-tight leading-none group-hover/btn:text-white transition-colors">{btn.text}</span>
                                            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-1.5">{btn.desc}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-white/10 group-hover/btn:text-white group-hover/btn:translate-x-1.5 transition-all" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-white/[0.02] to-transparent border border-white/10 backdrop-blur-3xl shadow-2xl space-y-8 flex flex-col items-center text-center group/status">
                        <div className="w-24 h-24 bg-white/[0.03] rounded-[2rem] flex items-center justify-center text-accent/60 border border-white/10 shadow-inner group-hover/status:scale-110 transition-transform duration-700">
                            <BarChart3 size={40} className="group-hover/status:text-accent transition-colors" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-black text-white uppercase text-xl tracking-tighter italic">System Status</h3>
                            <p className="text-[12px] text-white/30 font-medium leading-relaxed uppercase tracking-widest max-w-[200px] mx-auto">
                                Biometric sync <span className="text-emerald-500">Active</span> • Database <span className="text-amber-500">Normal</span>
                            </p>
                        </div>
                        <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white/60 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-95">
                            Refresh Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
