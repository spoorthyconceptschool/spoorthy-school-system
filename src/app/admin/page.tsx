"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, onSnapshot, query, orderBy, where, doc, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cacheManager } from "@/lib/services/cache-manager";
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
    PieChart, Wallet, Bus, Home, Settings2, Filter, X,
    Loader2
} from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
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
    absentStudents?: number;
    absentTeachers?: number;
    absentStaff?: number;
    pendingStudents?: number;
    pendingTeachers?: number;
    pendingStaff?: number;
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
        feeTypeAnalytics?: Record<string, { pending: number; partial: number; noDue: number; totalAccounts: number }>;
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
            <DropdownMenuContent className="w-56 bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl backdrop-blur-xl border-white/10" align="end">
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
    const { user, userData, branchId: userBranchId, role: authRole } = useAuth();
    
    // Safety fallback: if BranchContext is used elsewhere, we stick to the user's specific assigned branch.
    // If the user is Super Admin, they have no specific branch (it's "global").
    const activeBranchId = userBranchId || userData?.schoolId || (authRole === "SUPER_ADMIN" ? "global" : null);
    const { selectedYear, classes, sections, villages, branding } = useMasterData();
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
        staffPresent: 0,
        finance: {
            totalFee: 0,
            totalPaid: 0,
            hostelFee: 0,
            hostelPaid: 0,
            customFee: 0,
            customPaid: 0,
            transportFee: 0,
            transportPaid: 0,
            schoolFee: 0,
            schoolPaid: 0,
            terms: {},
            customFees: {},
            feeTypeAnalytics: {}
        }
    });

    const [loading, setLoading] = useState(false);
    const isDataQuarantined = useRef(false);

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

    // Load and sync dashboard stats with 1ms zero-latency hydration from cache, and clean background fetching
    useEffect(() => {
        if (!user || !selectedYear) return;

        const isFiltered = !!(filterClass || filterSection || filterVillage);
        const cacheKey = `dashboard_stats_${activeBranchId || "global"}_${selectedYear}_${filterClass}_${filterSection}_${filterVillage}`;

        const fetchEnterpriseStats = async (isBackground = false) => {
            let cacheHit = false;
            if (!isBackground) {
                try {
                    const cached = await cacheManager.get<any>(cacheKey);
                    if (cached) {
                        setStats(cached);
                        cacheHit = true;
                    }
                } catch (e) {
                    console.warn("[Dashboard] Failed to read cache:", e);
                }

                // If no cache exists for this filter set, show loading indicator and clear previous metrics
                if (!cacheHit) {
                    setLoading(true);
                    setStats({
                        totalStudents: 0,
                        pendingFees: 0,
                        leaveRequests: 0,
                        totalLeaves: 0,
                        todayCollection: 0,
                        totalStaff: 0,
                        staffPresent: 0,
                        presentStudents: 0,
                        presentTeachers: 0,
                        presentStaff: 0,
                        absentStudents: 0,
                        absentTeachers: 0,
                        absentStaff: 0,
                        pendingStudents: 0,
                        pendingTeachers: 0,
                        pendingStaff: 0,
                        finance: {
                            totalFee: 0,
                            totalPaid: 0,
                            hostelFee: 0,
                            hostelPaid: 0,
                            customFee: 0,
                            customPaid: 0,
                            transportFee: 0,
                            transportPaid: 0,
                            schoolFee: 0,
                            schoolPaid: 0,
                            terms: {},
                            customFees: {},
                            feeTypeAnalytics: {}
                        }
                    });
                }
            }

            try {
                const token = await user.getIdToken();
                let url = `/api/admin/dashboard/stats?year=${encodeURIComponent(selectedYear)}`;
                if (filterClass) url += `&classId=${filterClass}`;
                if (filterSection) url += `&section=${filterSection}`;
                if (filterVillage) url += `&village=${filterVillage}`;
                if (activeBranchId && activeBranchId !== "global") url += `&branchId=${activeBranchId}`;

                const req = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                const res = await req.json();
                console.log("[DEBUG API Response]", res);
                if (res.success) {
                    setStats(res.data);
                    await cacheManager.set(cacheKey, res.data, 5 * 60 * 1000);
                } else {
                    console.error("[DEBUG API Error]", res);
                }
            } catch (e) {
                console.error("[Dashboard] Stats Sync Error:", e);
                isDataQuarantined.current = true;
            } finally {
                if (!isBackground) {
                    setLoading(false);
                }
            }
        };

        fetchEnterpriseStats();
        const interval = setInterval(() => fetchEnterpriseStats(true), 60000);
        
        let unsubCounters = () => {};
        let unsubPay = () => {};
        let unsubAtt = () => {};

        // Only register real-time listeners for the global (unfiltered) view
        if (!isFiltered && !isDataQuarantined.current) {
            // --- REAL-TIME COUNTERS SYNC (ONLY FOR GLOBAL ADMIN) ---
            if (activeBranchId === "global") {
                unsubCounters = onSnapshot(collection(db, "counters"), (snap) => {
                    const counts: any = {};
                    snap.forEach(doc => { counts[doc.id] = doc.data().current || 0; });
                    setStats(prev => ({
                        ...prev,
                        totalStudents: counts.students || prev.totalStudents,
                        totalTeachers: counts.teachers || (prev as any).totalTeachers,
                        totalStaff: counts.staff || prev.totalStaff
                    }));
                }, (err) => {
                    console.warn("[Admin Dashboard] Counters sync warning:", err.message);
                    isDataQuarantined.current = true;
                });
            }

            // --- REAL-TIME PAYMENTS SYNC (TODAY) ---
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            let qPay = query(collection(db, "payments"), where("createdAt", ">=", todayStart));
            if (activeBranchId && activeBranchId !== "global") {
                qPay = query(collection(db, "payments"), where("schoolId", "==", activeBranchId));
            }
            unsubPay = onSnapshot(qPay, (snap) => {
                let total = 0;
                snap.forEach(doc => {
                    const data = doc.data();
                    if (activeBranchId && activeBranchId !== "global" && data.schoolId !== activeBranchId) return;
                    
                    const createdTime = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
                    if (createdTime >= todayStart.getTime()) {
                        if (data.status === "success" || data.status === "SUCCESS" || !data.status) {
                            total += Number(data.amount || 0);
                        }
                    }
                });
                setStats(prev => ({ ...prev, todayCollection: total }));
            }, (err) => {
                console.warn("[Admin Dashboard] Payments sync warning:", err.message);
                isDataQuarantined.current = true;
            });

            // --- ZERO-LATENCY REAL-TIME ATTENDANCE SYNC ---
            const todayStr = new Date().toISOString().split('T')[0];
            let qAtt = query(collection(db, "attendance_daily"), where("date", "==", todayStr));
            if (activeBranchId && activeBranchId !== "global") {
                qAtt = query(collection(db, "attendance_daily"), where("schoolId", "==", activeBranchId), where("date", "==", todayStr));
            }
            unsubAtt = onSnapshot(qAtt, (snap) => {
                let presentStudents = 0, absentStudents = 0;
                let presentTeachers = 0, absentTeachers = 0;
                let presentStaff = 0, absentStaff = 0;

                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (activeBranchId && activeBranchId !== "global" && data.branchId !== activeBranchId) return;
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
            }, (err) => {
                console.warn("[Admin Dashboard] Attendance sync warning:", err.message);
                isDataQuarantined.current = true;
            });
        }

        return () => {
            clearInterval(interval);
            unsubCounters();
            unsubPay();
            unsubAtt();
        };
    }, [user, selectedYear, filterClass, filterSection, filterVillage, activeBranchId]);

    useEffect(() => {
        if (!user || isDataQuarantined.current) return;
        let qLeaves = query(collection(db, "leave_requests"), where("status", "==", "PENDING"), limit(20));
        if (activeBranchId && activeBranchId !== "global") {
            qLeaves = query(collection(db, "leave_requests"), where("status", "==", "PENDING"), where("schoolId", "==", activeBranchId), limit(50));
        }
        const unsubLeaves = onSnapshot(qLeaves, (snap) => {
            let leaves = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));
            leaves.sort((a, b) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
                return dateB - dateA;
            });
            setPendingLeavesList(leaves.slice(0, 5));
        }, (err) => {
            console.warn("[Admin Dashboard] Leave requests sync warning:", err.message);
            isDataQuarantined.current = true;
        });
        return () => unsubLeaves();
    }, [user, selectedYear, activeBranchId]);

    useEffect(() => {
        if (!user || authRole === "TIMETABLE_EDITOR" || isDataQuarantined.current) return;
        
        let studentsQ = query(collection(db, "students"), orderBy("createdAt", "desc"), limit(20));
        if (activeBranchId && activeBranchId !== "global") {
            studentsQ = query(collection(db, "students"), where("branchId", "==", activeBranchId), limit(100));
        }
        
        const unsubscribe = onSnapshot(studentsQ, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, schoolId: doc.id, ...doc.data() } as Student));
            if (activeBranchId && activeBranchId !== "global") {
                list.sort((a, b) => {
                    const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
                    const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
                    return dateB - dateA;
                });
            }
            const finalRecent = list.slice(0, 10);
            setRecentStudents(finalRecent);
        }, (err) => {
            console.warn("[Admin Dashboard] Students sync warning:", err.message);
            isDataQuarantined.current = true;
        });
        return () => unsubscribe();
    }, [user, authRole, activeBranchId]);

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
            key: "schoolId",
            header: "School ID",
            render: (s: any) => {
                return <span className="font-mono text-xs text-white/60">{s.schoolId || "PENDING"}</span>
            }
        },
        {
            key: "createdAt",
            header: "Enrolled On",
            render: (s: Student) => (
                <span className="text-xs text-white/40 font-mono">
                    {s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString('en-GB') : "—"}
                </span>
            )
        }
    ], [classes]);

    if (!mounted) {
        return (
            <div className="w-full min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#64FFDA]" />
            </div>
        );
    }

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

                <div className="grid grid-cols-2 gap-4 px-2 md:px-0 max-w-2xl">
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
                            {branding?.schoolName ? (
                                <span className="bg-gradient-to-r from-white to-[#64FFDA] bg-clip-text text-transparent">
                                    {branding.schoolName}
                                </span>
                            ) : (
                                <>Admin <span className="text-[#64FFDA]">Central</span></>
                            )}
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

                {/* Redesigned Fee Collection Overview Card (Mobile World Class) */}
                <div className="p-4 rounded-[1.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] border border-indigo-500/30 shadow-[0_0_30px_-10px_rgba(79,70,229,0.3)] ring-1 ring-white/5 relative overflow-hidden shrink-0">
                    {/* Intricate Background Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-[30px] -ml-8 -mb-8 pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-300">Live Financial Status</span>
                        </div>
                        <div className="scale-90 origin-right">
                            <CardFilter 
                                villages={villages} classes={classes} sections={sections}
                                filterVillage={filterVillage} setFilterVillage={setFilterVillage}
                                filterClass={filterClass} setFilterClass={setFilterClass}
                                filterSection={filterSection} setFilterSection={setFilterSection} size="xs"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-row items-center gap-4 relative z-10">
                        {/* Left side Pie Chart */}
                        <div className="h-[100px] w-[100px] shrink-0 relative flex justify-center items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={[
                                            { name: 'PAID FEE', value: calculatedStats.finance?.totalPaid || 0 },
                                            { name: 'PENDING FEE', value: Math.max(0, (calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)) }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={35}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="rgba(255,255,255,0.05)"
                                        strokeWidth={1}
                                        cornerRadius={4}
                                    >
                                        <Cell fill="url(#colorPaidMob)" />
                                        <Cell fill="url(#colorPendingMob)" />
                                    </Pie>
                                    <defs>
                                        <linearGradient id="colorPaidMob" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                                        </linearGradient>
                                        <linearGradient id="colorPendingMob" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fb7185" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#e11d48" stopOpacity={1}/>
                                        </linearGradient>
                                    </defs>
                                </RePieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[14px] font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                                    {calculatedStats.finance?.totalFee ? Math.round((calculatedStats.finance.totalPaid / calculatedStats.finance.totalFee) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                        
                        {/* Right side Stats */}
                        <div className="flex-1 flex flex-col justify-center gap-2.5">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400/80">TOTAL EXPECTED</p>
                                <h3 className="text-xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 tracking-tight">
                                    ₹{(calculatedStats.finance?.totalFee || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-400">PAID FEE</p>
                                    <p className="text-sm font-display font-bold text-white leading-none mt-0.5">₹{(calculatedStats.finance?.totalPaid || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[7px] font-black uppercase tracking-[0.1em] text-rose-400">PENDING FEE</p>
                                    <p className="text-sm font-display font-bold text-white leading-none mt-0.5">₹{Math.max(0, (calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)).toLocaleString()}</p>
                                </div>
                            </div>
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
                                                <div className="flex justify-between items-center text-blue-400 font-semibold">
                                                    <span>TOTAL FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{data.total.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-emerald-400 font-semibold">
                                                    <span>PAID FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{data.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-rose-400 font-semibold">
                                                    <span>PENDING FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{(data.total - data.paid).toLocaleString()}</span>
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
                                            <div className="flex justify-between items-center text-blue-400 font-semibold">
                                                <span>TOTAL FEE:</span>
                                                <span className="text-white font-mono font-bold">₹{fee.total.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-emerald-400 font-semibold">
                                                <span>PAID FEE:</span>
                                                <span className="text-white font-mono font-bold">₹{fee.paid.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-rose-400 font-semibold">
                                                <span>PENDING FEE:</span>
                                                <span className="text-white font-mono font-bold">₹{(fee.total - fee.paid).toLocaleString()}</span>
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
                    <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tighter italic pb-1 text-white truncate">
                        {branding?.schoolName ? (
                            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                {branding.schoolName}
                            </span>
                        ) : (
                            <><span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Admin</span> Central</>
                        )}
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
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                            {/* MASTER SUMMARY CARD */}
                            <div className="p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] border border-indigo-500/30 shadow-[0_0_60px_-15px_rgba(79,70,229,0.3)] ring-1 ring-white/5 relative overflow-hidden group/master backdrop-blur-2xl h-full flex flex-col justify-between">
                                {/* Intricate Background Elements */}
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] -mr-48 -mt-48 transition-all duration-1000 group-hover/master:bg-indigo-500/30 mix-blend-screen pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32 mix-blend-screen pointer-events-none" />
                                
                                <div className="absolute top-6 right-8 z-20 scale-90 xl:scale-100 origin-right">
                                    <CardFilter 
                                        villages={villages} classes={classes} sections={sections}
                                        filterVillage={filterVillage} setFilterVillage={setFilterVillage}
                                        filterClass={filterClass} setFilterClass={setFilterClass}
                                        filterSection={filterSection} setFilterSection={setFilterSection}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10 items-center mt-8 xl:mt-4">
                                    {/* Left side Pie Chart */}
                                    <div className="lg:col-span-5 h-[240px] w-full relative flex justify-center items-center">
                                        <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl" />
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'PAID FEE', value: calculatedStats.finance?.totalPaid || 0 },
                                                        { name: 'PENDING FEE', value: Math.max(0, (calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)) }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={95}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth={2}
                                                    cornerRadius={8}
                                                >
                                                    <Cell fill="url(#colorPaid)" filter="drop-shadow(0px 0px 8px rgba(16,185,129,0.5))" />
                                                    <Cell fill="url(#colorPending)" filter="drop-shadow(0px 0px 8px rgba(244,63,94,0.5))" />
                                                </Pie>
                                                <defs>
                                                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#fb7185" stopOpacity={1}/>
                                                        <stop offset="100%" stopColor="#e11d48" stopOpacity={1}/>
                                                    </linearGradient>
                                                </defs>
                                                <ReTooltip 
                                                    formatter={(value: any) => `₹${Number(value || 0).toLocaleString()}`}
                                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[9px] font-black uppercase text-indigo-200/60 tracking-[0.2em] mb-0.5">Collection</span>
                                            <span className="text-2xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tighter filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                                                {calculatedStats.finance?.totalFee ? Math.round((calculatedStats.finance.totalPaid / calculatedStats.finance.totalFee) * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Right side Stats */}
                                    <div className="lg:col-span-7 flex flex-col gap-4">
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">Live Financial Status</span>
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/80 pl-1">TOTAL FEE EXPECTED</p>
                                            <h3 className="text-2xl md:text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 tracking-tight filter drop-shadow-lg leading-none">
                                                ₹{(calculatedStats.finance?.totalFee || 0).toLocaleString()}
                                            </h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="relative overflow-hidden group/stat p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 backdrop-blur-md shadow-lg transition-all hover:border-emerald-400/40">
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all group-hover/stat:bg-emerald-500/20" />
                                                <div className="relative z-10 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400"><TrendingUp size={10} /></div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">PAID FEE</p>
                                                    </div>
                                                    <p className="text-lg md:text-xl font-display font-bold text-white tracking-tight">
                                                        ₹{(calculatedStats.finance?.totalPaid || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="relative overflow-hidden group/stat p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-900/10 border border-rose-500/20 backdrop-blur-md shadow-lg transition-all hover:border-rose-400/40">
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all group-hover/stat:bg-rose-500/20" />
                                                <div className="relative z-10 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400"><AlertTriangle size={10} /></div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">PENDING FEE</p>
                                                    </div>
                                                    <p className="text-lg md:text-xl font-display font-bold text-white tracking-tight">
                                                        ₹{Math.max(0, (calculatedStats.finance?.totalFee || 0) - (calculatedStats.finance?.totalPaid || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FEE TYPE ANALYTICS (DESKTOP & TAB ONLY - HIDDEN ON MOBILE) */}
                            <div className="hidden md:flex flex-col p-6 rounded-[2rem] bg-gradient-to-br from-[#0f172a] via-[#09152b] to-[#020617] border border-cyan-500/20 shadow-[0_0_40px_-10px_rgba(6,182,212,0.15)] ring-1 ring-white/5 relative overflow-hidden h-full justify-between animate-in fade-in duration-300">
                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
                                
                                <div className="relative z-10 space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Fee Accounts Health</span>
                                        </div>
                                        <h3 className="text-xl font-display font-black text-white italic tracking-tight">
                                            Fee Type Analytics
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Outstanding dues & status counts</p>
                                    </div>
                                    
                                    {/* Recharts Bar Chart Section */}
                                    <div className="h-[250px] w-full mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={Object.entries(calculatedStats.finance?.feeTypeAnalytics || {
                                                    "I Term (Admission)": { pending: 0, partial: 0, noDue: 0, totalAccounts: 0 },
                                                    "II Term (Mid-Year)": { pending: 0, partial: 0, noDue: 0, totalAccounts: 0 },
                                                    "III Term (Final)": { pending: 0, partial: 0, noDue: 0, totalAccounts: 0 }
                                                })
                                                .filter(([feeName]) => feeName !== "School Fee")
                                                .sort(([a], [b]) => {
                                                    const order: Record<string, number> = {
                                                        "I Term (Admission)": 1,
                                                        "II Term (Mid-Year)": 2,
                                                        "III Term (Final)": 3,
                                                        "Transport": 4
                                                    };
                                                    return (order[a] || 99) - (order[b] || 99);
                                                })
                                                .map(([feeName, counts]: [string, any]) => {
                                                    let displayName = feeName;
                                                    if (feeName.includes("III Term")) displayName = "Term 3";
                                                    else if (feeName.includes("II Term")) displayName = "Term 2";
                                                    else if (feeName.includes("I Term")) displayName = "Term 1";
                                                    return {
                                                        name: displayName,
                                                        "No Due": counts.noDue || 0,
                                                        "Partial": counts.partial || 0,
                                                        "Pending": counts.pending || 0
                                                    };
                                                })}
                                                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                                            >
                                                <XAxis 
                                                    dataKey="name" 
                                                    stroke="rgba(255,255,255,0.4)" 
                                                    fontSize={9}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis 
                                                    stroke="rgba(255,255,255,0.4)" 
                                                    fontSize={9}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <ReTooltip
                                                    cursor={false}
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                        backdropFilter: 'blur(10px)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '12px',
                                                        color: '#fff',
                                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                                    }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={36} 
                                                    iconType="circle"
                                                    iconSize={8}
                                                    wrapperStyle={{ fontSize: '9px', color: '#94a3b8', paddingTop: '10px' }}
                                                />
                                                <Bar 
                                                    dataKey="No Due" 
                                                    fill="#10b981" 
                                                    radius={[3, 3, 0, 0]} 
                                                    activeBar={{ fill: '#34d399', stroke: '#10b981', strokeWidth: 1 }}
                                                />
                                                <Bar 
                                                    dataKey="Partial" 
                                                    fill="#f59e0b" 
                                                    radius={[3, 3, 0, 0]} 
                                                    activeBar={{ fill: '#fbbf24', stroke: '#f59e0b', strokeWidth: 1 }}
                                                />
                                                <Bar 
                                                    dataKey="Pending" 
                                                    fill="#f43f5e" 
                                                    radius={[3, 3, 0, 0]} 
                                                    activeBar={{ fill: '#fb7185', stroke: '#f43f5e', strokeWidth: 1 }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
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
                                    <div key={idx} className="p-5 rounded-2xl bg-[#131e35]/80 border border-white/10 flex flex-col items-center justify-center text-center gap-3 group/item hover:border-[#64FFDA]/30 transition-all relative min-h-[220px] shadow-xl">
                                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover/item:opacity-100 transition-opacity"><CardFilter villages={villages} classes={classes} sections={sections} filterVillage={filterVillage} setFilterVillage={setFilterVillage} filterClass={filterClass} setFilterClass={setFilterClass} filterSection={filterSection} setFilterSection={setFilterSection} size="xs" /></div>
                                        
                                        <div className="relative w-14 h-14 md:w-16 md:h-16">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="16" fill="none" stroke={fee.color} strokeWidth="3" strokeDasharray={`${fee.total > 0 ? (fee.paid / fee.total) * 100 : 0} 100`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center"><fee.icon className="w-6 h-6 text-white/50" /></div>
                                        </div>
                                        
                                        <div className="w-full space-y-2">
                                            <p className="text-xs font-black uppercase text-white tracking-widest">{fee.label}</p>
                                            <div className="flex flex-col gap-1.5 bg-black/20 p-3 rounded-xl border border-white/5">
                                                <div className="flex justify-between items-center text-xs md:text-sm">
                                                    <span className="text-blue-400 font-bold">TOTAL FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{fee.total.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs md:text-sm">
                                                    <span className="text-emerald-400 font-bold">PAID FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{fee.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs md:text-sm border-t border-white/10 pt-1.5 mt-0.5">
                                                    <span className="text-rose-400 font-bold">PENDING FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{(fee.total - fee.paid).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-[10px] font-black uppercase text-white/40 tracking-tighter pt-2 italic">
                                                Progress: {fee.total > 0 ? Math.round((fee.paid / fee.total) * 100) : 0}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(calculatedStats.finance?.terms || {}).sort().map(([name, data]) => (
                                    <div key={name} className="p-4 rounded-2xl bg-[#131e35]/80 border border-white/10 hover:border-[#64FFDA]/30 flex flex-col items-center text-center gap-3 transition-all shadow-xl">
                                        <div className="relative w-12 h-12">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="16" fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray={`${data.total > 0 ? (data.paid / data.total) * 100 : 0} 100`} strokeDashoffset="0" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center"><BookOpen className="w-4 h-4 text-blue-500/50" /></div>
                                        </div>
                                        <div className="w-full space-y-2">
                                            <p className="text-xs font-black uppercase text-white tracking-widest">{name}</p>
                                            <div className="flex flex-col gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                                                <div className="flex justify-between text-xs md:text-sm">
                                                    <span className="text-blue-400 font-bold">TOTAL FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{data.total.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs md:text-sm">
                                                    <span className="text-emerald-400 font-bold">PAID FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{data.paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs md:text-sm border-t border-white/10 pt-1 mt-0.5">
                                                    <span className="text-rose-400 font-bold">PENDING FEE:</span>
                                                    <span className="text-white font-mono font-bold">₹{(data.total - data.paid).toLocaleString()}</span>
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
