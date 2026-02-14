"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Settings2,
    Layers,
    Users,
    AlertCircle,
    Receipt,
    ArrowRight,
    IndianRupee,
    PieChart,
    CalendarClock
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function FeeDashboard() {
    const { user } = useAuth();
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
        return () => unsub();
    }, [user]);

    const modules = [
        {
            title: "Manage Fee Types",
            description: "Configure standard academic term fees and installment plans for all classes.",
            icon: Settings2,
            href: "/admin/fees/config",
            color: "text-blue-400",
            borderColor: "border-blue-500/20",
            bgColor: "bg-blue-500/5",
            hoverBg: "hover:bg-blue-500/10"
        },
        {
            title: "Custom Fees",
            description: "Assign special fees like Bus Fee, Uniform, or Contributions to specific groups.",
            icon: Layers,
            href: "/admin/fees/custom",
            color: "text-purple-400",
            borderColor: "border-purple-500/20",
            bgColor: "bg-purple-500/5",
            hoverBg: "hover:bg-purple-500/10"
        },
        {
            title: "Fee Structures",
            description: "View master reports of fee allocations and billing details for all students.",
            icon: Users,
            href: "/admin/fees/structures",
            color: "text-emerald-400",
            borderColor: "border-emerald-500/20",
            bgColor: "bg-emerald-500/5",
            hoverBg: "hover:bg-emerald-500/10"
        },
        {
            title: "Pending Dues",
            description: "Track outstanding balances, late fees, and manage recovery follow-ups.",
            icon: AlertCircle,
            href: "/admin/fees/pending",
            color: "text-red-400",
            borderColor: "border-red-500/20",
            bgColor: "bg-red-500/5",
            hoverBg: "hover:bg-red-500/10"
        },
        {
            title: "Payment Details",
            description: "Review all transactions, cash records, and online payment status history.",
            icon: Receipt,
            href: "/admin/payments",
            color: "text-amber-400",
            borderColor: "border-amber-500/20",
            bgColor: "bg-amber-500/5",
            hoverBg: "hover:bg-amber-500/10"
        }
    ];

    return (
        <div className="space-y-6 md:space-y-10 p-3 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-1">
                <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight text-white italic">Fee Center</h1>
                <p className="text-muted-foreground text-xs md:text-lg">Comprehensive financial oversight and student billing management.</p>
            </div>

            {/* Quick Stats Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <Card className="bg-black/20 border-white/5 backdrop-blur-sm">
                    <CardHeader className="p-3 md:pb-2 space-y-0 text-center md:text-left">
                        <CardTitle className="text-[8px] md:text-xs font-mono text-muted-foreground uppercase tracking-widest">Revenue Status</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 md:p-6 md:pt-0 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                            <IndianRupee className="w-3.5 h-3.5 md:w-5 md:h-5 text-accent" />
                            <span className="text-sm md:text-2xl font-bold text-white">Active</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black/20 border-white/5 backdrop-blur-sm">
                    <CardHeader className="p-3 md:pb-2 space-y-0 text-center md:text-left">
                        <CardTitle className="text-[8px] md:text-xs font-mono text-muted-foreground uppercase tracking-widest">Billing Cycle</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 md:p-6 md:pt-0 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                            <PieChart className="w-3.5 h-3.5 md:w-5 md:h-5 text-blue-400" />
                            <span className="text-sm md:text-2xl font-bold text-white">Termly</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {modules.filter(m => {
                    if (role === "MANAGER") {
                        return ["Pending Dues", "Payment Details", "Fee Structures"].includes(m.title);
                    }
                    return true;
                }).map((module, i) => (
                    <Link key={i} href={module.href} className="group">
                        <Card className={cn(
                            "h-full transition-all duration-300 cursor-pointer overflow-hidden relative",
                            "border-white/10 bg-black/20 backdrop-blur-md",
                            "group-hover:border-white/20 group-hover:shadow-2xl group-hover:shadow-black/50 group-hover:-translate-y-1",
                            module.borderColor,
                            module.bgColor,
                            module.hoverBg
                        )}>
                            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                                <div className={cn("p-2 md:p-3 rounded-lg md:rounded-xl w-fit border border-current shadow-lg shadow-black/20", module.color, "bg-black/40")}>
                                    <module.icon className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-base md:text-xl font-bold group-hover:text-white transition-colors">{module.title}</h3>
                                    <p className="text-[10px] md:text-sm text-muted-foreground leading-relaxed">
                                        {module.description}
                                    </p>
                                </div>
                                <div className="pt-2 md:pt-4 flex items-center text-[8px] md:text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">
                                    Open Module <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {role !== "MANAGER" && (
                <div className="rounded-xl md:rounded-2xl border border-white/5 bg-gradient-to-br from-accent/5 to-transparent p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 overflow-hidden relative">
                    <div className="space-y-1 md:space-y-2 relative z-10 text-center md:text-left">
                        <h3 className="text-lg md:text-2xl font-bold text-white">Automated Sync</h3>
                        <p className="text-[10px] md:text-sm text-muted-foreground max-w-xl">
                            Updating base fees? Use the Global Sync tool within the configuration module to update all student ledgers automatically.
                        </p>
                    </div>
                    <Button asChild size="sm" className="bg-accent text-accent-foreground relative z-10 font-bold uppercase tracking-tighter w-full md:w-auto">
                        <Link href="/admin/fees/config">
                            <CalendarClock className="w-4 h-4 mr-2" /> Start Sync
                        </Link>
                    </Button>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl opacity-20" />
                </div>
            )}
        </div>
    );
}
