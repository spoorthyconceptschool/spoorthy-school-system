"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, Calendar as CalendarIcon, Info, AlertTriangle, CheckCircle2, Megaphone, MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentNoticesPage() {
    const { user, userData } = useAuth();
    const [notices, setNotices] = useState<any[]>([]);
    const [classId, setClassId] = useState<string | null>(null);
    const [useFallback, setUseFallback] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;

        const schoolIdFromEmail = user.email.split('@')[0].toUpperCase();

        const unsubDoc = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                setClassId(pSnap.data().classId || "NONE");
            } else if (user.uid) {
                const q = query(
                    collection(db, "students"), 
                    where("uid", "==", user.uid),
                    where("schoolId", "==", userData?.schoolId || "global")
                );
                const unsubQuery = onSnapshot(q, (qSnap) => {
                    if (!qSnap.empty) setClassId(qSnap.docs[0].data().classId || "NONE");
                    else setClassId("NONE");
                });
                return () => unsubQuery();
            } else {
                setClassId("NONE");
            }
        }, (err) => console.error("Profile sync error:", err));

        return () => unsubDoc();
    }, [user]);

    useEffect(() => {
        if (!user?.uid || classId === null) return;

        let isMounted = true;

        const q = useFallback
            ? query(
                collection(db, "notices"), 
                where("target", "in", ["ALL", "STUDENTS", classId]),
                where("schoolId", "in", [userData?.schoolId || "global", "global"])
            )
            : query(
                collection(db, "notices"), 
                where("target", "in", ["ALL", "STUDENTS", classId]), 
                where("schoolId", "in", [userData?.schoolId || "global", "global"]),
                orderBy("createdAt", "desc")
            );

        const unsubscribe = onSnapshot(q, (snap) => {
            if (!isMounted) return;
            const now = Date.now();
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((n: any) => {
                if (n.expiresAt) return n.expiresAt.seconds * 1000 > now;
                return true;
            });

            if (useFallback) list = list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setNotices(list);
            setLoading(false);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes("index") && !useFallback) {
                setUseFallback(true);
            } else if (!err.message.includes("index")) {
                console.error("Notice listener error:", err);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [user, classId, useFallback]);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return '';
        const date = new Date(timestamp.seconds * 1000);
        const now = Date.now();
        const diff = now - date.getTime();
        
        if (diff < 60 * 1000) return 'Just now';
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getNoticeStyles = (type: string) => {
        switch (type?.toUpperCase()) {
            case "URGENT": return {
                icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
                border: "border-rose-500/30",
                bg: "bg-rose-500/10",
                badgeBg: "bg-rose-500/20",
                badgeText: "text-rose-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]"
            };
            case "HOLIDAY": return {
                icon: <CalendarIcon className="w-5 h-5 text-amber-400" />,
                border: "border-amber-500/30",
                bg: "bg-amber-500/10",
                badgeBg: "bg-amber-500/20",
                badgeText: "text-amber-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.2)]"
            };
            case "EVENT": return {
                icon: <MapPin className="w-5 h-5 text-indigo-400" />,
                border: "border-indigo-500/30",
                bg: "bg-indigo-500/10",
                badgeBg: "bg-indigo-500/20",
                badgeText: "text-indigo-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]"
            };
            case "ACADEMIC": return {
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                border: "border-emerald-500/30",
                bg: "bg-emerald-500/10",
                badgeBg: "bg-emerald-500/20",
                badgeText: "text-emerald-400",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]"
            };
            default: return {
                icon: <Megaphone className="w-5 h-5 text-[#64FFDA]" />,
                border: "border-[#64FFDA]/30",
                bg: "bg-[#64FFDA]/10",
                badgeBg: "bg-[#64FFDA]/20",
                badgeText: "text-[#64FFDA]",
                glow: "group-hover:shadow-[0_0_30px_-5px_rgba(100,255,218,0.2)]"
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

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="relative">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                        <Bell className="w-8 h-8 text-[#64FFDA]" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8892B0]">
                            School Notices
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">Official announcements, upcoming events, and critical alerts.</p>
                    </div>
                </div>
            </div>

            {/* Notices Stream */}
            <div className="space-y-6 relative z-10">
                {notices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Info className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Your Inbox is Empty</h3>
                        <p className="text-muted-foreground">You are all caught up! No active notices right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        <AnimatePresence>
                            {notices.map((n, index) => {
                                const styles = getNoticeStyles(n.type);
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                        key={n.id}
                                        className={`group relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-md border ${styles.border} transition-all duration-300 ${styles.glow} hover:-translate-y-1 block`}
                                    >
                                        {/* Background ambient glow */}
                                        <div className={`absolute -right-20 -top-20 w-64 h-64 ${styles.bg} rounded-full blur-[80px] opacity-20 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none`} />

                                        <div className="p-6 md:p-8 relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-4 rounded-2xl ${styles.bg} border ${styles.border} shrink-0 shadow-inner`}>
                                                        {styles.icon}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center flex-wrap gap-3 mb-2">
                                                            <h3 className="font-bold text-xl text-white tracking-tight">{n.title}</h3>
                                                            {n.type && (
                                                                <span className={`text-[10px] px-2.5 py-1 uppercase tracking-widest font-black rounded-lg ${styles.badgeBg} ${styles.badgeText}`}>
                                                                    {n.type}
                                                                </span>
                                                            )}
                                                            {n.type === "HOLIDAY" && n.startDate && (
                                                                <span className="text-[10px] px-2.5 py-1 uppercase tracking-widest font-black rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                                                    {new Date(n.startDate.seconds * 1000).toLocaleDateString()} {n.endDate && n.startDate.seconds !== n.endDate.seconds ? ` - ${new Date(n.endDate.seconds * 1000).toLocaleDateString()}` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                            <CalendarIcon className="w-3.5 h-3.5" />
                                                            {formatTimestamp(n.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pl-0 md:pl-20">
                                                <p className="text-[15px] text-[#8892B0] leading-relaxed whitespace-pre-wrap">
                                                    {n.content}
                                                </p>
                                                
                                                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full ${styles.bg} border ${styles.border} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                                                            {n.senderName?.charAt(0)?.toUpperCase() || "A"}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-[#E6F1FF]">{n.senderName || "Administrator"}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
                                                                {n.senderRole || "Staff"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

