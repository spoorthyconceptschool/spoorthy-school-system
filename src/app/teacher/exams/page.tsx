"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, FileText, Loader2, ArrowLeft, PenTool, BookOpen, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";

export default function TeacherExamsPage() {
    const { user } = useAuth();
    const { subjectTeachers, classSections, selectedYear } = useMasterData();
    const [exams, setExams] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("teacher_exams_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });
    const [loading, setLoading] = useState(() => {
        if (typeof window !== "undefined") {
            const cached = localStorage.getItem("teacher_exams_cache");
            return cached ? false : true;
        }
        return true;
    });

    useEffect(() => {
        if (!user?.uid) return;

        const fetchExams = async () => {
            setLoading(true);
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
                if (typeof window !== "undefined") {
                    localStorage.setItem("teacher_exams_cache", JSON.stringify(validExams));
                }
            } catch (e: any) {
                console.warn("[Exams] Error fetching exams:", e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, [user, subjectTeachers, classSections, selectedYear]);

    if (loading && exams.length === 0) {
        return (
            <div className="w-full min-h-screen text-[#E6F1FF] bg-transparent font-sans pb-20 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-10 animate-pulse">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5" />
                            <div className="space-y-2">
                                <div className="h-6 w-48 bg-white/5 rounded" />
                                <div className="h-4 w-32 bg-white/5 rounded" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-72 bg-white/5 rounded-3xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen text-[#E6F1FF] bg-transparent font-sans pb-20 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#10B981]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3B82F6]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-10 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#10B981]/20 to-[#64FFDA]/20 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40">
                            <PenTool className="w-6 h-6 text-[#10B981]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-display">EXAMS & GRADING</h1>
                                <Badge className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono text-[9px] px-2 py-0.5 rounded uppercase">FACULTY</Badge>
                            </div>
                            <p className="text-xs text-neutral-400 font-medium">
                                Review published schedules and key in student marks for your assigned courses.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Link href="/teacher" className="group flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Dashboard
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam, index) => {
                        const isActive = exam.status === "ACTIVE";
                        const isCompleted = exam.status === "RESULTS_RELEASED" || exam.status === "COMPLETED";

                        return (
                            <Link key={exam.id} href={`/teacher/exams/${exam.id}`} className="block h-full">
                                <div 
                                    className={`group relative rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 h-full ${
                                        isActive 
                                            ? "bg-[#0D1F3D]/80 border-[#10B981]/30 shadow-[#10B981]/5" 
                                            : "bg-[#0D1F3D]/30 border-white/10 hover:border-white/20"
                                    }`}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Card Glow */}
                                    <div className={`absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-[#3B82F6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                                    <div className="p-6 md:p-8 space-y-6 relative z-10 flex-grow">
                                        {/* Exam Header */}
                                        <div className="flex justify-between items-start">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 ${
                                                isActive ? "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]" : "bg-white/5 border-white/10 text-neutral-400"
                                            }`}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <Badge className={`font-black uppercase tracking-widest text-[9px] px-2.5 py-1 rounded-lg border ${
                                                isActive 
                                                    ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" 
                                                    : isCompleted 
                                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                                                        : "bg-white/5 text-neutral-400 border-white/10"
                                            }`}>
                                                {exam.status === 'RESULTS_RELEASED' ? 'PUBLISHED' : exam.status || 'ACTIVE'}
                                            </Badge>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-black text-white leading-tight font-display tracking-wide group-hover:text-[#10B981] transition-colors">{exam.name}</h3>
                                            <div className="flex items-center gap-2 mt-2 text-xs font-mono font-medium text-neutral-400 bg-white/5 px-3 py-1.5 rounded-lg w-fit border border-white/5">
                                                <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
                                                {new Date(exam.startDate).toLocaleDateString('en-GB')} - {new Date(exam.endDate).toLocaleDateString('en-GB')}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                                                <BookOpen className="w-4 h-4 text-[#10B981]" /> 
                                                Exam Data Entry
                                            </div>
                                            <p className="text-[11px] text-neutral-500 mt-1">Access the grading console to input student marks for your assigned subjects.</p>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="p-4 md:p-6 bg-black/20 border-t border-white/5 space-y-3 relative z-10 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">
                                            Open Console
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20 group-hover:bg-[#10B981]/20 transition-colors">
                                            <ChevronRight className="w-4 h-4 text-[#10B981] group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {exams.length === 0 && !loading && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-neutral-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest font-display">No Examinations Found</h3>
                        <p className="text-sm text-[#8892B0] max-w-sm">There are currently no active or past examinations scheduled for your assigned classes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
