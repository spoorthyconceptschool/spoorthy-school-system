"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, ChevronRight, GraduationCap, ClipboardCheck, Sparkle, Search, Filter } from "lucide-react";
import { HallTicketGenerator } from "@/components/admin/hall-ticket-generator";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";

const EXAMS_CACHE_KEY = "spoorthy_exams_cache";
const DEFAULT_EXAMS = [
    {
        id: "exam_default_1",
        name: "Quarterly Examinations",
        startDate: "2026-09-15",
        endDate: "2026-09-22",
        status: "ACTIVE",
        academicYear: "2025-2026",
        classIds: ["CLS_01", "CLS_02", "CLS_03", "CLS_04"]
    },
    {
        id: "exam_default_2",
        name: "Half-Yearly Examinations",
        startDate: "2026-12-10",
        endDate: "2026-12-18",
        status: "ACTIVE",
        academicYear: "2025-2026",
        classIds: ["CLS_01", "CLS_02", "CLS_03", "CLS_04", "CLS_05"]
    }
];

export default function ExamsListPage() {
    const { selectedYear, classes: classesData } = useMasterData();
    const { role, branchId: authBranchId, userData } = useAuth();
    const activeBranchId = authBranchId || userData?.schoolId || userData?.branchId || "global";
    const [exams, setExams] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(EXAMS_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch(e) {}
            }
        }
        return DEFAULT_EXAMS;
    });
    const [loading, setLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [hasLoggedError, setHasLoggedError] = useState(false);
    const { loading: authLoading } = useAuth();
    const router = useRouter();
 
    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: ""
    });
 
    const classes = Object.values(classesData || {}).map((c: any) => ({
        id: c.id,
        name: c.name,
        order: c.order || 99
    })).sort((a: any, b: any) => a.order - b.order);
 
    const fetchExams = async () => {
        // Circuit breaker: prevent infinite loops during auth transitions or if already errored
        if (authLoading || !activeBranchId || hasLoggedError) {
            if (!activeBranchId) setLoading(false);
            return;
        }

        // Synchronous cache purge before fetching new tenant data
        setExams([]);
        setLoading(true);
        
        try {
            const q = query(collection(db, "exams"), where("schoolId", "==", activeBranchId));
            const snap = await getDocs(q);
            const allExams = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort in memory by createdAt descending
            allExams.sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return dateB - dateA;
            });
            
            // Client-side filter to support backward compatibility and enforce academic year isolation
            const filtered = allExams.filter((exam: any) => {
                const examYear = exam.academicYear || "2025-2026";
                return examYear === selectedYear;
            });
            
            setExams(filtered);
            if (typeof window !== 'undefined') {
                localStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify(filtered));
            }
        } catch (e: any) {
            console.warn("[Exams] Fetch error / Permission Denied:", e.message);
            // TRIPS THE CIRCUIT BREAKER
            setHasLoggedError(true);
        } finally {
            setLoading(false);
        }
    };
 
    useEffect(() => {
        fetchExams();
    }, [selectedYear, activeBranchId, authLoading, hasLoggedError]);
 
    const handleCreate = async () => {
        if (!form.name || !form.startDate || !form.endDate) return;
        if (selectedClasses.length === 0) {
            alert("Please select at least one eligible class for this exam.");
            return;
        }
        setSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, "exams"), {
                ...form,
                academicYear: selectedYear,
                createdAt: serverTimestamp(),
                status: "ACTIVE",
                hallTicketRule: "NO_RESTRICTION",
                hallTicketLimitAmount: 0,
                hallTicketTerm: "",
                classIds: selectedClasses,
                schoolId: activeBranchId,
                branchId: activeBranchId
            });
            setCreateOpen(false);
            setForm({ name: "", startDate: "", endDate: "" });
            setSelectedClasses([]);

            // Notify all teachers
            await createNotification({
                target: "ALL_FACULTY",
                title: "New Examination Announced",
                message: `The ${form.name} session has been scheduled from ${new Date(form.startDate).toLocaleDateString('en-GB')} to ${new Date(form.endDate).toLocaleDateString('en-GB')}. Please prepare your subject syllabus.`,
                type: "NOTICE"
            });

            // Notify only selected student class channels immediately!
            selectedClasses.forEach(classId => {
                createNotification({
                    target: `class_${classId}`,
                    title: `New Exam Scheduled: ${form.name}`,
                    message: `The ${form.name} has been scheduled from ${new Date(form.startDate).toLocaleDateString('en-GB')} to ${new Date(form.endDate).toLocaleDateString('en-GB')}. Please check your exam portal.`,
                    type: "NOTICE"
                }).catch(err => console.error(`Failed notifying class_${classId}:`, err));
            });

            router.push(`/admin/exams/${docRef.id}`);
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-200">
            {/* Header / Hero Section - Always Visible immediately */}
            <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] border border-white/5 p-6 md:p-10 shadow-2xl">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20 px-4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/5 blur-[80px] rounded-full -ml-10 -mb-10" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-3 w-full lg:max-w-xl">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                                <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                            </span>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">Academic Portal</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tight leading-none flex items-center gap-3">
                            Examinations
                            {role !== "MANAGER" && (
                                <Button
                                    onClick={() => setCreateOpen(true)}
                                    size="icon" 
                                    className="w-[40px] h-[40px] rounded-full bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black shadow-[0_4px_14px_rgba(0,229,255,0.15)] transition-transform hover:scale-105 active:scale-95 shrink-0"
                                >
                                    <Plus size={22} strokeWidth={2.5} />
                                </Button>
                            )}
                        </h1>
                    </div>

                    <div className="flex flex-row gap-3 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none">
                            <HallTicketGenerator />
                        </div>
                        <Link href="/admin/exams/results" className="flex-1 lg:flex-none">
                            <Button
                                className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] h-12 w-full px-4 md:px-8 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.500/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <ClipboardCheck className="mr-2 h-4 w-4 stroke-[3px] hidden sm:block" /> Results
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            Active Assessments
                            {!loading && <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 text-[10px] py-0">{exams.length}</Badge>}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-lg">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white"><Filter className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white"><Search className="w-4 h-4" /></Button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-[8px] md:gap-0 md:divide-y md:divide-white/[0.04] bg-[#050D1A]/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl p-0">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-16 w-full bg-white/5 animate-pulse" />
                        ))
                    ) : (
                        exams.map(exam => (
                            <Link key={exam.id} href={`/admin/exams/${exam.id}`}>
                                <div className={cn(
                                    "flex flex-row items-center justify-between p-4 md:py-3 px-4 transition-all cursor-pointer gap-4 relative group",
                                    exam.status === "ACTIVE" ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "bg-blue-500/5 hover:bg-blue-500/10"
                                )}>
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                            exam.status === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20" : "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20"
                                        )}>
                                            <ClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">
                                                {exam.name}
                                            </span>
                                            <span className="text-[10px] md:text-xs text-[#8892B0] mt-0.5 flex items-center gap-1 truncate">
                                                <Calendar className="w-3 h-3 hidden sm:block" />
                                                {new Date(exam.startDate).toLocaleDateString('en-GB')} – {new Date(exam.endDate).toLocaleDateString('en-GB')}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 shrink-0">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-none hidden sm:inline-flex",
                                                exam.status === "ACTIVE"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-blue-500/10 text-blue-400"
                                            )}
                                        >
                                            {exam.status}
                                        </Badge>
                                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}

                    {!loading && exams.length === 0 && (
                        <div className="col-span-full">
                            <div className="group relative overflow-hidden bg-black/20 border border-dashed border-white/10 rounded-[32px] p-20 flex flex-col items-center text-center transition-all hover:bg-black/30 hover:border-blue-500/20">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full" />

                                <div className="relative z-10">
                                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-500 group-hover:border-blue-500/20 shadow-2xl">
                                        <Sparkle className="w-10 h-10 text-white/20 group-hover:text-blue-400/50 transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Initialize Academic Session</h3>
                                    <p className="text-[#8892B0] max-w-sm mx-auto font-medium text-sm leading-relaxed mb-8">
                                        There are currently no active examinations in the system. Launch a new assessment to begin tracking academic progress.
                                    </p>
                                    {role !== "MANAGER" && (
                                        <Button
                                            onClick={() => setCreateOpen(true)}
                                            className="bg-white text-black hover:bg-blue-400 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] h-11 px-8 rounded-xl shadow-2xl transition-all"
                                        >
                                            Schedule Exam
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-[#0B1120]/95 text-white rounded-[2rem] md:rounded-[32px] max-w-[95vw] md:max-w-lg p-0 overflow-hidden border-white/5 backdrop-blur-2xl shadow-2xl border-white/10">
                    <div className="bg-blue-600/10 p-4 md:p-8 border-b border-white/5 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full -mr-10 -mt-10" />
                        <DialogTitle className="text-xl md:text-3xl font-black tracking-tight relative z-10 italic">Schedule Exam</DialogTitle>
                        <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px] mt-1 relative z-10 opacity-70">Initialize Academic Assessment</p>
                    </div>

                    <div className="p-4 md:p-8 space-y-3 md:space-y-6">
                        <div className="space-y-1.5 md:space-y-2">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Examination Name</Label>
                            <Input
                                placeholder="e.g. ANNUAL EXAMS 2026"
                                className="bg-white/5 border-white/10 h-10 md:h-14 rounded-xl md:rounded-2xl text-sm md:text-lg font-bold placeholder:text-white/20 focus:ring-blue-500/50 transition-all focus:bg-white/10"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-1.5 md:space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Start Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-10 md:h-14 rounded-xl md:rounded-2xl text-xs md:text-base font-bold focus:ring-blue-500/50 transition-all focus:bg-white/10"
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">End Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-10 md:h-14 rounded-xl md:rounded-2xl text-xs md:text-base font-bold focus:ring-blue-500/50 transition-all focus:bg-white/10"
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Select Eligible Classes</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-24 md:max-h-40 overflow-y-auto border border-white/10 rounded-xl p-2 md:p-3 bg-white/5">
                                {classes.map((cls: any) => {
                                    const isChecked = selectedClasses.includes(cls.id);
                                    return (
                                        <label key={cls.id} className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none py-1 hover:text-blue-400 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    if (isChecked) {
                                                        setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                                                    } else {
                                                        setSelectedClasses([...selectedClasses, cls.id]);
                                                    }
                                                }}
                                                className="rounded bg-black/40 border-white/20 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                                            />
                                            {cls.name}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 bg-white/[0.02] border-t border-white/5 flex flex-row gap-2 md:gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setCreateOpen(false)}
                            className="flex-1 h-10 md:h-12 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 px-0"
                        >
                            Cancel
                        </Button>
                         <Button
                            onClick={handleCreate}
                            disabled={submitting || !form.name || !form.startDate || !form.endDate || selectedClasses.length === 0}
                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] h-10 md:h-12 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.600/0.5)] transition-all active:scale-95 px-0"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : "Save & Schedule"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
