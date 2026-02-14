"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2, Plus, Trash2, ArrowLeft, Send, History, CheckCircle2, Bookmark, Users, Calendar } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

export default function TeacherHomeworkPage() {
    const { user } = useAuth();
    const { subjects, classes, sections, subjectTeachers } = useMasterData();
    const [homeworkHistory, setHomeworkHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [useFallback, setUseFallback] = useState(false);

    // Form State
    const [targetClassId, setTargetClassId] = useState("");
    const [targetSectionId, setTargetSectionId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [homeworkInputs, setHomeworkInputs] = useState<Record<string, string>>({});

    // 1. Resolve Teacher ID
    useEffect(() => {
        if (!user?.uid) return;
        const fetchTeacher = async () => {
            const q = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setTeacherId(snap.docs[0].data().schoolId || snap.docs[0].id);
            }
        };
        fetchTeacher();
    }, [user]);

    // 2. Real-time History Listener
    useEffect(() => {
        if (!user || !teacherId) return;

        let isMounted = true;
        const hQ = useFallback
            ? query(collection(db, "homework"), where("teacherId", "==", teacherId), limit(10))
            : query(collection(db, "homework"), where("teacherId", "==", teacherId), orderBy("createdAt", "desc"), limit(10));

        const unsubscribe = onSnapshot(hQ, (hSnap) => {
            if (!isMounted) return;
            let list = hSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (useFallback) {
                list = [...list].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setHomeworkHistory(list);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes('index') && !useFallback) {
                console.warn("Homework index missing, using fallback.");
                setUseFallback(true);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [user, teacherId, useFallback]);

    const getAuthorizedClasses = () => {
        if (!teacherId || !subjectTeachers) return [];
        const set = new Map<string, { classId: string, sectionId: string, key: string }>();

        Object.keys(subjectTeachers).forEach(key => {
            const subjectsObj = subjectTeachers[key];
            if (Object.values(subjectsObj).includes(teacherId)) {
                const [cId, sId] = key.split('_');
                set.set(key, { classId: cId, sectionId: sId, key });
            }
        });
        return Array.from(set.values());
    };

    const getMySubjects = (classKey: string) => {
        if (!classKey || !teacherId || !subjectTeachers) return [];
        const subjectsObj = subjectTeachers[classKey] || {};
        return Object.keys(subjectsObj).filter(sid => subjectsObj[sid] === teacherId);
    };

    // Clear inputs when class changes
    useEffect(() => {
        setHomeworkInputs({});
    }, [targetClassId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetClassId) return;

        const validEntries = Object.entries(homeworkInputs).filter(([_, desc]) => desc.trim().length > 0);
        if (validEntries.length === 0) {
            toast({ title: "Empty", description: "Please enter homework for at least one subject.", type: "error" });
            return;
        }

        setLoading(true);
        const [cId, sId] = targetClassId.split('_');

        try {
            let successCount = 0;
            const promises = validEntries.map(async ([sid, desc]) => {
                const res = await fetch("/api/teacher/homework/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${await user?.getIdToken()}`
                    },
                    body: JSON.stringify({
                        classId: cId,
                        sectionId: sId,
                        subjectId: sid,
                        title: `${subjects[sid]?.name || "Homework"} Task`,
                        description: desc,
                        dueDate
                    })
                });
                const data = await res.json();
                if (data.success) successCount++;
                return data;
            });

            await Promise.all(promises);

            if (successCount > 0) {
                toast({ title: "Success", description: `Published ${successCount} tasks successfully!`, type: "success" });
                setHomeworkInputs({});
                setDueDate("");
            } else {
                toast({ title: "Error", description: "All tasks failed to publish.", type: "error" });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await deleteDoc(doc(db, "homework", id));
            toast({ title: "Deleted", description: "Assignment removed from history.", type: "success" });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, type: "error" });
        }
    };

    const authorized = getAuthorizedClasses();

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <Link href="/teacher" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-all mb-1">
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl md:text-6xl font-display font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic leading-tight">
                        Homework Portal
                    </h1>
                </div>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Cloud Sync: Active</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Assignment Form */}
                <Card className="lg:col-span-5 bg-black/40 border-white/10 backdrop-blur-3xl shadow-2xl rounded-3xl overflow-hidden h-fit sticky top-8">
                    <div className="bg-white/5 p-6 border-b border-white/10">
                        <CardTitle className="flex items-center gap-3 text-2xl font-display italic">
                            <Plus className="w-6 h-6 text-accent" /> Assign Homework
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-50">Fill the tasks for the subjects you teach</p>
                    </div>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Class & Section</label>
                                    <Select onValueChange={setTargetClassId} value={targetClassId} required>
                                        <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:ring-accent/20">
                                            <SelectValue placeholder="Select Class" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0A192F] border-white/10 text-white">
                                            {authorized.map(c => (
                                                <SelectItem key={c.key} value={c.key} className="focus:bg-accent focus:text-black font-bold py-3">
                                                    {classes[c.classId]?.name || c.classId} - {sections[c.sectionId]?.name || c.sectionId}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Submission Deadline</label>
                                    <Input
                                        type="date"
                                        required
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:ring-accent/20"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {targetClassId && (
                                <div className="border border-white/10 rounded-2xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] uppercase bg-white/5 text-muted-foreground font-black tracking-widest">
                                            <tr>
                                                <th className="px-4 py-3 border-b border-white/10 w-1/3">Subject</th>
                                                <th className="px-4 py-3 border-b border-white/10">Homework Task</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getMySubjects(targetClassId).map((sid: string) => (
                                                <tr key={sid} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-accent">
                                                        {subjects[sid]?.name || sid}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <Textarea
                                                            placeholder={`Enter ${subjects[sid]?.name || "homework"} task...`}
                                                            className="min-h-[60px] bg-transparent border-none resize-none focus:ring-0 px-0 placeholder:text-white/20"
                                                            value={homeworkInputs[sid] || ""}
                                                            onChange={e => setHomeworkInputs(prev => ({ ...prev, [sid]: e.target.value }))}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                            {getMySubjects(targetClassId).length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className="p-8 text-center text-muted-foreground text-xs">
                                                        No subjects assigned to you for this class.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <Button type="submit" disabled={loading || !targetClassId} className="w-full bg-accent text-black hover:bg-white hover:scale-[1.02] font-black h-12 rounded-xl transition-all shadow-xl shadow-accent/10 uppercase tracking-widest text-xs">
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-4 h-4 mr-2" /> Publish Tasks</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History Sidebar */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                    <div className="md:col-span-2 flex items-center gap-3 mb-2">
                        <History className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-display font-bold italic">Broadcast History</h2>
                        <div className="flex-1 h-px bg-white/5" />
                        <Badge className="bg-white/5 border-white/10 text-[10px] text-white/40 uppercase tracking-widest font-black">Latest 10 Entries</Badge>
                    </div>

                    {homeworkHistory.length === 0 ? (
                        <div className="md:col-span-2 py-32 text-center text-muted-foreground bg-white/5 rounded-[40px] border border-dashed border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                            <History className="w-12 h-12 opacity-10" />
                            <div className="space-y-1">
                                <p className="font-black uppercase tracking-widest text-xs opacity-40">No records found</p>
                                <p className="text-[10px]">Start by assigning homework to your classes.</p>
                            </div>
                        </div>
                    ) : (
                        homeworkHistory.map(hw => (
                            <div key={hw.id} className="group relative bg-black/40 border border-white/10 rounded-3xl p-6 hover:bg-white/5 transition-all backdrop-blur-md overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />

                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-wrap gap-2">
                                            <Badge className="bg-accent text-black border-none text-[8px] uppercase font-black tracking-widest px-3 py-1">
                                                {classes[hw.classId]?.name || hw.classId} {sections[hw.sectionId]?.name ? `- ${sections[hw.sectionId].name}` : ''}
                                            </Badge>
                                            <Badge variant="outline" className="border-white/10 text-white/40 text-[8px] uppercase font-black tracking-widest px-3 py-1">
                                                {subjects[hw.subjectId]?.name || hw.subjectId}
                                            </Badge>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-8 h-8 rounded-xl text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                            onClick={() => handleDelete(hw.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-xl text-white group-hover:text-accent transition-colors leading-tight">{hw.title}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-3 mt-2 leading-relaxed opacity-60 font-medium">{hw.description}</p>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4 relative z-10">
                                    <div className="flex items-center gap-2 text-[10px] text-accent font-black uppercase tracking-widest">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Due {new Date(hw.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    </div>
                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest opacity-30">
                                        {hw.createdAt ? new Date(hw.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function Badge({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) {
    return (
        <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
            variant === "outline" ? "bg-transparent" : "bg-white/10",
            className
        )}>
            {children}
        </span>
    );
}
