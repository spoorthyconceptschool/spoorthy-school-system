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

    const [students, setStudents] = useState<any[]>([]);

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
        const fetchStudents = async () => {
            const q = query(collection(db, "students"), where("status", "==", "ACTIVE"));
            const snap = await getDocs(q);
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchStudents();
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
            router.push(`/admin/exams/${docRef.id}`);
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header / Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] border border-white/5 p-6 md:p-10 shadow-2xl">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20 px-4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/5 blur-[80px] rounded-full -ml-10 -mb-10" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                                <GraduationCap className="w-5 h-5" />
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">Academic Portal</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight">
                            Examinations
                        </h1>
                        <p className="text-[#8892B0] max-w-xl text-sm md:text-base font-medium leading-relaxed">
                            Orchestrate academic excellence. Manage examination schedules, student roll numbers, and propagate hall tickets in real-time across the school system.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 md:mt-0">
                        <HallTicketGenerator students={students} />
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-[0_0_20px_-5px_theme(colors.emerald.500/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 text-[10px] py-0">{exams.length}</Badge>
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
                    {exams.map(exam => (
                        <Link key={exam.id} href={`/admin/exams/${exam.id}`}>
                            <Card className="group relative bg-[#1E293B]/40 hover:bg-[#1E293B]/60 border-white/5 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-xl overflow-hidden rounded-3xl shadow-xl h-full flex flex-col">
                                {/* Status Glow Background */}
                                <div className={cn(
                                    "absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-10 -mt-10 transition-opacity opacity-20 group-hover:opacity-40",
                                    exam.status === "ACTIVE" ? "bg-emerald-500" : "bg-blue-500"
                                )} />

                                <CardHeader className="relative z-10 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                                            <ClipboardCheck className="w-6 h-6" />
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none",
                                                exam.status === "ACTIVE"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-blue-500/10 text-blue-400"
                                            )}
                                        >
                                            <Sparkle className="w-2.5 h-2.5 mr-1 animate-pulse" /> {exam.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-6 text-xl md:text-2xl font-black text-white group-hover:text-blue-400 transition-colors tracking-tight">
                                        {exam.name}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2 text-[#8892B0] font-medium text-xs mt-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(exam.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(exam.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="relative z-10 mt-auto pt-6 border-t border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                                        <span>System Node v1.0</span>
                                        <div className="flex items-center gap-2">
                                            Manage <ChevronRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {exams.length === 0 && (
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
                                        Deploy Examination
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-[#0F172A] border-white/10 text-white rounded-[32px] max-w-lg p-0 overflow-hidden shadow-2xl backdrop-blur-2xl">
                    <div className="bg-blue-600/10 p-8 border-b border-white/5 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full -mr-10 -mt-10" />
                        <DialogTitle className="text-3xl font-black tracking-tight relative z-10">New Session</DialogTitle>
                        <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 relative z-10">Initializing Examination Node</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Examination Identity</Label>
                            <Input
                                placeholder="e.g. ANNUAL EXAMS 2026"
                                className="bg-white/5 border-white/10 h-14 rounded-2xl text-lg font-bold placeholder:text-white/20 focus:ring-blue-500/50"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Launch Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold focus:ring-blue-500/50"
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[#8892B0]">Final Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold focus:ring-blue-500/50"
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setCreateOpen(false)}
                            className="flex-1 h-12 rounded-xl font-bold text-white/40 hover:text-white"
                        >
                            Abort
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={submitting || !form.name || !form.startDate || !form.endDate}
                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.600/0.5)] transition-all"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : "Authorize & Deploy"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
