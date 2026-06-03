"use client";

import { useEffect, useState, useMemo } from "react";
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
        customFees?: Record<string, { total: number; paid: number }>;
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
    
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [filterClass, setFilterClass] = useState<string>("");
    const [filterSection, setFilterSection] = useState<string>("");
    const [filterVillage, setFilterVillage] = useState<string>("");

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

    const [loading, setLoading] = useState(false);

    // Derived Statistics Aggregator to prevent timing & race condition glitches
    const calculatedStats = useMemo(() => {
        const totalStud = stats.totalStudents || 0;
        const totalTeach = (stats as any).totalTeachers || 0;
        const totalStaf = stats.totalStaff || 0;

        const presStud = stats.presentStudents || 0;
        const absStud = (stats as any).absentStudents || 0;
        const pendStud = Math.max(0, totalStud - presStud - absStud);

        const presTeach = stats.presentTeachers || 0;
        const absTeach = (stats as any).absentTeachers || 0;
        const pendTeach = Math.max(0, totalTeach - presTeach - absTeach);

        const presStaf = stats.presentStaff || 0;
        const absStaf = (stats as any).absentStaff || 0;
        const pendStaf = Math.max(0, totalStaf - presStaf - absStaf);

        return {
            ...stats,
            totalStudents: totalStud,
            totalTeachers: totalTeach,
            totalStaff: totalStaf,
            presentStudents: presStud,
            absentStudents: absStud,
            pendingStudents: pendStud,
            presentTeachers: presTeach,
            absentTeachers: absTeach,
            pendingTeachers: pendTeach,
            presentStaff: presStaf,
            absentStaff: absStaf,
            pendingStaff: pendStaf
        };
    }, [stats]);

    // Hydration-safe cache loading
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedYear) {
            const cachedStudents = localStorage.getItem(`${DASHBOARD_CACHE_KEY}_students`);
            if (cachedStudents) {
                try { setRecentStudents(JSON.parse(cachedStudents)); } catch (e) {}
            }
            const cachedStats = localStorage.getItem(`${DASHBOARD_CACHE_KEY}_stats`);
            if (cachedStats) {
                try { setStats(prev => ({ ...prev, ...JSON.parse(cachedStats) })); } catch (e) {}
            }
        }
    }, [selectedYear, DASHBOARD_CACHE_KEY]);

    useEffect(() => {
        if (!user) return;

        const isFiltered = !!(filterClass || filterSection || filterVillage);

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
                    if (!isFiltered) {
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
        const interval = setInterval(() => fetchEnterpriseStats(true), 60000);
        
        let unsubCounters = () => {};
        let unsubPay = () => {};
        let unsubAtt = () => {};

        // Only register real-time listeners for the global (unfiltered) view
        if (!isFiltered) {
            // --- REAL-TIME COUNTERS SYNC ---
            unsubCounters = onSnapshot(collection(db, "counters"), (snap) => {
                const counts: any = {};
                snap.forEach(doc => { counts[doc.id] = doc.data().current || 0; });
                setStats(prev => ({
                    ...prev,
                    totalStudents: counts.students || prev.totalStudents,
                    totalTeachers: counts.teachers || (prev as any).totalTeachers,
                    totalStaff: counts.staff || prev.totalStaff
                }));
            });

            // --- REAL-TIME PAYMENTS SYNC (TODAY) ---
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const qPay = query(collection(db, "payments"), where("createdAt", ">=", todayStart));
            unsubPay = onSnapshot(qPay, (snap) => {
                let total = 0;
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === "success" || data.status === "SUCCESS" || !data.status) {
                        total += Number(data.amount || 0);
                    }
                });
                setStats(prev => ({ ...prev, todayCollection: total }));
            });

            // --- ZERO-LATENCY REAL-TIME ATTENDANCE SYNC ---
            const todayStr = new Date().toISOString().split('T')[0];
            const qAtt = query(collection(db, "attendance_daily"), where("date", "==", todayStr));
            unsubAtt = onSnapshot(qAtt, (snap) => {
                let presentStudents = 0, absentStudents = 0;
                let presentTeachers = 0, absentTeachers = 0;
                let presentStaff = 0, absentStaff = 0;

                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.type === "TEACHERS") {
                        presentTeachers += data.stats?.present || 0;
                        absentTeachers += data.stats?.absent || 0;
                    } else if (data.type === "STAFF") {
                        presentStaff += data.stats?.present || 0;
                        absentStaff += data.stats?.absent || 0;
                    } else {
                        presentStudents += data.stats?.present || 0;
                        absentStudents += data.stats?.absent || 0;
                    }
                });

                setStats(prev => ({
                    ...prev,
                    presentStudents,
                    absentStudents,
                    presentTeachers,
                    absentTeachers,
                    presentStaff,
                    absentStaff
                }));

                if (!snap.metadata.hasPendingWrites) {
                    fetchEnterpriseStats(true);
                }
            });
        }

        return () => {
            clearInterval(interval);
            unsubCounters();
            unsubPay();
            unsubAtt();
        };
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

    const columns = useMemo(() => [
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
    ], [classes]);

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
                                Last Synced: {mounted ? new Date().toLocaleTimeString() : "..."}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
                    <KPICard
                        title="Today's Revenue"
                        value={`₹${calculatedStats.todayCollection.toLocaleString()}`}
                        icon={<IndianRupee className="w-4 h-4 text-emerald-400" />}
                        trend="Real-time Flow"
                        className="bg-emerald-500/5 border-emerald-500/10 cursor-pointer hover:bg-emerald-500/10 transition-all"
                        onClick={() => router.push("/admin/payments")}
                    />
                    <KPICard
                        title="Outstanding Fee Payment"
                        value={`₹${((calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)).toLocaleString()}`}
                        icon={<Database className="w-4 h-4 text-rose-400" />}
                        trend="Fee Payment Recovery"
                        className="bg-rose-500/5 border-rose-500/10 cursor-pointer hover:bg-rose-500/10 transition-all"
                        onClick={() => router.push("/admin/fees/pending")}
                    />
                    <KPICard
                        title="Active Faculty"
                        value={calculatedStats.totalStaff}
                        icon={<Users className="w-4 h-4 text-blue-400" />}
                        trend="Total Staff strength"
                        className="bg-blue-500/5 border-blue-500/10 cursor-pointer hover:bg-blue-500/10 transition-all"
                        onClick={() => router.push("/admin/faculty")}
                    />
                    <KPICard
                        title="Growth Index"
                        value={calculatedStats.totalStudents}
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
        <div className="w-full h-full">
            {/* ═══ MOBILE VIEW (Classy Slate-Blue Theme, Viewport Fitted) ═══ */}
            <div className="md:hidden flex flex-col h-[calc(100dvh-4.5rem)] w-full overflow-y-auto no-scrollbar px-2 pt-2 pb-20 gap-2 animate-in fade-in">
                {/* Header Compact */}
                <div className="flex items-center justify-between shrink-0 px-1">
                    <div>
                        <h1 className="font-display text-base font-bold tracking-tight italic text-white leading-none">
                            Admin <span className="text-[#64FFDA]">Central</span>
                        </h1>
                        <p className="text-[7px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">Real-time School Operations</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-[#131e35]/80 hover:bg-white/5 text-[10px] rounded-xl px-2.5">
                            <Download size={12} className="text-[#64FFDA]" />
                            <span>Export</span>
                        </Button>
                        <AddStudentModal>
                            <Button size="sm" className="h-8 gap-1 bg-[#64FFDA] text-black hover:bg-[#64FFDA]/90 text-[10px] font-bold rounded-xl px-2.5">
                                <Plus size={12} className="stroke-[3]" />
                                <span>Add Student</span>
                            </Button>
                        </AddStudentModal>
                    </div>
                </div>

                {/* 4 KPI Cards in a tight 2x2 grid (MEMBERS, STUDENTS ATT., STAFF ATT., FEE COLLECTION) */}
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                    {/* Card 1: Members */}
                    <div className="bg-[#131e35]/80 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 transition-all" onClick={() => router.push("/admin/students")}>
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">Members</span>
                            <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
                        </div>
                        <div className="grid grid-cols-3 gap-0.5 text-center flex-1 items-center">
                            <div className="flex flex-col justify-center">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Students</span>
                                <span className="text-sm font-extrabold text-[#38bdf8] font-mono mt-1 leading-none">{calculatedStats.totalStudents}</span>
                            </div>
                            <div className="flex flex-col justify-center border-l border-white/10">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Teachers</span>
                                <span className="text-sm font-extrabold text-[#c084fc] font-mono mt-1 leading-none">{calculatedStats.totalTeachers}</span>
                            </div>
                            <div className="flex flex-col justify-center border-l border-white/10">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Staff</span>
                                <span className="text-sm font-extrabold text-[#818cf8] font-mono mt-1 leading-none">{calculatedStats.totalStaff}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Student Att. */}
                    <div className="bg-[#131e35]/80 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 transition-all" onClick={() => router.push("/admin/attendance")}>
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">Students Att.</span>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="grid grid-cols-3 gap-0.5 text-center flex-1 items-center">
                            <div className="flex flex-col justify-center">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Present</span>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono mt-1 leading-none">{calculatedStats.presentStudents}</span>
                            </div>
                            <div className="flex flex-col justify-center border-l border-white/10">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Absent</span>
                                <span className="text-sm font-extrabold text-[#f43f5e] font-mono mt-1 leading-none">{calculatedStats.absentStudents}</span>
                            </div>
                            <div className="flex flex-col justify-center border-l border-white/10">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Unmarked</span>
                                <span className="text-sm font-extrabold text-[#f59e0b] font-mono mt-1 leading-none">{calculatedStats.pendingStudents}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Staff Att. */}
                    <div className="bg-[#131e35]/80 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 transition-all" onClick={() => router.push("/admin/attendance")}>
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">Staff Att.</span>
                            <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="grid grid-cols-3 gap-0.5 text-center flex-1 items-center">
                            <div className="flex flex-col justify-center">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Present</span>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono mt-1 leading-none">{calculatedStats.presentTeachers + calculatedStats.presentStaff}</span>
                            </div>
                            <div className="flex flex-col justify-center border-l border-white/10">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Absent</span>
                                <span className="text-sm font-extrabold text-[#f43f5e] font-mono mt-1 leading-none">{calculatedStats.absentTeachers + calculatedStats.absentStaff}</span>
                            </div>
                            <div className="flex flex-col justify-center border-l border-white/10">
                                <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Unmarked</span>
                                <span className="text-sm font-extrabold text-[#f59e0b] font-mono mt-1 leading-none">{calculatedStats.pendingTeachers + calculatedStats.pendingStaff}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Fee Collection */}
                    <div className="bg-[#131e35]/80 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 transition-all" onClick={() => router.push("/admin/payments")}>
                        <div className="flex justify-between items-center mb-1 shrink-0">
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider">Fee Collection</span>
                            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 mt-1">
                            <span className="text-base font-extrabold text-white font-mono leading-none">₹{calculatedStats.todayCollection.toLocaleString()}</span>
                            <span className="text-[7px] font-black uppercase text-emerald-400 tracking-widest mt-1.5 leading-none">Today Collection</span>
                        </div>
                    </div>
                </div>

                {/* Redesigned Fee Collection Overview Card */}
                <div className="bg-gradient-to-br from-[#1a2b4b] via-[#101b33] to-[#0a1122] border border-[#3b82f6]/20 rounded-2xl p-3.5 shrink-0 flex flex-col justify-between shadow-2xl">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                <Wallet size={14} />
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Fee Collection Overview</span>
                        </div>
                        <div className="p-1.5 rounded-full bg-white/5 text-zinc-400">
                            <Filter size={10} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Pending Fees</div>
                            <div className="text-lg font-bold text-white font-mono mt-1">
                                ₹{((calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)).toLocaleString()}
                            </div>
                            <div className="text-[8px] text-zinc-500 italic mt-0.5">From all fee categories</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Collection Progress</div>
                            <div className="text-lg font-bold text-[#64FFDA] font-mono mt-1">
                                {calculatedStats.finance?.totalFee ? Math.round((calculatedStats.finance.totalPaid / calculatedStats.finance.totalFee) * 100) : 0}%
                            </div>
                            <div className="text-[8px] text-zinc-500 italic mt-0.5">
                                ₹{(calculatedStats.finance?.totalPaid || 0).toLocaleString()} of ₹{(calculatedStats.finance?.totalFee || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="col-span-2 w-full h-1.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-[#64FFDA] transition-all duration-1000" 
                                style={{ width: `${calculatedStats.finance?.totalFee ? (calculatedStats.finance.totalPaid / calculatedStats.finance.totalFee) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="mt-1">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Expected Collection</div>
                            <div className="text-xs font-bold text-purple-300 font-mono mt-1">
                                ₹{(calculatedStats.finance?.totalFee || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-right mt-1">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Academic Year</div>
                            <div className="text-xs font-bold text-blue-300 font-mono mt-1">{selectedYear}</div>
                        </div>
                    </div>
                </div>

                {/* Batch 1: Term Fee Analytics */}
                <div className="shrink-0 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Term Fee Analytics</span>
                        <Link href="/admin/fees" className="text-[8px] text-accent/80 font-bold uppercase tracking-tighter hover:underline">View Details →</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pb-0.5">
                        {Object.entries(calculatedStats.finance?.terms || {})
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([name, data]) => {
                                const pct = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;
                                return (
                                    <div key={name} className="p-2.5 bg-[#131e35]/80 border border-white/10 rounded-xl flex flex-col justify-between">
                                        <div className="text-[8px] font-black uppercase text-slate-300 tracking-wider truncate mb-1.5">{name}</div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Circular SVG */}
                                            <div className="relative w-8 h-8 shrink-0">
                                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                                                    <circle cx="18" cy="18" r="16" fill="none" stroke="#60a5fa" strokeWidth="3.5" strokeDasharray={`${pct} 100`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white">
                                                    {pct}%
                                                </div>
                                            </div>
                                            {/* Details */}
                                            <div className="flex-1 min-w-0 space-y-0.5 text-[8px]">
                                                <div className="flex justify-between items-center text-zinc-500 font-semibold">
                                                    <span>TOTAL</span>
                                                    <span className="text-white font-mono">₹{data.total.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-emerald-400 font-semibold">
                                                    <span>PAID</span>
                                                    <span className="text-white font-mono">₹{data.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-rose-400 font-semibold">
                                                    <span>PENDING</span>
                                                    <span className="text-white font-mono">₹{(data.total - data.paid).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Batch 2: Other Fee Analytics */}
                <div className="shrink-0 flex flex-col gap-1.5">
                    <div className="px-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Other Fee Analytics</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pb-0.5">
                        {[
                            { label: "School Fees (Total)", paid: calculatedStats.finance?.schoolPaid || 0, total: calculatedStats.finance?.schoolFee || 0, color: "#60a5fa" },
                            { label: "Transport", paid: calculatedStats.finance?.transportPaid || 0, total: calculatedStats.finance?.transportFee || 0, color: "#3b82f6" },
                            ...Object.entries(calculatedStats.finance?.customFees || {}).map(([name, data]: [string, any]) => {
                                let color = "#f59e0b"; // Curated amber
                                const upperName = name.toUpperCase();
                                if (upperName.includes("HOSTEL")) color = "#10b981";
                                else if (upperName.includes("EXAM")) color = "#a855f7";
                                else if (upperName.includes("BOOK") || upperName.includes("LIBRARY")) color = "#ec4899";
                                else if (upperName.includes("UNIFORM")) color = "#06b6d4";
                                return {
                                    label: name,
                                    paid: data.paid || 0,
                                    total: data.total || 0,
                                    color
                                };
                            })
                        ].map((fee, idx) => {
                            const pct = fee.total > 0 ? Math.round((fee.paid / fee.total) * 100) : 0;
                            return (
                                <div key={idx} className="p-2.5 bg-[#131e35]/80 border border-white/10 rounded-xl flex flex-col justify-between">
                                    <div className="text-[8px] font-black uppercase text-zinc-300 tracking-wider truncate mb-1.5">{fee.label}</div>
                                    <div className="flex items-center gap-1.5">
                                        {/* Circular SVG */}
                                        <div className="relative w-8 h-8 shrink-0">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                                                <circle cx="18" cy="18" r="16" fill="none" stroke={fee.color} strokeWidth="3.5" strokeDasharray={`${pct} 100`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white">
                                                {pct}%
                                            </div>
                                        </div>
                                        {/* Details */}
                                        <div className="flex-1 min-w-0 space-y-0.5 text-[8px]">
                                            <div className="flex justify-between items-center text-zinc-500 font-semibold">
                                                <span>TOTAL</span>
                                                <span className="text-white font-mono">₹{fee.total.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-emerald-400 font-semibold">
                                                <span>PAID</span>
                                                <span className="text-white font-mono">₹{fee.paid.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-rose-400 font-semibold">
                                                <span>PENDING</span>
                                                <span className="text-white font-mono">₹{(fee.total - fee.paid).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Latest Registrations Table Section */}
                <div className="flex-1 bg-[#131e35]/80 border border-white/10 rounded-2xl flex flex-col overflow-hidden min-h-0">
                    <div className="px-3 py-2 border-b border-white/5 shrink-0 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-white/80">Latest Registrations</span>
                        <Link href="/admin/students" className="text-[8px] text-accent font-bold hover:underline">ALL</Link>
                    </div>
                    <div className="flex-1 overflow-auto p-1 scrollbar-thin">
                        <DataTable
                            data={recentStudents.filter(s => s.classId && (classes as any)?.[s.classId]).slice(0, 3)}
                            columns={columns}
                            isLoading={false}
                            onRowClick={() => router.push("/admin/students")}
                        />
                    </div>
                </div>
            </div>

            {/* ═══ DESKTOP VIEW ═══ */}
            <div className="hidden md:block space-y-6 md:space-y-8 animate-in fade-in duration-200 pb-10 w-full">
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

            {/* Desktop KPI Grid (MEMBERS, STUDENTS ATT., STAFF ATT., FEE COLLECTION) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Card 1: Members */}
                <div 
                    className="bg-[#131e35]/80 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 hover:bg-[#172542]/95 transition-all duration-300 shadow-xl"
                    onClick={() => router.push("/admin/students")}
                >
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <span className="text-[10px] md:text-xs font-black uppercase text-slate-300 tracking-wider">Members</span>
                        <div className="p-2 bg-white/5 rounded-xl text-[#38bdf8] border border-white/5">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center items-center flex-1">
                        <div className="flex flex-col justify-center">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Students</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#38bdf8] font-mono mt-1.5 leading-none">{calculatedStats.totalStudents}</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-white/10 h-8 md:h-12">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Teachers</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#c084fc] font-mono mt-1.5 leading-none">{calculatedStats.totalTeachers}</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-white/10 h-8 md:h-12">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Staff</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#818cf8] font-mono mt-1.5 leading-none">{calculatedStats.totalStaff}</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Student Attendance */}
                <div 
                    className="bg-[#131e35]/80 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 hover:bg-[#172542]/95 transition-all duration-300 shadow-xl"
                    onClick={() => router.push("/admin/attendance")}
                >
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <span className="text-[10px] md:text-xs font-black uppercase text-slate-300 tracking-wider">Students Att.</span>
                        <div className="p-2 bg-white/5 rounded-xl text-emerald-400 border border-white/5">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center items-center flex-1">
                        <div className="flex flex-col justify-center">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Present</span>
                            <span className="text-base md:text-2xl font-extrabold text-emerald-400 font-mono mt-1.5 leading-none">{calculatedStats.presentStudents}</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-white/10 h-8 md:h-12">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Absent</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#f43f5e] font-mono mt-1.5 leading-none">{calculatedStats.absentStudents}</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-white/10 h-8 md:h-12">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Unmarked</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#f59e0b] font-mono mt-1.5 leading-none">{calculatedStats.pendingStudents}</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Staff Attendance */}
                <div 
                    className="bg-[#131e35]/80 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 hover:bg-[#172542]/95 transition-all duration-300 shadow-xl"
                    onClick={() => router.push("/admin/attendance")}
                >
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <span className="text-[10px] md:text-xs font-black uppercase text-slate-300 tracking-wider">Staff Att.</span>
                        <div className="p-2 bg-white/5 rounded-xl text-purple-400 border border-white/5">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center items-center flex-1">
                        <div className="flex flex-col justify-center">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Present</span>
                            <span className="text-base md:text-2xl font-extrabold text-emerald-400 font-mono mt-1.5 leading-none">{calculatedStats.presentTeachers + calculatedStats.presentStaff}</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-white/10 h-8 md:h-12">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Absent</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#f43f5e] font-mono mt-1.5 leading-none">{calculatedStats.absentTeachers + calculatedStats.absentStaff}</span>
                        </div>
                        <div className="flex flex-col justify-center border-l border-white/10 h-8 md:h-12">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Unmarked</span>
                            <span className="text-base md:text-2xl font-extrabold text-[#f59e0b] font-mono mt-1.5 leading-none">{calculatedStats.pendingTeachers + calculatedStats.pendingStaff}</span>
                        </div>
                    </div>
                </div>

                {/* Card 4: Fee Collection */}
                <div 
                    className="bg-[#131e35]/80 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col justify-between cursor-pointer hover:border-[#64FFDA]/30 hover:bg-[#172542]/95 transition-all duration-300 shadow-xl"
                    onClick={() => router.push("/admin/payments")}
                >
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <span className="text-[10px] md:text-xs font-black uppercase text-slate-300 tracking-wider">Fee Collection</span>
                        <div className="p-2 bg-white/5 rounded-xl text-emerald-400 border border-white/5">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1 mt-1">
                        <span className="text-xl md:text-3xl font-extrabold text-white font-mono leading-none">₹{calculatedStats.todayCollection.toLocaleString()}</span>
                        <span className="text-[9px] md:text-[10px] font-black uppercase text-emerald-400 tracking-widest mt-2 leading-none">Today Collection</span>
                    </div>
                </div>
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
                                            ₹{((calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)).toLocaleString()}
                                        </h3>
                                        <p className="text-xs text-muted-foreground italic">Combined Outstanding: School + Transport + Custom Fees</p>
                                    </div>
                                    <div className="flex flex-col justify-end md:items-end gap-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Combined Target</p>
                                        <p className="text-2xl md:text-3xl font-display font-bold text-indigo-300/80 italic">₹{(calculatedStats.finance?.totalFee || 0).toLocaleString()}</p>
                                        <div className="w-full md:w-48 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 transition-all duration-1000" 
                                                style={{ width: `${calculatedStats.finance?.totalFee ? (calculatedStats.finance.totalPaid / calculatedStats.finance.totalFee) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-indigo-400/60 font-mono mt-1">
                                            Collection Progress: {calculatedStats.finance?.totalFee ? Math.round((calculatedStats.finance.totalPaid / calculatedStats.finance.totalFee) * 100) : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "School Fee", paid: calculatedStats.finance?.schoolPaid || 0, total: calculatedStats.finance?.schoolFee || 0, color: "#60a5fa", icon: GraduationCap },
                                    { label: "Transport", paid: calculatedStats.finance?.transportPaid || 0, total: calculatedStats.finance?.transportFee || 0, color: "#3b82f6", icon: Bus },
                                    ...Object.entries(calculatedStats.finance?.customFees || {}).map(([name, data]: [string, any]) => {
                                        const upperName = name.toUpperCase();
                                        let color = "#f59e0b"; // Curated amber
                                        let icon = Settings2;

                                        if (upperName.includes("HOSTEL")) {
                                            color = "#10b981"; // Emerald
                                            icon = Home;
                                        } else if (upperName.includes("EXAM")) {
                                            color = "#a855f7"; // Purple
                                            icon = FileText;
                                        } else if (upperName.includes("BOOK") || upperName.includes("LIBRARY")) {
                                            color = "#ec4899"; // Pink
                                            icon = BookOpen;
                                        } else if (upperName.includes("UNIFORM")) {
                                            color = "#06b6d4"; // Cyan
                                            icon = Layers;
                                        }

                                        return {
                                            label: name,
                                            paid: data.paid || 0,
                                            total: data.total || 0,
                                            color,
                                            icon
                                        };
                                    })
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
                                {Object.entries(calculatedStats.finance?.terms || {}).sort().map(([name, data]) => (
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
        </div>
    );
}
