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

export default function ExamsListPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: ""
    });

    const fetchExams = async () => {
        try {
            const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleCreate = async () => {
        if (!form.name || !form.startDate || !form.endDate) return;
        setSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, "exams"), {
                ...form,
                createdAt: serverTimestamp(),
                status: "ACTIVE"
            });
            setCreateOpen(false);
            setForm({ name: "", startDate: "", endDate: "" });

            // Notify all teachers
            await createNotification({
                target: "ALL_FACULTY",
                title: "New Examination Announced",
                message: `The ${form.name} session has been scheduled from ${new Date(form.startDate).toLocaleDateString()} to ${new Date(form.endDate).toLocaleDateString()}. Please prepare your subject syllabus.`,
                type: "NOTICE"
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
                        <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tight leading-none">
                            Examinations
                        </h1>
                        <p className="text-[#8892B0] text-xs md:text-base font-medium leading-relaxed">
                            Manage examination schedules, student roll numbers, and generate hall tickets for students.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <HallTicketGenerator />
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] h-12 px-6 md:px-8 rounded-xl shadow-[0_0_20px_-5px_theme(colors.emerald.500/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Create New Exam
                        </Button>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-[250px] rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                        ))
                    ) : (
                        exams.map(exam => (
                            <Link key={exam.id} href={`/admin/exams/${exam.id}`}>
                                <Card className="group relative bg-[#1E293B]/40 hover:bg-[#1E293B]/60 border-white/5 hover:border-blue-500/30 transition-all duration-500 backdrop-blur-xl overflow-hidden rounded-[2rem] shadow-xl h-full flex flex-col">
                                    {/* Status Glow Background */}
                                    <div className={cn(
                                        "absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-10 -mt-10 transition-opacity opacity-20 group-hover:opacity-40",
                                        exam.status === "ACTIVE" ? "bg-emerald-500" : "bg-blue-500"
                                    )} />

                                    <CardHeader className="relative z-10 pb-4 p-5 md:p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                                                <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full border-none",
                                                    exam.status === "ACTIVE"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-blue-500/10 text-blue-400"
                                                )}
                                            >
                                                <Sparkle className="w-2 md:w-2.5 h-2 md:h-2.5 mr-1 animate-pulse" /> {exam.status}
                                            </Badge>
                                        </div>
                                        <CardTitle className="mt-4 md:mt-6 text-lg md:text-2xl font-black text-white group-hover:text-blue-400 transition-colors tracking-tight leading-tight">
                                            {exam.name}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 text-[#8892B0] font-medium text-[10px] md:text-xs mt-1">
                                            <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5" strokeWidth={2.5} />
                                            {new Date(exam.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(exam.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="relative z-10 mt-auto pt-4 md:pt-6 p-5 md:p-6 border-t border-white/5 bg-white/[0.02]">
                                        <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                                            <span className="opacity-50">Standard Logic</span>
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                Profile <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
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
                                    <Button
                                        onClick={() => setCreateOpen(true)}
                                        className="bg-white text-black hover:bg-blue-400 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] h-11 px-8 rounded-xl shadow-2xl transition-all"
                                    >
                                        Schedule Exam
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-[#0F172A] border-white/10 text-white rounded-[2rem] md:rounded-[32px] max-w-[95vw] md:max-w-lg p-0 overflow-hidden shadow-2xl backdrop-blur-2xl border-white/5">
                    <div className="bg-blue-600/10 p-6 md:p-8 border-b border-white/5 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full -mr-10 -mt-10" />
                        <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight relative z-10 italic">Schedule Exam</DialogTitle>
                        <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px] mt-1 relative z-10 opacity-70">Initialize Academic Assessment</p>
                    </div>

                    <div className="p-6 md:p-8 space-y-5 md:space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Examination Name</Label>
                            <Input
                                placeholder="e.g. ANNUAL EXAMS 2026"
                                className="bg-white/5 border-white/10 h-12 md:h-14 rounded-xl md:rounded-2xl text-base md:text-lg font-bold placeholder:text-white/20 focus:ring-blue-500/50 transition-all focus:bg-white/10"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Start Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold focus:ring-blue-500/50 transition-all focus:bg-white/10"
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#8892B0]">End Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold focus:ring-blue-500/50 transition-all focus:bg-white/10"
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-5 md:p-6 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setCreateOpen(false)}
                            className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={submitting || !form.name || !form.startDate || !form.endDate}
                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.600/0.5)] transition-all active:scale-95"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : "Save & Schedule"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
