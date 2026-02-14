"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Send, Bell, ArrowLeft } from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function NoticesPage() {
    const { user } = useAuth();
    const [sentNotices, setSentNotices] = useState<any[]>([]);
    const [receivedNotices, setReceivedNotices] = useState<any[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [useSentFallback, setUseSentFallback] = useState(false);
    const [useInboxFallback, setUseInboxFallback] = useState(false);

    // Form
    const [targetClassId, setTargetClassId] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    // 0. Fetch Classes (Once or on User change)
    useEffect(() => {
        if (user?.uid) fetchClasses();
    }, [user]);

    // 1. Sent History Listener
    useEffect(() => {
        if (!user?.uid) return;

        let isMounted = true;

        const qSent = useSentFallback
            ? query(collection(db, "notices"), where("senderId", "==", user.uid))
            : query(collection(db, "notices"), where("senderId", "==", user.uid), orderBy("createdAt", "desc"));

        const unsubSent = onSnapshot(qSent, (snap) => {
            if (!isMounted) return;
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (useSentFallback) {
                list = list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setSentNotices(list);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes("index") && !useSentFallback) {
                console.warn("Sent notices index missing, enabling fallback.");
                setUseSentFallback(true);
            }
        });

        return () => {
            isMounted = false;
            unsubSent();
        };
    }, [user, useSentFallback]);

    // 2. Inbox/Received Notices Listener
    useEffect(() => {
        if (!user?.uid) return;

        let isMounted = true;

        const qInbox = useInboxFallback
            ? query(collection(db, "notices"), where("target", "in", ["ALL", "TEACHERS"]))
            : query(collection(db, "notices"), where("target", "in", ["ALL", "TEACHERS"]), orderBy("createdAt", "desc"));

        const unsubInbox = onSnapshot(qInbox, (snap) => {
            if (!isMounted) return;
            const now = Date.now();
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter((n: any) => {
                    if (n.senderId === user.uid) return false;
                    if (n.expiresAt && n.expiresAt.seconds * 1000 < now) return false;
                    return true;
                });

            if (useInboxFallback) {
                list = list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setReceivedNotices(list);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes("index") && !useInboxFallback) {
                console.warn("Inbox notices index missing, enabling fallback.");
                setUseInboxFallback(true);
            } else if (!err.message.includes("index")) {
                console.error("Inbox stream error:", err);
            }
        });

        return () => {
            isMounted = false;
            unsubInbox();
        };
    }, [user, useInboxFallback]);

    const fetchClasses = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/timetable/my-schedule", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const schedule = data.data.weeklySchedule || {};
                const cls = new Set<string>();
                Object.values(schedule).forEach((day: any) => {
                    Object.values(day).forEach((slot: any) => {
                        if (typeof slot === 'object') cls.add(slot.classId);
                    });
                });
                setClasses(Array.from(cls));
            }
        } catch (e) { }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/teacher/notices/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify({ targetClassId, title, content })
            });
            const data = await res.json();
            if (data.success) {
                alert("Notice Sent!");
                setTitle(""); setContent("");
            } else { alert(data.error); }
        } catch (e: any) { alert(e.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-display font-bold">Notices</h1>
                </div>
            </div>

            <Tabs defaultValue="inbox" className="w-full">
                <TabsList className="bg-black/20 border border-white/10">
                    <TabsTrigger value="inbox">Inbox</TabsTrigger>
                    <TabsTrigger value="compose">Compose</TabsTrigger>
                    <TabsTrigger value="sent">Sent History</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="mt-4">
                    <div className="space-y-4">
                        {receivedNotices.length === 0 ? (
                            <Card className="bg-black/20 border-white/10">
                                <CardContent className="py-10 text-center text-muted-foreground">No notices received.</CardContent>
                            </Card>
                        ) : receivedNotices.map(n => (
                            <Card key={n.id} className="bg-black/20 border-white/10 relative overflow-hidden group">
                                {n.type === "HOLIDAY" && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />}
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{n.title}</h3>
                                            {n.type === "HOLIDAY" && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold uppercase">Holiday</span>}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                        <span>From: {n.senderName}</span>
                                        <span>{n.senderRole}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="compose" className="mt-4">
                    <Card className="bg-black/20 border-white/10 max-w-xl">
                        <CardHeader>
                            <CardTitle>Send Notice</CardTitle>
                            <CardDescription>Notices expire automatically after 3 days.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSend} className="space-y-4">
                                <div className="space-y-2">
                                    <label>Target Class</label>
                                    <Select onValueChange={setTargetClassId} value={targetClassId}>
                                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input required placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
                                <Textarea required placeholder="Message..." value={content} onChange={e => setContent(e.target.value)} className="bg-white/5 border-white/10 min-h-[100px]" />
                                <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    {submitting ? <Loader2 className="animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Notice</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sent" className="mt-4">
                    <div className="space-y-3">
                        {sentNotices.map(n => (
                            <Card key={n.id} className="bg-white/5 border-white/10">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold">{n.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{n.content}</p>
                                            <div className="text-xs text-muted-foreground mt-2">
                                                To: Class {n.target?.id || n.targetClassId} • Expires: {n.expiresAt ? new Date(n.expiresAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
