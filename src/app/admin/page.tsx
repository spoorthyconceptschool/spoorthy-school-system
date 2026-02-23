"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where, doc, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { KPICard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus, Download, IndianRupee, Users, Database,
    Calendar, Clock, AlertTriangle, Layers, GraduationCap,
    BookOpen, Bell, Briefcase, FileText, ClipboardList,
    TrendingUp, CheckCircle, ArrowRight, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddStudentModal } from "@/components/admin/add-student-modal";

interface Application {
    id: string;
    studentName: string;
    grade: string;
    status: string;
    submittedAt?: { seconds: number };
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
    const router = useRouter();

    // Admin State
    const [applications, setApplications] = useState<Application[]>([]);
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

        // Role is already provided by useAuth context for instant access


        // Optimized stats fetching - Avoid full snapshots of large collections
        const unsubStudents = onSnapshot(query(collection(db, "students"), limit(1)), (snap) => {
            // Since we can't get size without full fetch in onSnapshot, we'll use a local count or metadata doc in future
            // For now, we fetch just the size but without the data if possible, or use a cached value
            // To truly fix this, we'd need a counter document. As a quick fix, we'll just use a non-realtime getCount once
        });

        // Use getCountFromServer for large counts (One-time fetch for performance)
        import("firebase/firestore").then(({ getCountFromServer }) => {
            getCountFromServer(collection(db, "students")).then(s => setStats(p => ({ ...p, totalStudents: s.data().count })));
            getCountFromServer(collection(db, "teachers")).then(s => setStats(p => ({ ...p, totalStaff: s.data().count })));
            getCountFromServer(collection(db, "leave_requests")).then(s => setStats(p => ({ ...p, totalLeaves: s.data().count })));
        });

        // Financials - Today's Collection (Keep real-time as it's typically small volume per day)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTimestamp = Timestamp.fromDate(startOfDay);

        const qTodayPayments = query(
            collection(db, "payments"),
            where("date", ">=", startTimestamp),
            limit(100) // Safety limit
        );
        const unsubTodayPayments = onSnapshot(qTodayPayments, (snap) => {
            const total = snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
            setStats((prev: DashboardStats) => ({ ...prev, todayCollection: total }));
            setLoading(false);
        });

        // Financials - Aggregate Ledger Balance 
        // NOTE: In production, this MUST come from a pre-calculated summary document.
        // Fetching 500 ledgers on every dashboard load is still heavy.
        const unsubLedgers = onSnapshot(query(collection(db, "ledgers"), limit(100)), (snap) => {
            const total = snap.docs.reduce((acc, d) => acc + (Number(d.data().balance) || 0), 0);
            setStats((prev: DashboardStats) => ({ ...prev, pendingFees: total }));
        });

