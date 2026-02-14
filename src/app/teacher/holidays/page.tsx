"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HolidaysPage() {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const q = query(collection(db, "notices"), where("type", "==", "HOLIDAY"));
                const snap = await getDocs(q);
                setHolidays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching holidays:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHolidays();
    }, []);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in">
            <h1 className="text-3xl font-display font-bold">Holiday Calendar</h1>

            <div className="grid gap-4">
                {holidays.length > 0 ? (
                    holidays.map((h, i) => (
                        <Card key={i} className="bg-black/20 border-white/10">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-lg">{h.title || h.name || "Holiday"}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {h.date?.seconds ? new Date(h.date.seconds * 1000).toLocaleDateString() :
                                            h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleDateString() : "Date TBD"}
                                    </p>
                                    {h.content && <p className="text-xs text-muted-foreground mt-1">{h.content}</p>}
                                </div>
                                <Badge variant="secondary" className="capitalize">{h.category || "General"}</Badge>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground">No upcoming holidays scheduled.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
