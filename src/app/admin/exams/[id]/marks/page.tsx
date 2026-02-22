"use client";

import { use } from "react";
import { MarksEntryManager } from "@/components/exam/MarksEntryManager";

export default function AdminMarksEntryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);

    return (
        <div className="max-w-7xl mx-auto p-6">
            <MarksEntryManager examId={examId} backUrl={`/admin/exams/${examId}`} />
        </div>
    );
}
