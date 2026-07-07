"use client";

import Link from "next/link";
import { 
    FileText, 
    IndianRupee, 
    AlertCircle, 
    Award, 
    Users, 
    ArrowRight,
    GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SuperAdminReportsHub() {
    const modules = [
        {
            title: "Fee Collection Reports",
            description: "View transaction history and fee collections across all branches.",
            icon: IndianRupee,
            href: "/super-admin/reports/fees",
            color: "text-emerald-400",
            borderColor: "border-emerald-500/20",
            bgAccent: "bg-emerald-500/10",
            borderLeft: "border-l-emerald-500"
        },
        {
            title: "Pending Dues Reports",
            description: "Track outstanding balances and generate pending fee spreadsheets.",
            icon: AlertCircle,
            href: "/super-admin/reports/pending",
            color: "text-rose-400",
            borderColor: "border-rose-500/20",
            bgAccent: "bg-rose-500/10",
            borderLeft: "border-l-rose-500"
        },
        {
            title: "Academic Results Reports",
            description: "Analyze exam performance ledgers and print student result spreadsheets.",
            icon: Award,
            href: "/super-admin/reports/results",
            color: "text-blue-400",
            borderColor: "border-blue-500/20",
            bgAccent: "bg-blue-500/10",
            borderLeft: "border-l-blue-500"
        },
        {
            title: "Teacher & Staff Reports",
            description: "View consolidated faculty directories, staff lists, and coverage.",
            icon: Users,
            href: "/super-admin/reports/teachers",
            color: "text-amber-400",
            borderColor: "border-amber-500/20",
            bgAccent: "bg-amber-500/10",
            borderLeft: "border-l-amber-500"
        },
        {
            title: "Student Reports",
            description: "View student directories, demographics, and detailed student analytics.",
            icon: GraduationCap,
            href: "/super-admin/students",
            color: "text-purple-400",
            borderColor: "border-purple-500/20",
            bgAccent: "bg-purple-500/10",
            borderLeft: "border-l-purple-500"
        }
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00E5FF]/10 rounded-xl flex items-center justify-center border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                        <FileText className="w-5 h-5 text-[#00E5FF]" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
                        Combined Reports Engine
                    </h1>
                </div>
                <p className="text-sm text-[#8892B0] max-w-2xl leading-relaxed">
                    Access unified, cross-branch reporting modules. Select an active school from the top navigation to filter these reports, or choose "All Schools" to view global system data.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-8">
                {modules.map((module, i) => (
                    <Link key={i} href={module.href} className="group outline-none block">
                        <div className={cn(
                            "flex items-start gap-4 p-5 md:p-6 rounded-2xl border transition-all duration-300 h-full",
                            "bg-[#0B1524]/60 backdrop-blur-xl border-l-4 hover:bg-white/[0.04] shadow-xl hover:-translate-y-1",
                            module.borderColor,
                            module.borderLeft
                        )}>
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110",
                                module.bgAccent,
                                module.borderColor,
                                module.color
                            )}>
                                <module.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2} />
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center min-w-0 gap-1.5">
                                <h3 className={cn(
                                    "text-lg md:text-xl font-black truncate transition-colors",
                                    module.color
                                )}>
                                    {module.title}
                                </h3>
                                <p className="text-xs md:text-sm text-[#8892B0] leading-relaxed">
                                    {module.description}
                                </p>
                            </div>
                            
                            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all self-center ml-2">
                                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white transition-all group-hover:translate-x-1" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
