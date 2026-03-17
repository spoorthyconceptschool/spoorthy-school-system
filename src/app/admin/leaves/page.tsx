"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeavesManager } from "@/components/admin/leaves-manager";
import { StudentLeavesManager } from "@/components/admin/student-leaves-manager";
import { Calendar, UserCheck, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function LeavesManagementManager() {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "staff";

    return (
        <div className="space-y-6">
            <TabsContent value="staff" className="outline-none m-0 px-2 md:px-0">
                <div className={cn(activeTab === "staff" ? "block" : "hidden", "bg-black/20 rounded-[2rem] border border-white/10 p-4 md:p-8 backdrop-blur-xl shadow-2xl")}>
                    <LeavesManager />
                </div>
            </TabsContent>

            <TabsContent value="students" className="outline-none m-0 px-2 md:px-0">
                <div className={cn(activeTab === "students" ? "block" : "hidden")}>
                    <StudentLeavesManager />
                </div>
            </TabsContent>
        </div>
    );
}

function LeavesManagementTabs() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "staff";

    return (
        <Tabs value={activeTab} onValueChange={(val) => {
            router.replace(`/admin/leaves?tab=${val}`, { scroll: false });
        }} className="space-y-6">
            <div className="px-2 md:px-0 bg-black/20 p-1 rounded-2xl border border-white/5 backdrop-blur-md sticky top-0 z-10 mx-2 md:mx-0">
                <TabsList className="bg-transparent h-auto w-full grid grid-cols-2 gap-1">
                    <TabsTrigger
                        value="staff"
                        className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-3 font-bold transition-all text-xs md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-2"
                    >
                        <Calendar size={14} className="md:w-4 md:h-4" />
                        <span>Staff Leaves</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="students"
                        className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-3 font-bold transition-all text-xs md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-2"
                    >
                        <UserCheck size={14} className="md:w-4 md:h-4" />
                        <span>Student Leaves</span>
                    </TabsTrigger>
                </TabsList>
            </div>

            <LeavesManagementManager />
        </Tabs>
    );
}


export default function UnifiedLeavesPage() {
    const router = useRouter();
    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-200 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft size={14} />
                        </Button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Operations</span>
                    </div>
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Leave Center
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-sm tracking-tight uppercase font-black opacity-50">
                        Unified Management: <span className="text-accent">Staff • Students</span>
                    </p>
                </div>
            </div>

            <LeavesManagementTabs />
        </div>
    );
}

