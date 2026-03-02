"use client";

import { use } from "react";
import { MarksEntryManager } from "@/components/exam/MarksEntryManager";
import { SyllabusManager } from "@/components/exam/SyllabusManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, FileText } from "lucide-react";

export default function EnterMarksPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <Tabs defaultValue="syllabus" className="space-y-6">
                <TabsList className="bg-black/20 border-white/10 p-1">
                    <TabsTrigger value="syllabus" className="gap-2">
                        <FileText className="w-4 h-4" /> Exam Syllabus
                    </TabsTrigger>
                    <TabsTrigger value="marks" className="gap-2">
                        <ClipboardCheck className="w-4 h-4" /> Marks Entry
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="syllabus" className="animate-in fade-in slide-in-from-bottom-2">
                    <SyllabusManager examId={examId} role="TEACHER" />
                </TabsContent>

                <TabsContent value="marks" className="animate-in fade-in slide-in-from-bottom-2">
                    <MarksEntryManager examId={examId} backUrl="/teacher/exams" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
