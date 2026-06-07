"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Trophy, FileText, ArrowRight } from "lucide-react";
import { SingleReportCardButton } from "@/components/admin/SingleReportCardButton";
import { Button } from "@/components/ui/button";

interface AcademicsTabProps {
    student: any;
    exams: any[];
    examResults: Record<string, any>;
    loading?: boolean;
}

export function AcademicsTab({
    student,
    exams,
    examResults,
    loading
}: AcademicsTabProps) {

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-[200px] bg-white/5 rounded-[2rem]" />
                <div className="h-[200px] bg-white/5 rounded-[2rem]" />
            </div>
        );
    }

    if (!exams || exams.length === 0) {
        return (
            <div className="text-center py-20 text-[#8892B0] border border-dashed border-white/10 rounded-[2rem] bg-white/[0.02]">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
                <p className="text-sm">No academic records found for this academic year.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4 pb-8">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" /> Exam Results
                </h3>
            </div>
            
            <div className="space-y-1.5">
                {exams.map(exam => {
                    const result = examResults[exam.id];
                    
                    return (
                        <div key={exam.id} className="bg-[#0f172a] border border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between p-2.5 gap-2">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <h4 className="font-bold text-white text-[13px] leading-tight truncate">{exam.name}</h4>
                                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8892B0] bg-white/5 px-1.5 py-0.5 rounded">{exam.academicYear}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`px-1.5 py-[1px] rounded text-[8px] font-black uppercase tracking-widest shrink-0 ${
                                        result ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[#8892B0]'
                                    }`}>
                                        {result ? 'Published' : 'Pending'}
                                    </div>
                                    {result && result.grade && (
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-300">
                                            <Trophy size={10} /> Grade {result.grade}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {result ? (
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                        <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5">Score</span>
                                        <span className="text-[11px] font-bold text-white">{result.totalMarksObtained || 0}/{result.totalMaxMarks || 0}</span>
                                    </div>
                                    <div className="text-right w-[40px]">
                                        <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5">%</span>
                                        <span className="text-[12px] font-bold text-emerald-400">{result.percentage || 0}%</span>
                                    </div>
                                    <SingleReportCardButton 
                                        studentId={student.schoolId}
                                        examId={exam.id}
                                        classId={student.classId}
                                        sectionId={student.sectionId}
                                        studentName={student.studentName}
                                    />
                                </div>
                            ) : (
                                <div className="text-[10px] font-medium text-[#8892B0] shrink-0 text-right">
                                    Evaluating...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
