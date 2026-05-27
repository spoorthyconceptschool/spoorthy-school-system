"use client";

import { useEffect, useState } from "react";
import { useStudentData } from "@/context/StudentDataContext";
import { Bell, Calendar as CalendarIcon, Info, AlertTriangle, CheckCircle2, Megaphone, MapPin, Loader2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentNoticesPage() {
    const { notices, loading } = useStudentData();
    const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);

    useEffect(() => {
        if (notices.length > 0 && !selectedNoticeId) {
            setSelectedNoticeId(notices[0].id);
        }
    }, [notices, selectedNoticeId]);

    const formatDateToDDMMYY = (dateVal: any) => {
        if (!dateVal) return "";
        let d: Date;
        if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
            d = new Date(dateVal.seconds * 1000);
        } else {
            d = new Date(dateVal);
        }
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    };

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return '';
        const date = new Date(timestamp.seconds * 1000);
        const now = Date.now();
        const diff = now - date.getTime();
        
        if (diff < 60 * 1000) return 'Just now';
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`;
        return formatDateToDDMMYY(date);
    };

    const getNoticeStyles = (type: string) => {
        switch (type?.toUpperCase()) {
            case "URGENT": return {
                icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
                border: "border-rose-500/20",
                bg: "bg-rose-500/10",
                badgeBg: "bg-rose-500/20",
                badgeText: "text-rose-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]",
                textColor: "text-rose-400"
            };
            case "HOLIDAY": return {
                icon: <CalendarIcon className="w-4 h-4 text-amber-400" />,
                border: "border-amber-500/20",
                bg: "bg-amber-500/10",
                badgeBg: "bg-amber-500/20",
                badgeText: "text-amber-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.2)]",
                textColor: "text-amber-400"
            };
            case "EVENT": return {
                icon: <MapPin className="w-4 h-4 text-indigo-400" />,
                border: "border-indigo-500/20",
                bg: "bg-indigo-500/10",
                badgeBg: "bg-indigo-500/20",
                badgeText: "text-indigo-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]",
                textColor: "text-indigo-400"
            };
            case "ACADEMIC": return {
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
                border: "border-emerald-500/20",
                bg: "bg-emerald-500/10",
                badgeBg: "bg-emerald-500/20",
                badgeText: "text-emerald-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]",
                textColor: "text-emerald-400"
            };
            default: return {
                icon: <Megaphone className="w-4 h-4 text-[#64FFDA]" />,
                border: "border-[#64FFDA]/20",
                bg: "bg-[#64FFDA]/10",
                badgeBg: "bg-[#64FFDA]/20",
                badgeText: "text-[#64FFDA]",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(100,255,218,0.2)]",
                textColor: "text-[#64FFDA]"
            };
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#64FFDA]" />
            </div>
        );
    }

    const selectedNotice = notices.find(n => n.id === selectedNoticeId) || notices[0];

    return (
        <div className="w-full h-full overflow-y-auto">
            {/* =======================================
                DESKTOP SPLIT PANEL VIEW (>= lg)
                ======================================= */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-6 w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative">
                
                {/* Glowing decorations */}
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/5">
                            <Bell className="w-5 h-5 text-[#64FFDA]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Notice Board Inbox</h1>
                            <p className="text-xs text-neutral-400 font-medium">Keep track of important announcements, holidays, and official updates.</p>
                        </div>
                    </div>

                    <Link href="/student">
                        <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white gap-2 rounded-xl">
                            <ArrowLeft className="w-4 h-4" /> Dashboard
                        </Button>
                    </Link>
                </div>

                {notices.length === 0 ? (
                    <Card className="bg-[#112240]/40 border-white/10 p-12 text-center flex flex-col items-center justify-center rounded-2xl min-h-[300px]">
                        <Info className="w-12 h-12 text-neutral-500 mb-4 animate-bounce" />
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">Inbox is Completely Empty</h2>
                        <p className="text-sm text-neutral-400 mt-2 max-w-xs">
                            No notices or updates have been published for you yet. Enjoy a clean notice board!
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-12 gap-6 items-stretch min-h-[500px]">
                        
                        {/* 1. Left List Pane (5 cols) */}
                        <div className="col-span-5 flex flex-col space-y-3 max-h-[620px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {notices.map((n) => {
                                const styles = getNoticeStyles(n.type);
                                const isSelected = n.id === selectedNoticeId;
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => setSelectedNoticeId(n.id)}
                                        className={`group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 cursor-pointer flex flex-col gap-2.5 text-left ${
                                            isSelected
                                                ? "bg-blue-600/10 border-blue-500/40 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]"
                                                : "bg-[#112240]/40 border-white/5 hover:border-white/10"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${styles.bg} border ${styles.border} shrink-0 mt-0.5`}>
                                                {styles.icon}
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-extrabold text-xs text-white truncate flex-1 group-hover:text-blue-400 transition-colors">
                                                        {n.title}
                                                    </h3>
                                                    {n.type && (
                                                        <span className={`text-[7px] px-1.5 py-0.2 uppercase tracking-widest font-black rounded ${styles.badgeBg} ${styles.badgeText} shrink-0`}>
                                                            {n.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-neutral-400 font-mono">
                                                    Published: {formatTimestamp(n.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                                            {n.content}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 2. Right Detail Pane (7 cols) */}
                        <div className="col-span-7">
                            <AnimatePresence mode="wait">
                                {selectedNotice ? (
                                    <motion.div
                                        key={selectedNotice.id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col"
                                    >
                                        <Card className="bg-[#112240]/40 border-white/10 backdrop-blur-md shadow-2xl p-6 rounded-2xl flex-1 flex flex-col justify-between">
                                            <div className="space-y-5">
                                                
                                                {/* Header Details */}
                                                <div className="flex justify-between items-start gap-4 border-b border-white/5 pb-4">
                                                    <div className="space-y-1">
                                                        <span className={`text-[9px] px-2.5 py-0.5 uppercase tracking-widest font-black rounded-lg ${getNoticeStyles(selectedNotice.type).badgeBg} ${getNoticeStyles(selectedNotice.type).badgeText} inline-block`}>
                                                            {selectedNotice.type || "GENERAL"}
                                                        </span>
                                                        <h2 className="text-xl font-black text-white tracking-tight leading-tight mt-1.5">
                                                            {selectedNotice.title}
                                                        </h2>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono mt-1 select-none">
                                                            <CalendarIcon className="w-3.5 h-3.5" />
                                                            <span>Published: {formatTimestamp(selectedNotice.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white`}>
                                                        {getNoticeStyles(selectedNotice.type).icon}
                                                    </div>
                                                </div>

                                                {/* Core Notice Message */}
                                                <div className="text-left text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap py-2 font-medium">
                                                    {selectedNotice.content}
                                                </div>
                                            </div>

                                            {/* Publisher card footnote */}
                                            <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center gap-4 select-none">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-xs font-black text-white shadow-md uppercase">
                                                        {selectedNotice.senderName?.charAt(0) || "A"}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black text-white leading-none">{selectedNotice.senderName || "Administrator"}</p>
                                                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest mt-1 leading-none font-bold">
                                                            {selectedNotice.senderRole || "School Staff"}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-3 py-1 rounded-xl text-[9px] uppercase tracking-widest">
                                                    Official Circular
                                                </Badge>
                                            </div>

                                        </Card>
                                    </motion.div>
                                ) : (
                                    <div className="h-full bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-neutral-500 font-black text-xs uppercase tracking-wider select-none">
                                        Select an announcement from the inbox list
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* =======================================
                MOBILE LIST VIEW (< lg Breakpoint)
                ======================================= */}
            <div className="max-w-md mx-auto flex lg:hidden flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-500 pb-3 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] px-2.5">
                
                {/* Glowing blur decorations */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Title / Header */}
                <div className="flex items-center gap-3 px-1 shrink-0 mt-2">
                    <Link href="/student" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/10 transition-all shadow shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <Bell className="w-4 h-4 text-[#64FFDA]" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-base font-extrabold text-white">School Notices</h1>
                            <p className="text-[10px] text-neutral-400">Official announcements and updates.</p>
                        </div>
                    </div>
                </div>

                {/* Mobile Notices Scroll Feed */}
                <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 min-h-0 relative z-10">
                    {notices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-2xl border border-white/10 text-center h-full">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                                <Info className="w-6 h-6 text-neutral-500" />
                            </div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Inbox is Empty</h3>
                            <p className="text-[9px] text-neutral-500 mt-0.5">No active official school notices.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {notices.map((n, index) => {
                                const styles = getNoticeStyles(n.type);
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25, delay: index * 0.05 }}
                                        key={n.id}
                                        className={`group relative overflow-hidden rounded-2xl bg-[#112240]/40 border ${styles.border} transition-all duration-300 ${styles.glow} p-4 flex flex-col gap-3 text-left`}
                                    >
                                        {/* Ambient Glow */}
                                        <div className={`absolute -right-16 -top-16 w-48 h-48 ${styles.bg} rounded-full blur-[60px] opacity-10 group-hover:opacity-35 transition-opacity duration-500 pointer-events-none`} />
     
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className={`p-2.5 rounded-xl ${styles.bg} border ${styles.border} shrink-0 shadow-inner mt-0.5`}>
                                                {styles.icon}
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <h3 className="font-extrabold text-xs text-white tracking-tight truncate flex-1">
                                                        {n.title}
                                                    </h3>
                                                    {n.type && (
                                                        <span className={`text-[7px] px-1.5 py-0 uppercase tracking-widest font-black rounded ${styles.badgeBg} ${styles.badgeText} shrink-0`}>
                                                            {n.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[8px] text-neutral-500 font-bold uppercase">
                                                    <CalendarIcon className="w-2.5 h-2.5" />
                                                    <span>{formatTimestamp(n.createdAt)}</span>
                                                    {n.type === "HOLIDAY" && n.startDate && (
                                                         <>
                                                             <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                             <span className="text-amber-400">
                                                                 {formatDateToDDMMYY(n.startDate)}
                                                             </span>
                                                         </>
                                                     )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pl-12 relative z-10">
                                            <p className="text-[11px] text-[#8892B0] leading-relaxed whitespace-pre-wrap">
                                                {n.content}
                                            </p>
                                        </div>

                                        <div className="pl-12 pt-2.5 mt-1.5 border-t border-white/5 flex items-center gap-2 relative z-10 shrink-0 select-none">
                                            <div className={`w-6 h-6 rounded-full ${styles.bg} border ${styles.border} flex items-center justify-center text-[9px] font-black text-white shadow-sm`}>
                                                {n.senderName?.charAt(0)?.toUpperCase() || "A"}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-[10px] font-bold text-[#E6F1FF] leading-none">{n.senderName || "Administrator"}</p>
                                                <p className="text-[7px] text-neutral-500 uppercase tracking-widest mt-0.5 leading-none">
                                                    {n.senderRole || "Staff"}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>


            </div>
        </div>
    );
}
