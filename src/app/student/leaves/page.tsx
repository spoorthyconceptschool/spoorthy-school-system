"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, History, Send, Plus, X, HeartPulse, User, Coffee, Info, Layers, CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useStudentData } from "@/context/StudentDataContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function StudentLeavesPage() {
    const { user } = useAuth();
    const { profile, leaves, loading, refetchLeaves } = useStudentData();
    const [submitting, setSubmitting] = useState(false);
    const [today, setToday] = useState("");
    
    // UI states
    const [activeTab, setActiveTab] = useState<'balances' | 'requests'>('balances');
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

    const [form, setForm] = useState({
        fromDate: "",
        toDate: "",
        type: "PERSONAL",
        reason: ""
    });

    useEffect(() => {
        const getLocalTodayStr = (offsetDays = 0) => {
            const d = new Date();
            d.setDate(d.getDate() + offsetDays);
            return d.toISOString().split('T')[0];
        };

        const currentHour = new Date().getHours();
        const isPastMorningCutoff = currentHour >= 7;
        const minimumDate = getLocalTodayStr(isPastMorningCutoff ? 1 : 0);

        setToday(minimumDate);
        setForm(prev => ({ ...prev, fromDate: minimumDate, toDate: minimumDate }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.reason) return alert("Please provide a reason");
        if (!profile) return alert("Profile loading, please wait...");

        setSubmitting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/student/leaves", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    studentName: profile.studentName || profile.name,
                    classId: profile.classId,
                    sectionId: profile.sectionId
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Leave application submitted successfully!");
                setForm({ ...form, reason: "" });
                setIsApplyModalOpen(false);
                await refetchLeaves();
            } else {
                alert(data.error);
            }
        } catch (e: any) { alert(e.message); }
        finally { setSubmitting(false); }
    };

    // Derived statistics
    const stats = {
        total: leaves.length,
        pending: leaves.filter((l: any) => l.status?.toUpperCase() === "PENDING").length,
        approved: leaves.filter((l: any) => l.status?.toUpperCase() === "APPROVED").length,
        rejected: leaves.filter((l: any) => l.status?.toUpperCase() === "REJECTED").length,
    };

    // Cleaned up Leave balance list mirroring mockup screenshot
    const leaveTypes = [
        { name: "Medical Leave", typeKey: "MEDICAL", days: 10, totalDays: 10, icon: HeartPulse, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", barColor: "bg-emerald-500" },
        { name: "Personal Leave", typeKey: "PERSONAL", days: 5, totalDays: 5, icon: User, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", barColor: "bg-blue-500" },
    ];

    if (loading && leaves.length === 0) {
        return (
            <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-indigo-400">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                    Retrieving leave record ledger...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 relative bg-transparent pb-28 md:pb-8 text-left select-none">
            
            {/* Glowing Accents */}
            <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] right-[-5%] w-[45%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header / Actions */}
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4 relative z-10 select-none">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shrink-0">
                        <FileText className="w-4.5 h-4.5 md:w-5 md:h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-white tracking-tight">Leave Management</h1>
                        <p className="text-[10px] md:text-xs text-white/50 font-medium hidden sm:block">Apply for academic leaves and track pending requests in real-time.</p>
                    </div>
                </div>
                
                {/* Apply Button */}
                <Button 
                    onClick={() => setIsApplyModalOpen(true)}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-3 md:px-4 py-2 font-bold rounded-xl text-xs"
                >
                    <Plus className="w-4 h-4" /> Apply Leave
                </Button>
            </div>

            {/* ==========================================
                1. STATS OVERVIEW: Desktop vs Mobile
                ========================================== */}
            {/* Desktop Metrics Row */}
            <div className="hidden md:grid grid-cols-4 gap-4 relative z-10 select-none">
                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md flex items-center p-4 border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mr-3 shrink-0">
                        <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest font-mono">Total Requests</p>
                        <h3 className="text-xl font-black text-white mt-0.5 leading-none">{stats.total}</h3>
                    </div>
                </Card>

                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md flex items-center p-4 border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-3 shrink-0">
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest font-mono">Pending</p>
                        <h3 className="text-xl font-black text-amber-400 mt-0.5 leading-none">{stats.pending}</h3>
                    </div>
                </Card>

                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md flex items-center p-4 border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-3 shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest font-mono">Approved</p>
                        <h3 className="text-xl font-black text-emerald-400 mt-0.5 leading-none">{stats.approved}</h3>
                    </div>
                </Card>

                <Card className="bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-md flex items-center p-4 border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mr-3 shrink-0">
                        <XCircle className="w-5 h-5 text-rose-450" />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest font-mono">Rejected</p>
                        <h3 className="text-xl font-black text-rose-450 mt-0.5 leading-none">{stats.rejected}</h3>
                    </div>
                </Card>
            </div>

            {/* Mobile Metrics Row (Ultra Compact - 48px Height) */}
            <div className="grid grid-cols-4 gap-2 md:hidden">
                <div className="bg-[#112240]/30 border border-white/5 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Total</div>
                    <div className="text-xs font-black text-white mt-0.5">{stats.total}</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-amber-400 tracking-wider">Pending</div>
                    <div className="text-xs font-black text-amber-300 mt-0.5">{stats.pending}</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-emerald-400 tracking-wider">Approved</div>
                    <div className="text-xs font-black text-emerald-300 mt-0.5">{stats.approved}</div>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center shadow-md">
                    <div className="text-[8px] uppercase font-bold text-rose-400 tracking-wider">Rejected</div>
                    <div className="text-xs font-black text-rose-300 mt-0.5">{stats.rejected}</div>
                </div>
            </div>

            {/* ==========================================
                2. SEGMENT CONTROL TOGGLER (Mobile Only)
                ========================================== */}
            <div className="flex bg-[#112240]/40 p-1 rounded-xl border border-white/10 w-full max-w-sm mx-auto select-none md:hidden shrink-0">
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'balances' ? 'text-white' : 'text-white/60'
                    }`}
                >
                    {activeTab === 'balances' && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 bg-[#4F46E5] rounded-lg shadow-lg shadow-indigo-500/20"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Leave Types
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'requests' ? 'text-white' : 'text-white/60'
                    }`}
                >
                    {activeTab === 'requests' && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 bg-[#4F46E5] rounded-lg shadow-lg shadow-indigo-500/20"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Recent Requests
                    </span>
                </button>
            </div>

            {/* ==========================================
                3. MAIN SECTIONS: Desktop Dual-Layout vs Mobile Tabbed Toggled
                ========================================== */}
            {/* Desktop View */}
            <div className="hidden md:grid grid-cols-3 gap-6 items-start relative z-10">
                {/* Desktop Left: Leave Balances Grid */}
                <Card className="col-span-1 bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-xl rounded-2xl border select-none">
                    <CardHeader className="pb-3 border-b border-white/[0.05] p-5">
                        <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2 tracking-tight">
                            <Layers className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                            Leave Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 grid grid-cols-1 gap-4 text-left">
                        {leaveTypes.map((type, idx) => {
                            const IconComp = type.icon;
                            const percent = (type.days / type.totalDays) * 100;

                            return (
                                <div key={idx} className="space-y-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-colors hover:bg-white/[0.04]">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${type.color}`}>
                                                <IconComp className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-white truncate">{type.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-blue-300 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-lg shrink-0 font-mono">
                                            {type.days} Days Left
                                        </span>
                                    </div>
                                    
                                    {/* Progress meter */}
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className={`${type.barColor} h-full rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Desktop Right: Recent Requests Card */}
                <Card className="col-span-2 bg-[#112240]/30 border-white/[0.05] backdrop-blur-md shadow-xl rounded-2xl border">
                    <CardHeader className="pb-3 border-b border-white/[0.05] p-5 select-none">
                        <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2 tracking-tight">
                            <History className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                            My Leave History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden text-left">
                        {leaves.length === 0 ? (
                            <div className="p-12 text-center text-white/40 italic text-xs flex flex-col items-center justify-center gap-2 select-none min-h-[220px]">
                                <Info className="w-8 h-8 text-white/10" />
                                <span>No leave history found. You're fully caught up!</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.05]">
                                {leaves.map((l: any) => (
                                    <div key={l.id} className="p-4 hover:bg-white/[0.01] transition-colors flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 truncate">
                                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.05] flex items-center justify-center shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                                                <Calendar className="w-4.5 h-4.5" />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-xs font-extrabold text-white tracking-wide leading-none">
                                                    {l.fromDate === l.toDate
                                                        ? formatDateToDDMMYYYY(l.fromDate)
                                                        : `${formatDateToDDMMYYYY(l.fromDate)} - ${formatDateToDDMMYYYY(l.toDate)}`
                                                    }
                                                </div>
                                                <p className="text-[11px] text-white/50 truncate mt-1.5" title={l.reason}>
                                                    Reason: <span className="font-bold text-blue-300 italic">"{l.reason}"</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <Badge variant="outline" className="text-[8px] font-black bg-white/5 border-none select-none tracking-wider uppercase text-neutral-300 px-2 py-0.5 rounded">
                                                {l.type}
                                            </Badge>
                                            
                                            {l.status?.toUpperCase() === "PENDING" && (
                                                <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-lg select-none">
                                                    Pending
                                                </Badge>
                                            )}
                                            {l.status?.toUpperCase() === "APPROVED" && (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-lg select-none">
                                                    Approved
                                                </Badge>
                                            )}
                                            {l.status?.toUpperCase() === "REJECTED" && (
                                                <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-lg select-none">
                                                    Rejected
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Tabbed View (Highly Compact, Fluid Grid, scrolls naturally) */}
            <div className="md:hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'balances' ? (
                        <motion.div
                            key="balances-tab"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3.5"
                        >
                            <Card className="bg-[#112240]/30 border-white/10 backdrop-blur-md shadow-lg border rounded-2xl">
                                <CardHeader className="pb-2 p-4">
                                    <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                        Leave Balance Types
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2 p-3">
                                    {leaveTypes.map((type, idx) => {
                                        const IconComp = type.icon;
                                        return (
                                            <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-left">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${type.color}`}>
                                                    <IconComp className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-[10px] font-bold text-white truncate">{type.name}</div>
                                                    <div className="text-[8px] font-bold text-neutral-400 mt-0.5 font-mono">{type.days} Days Left</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Bottom Note */}
                            <Card className="bg-white/[0.01] border-white/5 p-3 rounded-2xl flex items-start gap-2.5 shadow-inner border">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <Info className="w-3.5 h-3.5 text-blue-450" />
                                </div>
                                <div className="text-left space-y-0.5">
                                    <h4 className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest leading-none">Important Note</h4>
                                    <p className="text-[8px] text-white/50 leading-normal font-medium">
                                        Submit leave requests in advance and wait for approval from class teachers.
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="requests-tab"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                        >
                            <Card className="bg-[#112240]/30 border-white/10 backdrop-blur-md shadow-lg border rounded-2xl">
                                <CardHeader className="pb-2 p-4">
                                    <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <History className="w-4 h-4 text-emerald-400" />
                                        Recent Requests
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 space-y-2.5 max-h-[360px] overflow-y-auto">
                                    {leaves.map((l: any) => (
                                        <div key={l.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 text-left">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-emerald-400 shrink-0 select-none">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-[10px] font-bold text-white truncate">
                                                        {l.fromDate === l.toDate ? formatDateToDDMMYYYY(l.fromDate) : `${formatDateToDDMMYYYY(l.fromDate)} - ${formatDateToDDMMYYYY(l.toDate)}`}
                                                    </div>
                                                    <div className="text-[8px] text-white/45 truncate mt-0.5 italic">
                                                        "{l.reason}"
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-end gap-1 font-mono text-[8px] font-black uppercase tracking-wider select-none">
                                                <Badge className="text-[7.5px] bg-white/5 border-none font-bold select-none px-1.5 py-0 shrink-0">
                                                    {l.type}
                                                </Badge>
                                                {l.status?.toUpperCase() === "PENDING" && <span className="text-amber-400 shrink-0">Pending</span>}
                                                {l.status?.toUpperCase() === "APPROVED" && <span className="text-emerald-450 shrink-0">Approved</span>}
                                                {l.status?.toUpperCase() === "REJECTED" && <span className="text-rose-450 shrink-0">Rejected</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {leaves.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-white/40 italic text-[10px] gap-2">
                                            <FileText className="w-8 h-8 text-white/10" />
                                            No leave requests yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ==========================================
                4. APPLY LEAVE GLASSMORPHIC MODAL SHEET
                ========================================== */}
            <AnimatePresence>
                {isApplyModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
                        {/* Backdrop Click Dismiss */}
                        <div className="absolute inset-0" onClick={() => setIsApplyModalOpen(false)} />
                        
                        {/* Modal container */}
                        <motion.div
                            initial={{ y: "100%", scale: 0.98 }}
                            animate={{ y: 0, scale: 1 }}
                            exit={{ y: "100%", scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 260, damping: 26 }}
                            className="relative w-full max-w-sm bg-[#112240]/95 border border-white/10 rounded-2xl p-5 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-white/15">
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 tracking-tight">
                                    <Send className="w-4 h-4 text-indigo-400" /> Apply For Leave
                                </h3>
                                <button 
                                    onClick={() => setIsApplyModalOpen(false)}
                                    className="p-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                                <div className="grid grid-cols-2 gap-3.5">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-sans select-none">From Date</Label>
                                        <DatePickerInput
                                            min={today}
                                            value={form.fromDate}
                                            onChange={(e: any) => setForm({ ...form, fromDate: e.target.value })}
                                            className="bg-black/60 border-white/10 text-xs h-9 text-white font-mono rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-sans select-none">To Date</Label>
                                        <DatePickerInput
                                            min={form.fromDate || today}
                                            value={form.toDate}
                                            onChange={(e: any) => setForm({ ...form, toDate: e.target.value })}
                                            className="bg-black/60 border-white/10 text-xs h-9 text-white font-mono rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-sans select-none">Leave Type</Label>
                                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                        <SelectTrigger className="bg-black/60 border-white/10 text-xs h-9 text-white font-sans rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white font-sans rounded-lg border-white/10">
                                            <SelectItem value="MEDICAL">Medical Leave</SelectItem>
                                            <SelectItem value="PERSONAL">Personal Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-sans select-none">Reason</Label>
                                    <Textarea
                                        placeholder="Reason for taking leave..."
                                        value={form.reason}
                                        onChange={e => setForm({ ...form, reason: e.target.value })}
                                        className="bg-black/60 border-white/10 text-xs min-h-[80px] text-white font-sans rounded-lg"
                                    />
                                </div>

                                <Button disabled={submitting} className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl mt-2 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25 font-sans">
                                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-3.5 h-3.5" /> Submit Request</>}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
