"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot, limit, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Bell, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    status: "READ" | "UNREAD";
    createdAt: any;
}

export default function AdminNotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [optimisticReads, setOptimisticReads] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(`read_notifs_${user?.uid}`);
                return stored ? new Set(JSON.parse(stored)) : new Set();
            } catch (e) {
                return new Set();
            }
        }
        return new Set();
    });

    // Rehydrate local reads once the user identity is confirmed
    useEffect(() => {
        if (typeof window !== 'undefined' && user?.uid) {
            try {
                const stored = localStorage.getItem(`read_notifs_${user.uid}`);
                if (stored) {
                    setOptimisticReads(new Set(JSON.parse(stored)));
                }
            } catch (e) {}
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        let isMounted = true;
        const unsubscribes: (() => void)[] = [];

        const updateNotifications = (newList: Notification[]) => {
            if (!isMounted) return;
            setNotifications(prev => {
                const newIds = new Set(newList.map(n => n.id));
                const filteredPrev = prev.filter(p => !newIds.has(p.id));
                const combined = [...filteredPrev, ...newList];
                return combined.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                }).slice(0, 100);
            });
            setLoading(false);
        };

        // 1. Personal Notifications
        const qPersonal = query(collection(db, "notifications"), where("userId", "==", user.uid), limit(50));
        const unsubPersonal = onSnapshot(qPersonal, (snap) => {
            if (!isMounted) return;
            updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        });
        unsubscribes.push(unsubPersonal);

        // 2. Global Admin Notifications
        const qAdmin = query(collection(db, "notifications"), where("target", "==", "ALL_ADMINS"), limit(50));
        const unsubAdmin = onSnapshot(qAdmin, (snap) => {
            if (!isMounted) return;
            updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        });
        unsubscribes.push(unsubAdmin);

        return () => {
            isMounted = false;
            unsubscribes.forEach(f => f());
        };
    }, [user]);

    const markAsRead = async (id: string, status: string) => {
        if (status === "READ" || optimisticReads.has(id)) return;
        
        setOptimisticReads(prev => {
            const next = new Set(prev).add(id);
            if (typeof window !== 'undefined') localStorage.setItem(`read_notifs_${user?.uid}`, JSON.stringify(Array.from(next).slice(-500)));
            return next;
        });

        try {
            await updateDoc(doc(db, "notifications", id), { status: "READ" });
        } catch (e) {
            console.error("Error marking read:", e);
        }
    };

    const markAllAsRead = () => {
        setOptimisticReads(prev => {
            const next = new Set(prev);
            notifications.forEach(n => next.add(n.id));
            if (typeof window !== 'undefined') localStorage.setItem(`read_notifs_${user?.uid}`, JSON.stringify(Array.from(next).slice(-500)));
            return next;
        });

        notifications.forEach(n => {
            if (n.status === "UNREAD" && !optimisticReads.has(n.id)) {
                updateDoc(doc(db, "notifications", n.id), { status: "READ" }).catch(()=>null);
            }
        });
    };

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
            return date.toLocaleString();
        } catch (e) {
            return '';
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-400" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-10 px-4 mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">Inbox</h1>
                        <p className="text-muted-foreground text-sm">System alerts and administrative updates.</p>
                    </div>
                </div>
                {notifications.some(n => n.status === "UNREAD" && !optimisticReads.has(n.id)) && (
                    <button 
                        onClick={markAllAsRead}
                        className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold transition-colors shadow-none"
                    >
                        Mark All Read
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                        <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Inbox is clear.</p>
                    </div>
                ) : (
                    notifications.map(n => {
                        const isUnread = n.status === "UNREAD" && !optimisticReads.has(n.id);
                        return (
                            <div
                                key={n.id}
                                onClick={() => markAsRead(n.id, n.status)}
                                className={cn(
                                    "bg-black/40 border border-white/10 rounded-xl transition-all hover:bg-white/5 cursor-pointer group relative overflow-hidden backdrop-blur-md",
                                    isUnread ? "border-l-4 border-l-blue-500 bg-blue-500/5" : "opacity-80"
                                )}
                            >
                                <div className="p-5 flex gap-4">
                                    <div className={cn(
                                        "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                                        isUnread ? "bg-blue-500" : "bg-transparent"
                                    )} />
                                    <div className="flex-1 space-y-1 w-full min-w-0">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1">
                                            <h3 className={cn("font-bold text-base md:text-lg truncate", isUnread ? "text-white" : "text-muted-foreground")}>
                                                {n.title}
                                            </h3>
                                            <span suppressHydrationWarning className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap font-mono shrink-0">
                                                {formatTimestamp(n.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed break-words">{n.message}</p>

                                        {!isUnread && (
                                            <div className="flex items-center gap-1 text-[10px] text-emerald-500/50 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle size={10} /> Read
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
