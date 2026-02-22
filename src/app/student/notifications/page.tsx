"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { collection, query, where, getDocs, orderBy, onSnapshot, limit, updateDoc, doc } from "firebase/firestore";
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

export default function StudentNotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;

        const schoolIdFromEmail = user.email.split('@')[0].toUpperCase();
        let isMounted = true;
        const unsubscribes: (() => void)[] = [];

        // 1. Personal Notifications - Realtime (UID based)
        const qPersonal = query(collection(db, "notifications"), where("userId", "==", user.uid), limit(50));
        const unsubPersonal = onSnapshot(qPersonal, (snap) => {
            if (!isMounted) return;
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
            updateNotifications(list);
        });
        unsubscribes.push(unsubPersonal);

        // 2. Class Notifications - Dual Strategy Profile Fetch
        const setupClassListener = (student: any) => {
            const classId = student.classId;
            if (classId) {
                const qClass = query(collection(db, "notifications"), where("target", "==", `class_${classId}`), limit(50));
                const unsubClass = onSnapshot(qClass, (snap) => {
                    if (!isMounted) return;
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
                    updateNotifications(list);
                });
                unsubscribes.push(unsubClass);
            }
            setLoading(false);
        };

        const unsubProfile = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                setupClassListener(pSnap.data());
            } else if (user.uid) {
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const unsubQuery = onSnapshot(q, (qSnap) => {
                    if (!qSnap.empty) setupClassListener(qSnap.docs[0].data());
                    else setLoading(false);
                });
                unsubscribes.push(unsubQuery);
            } else {
                setLoading(false);
            }
        }, (err) => {
            console.error("Profile sync error:", err);
            setLoading(false);
        });
        unsubscribes.push(unsubProfile);

        // Helper to merge lists safely
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
                }).slice(0, 50);
            });
        };

        return () => {
            isMounted = false;
            unsubscribes.forEach(f => f());
        };
    }, [user]);

    const markAsRead = async (id: string, status: string) => {
        // Prevent unnecessary writes
        if (status === "READ") return;

        try {
            console.log("Marking as read:", id);
            await updateDoc(doc(db, "notifications", id), { status: "READ" });
        } catch (e) {
            console.error("Error marking read:", e);
        }
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

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#64FFDA]" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-10">
            <div className="flex items-center gap-3 mb-6 border-b border-[#64FFDA]/10 pb-4">
                <div className="p-2 bg-[#64FFDA]/10 rounded-lg text-[#64FFDA]">
                    <Bell size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Notifications</h1>
                    <p className="text-muted-foreground">Updates on attendance, assignments, and system alerts.</p>
                </div>
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                        <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No notifications yet.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => markAsRead(n.id, n.status)}
                            className={cn(
                                "bg-black/20 border border-white/10 rounded-lg transition-all hover:bg-white/5 cursor-pointer group relative overflow-hidden",
                                n.status === "UNREAD" ? "border-l-4 border-l-[#3B82F6] bg-[#3B82F6]/5" : "opacity-80"
                            )}
                        >
                            <div className="p-5 flex gap-4">
                                <div className={cn(
                                    "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                                    n.status === "UNREAD" ? "bg-[#3B82F6]" : "bg-transparent"
                                )} />
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className={cn("font-bold text-lg", n.status === "UNREAD" ? "text-white" : "text-muted-foreground")}>
                                            {n.title}
                                        </h3>
                                        <span suppressHydrationWarning className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                            {formatTimestamp(n.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>

                                    {n.status === "READ" && (
                                        <div className="flex items-center gap-1 text-[10px] text-green-500/50 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CheckCircle size={10} /> Read
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
