"use client";

import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";

export function NotificationManager() {
    const isFirstRun = useRef(true);

    useEffect(() => {
        let unsubscribe: () => void;

        const handleSnapshot = (snapshot: any) => {
            if (isFirstRun.current) {
                isFirstRun.current = false;
                snapshot.docs.forEach((doc: any) => {
                    const data = doc.data();
                    const hDate = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
                    if (hDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const diff = hDate.getTime() - today.getTime();
                        const days = diff / (1000 * 60 * 60 * 24);

                        if (days >= 0 && days <= 2) {
                            toast({
                                title: hDate.getTime() === today.getTime() ? "Today is a Holiday!" : "Upcoming Holiday",
                                description: `${data.title} on ${hDate.toLocaleDateString()}`,
                                type: "info",
                                duration: 8000
                            });
                        }
                    }
                });
                return;
            }

            snapshot.docChanges().forEach((change: any) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const holidayDate = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
                    if (holidayDate) {
                        toast({
                            title: "🎉 Holiday Declared!",
                            description: `${data.title} on ${holidayDate.toLocaleDateString()}`,
                            type: "info",
                            duration: 10000
                        });
                    }
                }
            });
        };

        // Attempt ordered query
        const q = query(
            collection(db, "notices"),
            where("type", "==", "HOLIDAY"),
            orderBy("date", "desc"),
            limit(10)
        );

        unsubscribe = onSnapshot(q, handleSnapshot, (err) => {
            if (err.message.includes("index")) {
                console.warn("[NotificationManager] Index missing, falling back to unordered query.");
                // Fallback: Query without orderBy
                const fallbackQ = query(
                    collection(db, "notices"),
                    where("type", "==", "HOLIDAY"),
                    limit(20)
                );
                onSnapshot(fallbackQ, (s) => {
                    // Manual Sort for the initial load summary
                    if (isFirstRun.current) {
                        const sortedDocs = [...s.docs].sort((a, b) => {
                            const dateA = a.data().date?.seconds || 0;
                            const dateB = b.data().date?.seconds || 0;
                            return dateB - dateA;
                        });
                        handleSnapshot({ docs: sortedDocs, docChanges: () => [] });
                    } else {
                        handleSnapshot(s);
                    }
                });
            } else {
                console.error("Notice notification error:", err);
            }
        });

        return () => unsubscribe?.();
    }, []);

    return null;
}
