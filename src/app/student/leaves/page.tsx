"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, History, Send, Plus, X, HeartPulse, User, Coffee, Info, Layers, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useStudentData } from "@/context/StudentDataContext";
import { motion, AnimatePresence } from "framer-motion";

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
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-4 md:pb-10 relative select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] min-h-[calc(100vh-160px)] p-4 rounded-3xl">
            
            {/* Glowing Accents */}
            <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none" />

            {/* Header / Actions */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10 select-none">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                        Leave Management
                    </h1>
                    <p className="text-xs text-neutral-400 font-sans hidden sm:block font-medium mt-0.5">Apply for academic leaves and track pending requests in real-time.</p>
                </div>
                
                {/* Apply Button */}
                <Button 
                    onClick={() => setIsApplyModalOpen(true)}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-4 py-2 font-bold font-sans rounded-xl text-xs sm:text-sm"
                >
                    <Plus className="w-4 h-4" /> Apply Leave
                </Button>
            </div>

            {/* ==========================================
                1. STATS OVERVIEW: Desktop vs Mobile
                ========================================== */}
            {/* Desktop Metrics Row */}
            <div className="hidden md:grid grid-cols-4 gap-4 relative z-10 select-none">
                <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-lg flex items-center p-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mr-3 shrink-0">
                        <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black font-sans uppercase text-blue-200/50 tracking-wider">Total Requests</p>
                        <h3 className="text-xl font-black text-white mt-0.5 font-display">{stats.total}</h3>
                    </div>
                </Card>

                <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-lg flex items-center p-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-3 shrink-0">
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black font-sans uppercase text-blue-200/50 tracking-wider">Pending</p>
                        <h3 className="text-xl font-black text-amber-400 mt-0.5 font-display">{stats.pending}</h3>
                    </div>
                </Card>

                <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-lg flex items-center p-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-3 shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black font-sans uppercase text-blue-200/50 tracking-wider">Approved</p>
                        <h3 className="text-xl font-black text-emerald-400 mt-0.5 font-display">{stats.approved}</h3>
                    </div>
                </Card>

                <Card className="bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-lg flex items-center p-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mr-3 shrink-0">
                        <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black font-sans uppercase text-blue-200/50 tracking-wider">Rejected</p>
                        <h3 className="text-xl font-black text-red-400 mt-0.5 font-display">{stats.rejected}</h3>
                    </div>
                </Card>
            </div>

            {/* Mobile Metrics Row (Ultra Compact - 48px Height) */}
            <div className="grid grid-cols-4 gap-2 md:hidden">
                <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-neutral-400 tracking-wider">Total</div>
                    <div className="text-xs font-black text-white mt-0.5">{stats.total}</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-amber-400 tracking-wider">Pending</div>
                    <div className="text-xs font-black text-amber-300 mt-0.5">{stats.pending}</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-emerald-400 tracking-wider">Approved</div>
                    <div className="text-xs font-black text-emerald-300 mt-0.5">{stats.approved}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center shadow-inner">
                    <div className="text-[8px] uppercase font-bold text-red-400 tracking-wider">Rejected</div>
                    <div className="text-xs font-black text-red-300 mt-0.5">{stats.rejected}</div>
                </div>
            </div>

            {/* ==========================================
                2. SEGMENT CONTROL TOGGLER (Mobile Only)
                ========================================== */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full max-w-sm mx-auto select-none md:hidden">
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'balances'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-white/60 hover:text-white'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" /> Leave Types
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        activeTab === 'requests'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-white/60 hover:text-white'
                    }`}
                >
                    <History className="w-3.5 h-3.5" /> Recent Requests
                </button>
            </div>

            {/* ==========================================
                3. MAIN SECTIONS: Desktop Dual-Layout vs Mobile Tabbed Toggled
                ========================================== */}
            {/* Desktop View */}
            <div className="hidden md:grid grid-cols-3 gap-6 items-start relative z-10">
                {/* Desktop Left: Leave Balances Grid */}
                <Card className="col-span-1 bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-xl rounded-3xl select-none">
                    <CardHeader className="pb-3 border-b border-white/5">
                        <CardTitle className="text-sm font-black text-white flex items-center gap-2 font-display">
                            <Layers className="w-4.5 h-4.5 text-indigo-400" />
                            Leave Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 grid grid-cols-1 gap-4 text-left">
                        {leaveTypes.map((type, idx) => {
                            const IconComp = type.icon;
                            const percent = (type.days / type.totalDays) * 100;

                            return (
                                <div key={idx} className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${type.color}`}>
                                                <IconComp className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-extrabold text-white font-sans">{type.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-blue-200/70 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full font-mono">
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
                <Card className="col-span-2 bg-[#112240]/40 border-white/5 backdrop-blur-md shadow-xl rounded-3xl">
                    <CardHeader className="pb-3 border-b border-white/5 select-none">
                        <CardTitle className="text-sm font-black text-white flex items-center gap-2 font-display">
                            <History className="w-4.5 h-4.5 text-emerald-400" />
                            My Leave History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden text-left">
                        {leaves.length === 0 ? (
                            <div className="p-12 text-center text-neutral-400 italic text-xs font-sans flex flex-col items-center justify-center gap-2 select-none">
                                <Info className="w-8 h-8 text-neutral-600" />
                                <span>No leave history found. You're fully caught up!</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {leaves.map((l: any) => (
                                    <div key={l.id} className="p-4 hover:bg-white/[0.01] transition-colors flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 truncate">
                                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                                                <Calendar className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-xs font-black text-white tracking-wide">
                                                    {l.fromDate === l.toDate
                                                        ? formatDateToDDMMYYYY(l.fromDate)
                                                        : `${formatDateToDDMMYYYY(l.fromDate)} - ${formatDateToDDMMYYYY(l.toDate)}`
                                                    }
                                                </div>
                                                <p className="text-[11px] text-neutral-400 truncate mt-0.5" title={l.reason}>
                                                    Reason: <span className="font-medium text-blue-200/60 font-sans italic">"{l.reason}"</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <Badge variant="outline" className="text-[9px] font-black bg-white/5 border-none select-none tracking-wider uppercase text-neutral-300">
                                                {l.type}
                                            </Badge>
                                            
                                            {l.status?.toUpperCase() === "PENDING" && (
                                                <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full select-none">
                                                    Pending
                                                </Badge>
                                            )}
                                            {l.status?.toUpperCase() === "APPROVED" && (
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full select-none">
                                                    Approved
                                                </Badge>
                                            )}
                                            {l.status?.toUpperCase() === "REJECTED" && (
                                                <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full select-none">
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

            {/* Mobile Tabbed View (Highly Compact, Scroll-Free) */}
            <div className="md:hidden flex-1 flex flex-col justify-between">
                <AnimatePresence mode="wait">
                    {activeTab === 'balances' ? (
                        <motion.div
                            key="balances-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-3.5 flex-1"
                        >
                            <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg">
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
                                            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${type.color}`}>
                                                    <IconComp className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="truncate text-left">
                                                    <div className="text-[10px] font-bold text-white truncate">{type.name}</div>
                                                    <div className="text-[8px] font-bold text-neutral-400 mt-0.5">{type.days} Days Left</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Bottom Note */}
                            <Card className="bg-white/[0.02] border-white/5 p-3 rounded-2xl flex items-start gap-2.5 shadow-inner">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <Info className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest leading-none">Important Note</h4>
                                    <p className="text-[8px] text-neutral-400 mt-0.5 font-medium leading-normal">
                                        Submit your leave request in advance and wait for approval from school authority.
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="requests-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 flex flex-col justify-between"
                        >
                            <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-lg flex-1 flex flex-col min-h-[300px]">
                                <CardHeader className="pb-2 p-4">
                                    <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <History className="w-4 h-4 text-emerald-400" />
                                        Recent Requests
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 flex-1 overflow-y-auto max-h-[300px] space-y-2">
                                    {leaves.map((l: any) => (
                                        <div key={l.id} className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-emerald-400 shrink-0 select-none">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="truncate text-left">
                                                    <div className="text-[10px] font-bold text-white truncate">
                                                        {l.fromDate === l.toDate ? formatDateToDDMMYYYY(l.fromDate) : `${formatDateToDDMMYYYY(l.fromDate)} - ${formatDateToDDMMYYYY(l.toDate)}`}
                                                    </div>
                                                    <div className="text-[8px] text-neutral-400 truncate mt-0.5 italic">
                                                        "{l.reason}"
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-end gap-1">
                                                <Badge className="text-[7.5px] bg-white/5 border-none font-bold select-none px-1.5 py-0.2 shrink-0">
                                                    {l.type}
                                                </Badge>
                                                {l.status?.toUpperCase() === "PENDING" && <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest shrink-0">Pending</span>}
                                                {l.status?.toUpperCase() === "APPROVED" && <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest shrink-0">Approved</span>}
                                                {l.status?.toUpperCase() === "REJECTED" && <span className="text-[8px] font-black text-red-400 uppercase tracking-widest shrink-0">Rejected</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {leaves.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center py-12 text-neutral-400 italic text-[10px]">
                                            <FileText className="w-8 h-8 text-neutral-600 mb-2" />
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
                            className="relative w-full max-w-sm bg-[#112240]/95 border border-white/10 rounded-3xl p-5 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-white/15">
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-display">
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
                                        <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans">From Date</Label>
                                        <DatePickerInput
                                            min={today}
                                            value={form.fromDate}
                                            onChange={(e: any) => setForm({ ...form, fromDate: e.target.value })}
                                            className="bg-[#0A192F]/60 border-white/10 text-xs h-9 text-white font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans">To Date</Label>
                                        <DatePickerInput
                                            min={form.fromDate || today}
                                            value={form.toDate}
                                            onChange={(e: any) => setForm({ ...form, toDate: e.target.value })}
                                            className="bg-[#0A192F]/60 border-white/10 text-xs h-9 text-white font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans">Leave Type</Label>
                                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                        <SelectTrigger className="bg-[#0A192F]/60 border-white/10 text-xs h-9 text-white font-sans">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#112240] border-white/10 text-white font-sans">
                                            <SelectItem value="MEDICAL">Medical Leave</SelectItem>
                                            <SelectItem value="PERSONAL">Personal Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans">Reason</Label>
                                    <Textarea
                                        placeholder="Reason for taking leave..."
                                        value={form.reason}
                                        onChange={e => setForm({ ...form, reason: e.target.value })}
                                        className="bg-[#0A192F]/60 border-white/10 text-xs min-h-[80px] text-white font-sans"
                                    />
                                </div>

                                <Button disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl mt-2 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25 font-sans">
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
