"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Send, Calendar, Users, Info, GraduationCap, Bookmark, History, Trash2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminHomeworkPage() {
    const { user } = useAuth();
    const { classes, sections, subjects, classSections } = useMasterData();

    const classList = Object.values(classes || {}).sort((a: any, b: any) => a.order - b.order);
    const subjectList = Object.values(subjects || {}).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [homeworkHistory, setHomeworkHistory] = useState<any[]>([]);
    const [useFallback, setUseFallback] = useState(false);

    // 1. Real-time History Listener
    useEffect(() => {
        let isMounted = true;
        const hQ = useFallback
            ? query(collection(db, "homework"), limit(10))
            : query(collection(db, "homework"), orderBy("createdAt", "desc"), limit(10));

        const unsubscribe = onSnapshot(hQ, (snapshot) => {
            if (!isMounted) return;
            let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (useFallback) {
                list = [...list].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setHomeworkHistory(list);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes('index') && !useFallback) {
                console.warn("[Admin Homework] Index missing, switching to fallback.");
                setUseFallback(true);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [useFallback]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this assignment?")) return;
        try {
            await deleteDoc(doc(db, "homework", id));
        } catch (e: any) { alert(e.message); }
    };

    const fetchedSections = classId
        ? Object.values(classSections || {})
            .filter((cs: any) => cs.classId === classId)
            .map((cs: any) => sections[cs.sectionId])
            .filter(Boolean)
        : [];

    const availableSections = (classId && fetchedSections.length === 0)
        ? [{ id: "GENERAL", name: "General / No Section" }]
        : fetchedSections;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classId || !sectionId || !subjectId) {
            alert("Please select Class, Section, and Subject.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/homework/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify({
                    classId,
                    sectionId,
                    subjectId,
                    title,
                    description,
                    dueDate,
                    isInternal: true
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Homework sent successfully!");
                setTitle(""); setDescription(""); setClassId(""); setSectionId(""); setSubjectId(""); setDueDate("");
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-2 md:p-4 space-y-4 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div>
                    <h1 className="font-display text-lg md:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Post Homework
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[8px] text-accent font-black uppercase tracking-widest">Active System</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5">
                    <Card className="glass-panel border-white/5 bg-black/20 overflow-hidden shadow-2xl">
                        <div className="bg-white/5 border-b border-white/5 px-5 py-3 flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 italic">
                                <Send className="w-4 h-4 text-accent" />
                                New Assignment
                            </CardTitle>
                        </div>
                        <CardContent className="p-4 md:p-5">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-100 ml-0.5">Class</label>
                                        <Select onValueChange={(val) => { setClassId(val); setSectionId(""); }} value={classId}>
                                            <SelectTrigger className="bg-white/5 border-white/5 h-9 rounded-md focus:ring-accent transition-all text-white text-[10px] px-3">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-white/10">
                                                {classList.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id} className="text-[10px]">
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-100 ml-0.5">Section</label>
                                        <Select onValueChange={setSectionId} value={sectionId} disabled={!classId}>
                                            <SelectTrigger className="bg-white/5 border-white/5 h-9 rounded-md focus:ring-accent transition-all text-white text-[10px] px-3">
                                                <SelectValue placeholder={classId ? "Select" : "..."} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-white/10">
                                                <SelectItem value="ALL" className="text-[10px]">ALL</SelectItem>
                                                {availableSections.map((s: any) => (
                                                    <SelectItem key={s.id} value={s.id} className="text-[10px]">
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-100 ml-0.5">Subject</label>
                                        <Select onValueChange={setSubjectId} value={subjectId}>
                                            <SelectTrigger className="bg-white/5 border-white/5 h-9 rounded-md focus:ring-accent transition-all text-white text-[10px] px-3">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-white/10">
                                                {subjectList.map((s: any) => (
                                                    <SelectItem key={s.id} value={s.id} className="text-[10px]">
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-100 ml-0.5">Due Date</label>
                                        <Input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            className="bg-white/5 border-white/5 h-9 rounded-md focus:ring-accent transition-all text-white text-[10px] px-3"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-100">Homework Title</label>
                                        <Input
                                            required
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="e.g. Chapter 5 Review"
                                            className="bg-white/10 border-white/5 h-9 rounded-md focus:ring-accent transition-all text-[11px] font-bold text-white px-3"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-100">Detailed Instructions</label>
                                        <Textarea
                                            required
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Task details..."
                                            className="bg-white/5 border-white/5 min-h-[80px] rounded-md focus:ring-accent transition-all text-[10px] text-white/80 leading-relaxed p-3"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitting || !classId || !sectionId || !subjectId}
                                    className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-black text-[10px] hover:bg-accent/90 shadow-md shadow-accent/5 transition-all uppercase tracking-widest"
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin w-4 h-4" />
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Send className="w-3.5 h-3.5" />
                                            POST ASSIGNMENT
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-5">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <History className="w-6 h-6 text-accent" />
                            <h2 className="text-xl font-bold italic">Live Broadcast Feedback</h2>
                        </div>
                        <span className="text-[10px] bg-accent/20 text-accent border border-accent/30 px-3 py-1 rounded-full font-black animate-pulse">
                            REAL-TIME
                        </span>
                    </div>

                    <div className="space-y-4">
                        {homeworkHistory.length === 0 ? (
                            <div className="md:col-span-2 glass-panel p-8 text-center rounded-2xl border-dashed border-white/10 opacity-90">
                                <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-[10px] font-medium uppercase tracking-widest">No recent broadcasts</p>
                            </div>
                        ) : homeworkHistory.map((hw) => (
                            <Card key={hw.id} className="bg-white/5 border-white/10 hover:border-accent/40 transition-colors group relative overflow-hidden">
                                <CardContent className="p-3 text-white">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-0.5 min-w-0 pr-6">
                                            <h4 className="font-bold text-xs truncate leading-tight">{hw.title}</h4>
                                            <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground uppercase font-black tracking-tighter">
                                                <span>{classes[hw.classId]?.name}</span>
                                                <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                                                <span>SEC {sections[hw.sectionId]?.name}</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(hw.id)}
                                            className="h-6 w-6 text-muted-foreground hover:text-red-500 absolute top-2 right-2"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[8px] font-mono text-muted-foreground/60">
                                        <span className="flex items-center gap-1 truncate">
                                            <Bookmark className="w-2.5 h-2.5" /> {subjects[hw.subjectId]?.name}
                                        </span>
                                        <span className="shrink-0">
                                            {hw.createdAt ? new Date(hw.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '...'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-6 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-emerald-500/60 leading-relaxed font-bold uppercase tracking-widest">
                            Instant real-time sync active.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

