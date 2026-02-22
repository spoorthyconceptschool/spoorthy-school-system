"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Database, ShieldAlert, AlertTriangle, Terminal, CheckCircle2, History, Users, ArrowLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import Link from "next/link";

type PurgeMode = 'OPERATIONAL_ONLY' | 'FULL_SYSTEM';

export default function PurgeDataPage() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'warn' | 'success' | 'err' }[]>([]);
    const [confirmMode, setConfirmMode] = useState<PurgeMode | null>(null);

    const addLog = (msg: string, type: 'info' | 'warn' | 'success' | 'err' = 'info') => {
        setLogs(prev => [{ msg, type }, ...prev].slice(0, 50));
    };

    const handlePurge = async (mode: PurgeMode) => {
        setLoading(true);
        setConfirmMode(null);
        addLog(`Initiating ${mode} purge request...`, 'warn');

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/purge-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token} `
                },
                body: JSON.stringify({ type: mode })
            });

            const data = await res.json();
            if (data.success) {
                addLog(data.message, 'success');
                toast({
                    title: "Purge Initiated",
                    description: "The system is being wiped in the background.",
                    type: "success"
                });

                // Final log after simulated delay or just leave it running
                setTimeout(() => addLog("Process backgrounded. Check server logs for full completion.", 'info'), 2000);
            } else {
                throw new Error(data.error || "Failed to initiate purge");
            }
        } catch (e: any) {
            addLog(`ERROR: ${e.message} `, 'err');
            toast({
                title: "Operation Failed",
                description: e.message,
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-400 p-8 space-y-8 animate-in fade-in duration-700">
            {/* Navigation Ribbon */}
            <div className="max-w-6xl mx-auto flex items-center justify-between mb-4">
                <div className="flex gap-4">
                    <Link href="/admin/settings">
                        <Button variant="ghost" className="text-zinc-500 hover:text-white hover:bg-white/5 gap-2 px-0">
                            <ArrowLeft size={16} /> Back to Settings
                        </Button>
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="outline" className="text-zinc-400 border-white/5 hover:bg-white/5 gap-2">
                            Dashboard <ArrowUpRight size={14} />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-[10px] font-bold tracking-tighter animate-pulse">
                        <ShieldAlert size={12} /> RESTRICTED ACCESS
                    </div>
                </div>
            </div>

            {/* Header section */}
            <div className="max-w-6xl mx-auto">
                <div className="space-y-2">
                    <h1 className="text-4xl font-display font-bold text-white tracking-tight">System Purge Control</h1>
                    <p className="text-zinc-500 max-w-xl">
                        Sensitive administrative tools for database resetting and system-wide data clearing.
                        Use with extreme caution.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                {/* Left: Options */}
                <div className="space-y-6">
                    {/* Option 1: Operational Only */}
                    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl group hover:border-emerald-500/30 transition-all duration-500">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                    <Database size={24} />
                                </div>
                                <div className="text-[10px] font-mono p-1 px-2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">
                                    DATA RESET
                                </div>
                            </div>
                            <CardTitle className="text-xl text-white mt-4">Operational Data Purge</CardTitle>
                            <CardDescription>
                                Deletes all operational records (fees, attendance, notices, schedules) but
                                <b> preserves all users, students, and staff accounts.</b>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="text-xs space-y-2 text-zinc-500">
                                <li className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> Wipes Fees, Attendance & Exams</li>
                                <li className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> Wipes Notices & Timetables</li>
                                <li className="flex gap-2 text-emerald-400 font-medium italic"><Users size={12} className="text-emerald-400 shrink-0" /> Retains Students/Teachers/Staff Details</li>
                                <li className="flex gap-2 text-white/50 italic font-medium"><History size={12} className="text-amber-500 shrink-0" /> Retains All Login Credentials</li>
                            </ul>

                            {confirmMode === 'OPERATIONAL_ONLY' ? (
                                <div className="flex gap-2 pt-4 animate-in slide-in-from-bottom-2">
                                    <Button
                                        onClick={() => handlePurge('OPERATIONAL_ONLY')}
                                        disabled={loading}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        CONFIRM RESET
                                    </Button>
                                    <Button variant="ghost" onClick={() => setConfirmMode(null)} className="text-zinc-500">Cancel</Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setConfirmMode('OPERATIONAL_ONLY')}
                                    disabled={loading}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5"
                                >
                                    Operational Data Reset
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Option 2: Full System */}
                    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl group hover:border-red-500/30 transition-all duration-500 shadow-2xl shadow-red-500/5">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="text-[10px] font-mono p-1 px-2 bg-red-500/10 text-red-500 rounded border border-red-500/20">
                                    ☢️ DESTRUCTIVE
                                </div>
                            </div>
                            <CardTitle className="text-xl text-white mt-4">Full System Nuke</CardTitle>
                            <CardDescription>
                                Total destruction. Wipes all database records AND deletes all user accounts
                                except for the Master Admin account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="text-xs space-y-2 text-zinc-500">
                                <li className="flex gap-2"><CheckCircle2 size={12} className="text-red-500 shrink-0" /> Deletes all student/staff data</li>
                                <li className="flex gap-2"><CheckCircle2 size={12} className="text-red-500 shrink-0" /> Deletes all login credentials</li>
                                <li className="flex gap-2"><CheckCircle2 size={12} className="text-red-500 shrink-0" /> Clears Firestore, RTDB, and Storage</li>
                                <li className="flex gap-2 text-emerald-500 font-bold italic"><CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> PRESERVES LANDING PAGE & CMS IMAGES</li>
                            </ul>

                            {confirmMode === 'FULL_SYSTEM' ? (
                                <div className="flex flex-col gap-2 pt-4 animate-in zoom-in-95">
                                    <p className="text-[10px] text-red-500 font-bold text-center mb-2 uppercase tracking-widest">DANGER: THIS CANNOT BE UNDONE</p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handlePurge('FULL_SYSTEM')}
                                            disabled={loading}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse"
                                        >
                                            NUKE EVERYTHING
                                        </Button>
                                        <Button variant="ghost" onClick={() => setConfirmMode(null)} className="text-zinc-500">Abort</Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setConfirmMode('FULL_SYSTEM')}
                                    disabled={loading}
                                    className="w-full bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-500/20"
                                >
                                    Full Factory Reset
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Console Output */}
                <div className="flex flex-col h-full min-h-[500px]">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col h-full shadow-inner relative overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-zinc-900/40 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                                <Terminal size={14} /> SYSTEM_PURGE_LOG
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                                <div className="w-2 h-2 rounded-full bg-green-500/20" />
                            </div>
                        </div>

                        <div className="p-6 font-mono text-xs space-y-3 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
                            {logs.length === 0 && (
                                <div className="text-zinc-700 italic">Waiting for process initiation...</div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className={cn(
                                    "p-2 rounded border border-transparent leading-relaxed animate-in fade-in duration-300",
                                    log.type === 'info' && "text-zinc-400",
                                    log.type === 'warn' && "bg-amber-500/5 text-amber-500 border-amber-500/10",
                                    log.type === 'success' && "bg-emerald-500/5 text-emerald-500 border-emerald-500/10",
                                    log.type === 'err' && "bg-red-500/5 text-red-500 border-red-500/10"
                                )}>
                                    <span className="opacity-90 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                    {log.msg}
                                </div>
                            ))}
                        </div>

                        {loading && (
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-zinc-900/80 backdrop-blur-sm border-t border-white/5 flex items-center justify-center gap-3 text-white text-sm">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                Processing secure wipe...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
