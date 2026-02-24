"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeachersDirectory } from "@/components/admin/teachers-directory";
import { LeavesManager } from "@/components/admin/leaves-manager";
import { CoverageManager } from "@/components/admin/coverage-manager";
import { AddTeacherModal } from "@/components/admin/add-teacher-modal";
import { AddStaffModal } from "@/components/admin/add-staff-modal";
import { Users, Calendar, ShieldAlert, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function FacultyManagementContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "directory");
    const [directoryTab, setDirectoryTab] = useState("teachers"); // Track if we are on Teachers or Staff

    // Modal States
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-200 pb-20">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Staff Members
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-sm tracking-tight uppercase font-black opacity-50">
                        Consolidated Management: <span className="text-accent">Staff • Leaves • Coverage</span>
                    </p>
                </div>


                {activeTab === "directory" && (
                    <Button
                        onClick={() => directoryTab === 'teachers' ? setShowTeacherModal(true) : setShowStaffModal(true)}
                        className="h-10 md:h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-black uppercase tracking-tighter px-4 md:px-6 shadow-lg shadow-white/10 text-xs md:text-sm"
                    >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 stroke-[3]" /> Add {directoryTab === 'teachers' ? 'Teacher' : 'Staff'}
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="px-2 md:px-0 bg-black/20 p-1 rounded-2xl border border-white/5 backdrop-blur-md sticky top-0 z-10 mx-2 md:mx-0">
                    <TabsList className="bg-transparent h-auto w-full grid grid-cols-3 gap-1">
                        <TabsTrigger
                            value="directory"
                            className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-3 font-bold transition-all text-[10px] md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-2"
                        >
                            <Users size={14} className="md:w-4 md:h-4" />
                            <span>Directory</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="leaves"
                            className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-3 font-bold transition-all text-[10px] md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-2"
                        >
                            <Calendar size={14} className="md:w-4 md:h-4" />
                            <span>Leaves</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="coverage"
                            className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-3 font-bold transition-all text-[10px] md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-2"
                        >
                            <ShieldAlert size={14} className="md:w-4 md:h-4" />
                            <span>Coverage</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="space-y-6">
                    <TabsContent value="directory" className="outline-none m-0">
                        {/* Directory has its own internal tabs and header, so we just wrap it */}
                        <div className="bg-transparent">
                            <TeachersDirectory hideHeader={true} onTabChange={setDirectoryTab} />
                        </div>
                    </TabsContent>

                    <TabsContent value="leaves" className="outline-none m-0 px-2 md:px-0">
                        <LeavesManager />
                    </TabsContent>

                    <TabsContent value="coverage" className="outline-none m-0 px-2 md:px-0">
                        <CoverageManager />
                    </TabsContent>

                </div>
            </Tabs>

            <AddTeacherModal isOpen={showTeacherModal} onClose={() => setShowTeacherModal(false)} onSuccess={() => { }} />
            <AddStaffModal isOpen={showStaffModal} onClose={() => setShowStaffModal(false)} onSuccess={() => { }} />
        </div>
    );
}

export default function FacultyManagementPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6 md:space-y-10 p-1 md:p-6">
                <div className="h-12 w-48 bg-white/5 animate-pulse rounded-xl" />
                <div className="h-14 w-full bg-white/5 animate-pulse rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-40 bg-white/5 animate-pulse rounded-3xl" />
                    <div className="h-40 bg-white/5 animate-pulse rounded-3xl" />
                    <div className="h-40 bg-white/5 animate-pulse rounded-3xl" />
                </div>
            </div>
        }>
            <FacultyManagementContent />
        </Suspense>
    );
}



