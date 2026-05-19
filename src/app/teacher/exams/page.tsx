"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, FileText, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";

export default function TeacherExamsPage() {
    const { user } = useAuth();
    const { subjectTeachers, classSections, selectedYear } = useMasterData();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const fetchExams = async () => {
            try {
                // 1. Fetch teacher profile to get teacherDoc.id and schoolId
                const tQ = query(collection(db, "teachers"), where("uid", "==", user.uid));
                const tSnap = await getDocs(tQ);
                if (tSnap.empty) {
                    setLoading(false);
                    return;
                }
                const teacherDoc = tSnap.docs[0];
                const teacherId = teacherDoc.id;
                const schoolId = teacherDoc.data().schoolId;

                // 2. Resolve all unique classIds where this teacher is subject teacher or class teacher
                const teacherClasses = new Set<string>();

                // A. Subject teacher classes
                Object.entries(subjectTeachers || {}).forEach(([classSectionKey, subs]: [string, any]) => {
                    const [cId] = classSectionKey.split("_");
                    Object.values(subs || {}).forEach((tId) => {
                        if (tId === teacherId || tId === schoolId) {
                            teacherClasses.add(cId);
                        }
                    });
                });

                // B. Class teacher classes
                Object.values(classSections || {}).forEach((cs: any) => {
                    if ((cs.classTeacherId === teacherId || cs.classTeacherId === schoolId) && (cs.active || cs.isActive || cs.active !== false)) {
                        teacherClasses.add(cs.classId);
                    }
                });

                // 3. Fetch all exams
                const snap = await getDocs(collection(db, "exams"));
                const allExams = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a: any, b: any) => {
                        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                        return dateB - dateA;
                    });

                // 4. Filter exams by academicYear and class visibility
                const activeYear = selectedYear || "2025-2026";
                const validExams = allExams.filter((e: any) => {
                    if (e.status === "DELETED") return false;

                    // If class scope restriction exists and teacher is assigned to an eligible class, show it instantly!
                    if (e.classIds && Array.isArray(e.classIds)) {
                        // Handle legacy/buggy exams with empty classIds array
                        if (e.classIds.length === 0) {
                            const examYear = e.academicYear || "2025-2026";
                            return examYear === activeYear;
                        }

                        const hasClass = e.classIds.some((cId: string) => teacherClasses.has(cId));
                        if (hasClass) return true;
                        // If it has classIds but teacher doesn't teach any of them, hide it!
                        return false; 
                    }

                    // Fallback for old exams without class restrictions: check academic year match
                    const examYear = e.academicYear || "2025-2026";
                    return examYear === activeYear;
                });

                setExams(validExams);
            } catch (e: any) {
                console.warn("[Exams] Error fetching exams:", e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, [user, subjectTeachers, classSections, selectedYear]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400 w-8 h-8" /></div>;

    return (
        <div className="w-full text-[#E6F1FF] pb-20 animate-in fade-in duration-300">
            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT (High-density, space-optimized exam portal list)          */}
            {/* ========================================================================= */}
            <div className="lg:hidden block p-3 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                        <Link href="/teacher" className="group flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-emerald-400">
                            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" /> Back
                        </Link>
                        <h1 className="text-xl font-display font-bold italic mt-0.5">Examinations</h1>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400/80">Marks Room</span>
                    </div>
                </div>

                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest -mt-1">
                    Select an active schedule to key in student performance grades
                </p>

                {exams.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-white/40 italic bg-black/10 rounded-xl border border-white/5">
                        No active exams found for your assigned classes.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {exams.map((exam) => (
                            <Link key={exam.id} href={`/teacher/exams/${exam.id}`} className="block">
                                <Card className="bg-black/20 border-white/10 hover:bg-black/30 transition-all rounded-xl p-3.5 space-y-3 relative overflow-hidden group">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-white leading-tight">{exam.name}</div>
                                            <div className="flex items-center gap-1 text-[8px] text-white/40 uppercase tracking-widest font-black">
                                                <Calendar className="w-2.5 h-2.5 text-emerald-400" />
                                                {new Date(exam.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - {new Date(exam.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        {exam.status === "ACTIVE" ? (
                                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">Active</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/40 border border-white/10">
                                                {exam.status === 'RESULTS_RELEASED' ? 'Published' : exam.status || 'Active'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Enter Marks</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEWPORT (Wide Workspace layout for active examinations)          */}
            {/* ========================================================================= */}
            <div className="hidden lg:block max-w-[1600px] mx-auto p-12 space-y-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="space-y-1">
                        <Link href="/teacher" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors mb-2 font-bold uppercase tracking-wider">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                        <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">Exams & Grading</h1>
                        <p className="text-muted-foreground text-sm">Review published schedules and key in student marks for courses in your jurisdiction.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam) => (
                        <Link key={exam.id} href={`/teacher/exams/${exam.id}`}>
                            <Card className="bg-black/40 border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all cursor-pointer h-full group rounded-[2rem] overflow-hidden flex flex-col justify-between p-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <Badge className={exam.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 uppercase tracking-widest text-[9px] font-black px-3 py-1 rounded-full" : "bg-white/5 border border-white/10 text-white/40 uppercase tracking-widest text-[9px] font-black px-3 py-1 rounded-full"}>
                                            {exam.status === 'RESULTS_RELEASED' ? 'PUBLISHED' : exam.status || 'ACTIVE'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <CardTitle className="text-2xl font-display italic text-white group-hover:text-emerald-400 transition-colors">{exam.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 text-xs font-medium">
                                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                            {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="mt-8 pt-4 border-t border-white/5 flex items-center text-xs text-emerald-400 font-bold uppercase tracking-widest">
                                    Open Entry Console <ChevronRight className="ml-auto w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Card>
                        </Link>
                    ))}

                    {exams.length === 0 && (
                        <div className="col-span-full py-24 text-center border border-dashed border-white/10 rounded-[2rem] text-muted-foreground flex flex-col items-center justify-center gap-3">
                            <FileText className="w-12 h-12 opacity-10" />
                            <p className="font-bold text-sm uppercase tracking-widest opacity-40">No examinations found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
