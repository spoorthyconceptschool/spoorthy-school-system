"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, AlertCircle, CheckCircle, Lock, GraduationCap, ChevronRight, Clock, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";
import { useStudentData } from "@/context/StudentDataContext";

const formatTime12h = (time24?: string) => {
    if (!time24) return "";
    try {
        const [hoursStr, minutesStr] = time24.split(":");
        let hours = parseInt(hoursStr, 10);
        const minutes = minutesStr || "00";
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
        return time24;
    }
};

export default function StudentExamsPage() {
    const { user } = useAuth();
    const { selectedYear, subjects } = useMasterData();
    const { profile: studentProfile, exams: cachedExams, classSyllabi, ledger, loading } = useStudentData();

    const ledgerItems = ledger?.items || [];
    const dueAmount = ledgerItems.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);
    const feeStatus = dueAmount <= 0 ? "CLEARED" : "PENDING";

    const exams = cachedExams.filter((e: any) => {
        if (e.status === "DELETED") return false;
        
        const myClassId = studentProfile?.classId;
        const myYear = selectedYear || studentProfile?.academicYear || "2025-2026";
        
        if (e.classIds && Array.isArray(e.classIds)) {
            if (e.classIds.length === 0) {
                return e.academicYear === myYear;
            }
            if (e.classIds.includes(myClassId)) return true;
            return false;
        }
        return e.academicYear === myYear;
    });

    const checkHallTicketAccess = (exam: any) => {
        // Calculate total overall due
        const totalDue = ledgerItems.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

        // Check individual override first!
        if (exam.hallTicketOverrides && exam.hallTicketOverrides[studentProfile?.id] === true) {
            return { allowed: true, due: 0, reason: "" };
        }

        const rule = exam.hallTicketRule || "NO_RESTRICTION";

        if (rule === "NO_RESTRICTION") {
            return { allowed: true, due: 0, reason: "" };
        }

        if (rule === "PAID_FULL_FEE") {
            const isAllowed = totalDue <= 0;
            return {
                allowed: isAllowed,
                due: totalDue,
                reason: isAllowed ? "" : "Clear all outstanding school dues."
            };
        }

        if (rule === "PENDING_LIMIT") {
            const limit = Number(exam.hallTicketLimitAmount || 0);
            const isAllowed = totalDue <= limit;
            return {
                allowed: isAllowed,
                due: totalDue,
                reason: isAllowed ? "" : `Pending balance (₹${totalDue.toLocaleString()}) exceeds the allowed limit of ₹${limit.toLocaleString()}.`
            };
        }

        if (rule === "PAID_EXAM_FEE") {
            const examFeeItems = ledgerItems.filter((item: any) => 
                item.name?.toUpperCase().includes("EXAM")
            );
            
            if (examFeeItems.length === 0) {
                return { allowed: true, due: 0, reason: "" };
            }

            const unpaidExamFees = examFeeItems.filter((item: any) => 
                (item.amount - (item.paidAmount || 0)) > 0
            );

            const isAllowed = unpaidExamFees.length === 0;
            const unpaidAmount = unpaidExamFees.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

            return {
                allowed: isAllowed,
                due: unpaidAmount,
                reason: isAllowed ? "" : `Clear pending Exam Fees (₹${unpaidAmount.toLocaleString()}).`
            };
        }

        if (rule === "PAID_SPECIFIC_TERM") {
            const targetTerm = exam.hallTicketTerm || "";
            if (!targetTerm) return { allowed: true, due: 0, reason: "" };

            // Parse target term digit (e.g. "Term 2" -> 2)
            const targetMatch = targetTerm.match(/\d+/);
            const targetDigit = targetMatch ? parseInt(targetMatch[0], 10) : null;

            // Filter term fee items in ledger
            const termItems = ledgerItems.filter((item: any) => item.type === "TERM");
            
            const unpaidMatchingTerms = termItems.filter((item: any) => {
                const itemDue = item.amount - (item.paidAmount || 0);
                if (itemDue <= 0) return false;

                if (targetDigit !== null) {
                    const itemMatch = item.name?.match(/\d+/);
                    const itemDigit = itemMatch ? parseInt(itemMatch[0], 10) : null;
                    if (itemDigit !== null) {
                        return itemDigit <= targetDigit;
                    }
                }

                return item.name?.toUpperCase().includes(targetTerm.toUpperCase());
            });

            const isAllowed = unpaidMatchingTerms.length === 0;
            const unpaidAmount = unpaidMatchingTerms.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

            return {
                allowed: isAllowed,
                due: unpaidAmount,
                reason: isAllowed ? "" : `Clear pending dues up to ${targetTerm} (₹${unpaidAmount.toLocaleString()}).`
            };
        }

        return { allowed: true, due: 0, reason: "" };
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen text-[#E6F1FF] bg-[#030712] font-sans pb-20 p-4 md:p-8">
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
                            <div key={i} className="h-80 bg-white/5 rounded-3xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!studentProfile) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-[#070F1E]">
                <div className="text-center space-y-4 border border-white/10 p-10 rounded-3xl bg-white/5 backdrop-blur-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Profile Not Found</h2>
                    <p className="text-neutral-400 text-sm">We could not locate your student profile.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen text-[#E6F1FF] bg-gradient-to-b from-[#030712] via-[#09152b] to-[#030712] font-sans pb-20 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#64FFDA]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3B82F6]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-10 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6]/20 to-[#64FFDA]/20 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40">
                            <GraduationCap className="w-6 h-6 text-[#64FFDA]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-display">EXAMINATION CENTER</h1>
                                <Badge className="bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 font-mono text-[9px] px-2 py-0.5 rounded uppercase">ACADEMICS</Badge>
                            </div>
                            <p className="text-xs text-neutral-400 font-medium">
                                Manage your examination schedules, download syllabi, and retrieve hall tickets.
                            </p>
                        </div>
                    </div>

                    {exams.some(exam => !checkHallTicketAccess(exam).allowed) && (
                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                            <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
                                <Lock className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                                <p className="font-bold text-xs text-red-400 uppercase tracking-wider">Action Required</p>
                                <p className="text-[11px] text-red-400/80">Pending fee dues detected. Clear restricted items to unlock Examinations.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam, index) => {
                        const access = checkHallTicketAccess(exam);
                        const isActive = exam.status === "ACTIVE";
                        const isCompleted = exam.status === "RESULTS_RELEASED" || exam.status === "COMPLETED";

                        return (
                            <div 
                                key={exam.id} 
                                className={`group relative rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 ${
                                    isActive 
                                        ? "bg-[#0D1F3D]/80 border-[#64FFDA]/30 shadow-[#64FFDA]/5" 
                                        : "bg-[#0D1F3D]/30 border-white/10 hover:border-white/20"
                                }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Card Glow */}
                                <div className={`absolute inset-0 bg-gradient-to-br from-[#3B82F6]/5 to-[#64FFDA]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                                <div className="p-6 md:p-8 space-y-6 relative z-10 flex-grow">
                                    {/* Exam Header */}
                                    <div className="flex justify-between items-start">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                                            isActive ? "bg-[#64FFDA]/10 border-[#64FFDA]/20 text-[#64FFDA]" : "bg-white/5 border-white/10 text-neutral-400"
                                        }`}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <Badge className={`font-black uppercase tracking-widest text-[9px] px-2.5 py-1 rounded-lg border ${
                                            isActive 
                                                ? "bg-[#64FFDA]/15 text-[#64FFDA] border-[#64FFDA]/30" 
                                                : isCompleted 
                                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                                                    : "bg-white/5 text-neutral-400 border-white/10"
                                        }`}>
                                            {exam.status || "SCHEDULED"}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-white leading-tight font-display tracking-wide">{exam.name}</h3>
                                        <div className="flex items-center gap-2 mt-2 text-xs font-mono font-medium text-neutral-400 bg-white/5 px-3 py-1.5 rounded-lg w-fit border border-white/5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Timetable Snapshot */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#64FFDA] tracking-widest">
                                            <Clock className="w-3 h-3" /> Upcoming Papers
                                        </div>
                                        
                                        {!studentProfile?.classId || !exam.timetables?.[studentProfile.classId] || Object.keys(exam.timetables[studentProfile.classId]).length === 0 ? (
                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center gap-2 h-[100px]">
                                                <Calendar className="w-5 h-5 text-neutral-600" />
                                                <span className="text-xs text-neutral-500 font-medium italic">Schedule not yet published</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 bg-black/20 p-3 rounded-2xl border border-white/5 h-[120px] overflow-hidden relative">
                                                {Object.entries(exam.timetables[studentProfile.classId])
                                                    .filter(([_, d]: any) => d.date)
                                                    .sort((a, b) => new Date((a[1] as any).date).getTime() - new Date((b[1] as any).date).getTime())
                                                    .slice(0, 3)
                                                    .map(([subId, d]: any) => {
                                                        const subjectName = subjects?.[subId]?.name || subId;
                                                        return (
                                                            <div key={subId} className="flex justify-between items-center bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5">
                                                                <span className="text-[11px] font-bold text-white truncate max-w-[120px]">{subjectName}</span>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] font-mono text-[#8892B0] font-semibold">{d.date}</div>
                                                                    {(d.startTime || d.endTime) && (
                                                                        <div className="text-[9px] font-mono text-neutral-500">{formatTime12h(d.startTime)} - {formatTime12h(d.endTime)}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                                {Object.keys(exam.timetables[studentProfile.classId]).length > 3 && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#09152b] to-transparent flex items-end justify-center pb-1">
                                                        <span className="text-[9px] uppercase font-black tracking-widest text-[#64FFDA] bg-black/80 px-2 py-0.5 rounded border border-[#64FFDA]/20">
                                                            + {Object.keys(exam.timetables[studentProfile.classId]).length - 3} More
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="p-4 md:p-6 bg-black/20 border-t border-white/5 space-y-3 relative z-10">
                                    {exam.status === 'RESULTS_RELEASED' && (
                                        <Link href={`/student/exams/${exam.id}/results`} className="block w-full">
                                            <Button className="w-full h-12 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 group/btn transition-all">
                                                <Sparkles className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" /> View Scorecard
                                            </Button>
                                        </Link>
                                    )}

                                    {(() => {
                                        const examSyllabi = classSyllabi.filter(
                                            (s: any) => s.examId === exam.id && s.content && s.content.trim() !== ""
                                        );
                                        const isSyllabusUpdated = examSyllabi.length > 0;

                                        return (
                                            <Link href={`/student/exams/${exam.id}/syllabus`} className={isSyllabusUpdated ? "block w-full" : "block w-full pointer-events-none"}>
                                                <Button 
                                                    disabled={!isSyllabusUpdated} 
                                                    variant="outline" 
                                                    className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-between px-5 transition-all ${
                                                        isSyllabusUpdated 
                                                            ? "bg-white/5 border-white/10 text-white hover:bg-[#64FFDA]/10 hover:border-[#64FFDA]/30 hover:text-[#64FFDA]" 
                                                            : "bg-white/[0.01] border-white/5 text-neutral-600"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" /> 
                                                        {isSyllabusUpdated ? "View Syllabus" : "Syllabus Pending"}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 opacity-50" />
                                                </Button>
                                            </Link>
                                        );
                                    })()}

                                    {(() => {
                                        if (access.allowed) {
                                            return (
                                                <Link href={`/student/exams/${exam.id}/hall-ticket`} target="_blank" className="block w-full">
                                                    <Button className="w-full h-12 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-between px-5 group/btn transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4" /> Download Hall Ticket
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 opacity-50 group-hover/btn:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>
                                            );
                                        } else {
                                            return (
                                                <div className="relative group/lock">
                                                    <Button disabled className="w-full h-12 bg-red-500/5 text-red-500/50 border border-red-500/10 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-between px-5">
                                                        <div className="flex items-center gap-2">
                                                            <Lock className="w-4 h-4" /> Hall Ticket Locked
                                                        </div>
                                                    </Button>
                                                    <div className="absolute inset-x-0 bottom-full mb-2 bg-red-500/90 text-white text-[10px] font-bold p-3 rounded-xl shadow-xl border border-red-400/50 opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none text-center">
                                                        {access.reason}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {exams.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Calendar className="w-8 h-8 text-neutral-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No Scheduled Examinations</h3>
                        <p className="text-sm text-[#8892B0] max-w-sm">There are currently no upcoming or past examinations scheduled for your class profile.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
