"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, AlertCircle, Lock, Download, Info, Ticket, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";
import { useStudentData } from "@/context/StudentDataContext";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentExamsPage() {
    const { user } = useAuth();
    const { selectedYear, subjects = {} } = useMasterData();
    const { profile: studentProfile, exams: cachedExams, classSyllabi, ledger, loading } = useStudentData();

    // Track which cards are expanded for timetable/syllabus
    const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});

    const toggleExpand = (examId: string) => {
        setExpandedExams(prev => ({
            ...prev,
            [examId]: !prev[examId]
        }));
    };

    const ledgerItems = ledger?.items || [];

    const formatDateStr = (dateVal: any) => {
        if (!dateVal) return "";
        let d: Date;
        if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
            d = new Date(dateVal.seconds * 1000);
        } else {
            d = new Date(dateVal);
        }
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    };

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
        const totalDue = ledgerItems.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

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

            const targetMatch = targetTerm.match(/\d+/);
            const targetDigit = targetMatch ? parseInt(targetMatch[0], 10) : null;
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

    // Download all allowed hall tickets in one click
    const handleDownloadAll = () => {
        const allowedExams = exams.filter(exam => {
            const access = checkHallTicketAccess(exam);
            return exam.status === "ACTIVE" && access.allowed;
        });

        if (allowedExams.length === 0) {
            alert("No active hall tickets are currently unlocked for download.");
            return;
        }

        allowedExams.forEach(exam => {
            window.open(`/student/exams/${exam.id}/hall-ticket`, "_blank");
        });
    };

    if (loading && cachedExams.length === 0) {
        return (
            <div className="flex justify-center p-20 text-[#E6F1FF]">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (!studentProfile) {
        return <div className="p-8 text-center text-[#8892B0]">Student profile not found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 px-4 md:px-0 animate-in fade-in duration-500 select-none">
            {/* Header Area matching mockup text exactly */}
            <div className="text-left space-y-1">
                <h1 className="text-3xl font-extrabold text-[#E6F1FF] tracking-tight">My Examinations</h1>
                <p className="text-[#8892B0] text-sm md:text-base">View schedules and download examinations/hall tickets.</p>
            </div>

            {/* Horizontal Cards List */}
            <div className="space-y-4">
                {exams.map(exam => {
                    const access = checkHallTicketAccess(exam);
                    const isExpanded = !!expandedExams[exam.id];
                    const isResultsReleased = exam.status === "RESULTS_RELEASED";

                    // Syllabus filter
                    const examSyllabi = classSyllabi.filter(
                        (s: any) => s.examId === exam.id && s.content && s.content.trim() !== ""
                    );
                    const isSyllabusUpdated = examSyllabi.length > 0;

                    // Timetable mapping
                    const timetableData = studentProfile?.classId ? exam.timetables?.[studentProfile.classId] : null;
                    const hasTimetable = timetableData && Object.keys(timetableData).length > 0;

                    return (
                        <div 
                            key={exam.id}
                            onClick={() => toggleExpand(exam.id)}
                            className="bg-[#112240] border border-white/5 rounded-2xl hover:border-blue-500/20 cursor-pointer transition-all overflow-hidden shadow-lg animate-in fade-in duration-300"
                        >
                            {/* Card Main Row (Tap to expand/collapse details) */}
                            <div 
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Left Icon Document block */}
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 transition-transform hover:scale-105">
                                        <FileText className="w-6 h-6" />
                                    </div>

                                    {/* Middle Content */}
                                    <div className="space-y-1.5 text-left min-w-0 flex-1 pr-0 sm:pr-4">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h3 className="font-bold text-white text-base md:text-lg tracking-tight truncate">
                                                {exam.name}
                                            </h3>
                                            
                                            {/* Beautiful status badges matching mockup */}
                                            {isResultsReleased ? (
                                                <Badge className="bg-teal-500/15 text-teal-400 border border-teal-500/30 text-[9px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase">
                                                    RESULTS_RELEASED
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase">
                                                    ACTIVE
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 text-[10px] sm:text-xs text-[#8892B0] font-semibold select-none flex-wrap">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Calendar className="w-3.5 h-3.5 text-[#8892B0]" />
                                                <span>
                                                    {formatDateStr(exam.startDate)} - {formatDateStr(exam.endDate)}
                                                </span>
                                            </div>

                                            {/* Thin vertical line divider */}
                                            <div className="hidden xs:block h-3.5 w-[1px] bg-white/10" />

                                            {/* Brand blue "VIEW TIMETABLE & SYLLABUS" text toggle */}
                                            <div className="flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider text-[10px] shrink-0">
                                                <span>View Timetable & Syllabus</span>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Actions */}
                                <div className="w-full sm:w-auto flex items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0" onClick={e => e.stopPropagation()}>
                                    {isResultsReleased ? (
                                        <Link href={`/student/exams/${exam.id}/results`} className="w-full sm:w-auto">
                                            <Button 
                                                variant="outline" 
                                                className="w-full sm:w-auto border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-bold px-3 py-1.5 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px]"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> View Results
                                            </Button>
                                        </Link>
                                    ) : (
                                        <>
                                            {access.allowed ? (
                                                <Link href={`/student/exams/${exam.id}/hall-ticket`} className="w-full sm:w-auto">
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full sm:w-auto border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 font-bold px-3 py-1.5 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px]"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> Hall Ticket
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-1">
                                                    <Button 
                                                        disabled 
                                                        className="w-full sm:w-auto bg-red-500/5 text-red-400/90 border border-red-500/20 cursor-not-allowed font-bold px-3 py-1.5 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px]"
                                                    >
                                                        <Lock className="w-3.5 h-3.5" /> Locked
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Collapsible Details Section (Framer Motion) */}
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div 
                                            onClick={e => e.stopPropagation()}
                                            className="px-5 pb-5 pt-1 border-t border-white/5 bg-[#0d1d37]/40 space-y-4"
                                        >
                                            {/* Display Access Alert if Locked */}
                                            {!isResultsReleased && !access.allowed && (
                                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold">Hall Ticket Locked Due to Pending Dues</p>
                                                        <p className="text-[11px] text-red-400/80 mt-0.5">{access.reason}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Left: Timetable */}
                                                <div className="space-y-2 text-left">
                                                    <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Exam Timetable</h4>
                                                    {!hasTimetable ? (
                                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-[#8892B0] text-center">
                                                            No timetable uploaded for your class yet.
                                                        </div>
                                                    ) : (
                                                        <div className="bg-[#0A192F]/50 border border-white/5 rounded-xl p-3.5 space-y-2.5 max-h-[220px] overflow-y-auto">
                                                            {Object.entries(timetableData)
                                                                .filter(([_, d]: any) => d.date)
                                                                .map(([subId, d]: any) => (
                                                                    <div key={subId} className="flex justify-between items-center text-xs pb-2 border-b border-white/5 last:border-0 last:pb-0">
                                                                        <div className="font-bold text-white truncate pr-2">
                                                                            {subjects[subId]?.name || subId}
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="text-neutral-300 font-medium">{formatDateStr(d.date)}</p>
                                                                            {d.time && <p className="text-[10px] text-[#8892B0] font-mono mt-0.5">{d.time}</p>}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Syllabus */}
                                                <div className="space-y-2 text-left flex flex-col">
                                                    <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Exam Syllabus</h4>
                                                    {!isSyllabusUpdated ? (
                                                        <div className="flex-1 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-[#8892B0] text-center flex items-center justify-center">
                                                            Syllabus not yet updated by the teacher.
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 bg-[#0A192F]/50 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                                                            <div className="text-xs text-neutral-300 line-clamp-4 leading-relaxed whitespace-pre-line">
                                                                {examSyllabi[0].content}
                                                            </div>
                                                            <Link href={`/student/exams/${exam.id}/syllabus`} className="block w-full">
                                                                <Button variant="outline" className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10 text-xs h-9 rounded-xl">
                                                                    <FileText className="w-3.5 h-3.5 mr-2" /> View Detailed Syllabus
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {exams.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-[#64FFDA]/10 rounded-lg text-[#8892B0]">
                        No exams scheduled for your class ({studentProfile.className}) yet.
                    </div>
                )}
            </div>

            {/* Bottom Section Card 1: Timetable and syllabus Info Banner (Matching mockup exactly) */}
            <div className="bg-[#112240]/30 border border-blue-500/10 p-5 rounded-2xl flex items-start gap-4 text-left shadow-lg">
                <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-snug">
                        Timetable and syllabus will be updated by the administration.
                    </p>
                    <p className="text-xs text-amber-500 font-bold tracking-tight">
                        Please check regularly for updates.
                    </p>
                </div>
            </div>

            {/* Bottom Section Card 2: Download All Tickets Banner (Matching mockup exactly) */}
            <div className="bg-[#112240]/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-lg">
                <div className="flex items-center gap-3.5 text-left min-w-0">
                    {/* Blue ticket icon container */}
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Ticket className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white leading-tight">
                            Download all your hall tickets in one click
                        </h4>
                        <p className="text-xs text-[#8892B0] font-medium mt-0.5">
                            Get all hall tickets in a single PDF file.
                        </p>
                    </div>
                </div>

                {/* Right button action */}
                <Button 
                    onClick={handleDownloadAll}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 h-11 rounded-xl flex items-center gap-2 text-xs shadow-md transition-all shrink-0"
                >
                    <Download className="w-4 h-4" /> Download All
                </Button>
            </div>
        </div>
    );
}
