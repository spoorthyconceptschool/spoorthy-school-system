"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import {
    LayoutGrid,
    GraduationCap,
    Clock,
    CheckCircle,
    Menu,
    X,
    Users,
    Layers,
    Banknote,
    Wallet,
    Calendar,
    BookOpen,
    ClipboardCheck,
    Database,
    Settings,
    Bell,
    CalendarOff,
    FileText,
    Trash2
} from 'lucide-react';

export function BottomNav() {
    const [mounted, setMounted] = React.useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);
    const [optimisticPath, setOptimisticPath] = React.useState<string | null>(null);
    const pathname = usePathname();

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        setOptimisticPath(null);
    }, [pathname]);

    if (!mounted) return null;

    const currentPath = optimisticPath || pathname;
    const isMainRouteActive = currentPath === "/admin" || currentPath.startsWith("/admin/students") || currentPath.startsWith("/admin/timetable") || currentPath.startsWith("/admin/attendance");
    const isMoreActive = !isMainRouteActive;

    return (
        <>
            {/* Mobile Bottom Navigation Bar (Visible only on Mobile) */}
            <nav className="fixed bottom-[-4px] pb-[4px] left-0 right-0 h-[68px] bg-[#040A15]/95 backdrop-blur-xl border-t border-[#64FFDA]/20 flex items-center justify-around px-2 z-50 md:hidden shadow-[0_-8px_30px_rgba(100,255,218,0.08)]">
                {/* Home */}
                <Link href="/admin" prefetch={true} onClick={() => setOptimisticPath("/admin")} className={cn(
                    "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                    currentPath === "/admin" 
                        ? "text-[#64FFDA] scale-105 drop-shadow-[0_0_8px_rgba(100,255,218,0.6)] font-bold" 
                        : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                )}>
                    <LayoutGrid size={20} className={cn(currentPath === "/admin" && "stroke-[2.5]")} />
                    <span className="text-[9px] font-bold mt-1 tracking-wide">Home</span>
                </Link>

                {/* Students */}
                <Link href="/admin/students" prefetch={true} onClick={() => setOptimisticPath("/admin/students")} className={cn(
                    "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                    currentPath.startsWith("/admin/students") 
                        ? "text-[#64FFDA] scale-105 drop-shadow-[0_0_8px_rgba(100,255,218,0.6)] font-bold" 
                        : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                )}>
                    <GraduationCap size={20} className={cn(currentPath.startsWith("/admin/students") && "stroke-[2.5]")} />
                    <span className="text-[9px] font-bold mt-1 tracking-wide">Students</span>
                </Link>

                {/* Time Table */}
                <Link href="/admin/timetable/manage" prefetch={true} onClick={() => setOptimisticPath("/admin/timetable/manage")} className={cn(
                    "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                    currentPath.startsWith("/admin/timetable") 
                        ? "text-[#64FFDA] scale-105 drop-shadow-[0_0_8px_rgba(100,255,218,0.6)] font-bold" 
                        : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                )}>
                    <Clock size={20} className={cn(currentPath.startsWith("/admin/timetable") && "stroke-[2.5]")} />
                    <span className="text-[9px] font-bold mt-1 tracking-wide">Time Table</span>
                </Link>

                {/* Attendance */}
                <Link href="/admin/attendance" prefetch={true} onClick={() => setOptimisticPath("/admin/attendance")} className={cn(
                    "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                    currentPath.startsWith("/admin/attendance") 
                        ? "text-[#64FFDA] scale-105 drop-shadow-[0_0_8px_rgba(100,255,218,0.6)] font-bold" 
                        : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                )}>
                    <CheckCircle size={20} className={cn(currentPath.startsWith("/admin/attendance") && "stroke-[2.5]")} />
                    <span className="text-[9px] font-bold mt-1 tracking-wide">Attendance</span>
                </Link>

                {/* More button */}
                <button 
                    onClick={() => setMobileMoreOpen(true)}
                    className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        isMoreActive
                            ? "text-[#64FFDA] scale-105 drop-shadow-[0_0_8px_rgba(100,255,218,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}
                >
                    <Menu size={20} />
                    <span className="text-[9px] font-bold mt-1 tracking-wide">More</span>
                </button>
            </nav>

            {/* Mobile "More" sliding action drawer overlay */}
            {mobileMoreOpen && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] md:hidden animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setMobileMoreOpen(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#0B1524] border-t border-[#64FFDA]/30 rounded-t-[2.5rem] p-6 pb-10 space-y-6 z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#64FFDA]/20 flex items-center justify-center text-[#64FFDA] font-black text-sm">A</div>
                                <h3 className="text-lg font-display font-black text-white uppercase tracking-wider">More Actions</h3>
                            </div>
                            <button 
                                onClick={() => setMobileMoreOpen(false)} 
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable list of items to prevent small viewport overflows */}
                        <div className="max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                            <div className="grid grid-cols-3 gap-3">
                                <Link 
                                    href="/admin/faculty" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/faculty"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Users size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Staff</span>
                                </Link>

                                <Link 
                                    href="/admin/groups" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/groups"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Layers size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Groups</span>
                                </Link>

                                <Link 
                                    href="/admin/fees" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/fees"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Banknote size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Fees</span>
                                </Link>

                                <Link 
                                    href="/admin/salary" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/salary"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Wallet size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Payroll</span>
                                </Link>

                                <Link 
                                    href="/admin/leaves" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/leaves"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Leaves</span>
                                </Link>

                                <Link 
                                    href="/admin/homework" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/homework"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <BookOpen size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Homework</span>
                                </Link>

                                <Link 
                                    href="/admin/exams" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/exams"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <ClipboardCheck size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Exams</span>
                                </Link>

                                <Link 
                                    href="/admin/master-data" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/master-data"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Database size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Database</span>
                                </Link>

                                <Link 
                                    href="/admin/settings" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/settings"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-zinc-500/10 flex items-center justify-center text-zinc-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Settings size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Settings</span>
                                </Link>

                                <Link 
                                    href="/admin/notices" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/notices"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Bell size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Notices</span>
                                </Link>

                                <Link 
                                    href="/admin/holidays" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/holidays"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <CalendarOff size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Holidays</span>
                                </Link>

                                <Link 
                                    href="/admin/cms" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/cms"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">CMS Content</span>
                                </Link>

                                <Link 
                                    href="/admin/purge-data" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/admin/purge-data"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#64FFDA]/20 transition-all text-center group col-span-3"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform mb-1.5">
                                        <Trash2 size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Purge Data</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
