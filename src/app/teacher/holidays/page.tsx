"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HolidaysPage() {
    const [holidays, setHolidays] = useState<any[]>(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_holidays_page_cache") || "[]") : []);

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const q = query(collection(db, "notices"), where("type", "==", "HOLIDAY"));
                const snap = await getDocs(q);
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHolidays(list);
                if (typeof window !== 'undefined') localStorage.setItem("teacher_holidays_page_cache", JSON.stringify(list));
            } catch (error: any) {
                console.warn("[Holidays] error fetching holidays:", error.message);
            }
        };
        fetchHolidays();
    }, []);

    return (
        <div className="w-full text-[#E6F1FF] pb-20 animate-in fade-in duration-300">
            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT (High-density, space-optimized holiday cards)             */}
            {/* ========================================================================= */}
            <div className="lg:hidden block p-3 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h1 className="text-xl font-display font-bold italic">Holiday Calendar</h1>
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400/80">Calendar</span>
                    </div>
                </div>

                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest -mt-1">
                    Scheduled breaks and institutional holidays
                </p>

                <div className="space-y-2.5">
                    {holidays.length > 0 ? (
                        holidays.map((h, i) => (
                            <Card key={i} className="bg-black/20 border-white/10 p-3 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                <div className="flex justify-between items-start gap-2 pl-1">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-xs text-white leading-tight">{h.title || h.name || "Holiday"}</h4>
                                        <p className="text-[9px] text-white/40 uppercase tracking-widest font-black flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5 text-emerald-400" />
                                            {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) :
                                                h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : "Date TBD"}
                                        </p>
                                        {h.content && <p className="text-[10px] text-white/60 leading-normal font-medium mt-1">{h.content}</p>}
                                    </div>
                                    <span className="bg-white/5 border border-white/10 text-white/50 text-[8px] uppercase font-black tracking-wider px-2 py-0.5 rounded">
                                        {h.category || "General"}
                                    </span>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 text-[10px] text-white/40 italic bg-black/10 rounded-xl border border-white/5">
                            <Calendar className="w-8 h-8 opacity-10 mx-auto mb-2" />
                            No holidays scheduled.
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEWPORT (Wide Workspace layout for holidays)                     */}
            {/* ========================================================================= */}
            <div className="hidden lg:block max-w-[1600px] mx-auto p-12 space-y-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="space-y-1">
                        <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">School Holidays</h1>
                        <p className="text-muted-foreground text-sm">Official calendar planning and scheduled leaves for the active academic session.</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {holidays.length > 0 ? (
                        holidays.map((h, i) => (
                            <Card key={i} className="bg-black/40 border border-white/10 hover:border-emerald-500/20 transition-all rounded-[2rem] overflow-hidden p-6 relative group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full -mr-8 -mt-8" />
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-xl text-white group-hover:text-emerald-400 transition-colors">{h.title || h.name || "Holiday"}</h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                                {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) :
                                                    h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Date TBD"}
                                            </div>
                                        </div>
                                        {h.content && <p className="text-sm text-white/70 leading-relaxed font-medium">{h.content}</p>}
                                    </div>
                                    <Badge className="bg-white/5 border border-white/10 text-white/40 uppercase tracking-widest text-[9px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                                        {h.category || "General"}
                                    </Badge>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-2 text-center py-24 border border-dashed border-white/10 rounded-[2rem] bg-white/5 flex flex-col items-center justify-center gap-3">
                            <Calendar className="w-12 h-12 text-muted-foreground opacity-20" />
                            <p className="font-bold text-sm uppercase tracking-widest opacity-40">No academic holidays scheduled</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
