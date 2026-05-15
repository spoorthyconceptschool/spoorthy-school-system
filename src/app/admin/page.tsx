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
    TrendingUp, CheckCircle, ArrowRight, BarChart3,
    PieChart, Wallet, Bus, Home, Settings2, Filter, X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";

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
    presentStudents?: number;
    presentTeachers?: number;
    presentStaff?: number;
    finance?: {
        totalFee: number;
        totalPaid: number;
        hostelFee: number;
        hostelPaid: number;
        customFee: number;
        customPaid: number;
        transportFee: number;
        transportPaid: number;
        schoolFee: number;
        schoolPaid: number;
        terms: Record<string, { total: number; paid: number }>;
    };
}

// --- MODULAR CARD FILTER COMPONENT ---
function CardFilter({ 
    villages, classes, sections, 
    filterVillage, setFilterVillage,
    filterClass, setFilterClass,
    filterSection, setFilterSection,
    size = "sm"
}: any) {
    const hasActive = filterVillage || filterClass || filterSection;
    const iconSize = size === "xs" ? 12 : 14;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className={cn(
                        "rounded-full border-white/10 bg-black/40 hover:bg-white/10 transition-all",
                        size === "xs" ? "w-6 h-6" : "w-8 h-8",
                        hasActive && "border-accent text-accent shadow-[0_0_10px_-2px_rgba(var(--accent-rgb),0.5)]"
                    )}
                >
                    <Filter size={iconSize} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-950 border-white/10 backdrop-blur-xl" align="end">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Filter Module</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs font-bold text-white/80">
                        <Home className="mr-2 h-3.5 w-3.5 opacity-50" />
                        <span>Village</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-zinc-950 border-white/10 max-h-[300px] overflow-y-auto">
                            <DropdownMenuRadioGroup value={filterVillage} onValueChange={setFilterVillage}>
                                <DropdownMenuRadioItem value="" className="text-xs">All Villages</DropdownMenuRadioItem>
                                {Object.values(villages || {}).sort((a:any, b:any) => a.name?.localeCompare(b.name)).map((v:any) => (
                                    <DropdownMenuRadioItem key={v.id} value={v.id} className="text-xs">{v.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs font-bold text-white/80">
                        <GraduationCap className="mr-2 h-3.5 w-3.5 opacity-50" />
                        <span>Class</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-zinc-950 border-white/10">
                            <DropdownMenuRadioGroup value={filterClass} onValueChange={setFilterClass}>
                                <DropdownMenuRadioItem value="" className="text-xs">All Classes</DropdownMenuRadioItem>
                                {Object.values(classes || {}).sort((a:any, b:any) => (a.order || 0) - (b.order || 0)).map((c:any) => (
                                    <DropdownMenuRadioItem key={c.id} value={c.id} className="text-xs">{c.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs font-bold text-white/80">
                        <Layers className="mr-2 h-3.5 w-3.5 opacity-50" />
                        <span>Section</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-zinc-950 border-white/10">
                            <DropdownMenuRadioGroup value={filterSection} onValueChange={setFilterSection}>
                                <DropdownMenuRadioItem value="" className="text-xs">All Sections</DropdownMenuRadioItem>
                                {Object.values(sections || {}).sort((a:any, b:any) => a.name?.localeCompare(b.name)).map((s:any) => (
                                    <DropdownMenuRadioItem key={s.id} value={s.id} className="text-xs">{s.name}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem 
                    className="text-[10px] font-black uppercase tracking-widest text-rose-400 focus:text-rose-300"
                    onClick={() => {
                        setFilterVillage("");
                        setFilterClass("");
                        setFilterSection("");
                    }}
                >
                    <X className="mr-2 h-3 w-3" />
                    Reset Card
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function AdminDashboard() {
    const { user, role: authRole } = useAuth();
    const { selectedYear, classes, sections, villages } = useMasterData();
    const router = useRouter();

    const DASHBOARD_CACHE_KEY = `spoorthy_dashboard_cache_${selectedYear}`;
    
    const [filterClass, setFilterClass] = useState<string>("");
    const [filterSection, setFilterSection] = useState<string>("");
    const [filterVillage, setFilterVillage] = useState<string>("");

    const [recentStudents, setRecentStudents] = useState<Student[]>(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            const cached = localStorage.getItem(`${DASHBOARD_CACHE_KEY}_students`);
            if (cached) { try { return JSON.parse(cached); } catch (e) { return []; } }
        }
        return [];
    });
    
    const [pendingLeavesList, setPendingLeavesList] = useState<LeaveRequest[]>([]);
    
    const [stats, setStats] = useState<DashboardStats>(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            const cached = localStorage.getItem(`${DASHBOARD_CACHE_KEY}_stats`);
            if (cached) { try { return JSON.parse(cached); } catch (e) { return { totalStudents: 0, pendingFees: 0, leaveRequests: 0, totalLeaves: 0, todayCollection: 0, totalStaff: 0, staffPresent: 0 }; } }
        }
        return {
            totalStudents: 0,
            pendingFees: 0,
            leaveRequests: 0,
            totalLeaves: 0,
            todayCollection: 0,
            totalStaff: 0,
            staffPresent: 0
        };
    });

    const [loading, setLoading] = useState(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            const hasStats = localStorage.getItem(`${DASHBOARD_CACHE_KEY}_stats`);
            const hasStudents = localStorage.getItem(`${DASHBOARD_CACHE_KEY}_students`);
            return !(hasStats && hasStudents);
        }
        return true;
    });

    useEffect(() => {
        if (!user) return;

        const fetchEnterpriseStats = async (isBackground = false) => {
            try {
                if (!isBackground) setLoading(true);
                const currentYear = selectedYear || "2026-2027";
                const token = await user.getIdToken();
                
                let url = `/api/admin/dashboard/stats?year=${encodeURIComponent(currentYear)}`;
                if (filterClass) url += `&classId=${filterClass}`;
                if (filterSection) url += `&section=${filterSection}`;
                if (filterVillage) url += `&village=${filterVillage}`;

                const req = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                const res = await req.json();
                if (res.success) {
                    setStats(prev => ({ ...prev, ...res.data }));
                    if (!filterClass && !filterSection && !filterVillage) {
                        localStorage.setItem(`${DASHBOARD_CACHE_KEY}_stats`, JSON.stringify(res.data));
                    }
                }
            } catch (e) {
                console.error("[Dashboard] Stats Sync Error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchEnterpriseStats();
        const interval = setInterval(() => fetchEnterpriseStats(true), 45000);
        return () => clearInterval(interval);
    }, [user, selectedYear, filterClass, filterSection, filterVillage]);

    useEffect(() => {
        if (!user) return;
        const qLeaves = query(collection(db, "leave_requests"), where("status", "==", "PENDING"), limit(5));
        const unsubLeaves = onSnapshot(qLeaves, (snap) => {
            const leaves = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));
            leaves.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPendingLeavesList(leaves);
        });
        return () => unsubLeaves();
    }, [user, selectedYear]);

    useEffect(() => {
        if (!user || authRole === "TIMETABLE_EDITOR") return;
        const studentsQ = query(collection(db, "students"), orderBy("createdAt", "desc"), limit(10));
        const unsubscribe = onSnapshot(studentsQ, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, schoolId: doc.id, ...doc.data() } as Student));
            setRecentStudents(list);
            localStorage.setItem(`${DASHBOARD_CACHE_KEY}_students`, JSON.stringify(list));
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

    if (authRole === "MANAGER") {
        return (
            <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl md:text-6xl font-display font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent italic leading-tight">
                            Operations Central
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-[8px] md:text-sm tracking-wider uppercase font-black opacity-60 leading-tight md:leading-relaxed">
                                <span>Financial Health</span>
                                <span className="text-blue-500">•</span>
                                <span>Operational Efficiency</span>
                                <span className="text-blue-500">•</span>
                                <span>Growth Analytics</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-white/5 bg-white/5 text-muted-foreground ml-2">
                                Last Synced: {new Date().toLocaleTimeString()}
                            </Badge>
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
                        title="Outstanding Fee Payment"
                        value={`₹${((stats.finance?.totalFee || 0) - (stats.finance?.totalPaid || 0)).toLocaleString()}`}
                        icon={<Database className="w-4 h-4 text-rose-400" />}
                        trend="Fee Payment Recovery"
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
                    <div className="lg:col-span-3 space-y-6">
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-blue-500/20 backdrop-blur-xl group">
                            <div className="relative z-10 space-y-6">
                                <h2 className="text-xl md:text-2xl font-display font-bold italic flex items-center gap-3">
                                    <Briefcase className="text-blue-400" />
                                    Department Overview
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    data={recentStudents.filter(s => s.classId && (classes as any)?.[s.classId]).slice(0, 3)}
                                    columns={columns}
                                    isLoading={false}
                                    onRowClick={() => router.push(`/admin/students`)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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

    // Default Admin View
    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-200 pb-10 w-full">
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
                    trend="Digital Registry"
                    className="bg-blue-500/5 border-blue-500/10 cursor-pointer"
                    onClick={() => router.push("/admin/students")}
                />
                <KPICard
                    title="Present Today"
                    value={
                        <div className="flex flex-col gap-1 md:gap-2 mt-1 md:mt-2 w-full pr-2">
                            <div className="flex justify-between items-center group/row">
                                <span className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest italic group-hover/row:text-white transition-colors">Students</span>
                                <span className="text-sm md:text-2xl font-black text-emerald-400 font-display italic leading-none">{stats.presentStudents || 0}</span>
                            </div>
                            <div className="flex justify-between items-center group/row border-t border-white/5 pt-1 md:pt-2">
                                <span className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest italic group-hover/row:text-white transition-colors">Teachers</span>
                                <span className="text-sm md:text-2xl font-black text-blue-400 font-display italic leading-none">{stats.presentTeachers || 0}</span>
                            </div>
                            <div className="flex justify-between items-center group/row border-t border-white/5 pt-1 md:pt-2">
                                <span className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest italic group-hover/row:text-white transition-colors">Support</span>
                                <span className="text-sm md:text-2xl font-black text-amber-400 font-display italic leading-none">{stats.presentStaff || 0}</span>
                            </div>
                        </div>
                    }
                    icon={<ClipboardList className="w-4 h-4 text-emerald-400" />}
                    className="bg-emerald-500/5 border-emerald-500/10 col-span-1 md:row-span-1"
                    onClick={() => router.push("/admin/attendance")}
                />
                <KPICard
                    title="Leave Requests"
                    value={stats.leaveRequests > 0 ? `${stats.leaveRequests} Alert` : "Clean"}
                    icon={<Calendar className={cn("w-4 h-4", stats.leaveRequests > 0 ? "text-rose-400" : "text-amber-400")} />}
                    trend={stats.leaveRequests > 0 ? `⚠️ Priority Action` : "✨ No Backlog"}
                    className={cn(
                        "transition-all duration-500 cursor-pointer",
                        stats.leaveRequests > 0 ? "border-rose-500/40 bg-rose-500/10 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)] animate-pulse-subtle" : "bg-zinc-500/5"
                    )}
                    onClick={() => router.push("/admin/leaves?tab=staff")}
                />
                <KPICard
                    title="Today's Collection"
                    value={`₹${stats.todayCollection}`}
                    icon={<IndianRupee className="w-4 h-4 text-emerald-400" />}
                    trend="Financial Flow"
                    className="bg-emerald-500/5 border-emerald-500/10 cursor-pointer"
                    onClick={() => router.push("/admin/payments")}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {pendingLeavesList.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-top-4 duration-700 bg-rose-500/5 rounded-2xl border border-rose-500/10 p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between border-b border-rose-500/10 pb-2 mb-2">
                                <h2 className="text-[10px] md:text-sm font-black flex items-center gap-2 text-rose-400 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Urgent Action Required
                                </h2>
                                <Link href="/admin/leaves?tab=staff" className="text-[9px] text-muted-foreground hover:text-white underline uppercase font-black tracking-widest">Process</Link>
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
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl md:text-2xl font-display font-bold italic flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-accent" />
                                Financial Performance
                            </h2>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-black">Collection Active</Badge>
                                {(filterClass || filterSection || filterVillage) && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 px-2 text-[9px] font-black uppercase text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
                                        onClick={() => {
                                            setFilterClass("");
                                            setFilterSection("");
                                            setFilterVillage("");
                                        }}
                                    >
                                        Clear All Filters
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* MASTER SUMMARY CARD */}
                            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-transparent border border-indigo-500/20 relative overflow-hidden group/master">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover/master:bg-indigo-500/10 transition-all duration-1000" />
                                <div className="absolute top-6 right-6 z-20">
                                    <CardFilter 
                                        villages={villages} classes={classes} sections={sections}
                                        filterVillage={filterVillage} setFilterVillage={setFilterVillage}
                                        filterClass={filterClass} setFilterClass={setFilterClass}
                                        filterSection={filterSection} setFilterSection={setFilterSection}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-indigo-400">
                                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Outstanding Revenue</span>
                                        </div>
                                        <h3 className="text-4xl md:text-6xl font-display font-bold text-white italic tracking-tighter">
                                            ₹{((stats.finance?.totalFee || 0) - (stats.finance?.totalPaid || 0)).toLocaleString()}
                                        </h3>
                                        <p className="text-xs text-muted-foreground italic">Combined Pending: School + Hostel + Transport + Custom</p>
                                    </div>
                                    <div className="flex flex-col justify-end md:items-end gap-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Combined Target</p>
                                        <p className="text-2xl md:text-3xl font-display font-bold text-indigo-300/80 italic">₹{(stats.finance?.totalFee || 0).toLocaleString()}</p>
                                        <div className="w-full md:w-48 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 transition-all duration-1000" 
                                                style={{ width: `${stats.finance?.totalFee ? (stats.finance.totalPaid / stats.finance.totalFee) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-indigo-400/60 font-mono mt-1">
                                            Collection Progress: {stats.finance?.totalFee ? Math.round((stats.finance.totalPaid / stats.finance.totalFee) * 100) : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "School Fee", paid: stats.finance?.schoolPaid || 0, total: stats.finance?.schoolFee || 0, color: "#60a5fa", icon: GraduationCap },
                                    { label: "Hostel Fee", paid: stats.finance?.hostelPaid || 0, total: stats.finance?.hostelFee || 0, color: "#10b981", icon: Home },
                                    { label: "Transport", paid: stats.finance?.transportPaid || 0, total: stats.finance?.transportFee || 0, color: "#3b82f6", icon: Bus },
                                    { label: "Custom Fee", paid: stats.finance?.customPaid || 0, total: stats.finance?.customFee || 0, color: "#f59e0b", icon: Settings2 }
                                ].map((fee, idx) => (
                                    <div key={idx} className="p-6 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center justify-center text-center gap-4 group/item hover:border-white/20 transition-all relative min-h-[260px]">
                                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover/item:opacity-100 transition-opacity"><CardFilter villages={villages} classes={classes} sections={sections} filterVillage={filterVillage} setFilterVillage={setFilterVillage} filterClass={filterClass} setFilterClass={setFilterClass} filterSection={filterSection} setFilterSection={setFilterSection} size="xs" /></div>
                                        
                                        <div className="relative w-16 h-16 md:w-20 md:h-20">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="16" fill="none" stroke={fee.color} strokeWidth="3" strokeDasharray={`${fee.total > 0 ? (fee.paid / fee.total) * 100 : 0} 100`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center"><fee.icon className="w-6 h-6 text-white/20" /></div>
                                        </div>
                                        
                                        <div className="w-full space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{fee.label}</p>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-center text-[10px] md:text-xs">
                                                    <span className="text-emerald-400 font-bold">Paid:</span>
                                                    <span className="text-white font-mono">₹{fee.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs">
                                                    <span className="text-rose-400 font-bold">Pending:</span>
                                                    <span className="text-white font-mono">₹{(fee.total - fee.paid).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] md:text-xs border-t border-white/5 pt-1 mt-1">
                                                    <span className="text-blue-400 font-bold">Total:</span>
                                                    <span className="text-white font-mono">₹{fee.total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-[8px] font-black uppercase text-white/40 tracking-tighter pt-2 italic">
                                                Progress: {fee.total > 0 ? Math.round((fee.paid / fee.total) * 100) : 0}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(stats.finance?.terms || {}).sort().map(([name, data]) => (
                                    <div key={name} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center text-center gap-3">
                                        <div className="relative w-12 h-12">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray={`${data.total > 0 ? (data.paid / data.total) * 100 : 0} 100`} strokeDashoffset="0" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center"><BookOpen className="w-4 h-4 text-blue-500/30" /></div>
                                        </div>
                                        <div className="w-full space-y-2">
                                            <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest">{name}</p>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex justify-between text-[8px] md:text-[10px]">
                                                    <span className="text-emerald-400/80">Paid:</span>
                                                    <span className="text-white/60 font-mono">₹{data.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-[8px] md:text-[10px]">
                                                    <span className="text-rose-400/80">Left:</span>
                                                    <span className="text-white/60 font-mono">₹{(data.total - data.paid).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-[8px] md:text-[10px] border-t border-white/5 pt-0.5">
                                                    <span className="text-blue-400/80">Total:</span>
                                                    <span className="text-white/60 font-mono">₹{data.total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl md:text-2xl font-display font-bold italic">Latest Registrations</h2>
                            <Link href="/admin/students" className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">Full Database</Link>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
                            <DataTable
                                data={recentStudents.filter(s => s.classId && (classes as any)?.[s.classId]).slice(0, 5)}
                                columns={columns}
                                isLoading={false}
                                onRowClick={() => router.push("/admin/students")}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
