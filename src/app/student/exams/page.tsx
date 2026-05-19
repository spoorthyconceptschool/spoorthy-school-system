"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, where, doc, getDoc, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, AlertCircle, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";

import { useStudentData } from "@/context/StudentDataContext";

export default function StudentExamsPage() {
    const { user } = useAuth();
    const { selectedYear } = useMasterData();
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

    if (loading) return <div className="flex justify-center p-20 text-[#E6F1FF]"><Loader2 className="animate-spin" /></div>;

    if (!studentProfile) return <div className="p-8 text-center text-[#8892B0]">Student profile not found.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#E6F1FF]">My Examinations</h1>
                    <p className="text-[#8892B0]">View schedules and download examinations/hall tickets.</p>
                </div>
                {exams.some(exam => !checkHallTicketAccess(exam).allowed) && (
                    <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                            <p className="font-bold text-sm">Action Required</p>
                            <p className="text-xs">Pending fee dues detected. Clear restricted items below to unlock Examinations.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(exam => (
                    <Card key={exam.id} className="bg-[#112240] border-[#64FFDA]/10 hover:border-[#64FFDA]/30 transition-all group">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <Badge variant={exam.status === "ACTIVE" ? "default" : "secondary"} className="bg-[#64FFDA]/10 text-[#64FFDA] border-[#64FFDA]/20">
                                    {exam.status || "Scheduled"}
                                </Badge>
                            </div>
                            <CardTitle className="text-[#E6F1FF] mt-4 text-xl">{exam.name}</CardTitle>
                            <CardDescription className="text-[#8892B0] flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-[#0A192F]/50 rounded p-3 mb-4 border border-white/5">
                                <p className="text-xs text-[#8892B0] uppercase tracking-wider mb-2">Timetable Overview</p>
                                <div className="space-y-1">
                                    {!studentProfile?.classId || !exam.timetables?.[studentProfile.classId] || Object.keys(exam.timetables[studentProfile.classId]).length === 0 ? (
                                        <div className="text-amber-400/90 text-xs font-bold py-3 flex flex-col items-center gap-1 justify-center bg-amber-500/5 rounded-xl border border-amber-500/10">
                                            <AlertCircle className="w-4 h-4 text-amber-500" /> Exam timetable not updated
                                        </div>
                                    ) : (
                                        <>
                                            {Object.entries(exam.timetables[studentProfile.classId])
                                                .filter(([_, d]: any) => d.date)
                                                .slice(0, 3)
                                                .map(([subId, d]: any) => (
                                                    <div key={subId} className="flex justify-between text-sm text-[#E6F1FF]">
                                                        <span>{subId}</span>
                                                        <span className="text-[#8892B0] text-xs">{d.date}</span>
                                                    </div>
                                                ))
                                            }
                                            {(Object.keys(exam.timetables[studentProfile.classId]).length > 3) && (
                                                <div className="text-xs text-[#64FFDA] pt-1 text-center">+ More subjects</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {exam.status === 'RESULTS_RELEASED' && (
                                    <Link href={`/student/exams/${exam.id}/results`}>
                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_0_15px_-5px_#10B981]">
                                            <FileText className="w-4 h-4 mr-2" /> View Results / Report Card
                                        </Button>
                                    </Link>
                                )}

                                {(() => {
                                    const examSyllabi = classSyllabi.filter(
                                        (s: any) => s.examId === exam.id && s.content && s.content.trim() !== ""
                                    );
                                    const isSyllabusUpdated = examSyllabi.length > 0;

                                    if (!isSyllabusUpdated) {
                                        return (
                                            <div className="space-y-1">
                                                <Button disabled className="w-full border-amber-500/20 text-amber-500/80 bg-amber-500/5 cursor-not-allowed text-xs font-bold h-10 rounded-lg">
                                                    <AlertCircle className="w-4 h-4 mr-2 text-amber-500 animate-pulse" /> Syllabus Not Yet Updated
                                                </Button>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <Link href={`/student/exams/${exam.id}/syllabus`}>
                                                <Button variant="outline" className="w-full border-[#64FFDA]/30 text-[#64FFDA] hover:bg-[#64FFDA]/10">
                                                    <FileText className="w-4 h-4 mr-2" /> View Exam Syllabus
                                                </Button>
                                            </Link>
                                        );
                                    }
                                })()}

                                {(() => {
                                    const access = checkHallTicketAccess(exam);
                                    if (access.allowed) {
                                        return (
                                            <Link href={`/student/exams/${exam.id}/hall-ticket`} target="_blank">
                                                <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-black uppercase tracking-widest text-[10px] h-11 rounded-lg">
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Download Hall Ticket
                                                </Button>
                                            </Link>
                                        );
                                    } else {
                                        return (
                                            <div className="space-y-1.5 pt-1">
                                                <Button disabled className="w-full bg-red-500/10 text-red-400/90 border border-red-500/20 cursor-not-allowed font-black uppercase tracking-widest text-[10px] h-11 rounded-lg">
                                                    <Lock className="w-4 h-4 mr-2" /> Hall Ticket Locked
                                                </Button>
                                                <p className="text-[10px] text-red-400/80 text-center font-medium leading-tight px-2">
                                                    {access.reason}
                                                </p>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {exams.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-[#64FFDA]/10 rounded-lg text-[#8892B0]">
                        No exams scheduled for your class ({studentProfile.className}) yet.
                    </div>
                )}
            </div>
        </div>
    );
}
