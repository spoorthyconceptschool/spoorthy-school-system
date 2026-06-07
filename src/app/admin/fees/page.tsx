"use client";

import { Settings2, AlertCircle, Receipt, ArrowRight, IndianRupee, PieChart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function FeeDashboard() {
    const { role } = useAuth();

    const modules = [
        {
            title: "Fee Types",
            description: "Configure academic terms, transport, and custom fees.",
            icon: Settings2,
            href: "/admin/fees/manage",
            color: "text-[#00E5FF]",
            borderColor: "border-[#00E5FF]/20",
            bgAccent: "bg-[#00E5FF]/10",
            borderLeft: "border-l-[#00E5FF]"
        },
        {
            title: "Pending Dues",
            description: "Track outstanding balances and recovery follow-ups.",
            icon: AlertCircle,
            href: "/admin/fees/pending",
            color: "text-rose-400",
            borderColor: "border-rose-500/20",
            bgAccent: "bg-rose-500/10",
            borderLeft: "border-l-rose-500"
        },
        {
            title: "Fee Collection",
            description: "Review transactions and online payment history.",
            icon: Receipt,
            href: "/admin/payments",
            color: "text-amber-400",
            borderColor: "border-amber-500/20",
            bgAccent: "bg-amber-500/10",
            borderLeft: "border-l-amber-500"
        }
    ];

    return (
        <div className="h-[calc(100vh-4rem)] md:h-full w-full flex flex-col p-4 md:p-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex flex-col mb-5 shrink-0">
                <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">Fee Payment Center</h1>
                <p className="text-[11px] md:text-sm text-white/40 mt-1">Financial oversight & student billing management.</p>
            </div>

            {/* Quick Stats Highlights */}
            <div className="flex gap-3 mb-5 shrink-0">
                <div className="flex-1 rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl p-3 md:p-4 flex items-center gap-3 relative overflow-hidden shadow-2xl">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        <IndianRupee className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Revenue Status</span>
                        <span className="text-base md:text-lg font-mono font-black text-white leading-none">Active</span>
                    </div>
                </div>
                <div className="flex-1 rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl p-3 md:p-4 flex items-center gap-3 relative overflow-hidden shadow-2xl">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <PieChart className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Billing Cycle</span>
                        <span className="text-base md:text-lg font-mono font-black text-white leading-none">Termly</span>
                    </div>
                </div>
            </div>

            {/* Main Action Grid - Horizontal Bars */}
            <div className="flex flex-col gap-3 md:gap-4 flex-1 overflow-y-auto pb-4">
                {modules.filter(m => {
                    if (role === "MANAGER") {
                        return ["Pending Dues", "Fee Collection"].includes(m.title);
                    }
                    return true;
                }).map((module, i) => (
                    <Link key={i} href={module.href} className="group outline-none block">
                        <div className={cn(
                            "flex items-center gap-3 md:gap-5 p-3 md:p-4 rounded-2xl border transition-all duration-300",
                            "bg-[#0B1524]/60 backdrop-blur-xl border-l-4 hover:bg-white/[0.04] shadow-xl",
                            module.borderColor,
                            module.borderLeft
                        )}>
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                                module.bgAccent,
                                module.borderColor,
                                module.color
                            )}>
                                <module.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2} />
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center min-w-0 gap-1">
                                <h3 className={cn(
                                    "text-base md:text-lg font-bold truncate transition-colors",
                                    module.color
                                )}>
                                    {module.title}
                                </h3>
                                <p className="text-[11px] md:text-sm text-white/40 truncate">
                                    {module.description}
                                </p>
                            </div>
                            
                            <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all">
                                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white/40 group-hover:text-white transition-all group-hover:translate-x-1" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
