"use client";

import { TeacherGroupManager } from "@/components/teacher/teacher-group-manager";

export default function TeacherGroupsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 animate-in fade-in">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b border-white/10">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">Groups Management</h1>
                        <p className="text-muted-foreground">Assign your students to their respective Houses/Teams.</p>
                    </div>
                </header>

                <TeacherGroupManager />
            </div>
        </div>
    );
}
