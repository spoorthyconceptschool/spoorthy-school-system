"use client";

import { StaffQueriesManager } from "@/components/admin/staff-queries-manager";

export default function AdminStaffQueriesPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight uppercase">
                        Staff Queries
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-sm tracking-[0.2em] font-black uppercase opacity-50">
                        Managing queries from faculty and staff members
                    </p>
                </div>
            </div>

            <StaffQueriesManager />
        </div>
    );
}
