"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";

export default function TimetablePage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold">Timetable</h1>
                    <p className="text-muted-foreground">Manage class schedules and teacher allocations.</p>
                </div>
                <Button className="gap-2 bg-accent text-accent-foreground">
                    <Plus size={16} /> Create Schedule
                </Button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-2">Class Schedules</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Timetable configuration and viewing interface coming soon.
                </p>
            </div>
        </div>
    );
}
