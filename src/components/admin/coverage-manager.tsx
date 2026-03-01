"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, getDoc, doc, limit, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Coffee, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Represents a single coverage task that requires administrative resolution.
 * A task is created whenever a teacher's leave is approved, generating separate
 * tasks for every single academic period they are missing.
 */
interface CoverageTask {
    id: string;
    date: string;
    day: string;
    slotId: number;
    classId: string;
    originalTeacherId: string;
    leaveRequestId?: string;
    status: "PENDING" | "RESOLVED";
    suggestedSubstituteId?: string;
    suggestedType?: string;
    resolution?: {
        type: "SUBSTITUTION" | "LEISURE";
        substituteTeacherId: string | null;
    };
}

/**
 * CoverageManager Component
 * 
 * Renders the interface for administrators to manage and resolve staffing gaps (coverage)
 * due to approved teacher leaves. It automatically groups periods that belong to the same leave request
 * into a single unified row (condensed view) to avoid clutter.
 * 
 * Features:
 * - Real-time synchronization of coverage tasks via Firestore snapshot listeners.
 * - Single-row grouping of periods by 'leaveRequestId' (or 'originalTeacherId' as fallback).
 * - Inline details showing individual periods and their suggested substituting teachers.
 * - One-click "Approve All" functionality to bulk-assign suggested substitutes for a single leave request.
 * - Safe manual overrides through a detailed modal dialog for fine-tuning individual period assignments.
 * 
 * @returns JSX Element representing the coverage management view.
 */
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

    /**
     * Initializes real-time listener hooks for the Firestore coverage tasks backend.
     * Continuously sinks modified and newly pushed tasks directly into component state.
     */
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

    /**
     * Helper to reliably resolve a teacher's human-readable name from their ID.
     * Checks multiple potential ID fields (document ID, schoolId, uid) due to
     * generic referencing approaches in standard datasets.
     * 
     * @param tid The teacher's ID (uid, docId, or schoolId)
     * @returns The human-readable name of the teacher, or "N/A" if unseen.
     */
    const getTeacherName = (tid: string) => {
        if (!tid) return "N/A";
        const t = teachers.find(t => t.id === tid || t.schoolId === tid || t.uid === tid);
        return t?.name || tid;
    };

    /**
     * Submits a manual override for a specific coverage task period.
     * This pushes the change to the backend resolution API.
     */
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

    /**
     * Memoized computed property that transforms the flat list of individual period tasks
     * into a grouped array of arrays, grouped entirely by the `leaveRequestId`.
     * This allows the UI to render a single row for the entire duration of a leave.
     */
    const groupedTasks = useMemo(() => {
        const groups: Record<string, CoverageTask[]> = {};
        /** Transforms the flat tasks map into dictionary grouping */
        tasks.forEach(task => {
            const key = task.leaveRequestId || task.originalTeacherId;
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });

        return Object.values(groups).sort((a, b) => {
            const dateA = a[0]?.date || "";
            const dateB = b[0]?.date || "";
            return dateA.localeCompare(dateB);
        });
    }, [tasks]);

    /**
     * Batch assigns coverage suggestions for all pending periods in a specific grouped task.
     * Iterates through the provided list of tasks and auto-approves the recommended substitution.
     * 
     * @param group An array of CoverageTask objects belonging to a specific leave or teacher.
     */
    const handleApproveAllGroup = async (group: CoverageTask[]) => {
        setResolving(true);
        let hasError = false;
        try {
            const pendingTasks = group.filter(t => t.status === "PENDING" && t.suggestedType);
            /** Evaluates inner task properties, fetching validation API endpoints */
            for (const task of pendingTasks) {
                const res = await fetch("/api/admin/timetable/coverage/resolve", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
                    },
                    body: JSON.stringify({
                        taskId: task.id,
                        resolutionType: task.suggestedType,
                        substituteTeacherId: task.suggestedType === "SUBSTITUTE" ? task.suggestedSubstituteId : null
                    })
                });
                const data = await res.json();
                if (!data.success) {
                    hasError = true;
                }
            }
        } catch (e) {
            hasError = true;
        }

        setResolving(false);
        if (hasError) {
            alert("Some periods could not be automatically approved.");
        }
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
                    {groupedTasks.filter(group => group.some(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING")).length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                            <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground">No {showResolved ? "resolved" : "pending"} coverage tasks {showResolved ? "yet" : "at the moment"}.</p>
                        </div>
                    ) : (
                        groupedTasks.filter(group => group.some(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING")).map((group, groupIndex) => {
                            const firstTask = group[0];
                            const teacherId = firstTask.originalTeacherId;

                            // Sort group items
                            const sortedTasks = [...group].sort((a, b) => {
                                if (a.date === b.date) return a.slotId - b.slotId;
                                return (a.date || "").localeCompare(b.date || "");
                            });

                            const dates = Array.from(new Set(group.map(t => t.date))).filter(Boolean).sort();
                            let dateRangeStr = "";
                            if (dates.length > 0) {
                                dateRangeStr = dates.length > 1
                                    ? `${dates[0].split('-').slice(1).join('/')} to ${dates[dates.length - 1].split('-').slice(1).join('/')}`
                                    : `${dates[0].split('-').slice(1).join('/')}`;
                            }

                            return (
                                <Card key={firstTask.leaveRequestId || teacherId + groupIndex} className="bg-black/20 border-white/10 overflow-hidden hover:bg-white/5 transition-all group backdrop-blur-md rounded-2xl relative">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">

                                        <div className="flex items-center gap-4 w-full lg:w-fit shrink-0">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                                                <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm md:text-lg text-white group-hover:text-accent transition-colors leading-tight truncate">
                                                    {getTeacherName(teacherId)}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5 flex-wrap uppercase tracking-widest font-bold">
                                                    {dates.length > 0 && <span className="mr-2 px-2 py-0.5 rounded-md bg-white/10">{dateRangeStr}</span>}
                                                    <span>{group.length} period(s)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden lg:flex flex-wrap gap-1.5 flex-1 px-4 min-w-0 max-h-24 overflow-y-auto custom-scrollbar border-l border-white/5">
                                            {sortedTasks.map(task => {
                                                const shortDate = task.date?.split('-')?.[1] + "/" + task.date?.split('-')?.[2] || "??/??";
                                                const candidate = task.status === "RESOLVED"
                                                    ? (task.resolution?.type === "LEISURE" ? "Leisure" : getTeacherName(task.resolution?.substituteTeacherId || ""))
                                                    : (task.suggestedType === "LEISURE" ? "Leisure" : getTeacherName(task.suggestedSubstituteId || ""));

                                                return (
                                                    <div key={task.id} className="flex items-center gap-1.5 bg-black/40 border border-white/5 rounded-md px-2 py-1 shrink-0">
                                                        <span className="text-[9px] text-muted-foreground font-mono">{shortDate}</span>
                                                        <span className="text-[9px] font-black uppercase text-accent/80">P{task.slotId}</span>
                                                        <span className="text-[9px] font-mono uppercase text-white/40">{task.classId}</span>
                                                        <span className="text-white/20 text-[9px] mx-0.5">→</span>
                                                        <span className="text-[10px] font-bold text-white/80 max-w-[80px] truncate" title={candidate}>{candidate}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full lg:w-fit pt-4 md:pt-0 border-t md:border-t-0 border-white/5 border-l md:pl-4 shrink-0">
                                            <div className="flex flex-col text-left md:text-right md:border-r border-white/10 md:pr-6 md:mr-2">
                                                <span className="text-[8px] text-blue-400 uppercase font-black tracking-widest mb-0.5">Coverage Candidates</span>
                                                <span className="text-xs font-bold text-white/90 truncate max-w-[200px]">
                                                    {Array.from(new Set(group.map(t => {
                                                        if (t.status === "RESOLVED") return t.resolution?.type === "LEISURE" ? "Leisure" : getTeacherName(t.resolution?.substituteTeacherId || "");
                                                        return t.suggestedType === "LEISURE" ? "Leisure" : getTeacherName(t.suggestedSubstituteId || "");
                                                    }))).filter(Boolean).join(", ")}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
                                                {!showResolved && group.some(t => t.status === "PENDING" && t.suggestedType) && (
                                                    <Button
                                                        onClick={() => handleApproveAllGroup(group)}
                                                        disabled={resolving}
                                                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-accent text-black hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all w-full md:w-auto shrink-0"
                                                    >
                                                        {resolving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle className="w-3 h-3 mr-2" />}
                                                        Approve All
                                                    </Button>
                                                )}

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all w-full md:w-auto shrink-0"
                                                        >
                                                            {showResolved ? "Details" : "Manage"}
                                                        </Button>
                                                    </DialogTrigger>

                                                    <DialogContent className="bg-[#0A192F] border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 w-[95vw] md:w-full max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                                                        <DialogHeader className="p-6 border-b border-white/5 shrink-0">
                                                            <DialogTitle className="text-xl font-bold flex items-center gap-2 italic">
                                                                <UserPlus className="text-accent" /> {showResolved ? "Coverage Details" : "Manage Coverage"}
                                                            </DialogTitle>
                                                            <DialogDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                                                                Periods for {getTeacherName(teacherId)} ({dateRangeStr})
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="p-6 overflow-y-auto space-y-3">
                                                            {sortedTasks.filter(t => showResolved ? t.status === "RESOLVED" : t.status === "PENDING").map(task => {
                                                                const displayDay = task.day || (task.date ? new Date(task.date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() : "N/A");
                                                                const shortDate = task.date?.split('-')?.[1] + "/" + task.date?.split('-')?.[2] || "??/??";

                                                                return (
                                                                    <div key={task.id} className="flex flex-col items-start md:flex-row md:items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 gap-4">
                                                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                                                            <div className="hidden md:flex w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 items-center justify-center text-red-400 font-black text-[10px] flex-col shrink-0 italic shadow-inner">
                                                                                <span>{shortDate}</span>
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                                                                                    <span className="text-accent/80">{displayDay}</span>
                                                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                                                    <span className="text-white">Period {task.slotId}</span>
                                                                                </div>
                                                                                <div className="text-sm font-bold text-white/80 truncate">{task.classId}</div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-end w-full md:w-auto gap-3 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                                                            {task.status === "PENDING" && task.suggestedSubstituteId && (
                                                                                <div className="text-right mr-2 md:border-r border-white/10 md:pr-4">
                                                                                    <div className="text-[8px] text-blue-400 uppercase font-black tracking-widest mb-0.5">Recommendation</div>
                                                                                    <div className="text-xs font-bold text-white/90">
                                                                                        {task.suggestedType === "LEISURE" ? "Leisure" : getTeacherName(task.suggestedSubstituteId)}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {task.status === "RESOLVED" && (
                                                                                <div className="text-right mr-2 md:border-r border-white/10 md:pr-4">
                                                                                    <div className="text-[8px] text-emerald-400 uppercase font-black tracking-widest mb-0.5 opacity-40">Resolved Status</div>
                                                                                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                                                        <CheckCircle className="w-3 h-3 shrink-0" />
                                                                                        <span className="truncate">{task.resolution?.type === "LEISURE" ? "Leisure Mode" : `Covered By ${getTeacherName(task.resolution?.substituteTeacherId || "")}`}</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <Dialog open={selectedTask?.id === task.id} onOpenChange={(o) => {
                                                                                if (!o) setSelectedTask(null);
                                                                            }}>
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
                                                                                            "h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shrink-0",
                                                                                            task.status === "RESOLVED"
                                                                                                ? "bg-white/5 text-white/40 hover:text-white border border-white/10"
                                                                                                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                                                                                        )}
                                                                                    >
                                                                                        {task.status === "RESOLVED" ? "Manage" : "Manual"}
                                                                                    </Button>
                                                                                </DialogTrigger>

                                                                                <DialogContent className="bg-[#0A192F] border-white/10 text-white rounded-2xl shadow-2xl shadow-black/50 w-[95vw] md:w-full max-w-sm border-l-4 border-l-accent overflow-hidden">
                                                                                    <DialogHeader className="bg-black/20 p-4 border-b border-white/5">
                                                                                        <DialogTitle className="text-lg font-bold flex items-center gap-2 italic">
                                                                                            <UserPlus className="text-accent" /> Manual Coverage
                                                                                        </DialogTitle>
                                                                                    </DialogHeader>

                                                                                    <div className="space-y-4 py-3 p-4">
                                                                                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                                                                            <Button
                                                                                                variant={resolveType === "SUBSTITUTE" ? "default" : "outline"}
                                                                                                onClick={() => setResolveType("SUBSTITUTE")}
                                                                                                className={cn(
                                                                                                    "flex-1 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                                                    resolveType === 'SUBSTITUTE' ? 'bg-accent text-black hover:bg-accent/90' : 'bg-transparent text-white/40 border-none hover:text-white hover:bg-white/5'
                                                                                                )}
                                                                                            >
                                                                                                <UserPlus className="w-3.5 h-3.5 mr-2" /> Substitute
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant={resolveType === "LEISURE" ? "default" : "outline"}
                                                                                                onClick={() => setResolveType("LEISURE")}
                                                                                                className={cn(
                                                                                                    "flex-1 h-9 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                                                    resolveType === 'LEISURE' ? 'bg-accent text-black hover:bg-accent/90' : 'bg-transparent text-white/40 border-none hover:text-white hover:bg-white/5'
                                                                                                )}
                                                                                            >
                                                                                                <Coffee className="w-3.5 h-3.5 mr-2" /> Leisure
                                                                                            </Button>
                                                                                        </div>

                                                                                        {resolveType === "SUBSTITUTE" && (
                                                                                            <div className="space-y-3 pt-1">
                                                                                                <Select value={substituteId} onValueChange={setSubstituteId}>
                                                                                                    <SelectTrigger className="h-10 bg-black/40 border-white/10 rounded-xl font-bold focus:ring-accent/20">
                                                                                                        <SelectValue placeholder="Choose Teacher" />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent className="bg-[#0A192F] border-white/10 text-white max-h-[200px]">
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

                                                                                    <DialogFooter className="p-4 bg-black/20 border-t border-white/5">
                                                                                        <Button onClick={handleResolve} disabled={resolving || (resolveType === "SUBSTITUTE" && !substituteId)} className="w-full h-10 bg-accent text-black hover:bg-accent/90 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-accent/20">
                                                                                            {resolving ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Changes"}
                                                                                        </Button>
                                                                                    </DialogFooter>
                                                                                </DialogContent>
                                                                            </Dialog>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    );
}
