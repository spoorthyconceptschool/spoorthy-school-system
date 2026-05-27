"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
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
    const { user, userData } = useAuth();
    const { classSections } = useMasterData();
    const DEFAULT_PROFILE = {
        name: "Prof. S. Praneeth",
        schoolId: "TCH-2026-042",
        teacherId: "TCH-2026-042",
        status: "ACTIVE",
        schoolName: "Spoorthy Concept School"
    };

    const DEFAULT_SENT = [
        { id: "n_sent_1", title: "Science Project Reminder", content: "Please ensure all student models are submitted by this Friday.", target: "class_10", createdAt: { seconds: Date.now()/1000 } }
    ];

    const DEFAULT_RECEIVED = [
        { id: "n_rec_1", title: "Annual Sports Meet Notice", content: "The annual sports day will commence from next Monday. All faculty members are requested to report in sports gear.", senderName: "Principal", createdAt: { seconds: Date.now()/1000 - 43200 } }
    ];

    const DEFAULT_CLASSES = ["1_A", "2_A", "3_A"];

    const [teacherProfile, setTeacherProfile] = useState<any>(() => {
        if (typeof window === 'undefined') return DEFAULT_PROFILE;
        const cached = localStorage.getItem("teacher_profile_cache");
        return cached ? JSON.parse(cached) : DEFAULT_PROFILE;
    });
    const [sentNotices, setSentNotices] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_SENT;
        const cached = localStorage.getItem("teacher_notices_sent_cache");
        return cached ? JSON.parse(cached) : DEFAULT_SENT;
    });
    const [receivedNotices, setReceivedNotices] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_RECEIVED;
        const cached = localStorage.getItem("teacher_notices_received_cache");
        return cached ? JSON.parse(cached) : DEFAULT_RECEIVED;
    });
    const [classes, setClasses] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_CLASSES.map(c => ({ id: c, name: c }));
        const cached = localStorage.getItem("teacher_notices_classes_cache");
        return cached ? JSON.parse(cached) : DEFAULT_CLASSES.map(c => ({ id: c, name: c }));
    });
    const [submitting, setSubmitting] = useState(false);
    const [useSentFallback, setUseSentFallback] = useState(false);
    const [useInboxFallback, setUseInboxFallback] = useState(false);

    // Form
    const [targetClassId, setTargetClassId] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    // 0. Fetch Teacher Profile
    useEffect(() => {
        if (!user?.uid) return;
        const fetchTeacher = async () => {
            try {
                let q = query(collection(db, "teachers"), where("schoolId", "==", userData?.schoolId || ""), limit(1));
                let snap = await getDocs(q);

                if (snap.empty && user?.uid) {
                    q = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
                    snap = await getDocs(q);
                }

                if (!snap.empty) {
                    const tData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                    setTeacherProfile(tData);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem("teacher_profile_cache", JSON.stringify(tData));
                    }
                }
            } catch (e: any) {
                console.warn("[Notices] Teacher fetch error:", e.message);
            }
        };
        fetchTeacher();
    }, [user, userData]);

    // 0. Fetch Classes (Once or on User/Profile/classSections change)
    useEffect(() => {
        if (user?.uid) fetchClasses();
    }, [user, teacherProfile, classSections]);

    // 1. Sent History Listener
    useEffect(() => {
        if (!user?.uid) return;

        let isMounted = true;

        const qSent = useSentFallback
            ? query(
                collection(db, "notices"), 
                where("senderId", "==", user.uid),
                where("schoolId", "==", userData?.schoolId || "global")
            )
            : query(
                collection(db, "notices"), 
                where("senderId", "==", user.uid), 
                where("schoolId", "==", userData?.schoolId || "global"),
                orderBy("createdAt", "desc")
            );

        const unsubSent = onSnapshot(qSent, (snap) => {
            if (!isMounted) return;
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (useSentFallback) {
                list = list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setSentNotices(list);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_notices_sent_cache", JSON.stringify(list));
            }
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
    }, [user, useSentFallback, userData]);

    // 2. Inbox/Received Notices Listener
    useEffect(() => {
        if (!user?.uid) return;

        let isMounted = true;

        const qInbox = useInboxFallback
            ? query(
                collection(db, "notices"), 
                where("target", "in", ["ALL", "TEACHERS"]),
                where("schoolId", "in", [userData?.schoolId || "global", "global"])
            )
            : query(
                collection(db, "notices"), 
                where("target", "in", ["ALL", "TEACHERS"]), 
                where("schoolId", "in", [userData?.schoolId || "global", "global"]),
                orderBy("createdAt", "desc")
            );

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
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_notices_received_cache", JSON.stringify(list));
            }
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes("index") && !useInboxFallback) {
                console.warn("Inbox notices index missing, enabling fallback.");
                setUseInboxFallback(true);
            } else if (!err.message.includes("index")) {
                console.warn("[Notices] Inbox stream warning:", err.message);
            }
        });

        return () => {
            isMounted = false;
            unsubInbox();
        };
    }, [user, useInboxFallback, userData]);

    const fetchClasses = async () => {
        try {
            const clsSet = new Map<string, string>(); // Mapping id -> displayName

            // 1. Only Class Teacher assignments from Master Data
            if (teacherProfile && classSections) {
                const tId = teacherProfile.schoolId;
                const tDocId = teacherProfile.id;
                Object.values(classSections).forEach((cs: any) => {
                    const isMatch = (tId && cs.classTeacherId === tId) || (tDocId && cs.classTeacherId === tDocId);
                    if (isMatch && cs.isActive !== false) {
                        const cName = cs.className || cs.classId || cs.id;
                        const sName = cs.sectionName || cs.sectionId || "";
                        const displayName = `${cName} ${sName}`.replace(/^(Class |Grade )/i, '').trim();
                        clsSet.set(cs.id, displayName);
                    }
                });
            }

            const classList = Array.from(clsSet.entries()).map(([id, name]) => ({ id, name }));
            setClasses(classList);
            if (typeof window !== 'undefined') {
                localStorage.setItem("teacher_notices_classes_cache", JSON.stringify(classList));
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
        <div className="w-full text-[#E6F1FF] pb-20 animate-in fade-in duration-300">
            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT (High-density, space-optimized notice inbox & compose)    */}
            {/* ========================================================================= */}
            <div className="lg:hidden block p-3 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                        <Link href="/teacher" className="group flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-emerald-400">
                            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" /> Back
                        </Link>
                        <h1 className="text-xl font-display font-bold italic mt-0.5">Notices & Alerts</h1>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Bell className="w-4 h-4 animate-swing" />
                    </div>
                </div>

                {/* Mobile Tabs Wrapper */}
                <Tabs defaultValue="inbox" className="w-full">
                    <TabsList className="grid grid-cols-3 gap-1 bg-black/20 p-1 rounded-xl border border-white/10 w-full h-fit">
                        <TabsTrigger value="inbox" className="py-1 text-[9px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                            Inbox
                        </TabsTrigger>
                        <TabsTrigger value="compose" className="py-1 text-[9px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                            Compose
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="py-1 text-[9px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                            Sent
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox" className="mt-3 space-y-2">
                        {receivedNotices.length === 0 ? (
                            <div className="text-center py-12 text-[11px] text-white/40 italic bg-black/10 rounded-2xl border border-white/5">
                                No notices received.
                            </div>
                        ) : (
                            receivedNotices.map(n => (
                                <Card key={n.id} className="bg-black/25 border-white/5 overflow-hidden rounded-xl relative">
                                    {n.type === "HOLIDAY" && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                                    <CardContent className="p-3 space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="space-y-0.5">
                                                <h3 className="font-bold text-xs text-white leading-tight">{n.title}</h3>
                                                {n.type === "HOLIDAY" && <span className="text-[8px] bg-amber-500/25 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Holiday</span>}
                                            </div>
                                            <span className="text-[9px] text-white/40 shrink-0">
                                                {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Just now"}
                                            </span>
                                        </div>
                                        <p className="text-[10px] leading-normal text-white/70 whitespace-pre-wrap">{n.content}</p>
                                        <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[8px] text-white/30 font-black uppercase tracking-wider">
                                            <span>From: {n.senderName}</span>
                                            <span>{n.senderRole || "Admin"}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="compose" className="mt-3">
                        <Card className="bg-black/20 border-white/10 rounded-xl p-3.5 space-y-3.5">
                            <div>
                                <div className="text-xs font-bold text-white">Compose Notice</div>
                                <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Broadcasting message to target classes</p>
                            </div>
                            <form onSubmit={handleSend} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-wider text-white/40 ml-0.5">Target Class</label>
                                    <Select onValueChange={setTargetClassId} value={targetClassId}>
                                        <SelectTrigger className="h-9 bg-black/40 border-white/10 text-xs rounded-lg">
                                            <SelectValue placeholder="Select Target Class" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>Class {c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input required placeholder="Notice Title" value={title} onChange={e => setTitle(e.target.value)} className="h-9 bg-black/40 border-white/10 text-xs rounded-lg" />
                                <Textarea required placeholder="Write your message here..." value={content} onChange={e => setContent(e.target.value)} className="bg-black/40 border-white/10 text-xs rounded-lg min-h-[80px]" />
                                <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-9 rounded-lg text-[10px] uppercase tracking-wider">
                                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Send Broadcast</>}
                                </Button>
                            </form>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sent" className="mt-3 space-y-2">
                        {sentNotices.length === 0 ? (
                            <div className="text-center py-12 text-[11px] text-white/40 italic bg-black/10 rounded-2xl border border-white/5">
                                No notices sent.
                            </div>
                        ) : (
                            sentNotices.map(n => (
                                <Card key={n.id} className="bg-black/25 border-white/5 rounded-xl">
                                    <CardContent className="p-3 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-xs text-white leading-tight">{n.title}</h4>
                                            <span className="text-[8px] bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded font-black uppercase">Sent</span>
                                        </div>
                                        <p className="text-[10px] text-white/70 leading-normal">{n.content}</p>
                                        <div className="pt-2 border-t border-white/5 text-[8px] text-white/30 font-black uppercase tracking-wider flex justify-between">
                                            <span>To: Class {n.target || n.targetClassId}</span>
                                            <span>Expires: {n.expiresAt ? new Date(n.expiresAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEWPORT (Wide grid workspace notice dashboard layout)             */}
            {/* ========================================================================= */}
            <div className="hidden lg:block max-w-[1600px] mx-auto p-12 space-y-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="space-y-1">
                        <Link href="/teacher" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors mb-2 font-bold uppercase tracking-wider">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                        <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">School Notices</h1>
                    </div>
                </div>

                <Tabs defaultValue="inbox" className="w-full space-y-6">
                    <TabsList className="bg-black/20 border border-white/10 p-1.5 rounded-2xl h-fit">
                        <TabsTrigger value="inbox" className="px-6 py-2 rounded-xl text-xs uppercase font-black tracking-widest data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all">Inbox Messages</TabsTrigger>
                        <TabsTrigger value="compose" className="px-6 py-2 rounded-xl text-xs uppercase font-black tracking-widest data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all">Compose Bulletin</TabsTrigger>
                        <TabsTrigger value="sent" className="px-6 py-2 rounded-xl text-xs uppercase font-black tracking-widest data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all">Outbox Archive</TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {receivedNotices.length === 0 ? (
                                <Card className="bg-black/20 border-white/10 col-span-2 rounded-[2rem] border-dashed">
                                    <CardContent className="py-20 text-center text-muted-foreground font-medium">No active notices received.</CardContent>
                                </Card>
                            ) : receivedNotices.map(n => (
                                <Card key={n.id} className="bg-black/20 border border-white/10 relative overflow-hidden group rounded-[2rem] shadow-xl hover:bg-white/5 transition-all">
                                    {n.type === "HOLIDAY" && <div className="absolute top-0 left-0 w-2 h-full bg-yellow-500" />}
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-xl text-white group-hover:text-emerald-400 transition-colors leading-tight">{n.title}</h3>
                                                {n.type === "HOLIDAY" && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full font-black uppercase tracking-wider">Holiday Notification</span>}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">{n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap">{n.content}</p>
                                        <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                            <span>Sender: {n.senderName}</span>
                                            <span>Authority: {n.senderRole || "Admin"}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="compose" className="mt-4">
                        <Card className="bg-black/20 border border-white/10 max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden">
                            <CardHeader className="bg-white/5 p-8 border-b border-white/10">
                                <CardTitle className="text-2xl font-display italic text-white flex items-center gap-3">
                                    <Send className="w-6 h-6 text-emerald-400" /> Dispatch Notice
                                </CardTitle>
                                <CardDescription className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-1">Broadcast important announcements to your classrooms</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form onSubmit={handleSend} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Target Class</label>
                                        <Select onValueChange={setTargetClassId} value={targetClassId}>
                                            <SelectTrigger className="h-12 bg-white/5 border border-white/10 rounded-xl font-bold"><SelectValue placeholder="Select target classroom" /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                {classes.map(c => <SelectItem key={c.id} value={c.id} className="focus:bg-accent focus:text-black py-3">Class {c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Input required placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="h-12 bg-white/5 border border-white/10 rounded-xl" />
                                    <Textarea required placeholder="Enter announcement content here..." value={content} onChange={e => setContent(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl min-h-[140px]" />
                                    <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-12 rounded-xl transition-all shadow-xl shadow-emerald-500/10 uppercase tracking-widest text-xs">
                                        {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-4 h-4 mr-2" /> Broadcast Notice</>}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sent" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {sentNotices.length === 0 ? (
                                <Card className="bg-black/20 border-white/10 col-span-2 rounded-[2rem] border-dashed">
                                    <CardContent className="py-20 text-center text-muted-foreground font-medium">No notices sent in history.</CardContent>
                                </Card>
                            ) : sentNotices.map(n => (
                                <Card key={n.id} className="bg-black/20 border border-white/10 rounded-[2rem] hover:bg-white/5 transition-all">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-lg text-white">{n.title}</h4>
                                            <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded font-black uppercase">Outbox</span>
                                        </div>
                                        <p className="text-sm text-white/70 leading-relaxed">{n.content}</p>
                                        <div className="pt-4 border-t border-white/5 text-xs text-muted-foreground font-black uppercase tracking-wider flex justify-between">
                                            <span>Recipient: Class {n.target || n.targetClassId}</span>
                                            <span>Expires: {n.expiresAt ? new Date(n.expiresAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
