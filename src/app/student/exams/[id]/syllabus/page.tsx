"use client";

import { use } from "react";
import { SyllabusManager } from "@/components/exam/SyllabusManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudentSyllabusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);
    const router = useRouter();

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5 text-[#8892B0]" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-[#E6F1FF]">Exam Syllabus</h1>
                    <p className="text-sm text-[#8892B0]">View and print curriculum for your examination</p>
                </div>
            </div>

            <SyllabusManager examId={examId} role="STUDENT" />
        </div>
    );
}