        const qLeaves = query(collection(db, "leave_requests"), where("status", "==", "PENDING"), limit(5));
        const unsubLeaves = onSnapshot(qLeaves, (snap) => {
            setStats((prev: DashboardStats) => ({ ...prev, leaveRequests: snap.size }));
            const leaves = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));
            leaves.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPendingLeavesList(leaves);
        });

        return () => {
            unsubStudents();
            unsubTodayPayments();
            unsubLedgers();
            unsubLeaves();
        };
    }, [user]);

    // Applications Listener
    useEffect(() => {
        if (!user || authRole === "TIMETABLE_EDITOR") return;

        const appQ = query(collection(db, "applications"), orderBy("submittedAt", "desc"), limit(10));
        const unsubscribe = onSnapshot(appQ, (snapshot) => {
            setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
        });

        return () => unsubscribe();
    }, [user, authRole]);

    // === SHARED UI ELEMENTS ===
    const columns = [
        {
            key: "studentName",
            header: "Student Name",
            render: (app: Application) => <span className="font-bold text-white italic">{app.studentName}</span>
        },
        { key: "grade", header: "Grade" },
        {
            key: "status",
            header: "Status",
            render: (app: Application) => (
                <Badge variant="outline" className="capitalize border-accent/20 text-accent bg-accent/5">
                    {app.status}
                </Badge>
            )
        },
        {
            key: "submittedAt",
            header: "Date",
            render: (app: Application) => (
                <span className="text-xs text-white/40 font-mono">
                    {app.submittedAt?.seconds ? new Date(app.submittedAt.seconds * 1000).toLocaleDateString() : 'Pending'}
                </span>
            )
        }
    ];

    // === MANAGER DASHBOARD VIEW ===
    if (authRole === "MANAGER") {
        return (
            <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 md:px-0">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl md:text-6xl font-display font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent italic leading-tight">
                            Operations Central
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-[8px] md:text-sm tracking-wider uppercase font-black opacity-60 leading-tight md:leading-relaxed">
                            <span>Financial Health</span>
                            <span className="text-blue-500">•</span>
                            <span>Operational Efficiency</span>
                            <span className="text-blue-500">•</span>
                            <span>Growth Analytics</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
                    <KPICard
                        title="Today's Revenue"
                        value={`₹${stats.todayCollection.toLocaleString()}`}
                        icon={<IndianRupee className="w-4 h-4 text-emerald-400" />}
                        trend="Real-time Flow"
                        className="bg-emerald-500/5 border-emerald-500/10 cursor-pointer hover:bg-emerald-500/10 transition-all"
                        onClick={() => router.push("/admin/payments")}
                    />
                    <KPICard
                        title="Outstanding Dues"
                        value={`₹${stats.pendingFees.toLocaleString()}`}
                        icon={<Database className="w-4 h-4 text-rose-400" />}
                        trend="Fee Recovery"
                        className="bg-rose-500/5 border-rose-500/10 cursor-pointer hover:bg-rose-500/10 transition-all"
                        onClick={() => router.push("/admin/fees/pending")}
                    />
                    <KPICard
                        title="Active Faculty"
                        value={stats.totalStaff}
                        icon={<Users className="w-4 h-4 text-blue-400" />}
                        trend="Total Staff strength"
                        className="bg-blue-500/5 border-blue-500/10 cursor-pointer hover:bg-blue-500/10 transition-all"
                        onClick={() => router.push("/admin/faculty")}
                    />
                    <KPICard
                        title="Growth Index"
                        value={stats.totalStudents}
                        icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
                        trend="Verified Enrollments"
                        className="bg-purple-500/5 border-purple-500/10 cursor-pointer hover:bg-purple-500/10 transition-all"
                        onClick={() => router.push("/admin/students")}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2 md:px-0">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-blue-500/20 backdrop-blur-xl group">
                            <div className="relative z-10 space-y-6">
                                <h2 className="text-xl md:text-2xl font-display font-bold italic flex items-center gap-3">
                                    <Briefcase className="text-blue-400" />
                                    Department Overview
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { label: "Staff Members", desc: "View staff profiles & leaves", href: "/admin/faculty", icon: Users },
                                        { label: "Master Data", desc: "Manage classes, subjects & villages", href: "/admin/master-data", icon: Database },
                                        { label: "Timetable", desc: "Manage schedules & coverage", href: "/admin/timetable/manage", icon: Clock },
                                        { label: "Exam Logistics", desc: "Hall tickets and scheduling", href: "/admin/exams", icon: ClipboardList }
                                    ].map((action, i) => (
                                        <Link key={i} href={action.href} className="flex items-start gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-blue-500/30 hover:bg-black/60 transition-all group/card">
                                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover/card:scale-110 transition-transform">
                                                <action.icon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white mb-1">{action.label}</div>
                                                <div className="text-xs text-muted-foreground">{action.desc}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-display font-bold italic px-1 flex items-center gap-2">
                                <FileText size={18} className="text-indigo-400" />
                                Latest Academic Updates
                            </h3>
                            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
                                <DataTable
                                    data={applications.slice(0, 3)}
                                    columns={columns}
                                    isLoading={false}
                                    onRowClick={(app) => router.push(`/admin/students`)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                Quick Actions
                            </h3>
                            <div className="grid gap-3">
                                <Button asChild variant="outline" className="w-full justify-start gap-3 h-12 border-white/5 bg-white/5 hover:bg-white/10 font-bold">
                                    <Link href="/admin/attendance">
                                        <Clock size={16} /> Mark Attendance
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {pendingLeavesList.length > 0 && (
                            <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2">
                                    <div className="w-1 h-3 bg-amber-500 rounded-full animate-pulse" />
                                    Pending Absences
                                </h3>
                                <div className="space-y-2">
                                    {pendingLeavesList.slice(0, 3).map((leave: LeaveRequest) => (
                                        <div key={leave.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs capitalize">
                                                {leave.teacherName?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0" onClick={() => router.push("/admin/faculty?tab=leaves")} style={{ cursor: 'pointer' }}>
                                                <div className="text-[11px] font-bold text-white truncate">{leave.teacherName}</div>
                                                <div className="text-[9px] text-muted-foreground">{leave.type}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // === TIMETABLE EDITOR VIEW ===
    if (authRole === "TIMETABLE_EDITOR") {
        return (
            <div className="space-y-8 animate-in fade-in duration-200">
                <div className="flex flex-col gap-2">
                    <h1 className="font-display text-4xl font-bold tracking-tight">Timetable Dashboard</h1>
                </div>
                <div className="p-10 border border-dashed border-white/10 rounded-2xl bg-white/5 text-center">
                    <Calendar className="w-12 h-12 text-accent mx-auto mb-4 opacity-90" />
                    <p className="text-white/60">Welcome, Timetable Editor. Access staff coverage and schedules from the sidebar.</p>
                    <Button asChild className="mt-4 bg-accent text-black hover:bg-accent/80">
                        <Link href="/admin/faculty?tab=coverage">Manage Coverage</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // === ADMIN VIEW ===
    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-200 pb-10 px-2 md:px-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tighter italic pb-1 text-white">
                        <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Admin</span> Central
                    </h1>
                    <p className="text-muted-foreground mt-1 text-[10px] md:text-xs uppercase tracking-widest font-black opacity-70">Real-time School Operations</p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3">
                    <Button variant="outline" className="gap-2 border-white/5 bg-black/40 hover:bg-white/5 text-[10px] md:text-sm h-9 md:h-12 rounded-xl backdrop-blur-md">
                        <Download size={14} /> Export Data
                    </Button>
                    <AddStudentModal />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KPICard
                    title="Total Students"
                    value={loading ? "..." : stats.totalStudents}
                    icon={<Users className="w-4 h-4 text-blue-400" />}
                    trend="Live Snapshot"
                    className="bg-blue-500/5 border-blue-500/10"
                />
                <KPICard
                    title="Collection"
                    value={`₹${stats.todayCollection}`}
                    icon={<IndianRupee className="w-4 h-4 text-emerald-400" />}
                    trend="Today's Flow"
                    className="bg-emerald-500/5 border-emerald-500/10"
                />
                <KPICard
                    title="Leave Requests"
                    value={stats.leaveRequests > 0 ? `${stats.leaveRequests} Alert` : "Clean"}
                    icon={<Calendar className={cn("w-4 h-4", stats.leaveRequests > 0 ? "text-rose-400" : "text-amber-400")} />}
                    trend={stats.leaveRequests > 0 ? `⚠️ Priority Action` : "✨ No Backlog"}
                    className={cn(
                        "transition-all duration-500",
                        stats.leaveRequests > 0 ? "border-rose-500/40 bg-rose-500/10 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)] animate-pulse-subtle" : "bg-zinc-500/5"
                    )}
                />
                <KPICard
                    title="Fee Balance"
                    value={`₹${stats.pendingFees}`}
                    icon={<Database className="w-4 h-4 text-purple-400" />}
                    trend="Outstanding"
                    className="bg-purple-500/5 border-purple-500/10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {pendingLeavesList.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-top-4 duration-700 bg-rose-500/5 rounded-2xl border border-rose-500/10 p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between border-b border-rose-500/10 pb-2 mb-2">
                                <h2 className="text-[10px] md:text-sm font-black flex items-center gap-2 text-rose-400 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Urgent Action Required
                                </h2>
                                <Link href="/admin/faculty?tab=leaves" className="text-[9px] text-muted-foreground hover:text-white underline uppercase font-black tracking-widest">Process</Link>
                            </div>
                            <div className="grid gap-2">
                                {pendingLeavesList.map((leave: LeaveRequest) => (
                                    <div key={leave.id} onClick={() => router.push("/admin/faculty?tab=leaves")} className="flex items-center justify-between py-2 px-3 rounded-xl bg-black/40 border border-white/5 hover:border-rose-500/20 transition-all group cursor-pointer">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] md:text-xs font-bold text-white group-hover:text-rose-400 transition-colors uppercase tracking-tight italic">{leave.teacherName}</span>
                                            <span className="text-[8px] md:text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                                                {leave.type} <span className="w-1 h-1 rounded-full bg-white/10" /> {leave.fromDate}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl md:text-2xl font-display font-bold italic">Latest Registrations</h2>
                            <Link href="/admin/students" className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">Full Database</Link>
                        </div>

                        {applications.length > 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-md overflow-hidden mobile-dense-table">
                                <DataTable
                                    data={applications.slice(0, 5)}
                                    columns={columns}
                                    isLoading={false}
                                    onRowClick={() => router.push("/admin/students")}
                                />
                            </div>
                        ) : (
                            <div className="p-12 border border-dashed border-white/10 rounded-2xl bg-white/5 text-center text-muted-foreground italic text-sm">
                                {loading ? "Syncing data matrix..." : "No recent activity found."}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-all duration-1000" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-accent/60 flex items-center gap-2">
                            <div className="w-1 h-4 bg-accent rounded-full" />
                            Terminal Links
                        </h3>
                        <div className="space-y-3 relative z-10">
                            {[
                                { href: "/admin/payments", icon: IndianRupee, text: "Record Payment", color: "text-emerald-400" },
                                { href: "/admin/notices", icon: AlertTriangle, text: "Post Notice", color: "text-amber-400" },
                                { href: "/admin/timetable/manage", icon: Clock, text: "Edit Schedule", color: "text-blue-400" }
                            ].map((btn, i) => (
                                <Button
                                    key={i}
                                    className="w-full justify-start gap-4 bg-white/5 hover:bg-white/10 border border-white/5 h-14 md:h-16 text-sm md:text-base font-bold rounded-2xl transition-all text-white"
                                    onClick={() => router.push(btn.href)}
                                >
                                    <div className={cn("p-2 rounded-xl bg-black/40 border border-white/5", btn.color)}>
                                        <btn.icon size={18} />
                                    </div>
                                    {btn.text}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
