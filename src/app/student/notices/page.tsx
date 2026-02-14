"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StudentNoticesPage() {
    const { user } = useAuth();
    const [notices, setNotices] = useState<any[]>([]);
    const [classId, setClassId] = useState<string | null>(null);
    const [useFallback, setUseFallback] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        const fetchProfile = async () => {
            try {
                const sRef = collection(db, "students");
                const qProfile = query(sRef, where("uid", "==", user.uid));
                const pSnap = await getDocs(qProfile);
                if (!pSnap.empty) {
                    setClassId(pSnap.docs[0].data().classId || "NONE");
                }
            } catch (e) {
                console.error("Error fetching student profile:", e);
            }
        };

        fetchProfile();
    }, [user]);

    useEffect(() => {
        if (!user?.uid || classId === null) return;

        let isMounted = true;

        const q = useFallback
            ? query(
                collection(db, "notices"),
                where("target", "in", ["ALL", "STUDENTS", classId])
            )
            : query(
                collection(db, "notices"),
                where("target", "in", ["ALL", "STUDENTS", classId]),
                orderBy("createdAt", "desc")
            );

        const unsubscribe = onSnapshot(q, (snap) => {
            if (!isMounted) return;
            const now = Date.now();
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter((n: any) => {
                    if (n.expiresAt) return n.expiresAt.seconds * 1000 > now;
                    return true;
                });

            if (useFallback) {
                list = list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setNotices(list);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes("index") && !useFallback) {
                console.warn("[Notices] Index missing, switching to fallback query.");
                setUseFallback(true);
            } else if (!err.message.includes("index")) {
                console.error("Notice listener error:", err);
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
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} min ago`;
        }
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <h1 className="text-3xl font-display font-bold">Inbox</h1>

            <div className="space-y-4">
                {notices.length === 0 ? <p className="text-muted-foreground">No active notices.</p> : notices.map(n => (
                    <Card key={n.id} className="bg-black/20 border-white/10">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{n.title}</h3>
                                        {n.type === "HOLIDAY" && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold">HOLIDAY</span>}
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(n.createdAt)}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{n.content}</p>
                            <div className="mt-3 text-xs text-muted-foreground">From: {n.senderName} ({n.senderRole})</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
