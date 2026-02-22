"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookOpen, Calendar, User, Info, Bookmark, Loader2, CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function StudentHomeworkPage() {
    const { user } = useAuth();
    const { subjects, homeworkSubjects } = useMasterData();
    const [homework, setHomework] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [useFallback, setUseFallback] = useState(false);

    useEffect(() => {
        if (!user?.email) return;

        const schoolIdFromEmail = user.email.split('@')[0].toUpperCase();

        // 1. Listen for Profile (Dual Strategy)
        const unsubDoc = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                setStudentProfile(pSnap.data());
            } else if (user.uid) {
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const unsubQuery = onSnapshot(q, (qSnap) => {
                    if (!qSnap.empty) setStudentProfile(qSnap.docs[0].data());
                });
                return () => unsubQuery();
            }
        }, (err) => {
            console.error("Profile sync error:", err);
            setLoading(false);
        });

        return () => unsubDoc();
    }, [user]);

    useEffect(() => {
        if (!user || !studentProfile?.classId) return;

        let isMounted = true;
        const classId = studentProfile.classId;
        const sectionId = studentProfile.sectionId;

        const hQ = useFallback
            ? query(collection(db, "homework"), where("classId", "==", classId), limit(50))
            : query(collection(db, "homework"), where("classId", "==", classId), orderBy("createdAt", "desc"), limit(50));

        const unsubscribe = onSnapshot(hQ, (snapshot) => {
            if (!isMounted) return;
            let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            let filtered = sectionId
                ? list.filter((hw: any) => !hw.sectionId || hw.sectionId === sectionId || hw.sectionId === "ALL" || hw.sectionId === "GENERAL")
                : list;

            if (useFallback) {
                filtered = filtered.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }

            setHomework(filtered);
            setLoading(false);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes('index') && !useFallback) {
                console.warn("[Homework] Index missing, switching to fallback query.");
                setUseFallback(true);
            } else if (!err.message.includes('index')) {
                console.error("[Homework] Firestore Error:", err);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [user, studentProfile, useFallback]);

    // Group homework by subject (keep only the latest)
    const getLatestHomeworkBySubject = () => {
        const map: Record<string, any> = {};
        homework.forEach(hw => {
            if (!map[hw.subjectId]) {
                map[hw.subjectId] = hw;
            }
        });
        return map;
    };

    const latestHW = getLatestHomeworkBySubject();

    // Get subjects marked as "Homework Giving" for this class
    const getHomeworkGivingSubjects = () => {
        if (!studentProfile?.classId) return [];
        const sectionId = studentProfile.sectionId || "A";
        const classKey = `${studentProfile.classId}_${sectionId}`;
        const config = homeworkSubjects[classKey] || {};

        return Object.keys(config).filter(sid => config[sid]);
    };

    const targetSubjects = Array.from(new Set([...getHomeworkGivingSubjects(), ...Object.keys(latestHW)]));

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in p-4 md:p-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">Today's Homework</h1>
                    <p className="text-white/60 font-medium text-sm md:text-base">Daily assignments for your class subjects.</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl w-fit">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span className="text-xs md:text-sm font-bold text-white/80">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {loading ? (
                <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] animate-pulse font-mono">Loading class subjects...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Desktop View: Table */}
                    <div className="hidden md:block">
                        <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <TableHeader className="bg-white/[0.03] border-b border-white/10">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[200px] text-white/50 uppercase text-[10px] font-black tracking-widest py-6">Subject</TableHead>
                                    <TableHead className="text-white/50 uppercase text-[10px] font-black tracking-widest py-6">Assignment / Content</TableHead>
                                    <TableHead className="w-[150px] text-white/50 uppercase text-[10px] font-black tracking-widest py-6">Status</TableHead>
                                    <TableHead className="w-[150px] text-white/50 uppercase text-[10px] font-black tracking-widest py-6 text-right">Teacher</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {targetSubjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <AlertCircle className="w-8 h-8 text-white/20" />
                                                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No homework-giving subjects defined for your class.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : targetSubjects.map(sid => {
                                    const hw = latestHW[sid];
                                    const subjectName = subjects[sid]?.name || sid;

                                    return (
                                        <TableRow key={sid} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <TableCell className="py-6 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-accent/30 transition-all">
                                                        <BookOpen className="w-4 h-4 text-accent" />
                                                    </div>
                                                    <span className="font-bold text-white text-base tracking-tight">{subjectName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 align-top">
                                                {hw ? (
                                                    <div className="space-y-2">
                                                        <h4 className="font-bold text-white/90 text-sm leading-relaxed">{hw.title}</h4>
                                                        <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                                                            {hw.description}
                                                        </p>
                                                        {hw.dueDate && (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-400/10 border border-red-400/20 text-red-400 text-[10px] font-black uppercase tracking-tighter">
                                                                <Clock className="w-3 h-3" /> Due: {hw.dueDate}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-white/20 italic text-sm py-2">
                                                        Not Assigned
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-6 align-top">
                                                {hw ? (
                                                    <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 font-black uppercase text-[9px] tracking-widest">
                                                        <CheckCircle2 className="w-3 h-3 mr-1.5" /> Published
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-white/20 border-white/10 font-black uppercase text-[9px] tracking-widest">
                                                        Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-6 align-top text-right">
                                                {hw ? (
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-bold text-white/80">{hw.teacherName}</div>
                                                        <div className="text-[10px] text-white/30 font-mono uppercase tracking-tighter">
                                                            {hw.createdAt ? new Date(hw.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-white/10">--</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Card>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {targetSubjects.length === 0 ? (
                            <div className="py-20 text-center bg-black/40 rounded-3xl border border-dashed border-white/10">
                                <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
                                <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] px-6">No homework-giving subjects defined.</p>
                            </div>
                        ) : targetSubjects.map(sid => {
                            const hw = latestHW[sid];
                            const subjectName = subjects[sid]?.name || sid;

                            return (
                                <Card key={sid} className={`bg-black/40 border-white/10 overflow-hidden ${hw ? 'border-l-4 border-l-emerald-500' : 'opacity-60 border-l-4 border-l-white/10'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-lg ${hw ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/40'}`}>
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-white text-base tracking-tight uppercase">{subjectName}</span>
                                            </div>
                                            {hw ? (
                                                <Badge className="bg-[#10B981]/10 text-[#10B981] border-none text-[8px] font-black tracking-widest uppercase">Posted</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-white/20 border-white/10 text-[8px] font-black tracking-widest uppercase">N/A</Badge>
                                            )}
                                        </div>

                                        {hw ? (
                                            <div className="space-y-3">
                                                <p className="font-bold text-white text-sm leading-snug">{hw.title}</p>
                                                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{hw.description}</p>

                                                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Teacher</span>
                                                        <span className="text-xs font-bold text-white/80">{hw.teacherName}</span>
                                                    </div>
                                                    {hw.dueDate && (
                                                        <div className="text-right flex flex-col items-end">
                                                            <span className="text-[10px] text-red-500/60 font-black uppercase tracking-widest">Due</span>
                                                            <span className="text-xs font-bold text-red-400">{hw.dueDate}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-4 text-white/20 text-xs font-bold uppercase italic tracking-widest text-center">
                                                No assignment posted today
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Quick Stats / Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <Card className="bg-emerald-500/5 border-emerald-500/20 p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">{Object.keys(latestHW).filter(sid => targetSubjects.includes(sid)).length}</div>
                                <div className="text-[10px] uppercase font-black tracking-widest text-white/40">Assignments Posted</div>
                            </div>
                        </Card>
                        <Card className="bg-amber-500/5 border-amber-500/20 p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl">
                                <Info className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">{targetSubjects.length - Object.keys(latestHW).filter(sid => targetSubjects.includes(sid)).length}</div>
                                <div className="text-[10px] uppercase font-black tracking-widest text-white/40">Pending Subjects</div>
                            </div>
                        </Card>
                        <Card className="hidden lg:flex bg-indigo-500/5 border-indigo-500/20 p-4 items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <User className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-black tracking-widest text-white/40 italic">Academic Profile</div>
                                <div className="text-sm font-bold text-white truncate">{studentProfile?.studentName || "Verified Student"}</div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
