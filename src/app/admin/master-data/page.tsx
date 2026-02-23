"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Layers,
    BookOpen,
    MapPin,
    ArrowRight,
    ArrowLeft,
    Database,
    Binary,
    Globe2,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassesSectionsManager } from "@/components/admin/master-data/ClassesSectionsManager";
import { SubjectsManager } from "@/components/admin/master-data/SubjectsManager";
import { VillagesManager } from "@/components/admin/master-data/VillagesManager";
import { useMasterData } from "@/context/MasterDataContext";

export default function MasterDataPage() {
    const [view, setView] = useState<"dashboard" | "classes" | "subjects" | "villages">("dashboard");
    const { classes, subjects, villages, loading } = useMasterData();

    // Stats calculation
    const classCount = Object.keys(classes || {}).length;
    const subjectCount = Object.keys(subjects || {}).length;
    const villageCount = Object.keys(villages || {}).filter(id => villages[id].active).length;

    const modules = [
        {
            id: "classes",
            title: "Classes & Sections",
            description: "Configure school grade levels, branch sections, and academic combinations.",
            icon: Layers,
            color: "text-blue-400",
            borderColor: "border-blue-500/20",
            bgColor: "bg-blue-500/5",
            hoverBg: "hover:bg-blue-500/10",
            stat: `${classCount} Active Grades`
        },
        {
            id: "subjects",
            title: "Subjects Center",
            description: "Define core curriculum subjects, department codes, and academic requirements.",
            icon: BookOpen,
            color: "text-purple-400",
            borderColor: "border-purple-500/20",
            bgColor: "bg-purple-500/5",
            hoverBg: "hover:bg-purple-500/10",
            stat: `${subjectCount} Core Subjects`
        },
        {
            id: "villages",
            title: "Transport Hub",
            description: "Manage service operational areas, village zones, and transport coverage points.",
            icon: MapPin,
            color: "text-emerald-400",
            borderColor: "border-emerald-500/20",
            bgColor: "bg-emerald-500/5",
            hoverBg: "hover:bg-emerald-500/10",
            stat: `${villageCount} Active Zones`
        }
    ];

    if (view !== "dashboard") {
        return (
            <div className="space-y-6 animate-in fade-in duration-500 pb-20">
                <div className="flex items-center gap-4 px-2 md:px-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView("dashboard")}
                        className="text-muted-foreground hover:text-white group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Center
                    </Button>
                    <div className="h-4 w-px bg-white/10" />
                    <h2 className="text-xl font-bold italic capitalize text-accent">{view.replace("-", " ")} Management</h2>
                </div>

                <div className="px-2 md:px-0">
                    {view === "classes" && <ClassesSectionsManager />}
                    {view === "subjects" && <SubjectsManager />}
                    {view === "villages" && <VillagesManager />}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 p-2 md:p-0 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Section */}
            <div className="space-y-1">
                <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                    Master Data Center
                </h1>
                <p className="text-muted-foreground text-[10px] md:text-lg">Central control for school architecture and foundational configurations.</p>
            </div>

            {/* Quick Stats Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <Card className="bg-black/20 border-white/5 backdrop-blur-md">
                    <CardHeader className="p-3 md:pb-2 space-y-0">
                        <CardTitle className="text-[8px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">Digital Registry</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 md:p-6 md:pt-0">
                        <div className="flex items-center gap-2">
                            <Binary className="w-4 h-4 text-accent" />
                            <span className="text-sm md:text-2xl font-bold text-white uppercase tracking-tighter">Sync Active</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black/20 border-white/5 backdrop-blur-md">
                    <CardHeader className="p-3 md:pb-2 space-y-0">
                        <CardTitle className="text-[8px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">Global Reach</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 md:p-6 md:pt-0">
                        <div className="flex items-center gap-2">
                            <Globe2 className="w-4 h-4 text-blue-400" />
                            <span className="text-sm md:text-2xl font-bold text-white uppercase tracking-tighter">{villageCount} Locations</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hidden md:block bg-black/20 border-white/5 backdrop-blur-md">
                    <CardHeader className="p-3 md:pb-2 space-y-0">
                        <CardTitle className="text-[8px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">Data Integrity</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 md:p-6 md:pt-0">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm md:text-2xl font-bold text-white uppercase tracking-tighter">Verified</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {modules.map((module) => (
                    <div
                        key={module.id}
                        onClick={() => setView(module.id as any)}
                        className="group"
                    >
                        <Card className={cn(
                            "h-full transition-all duration-500 cursor-pointer overflow-hidden relative",
                            "border-white/10 bg-black/40 backdrop-blur-xl",
                            "group-hover:border-white/20 group-hover:shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] group-hover:-translate-y-2",
                            module.borderColor,
                            module.bgColor,
                            module.hoverBg
                        )}>
                            <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                                <div className={cn(
                                    "p-3 rounded-2xl w-fit border border-current shadow-2xl shadow-black transition-all duration-500 group-hover:rotate-6",
                                    module.color,
                                    "bg-black/60"
                                )}>
                                    <module.icon className="w-6 h-6 md:w-8 md:h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">{module.title}</h3>
                                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                                        {module.description}
                                    </p>
                                    <div className="inline-block px-3 py-1 rounded-full bg-black/40 border border-white/5 mt-2">
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", module.color)}>
                                            {loading ? "Loading..." : module.stat}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-4 flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-white transition-all">
                                    Open Module <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>

                            {/* Subtle Background Accent */}
                            <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700", module.bgColor)} />
                        </Card>
                    </div>
                ))}
            </div>

            {/* Bottom Footer Section */}
            <div className="rounded-2xl md:rounded-3xl border border-white/5 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/5 p-6 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 overflow-hidden relative group">
                <div className="space-y-2 md:space-y-3 relative z-10 text-center md:text-left">
                    <h3 className="text-xl md:text-3xl font-bold text-white italic">Architecture Sync</h3>
                    <p className="text-xs md:text-base text-muted-foreground max-w-2xl font-medium">
                        Changes to Master Data automatically propagate across Attendance, Fees, and Exams.
                        Ensure all grades and subjects are mapped correctly for seamless operations.
                    </p>
                </div>
                <div className="relative z-10">
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center">
                                <Database size={16} className="text-accent" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
        </div>
    );
}
