"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, getDoc, doc, limit, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Coffee, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CoverageTask {
    id: string;
    date: string;
    day: string;
    slotId: number;
    classId: string;
    originalTeacherId: string;
    status: "PENDING" | "RESOLVED";
    suggestedSubstituteId?: string;
    suggestedType?: string;
    resolution?: {
        type: "SUBSTITUTION" | "LEISURE";
        substituteTeacherId: string | null;
    };
}

export function CoverageManager() {
    const [tasks, setTasks] = useState<CoverageTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [showResolved, setShowResolved] = useState(false);

    // Resolve Modal
    const [selectedTask, setSelectedTask] = useState<CoverageTask | null>(null);
    const [resolveType, setResolveType] = useState<"SUBSTITUTE" | "LEISURE">("SUBSTITUTE");
    const [substituteId, setSubstituteId] = useState("");
    const [resolving, setResolving] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Real-time Tasks
        const q = query(collection(db, "coverage_tasks"), orderBy("createdAt", "desc"), limit(100));
        const unsubscribeTasks = onSnapshot(q, (snapshot) => {
            setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CoverageTask)));
            setLoading(false);
        }, (err) => {
            console.warn("Task Listener Error, falling back...", err);
            // Fallback for missing index
            const qFallback = query(collection(db, "coverage_tasks"), limit(100));
            onSnapshot(qFallback, (snap) => {
                setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CoverageTask)));
                setLoading(false);
            });
        });

        // Real-time Teachers
        const qT = query(collection(db, "teachers"), where("status", "==", "ACTIVE"));
        const unsubscribeTeachers = onSnapshot(qT, (snapshot) => {
            setTeachers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubscribeTasks();
            unsubscribeTeachers();
        };
    }, []);

    const getTeacherName = (tid: string) => {
        if (!tid) return "N/A";
        const t = teachers.find(t => t.id === tid || t.schoolId === tid || t.uid === tid);
        return t?.name || tid;
    };

    const handleResolve = async () => {
        if (!selectedTask) return;
        setResolving(true);
        try {
            const res = await fetch("/api/admin/timetable/coverage/resolve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
                },
                body: JSON.stringify({
                    taskId: selectedTask.id,
                    resolutionType: resolveType,
                    substituteTeacherId: resolveType === "SUBSTITUTE" ? substituteId : null
                })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedTask(null);
            } else {
                alert(data.error);
            }
        } catch (e: any) { alert(e.message); }
        finally { setResolving(false); }
    };

    return (
        <div className="space-y-4 md:space-y-6 max-w-none p-0 animate-in fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                        <Button
                            variant={!showResolved ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setShowResolved(false)}
                            className={cn(
                                "text-[10px] h-8 px-4 font-black uppercase tracking-widest transition-all rounded-lg",
                                !showResolved ? "bg-accent text-black" : "text-white/40 hover:text-white"
                            )}
                        >
                            Pending
                        </Button>
                        <Button
                            variant={showResolved ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setShowResolved(true)}
                            className={cn(
                                "text-[10px] h-8 px-4 font-black uppercase tracking-widest transition-all rounded-lg",
                                showResolved ? "bg-accent text-black" : "text-white/40 hover:text-white"
                            )}
                        >
                            Resolved
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm mb-6">
                    {error}
                </div>
            )}

            {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : (
                <div className="grid grid-cols-1 gap-3">
                    {tasks.filter(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING").length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                            <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground">No {showResolved ? "resolved" : "pending"} coverage tasks {showResolved ? "yet" : "at the moment"}.</p>
                        </div>
                    ) : (
                        tasks
                            .filter(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING")
                            .map(task => {
                                const teacherId = task.originalTeacherId;
                                const displayDay = task.day || (task.date ? new Date(task.date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() : "N/A");

                                return (
                                    <Card key={task.id} className="bg-black/20 border-white/10 overflow-hidden hover:bg-white/5 transition-all group backdrop-blur-md rounded-2xl relative">
                                        <div className="flex flex-col md:flex-row items-center justify-between p-3 md:p-5 gap-4">
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-black text-[10px] flex-col shrink-0 italic shadow-inner">
                                                    <span>{task.date?.split('-')?.[1] || "??"}/{task.date?.split('-')?.[2] || "??"}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm md:text-lg text-white group-hover:text-accent transition-colors leading-tight truncate">
                                                        {getTeacherName(teacherId)}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap font-bold uppercase tracking-widest opacity-60">
                                                        <span className="text-accent/60">{displayDay}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span>Period {task.slotId}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span>{task.classId}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-3 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                                {task.status === "PENDING" && task.suggestedSubstituteId && (
                                                    <div className="text-left md:text-right md:mr-2 md:border-r border-white/10 md:pr-4">
                                                        <div className="text-[8px] text-blue-400 uppercase font-black tracking-widest mb-0.5">Recommendation</div>
                                                        <div className="text-xs font-bold text-white/90">
                                                            {task.suggestedType === "LEISURE" ? "Leisure" : getTeacherName(task.suggestedSubstituteId)}
                                                        </div>
                                                    </div>
                                                )}

                                                {task.status === "RESOLVED" && (
                                                    <div className="text-left md:text-right md:mr-2">
                                                        <div className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mb-0.5 opacity-40">Resolved Status</div>
                                                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                            <CheckCircle className="w-3 h-3" />
                                                            {task.resolution?.type === "LEISURE" ? "Leisure Mode" : `Covered By ${getTeacherName(task.resolution?.substituteTeacherId || "")}`}
                                                        </div>
                                                    </div>
                                                )}

                                                <Dialog open={selectedTask?.id === task.id} onOpenChange={(o) => !o && setSelectedTask(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                if (task.status === "RESOLVED" && task.resolution) {
                                                                    setResolveType(task.resolution.type === "SUBSTITUTION" ? "SUBSTITUTE" : "LEISURE");
                                                                    setSubstituteId(task.resolution.substituteTeacherId || "");
                                                                } else {
                                                                    setResolveType((task.suggestedType as any) || "SUBSTITUTE");
                                                                    setSubstituteId(task.suggestedSubstituteId || "");
                                                                }
                                                            }}
                                                            className={cn(
                                                                "h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                                                task.status === "RESOLVED"
                                                                    ? "bg-white/5 text-white/40 hover:text-white border border-white/10"
                                                                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
                                                            )}
                                                        >
                                                            {task.status === "RESOLVED" ? "Manage" : "Action"}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-[#0A192F] border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-xl font-bold flex items-center gap-2 italic">
                                                                <UserPlus className="text-accent" /> Resolve Coverage
                                                            </DialogTitle>
                                                            <DialogDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Choose how to handle this academic period.</DialogDescription>
                                                        </DialogHeader>

                                                        <div className="space-y-4 py-4">
                                                            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                                                <Button
                                                                    variant={resolveType === "SUBSTITUTE" ? "default" : "outline"}
                                                                    onClick={() => setResolveType("SUBSTITUTE")}
                                                                    className={cn(
                                                                        "flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                        resolveType === 'SUBSTITUTE' ? 'bg-accent text-black hover:bg-accent/90' : 'bg-transparent text-white/40 border-none hover:text-white hover:bg-white/5'
                                                                    )}
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5 mr-2" /> Substitute
                                                                </Button>
                                                                <Button
                                                                    variant={resolveType === "LEISURE" ? "default" : "outline"}
                                                                    onClick={() => setResolveType("LEISURE")}
                                                                    className={cn(
                                                                        "flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                        resolveType === 'LEISURE' ? 'bg-accent text-black hover:bg-accent/90' : 'bg-transparent text-white/40 border-none hover:text-white hover:bg-white/5'
                                                                    )}
                                                                >
                                                                    <Coffee className="w-3.5 h-3.5 mr-2" /> Leisure
                                                                </Button>
                                                            </div>

                                                            {resolveType === "SUBSTITUTE" && (
                                                                <div className="space-y-4 pt-2">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Select Substitute Teacher</label>
                                                                        <div className="text-[8px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black uppercase tracking-tighter">Recommended: {getTeacherName(task.suggestedSubstituteId || "")}</div>
                                                                    </div>
                                                                    <Select value={substituteId} onValueChange={setSubstituteId}>
                                                                        <SelectTrigger className="h-12 bg-black/40 border-white/10 rounded-xl font-bold focus:ring-accent/20">
                                                                            <SelectValue placeholder="Choose Teacher" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-[#0A192F] border-white/10 text-white">
                                                                            {teachers
                                                                                .filter(t => (t.schoolId || t.id) !== task.originalTeacherId)
                                                                                .map(t => (
                                                                                    <SelectItem key={t.id} value={t.schoolId || t.id} className="focus:bg-accent focus:text-black font-bold text-xs">{t.name}</SelectItem>
                                                                                ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <DialogFooter className="pt-2">
                                                            <Button onClick={handleResolve} disabled={resolving || (resolveType === "SUBSTITUTE" && !substituteId)} className="w-full h-12 bg-accent text-black hover:bg-accent/90 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-accent/20">
                                                                {resolving ? <Loader2 className="animate-spin w-4 h-4" /> : "Finalize Resolution"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                    )}
                </div>
            )}
        </div>
    );
}
