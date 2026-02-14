"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trash2, ShieldAlert } from "lucide-react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";
import { DataTable } from "@/components/ui/data-table";

export default function AdminNoticesPage() {
    const { user } = useAuth();
    const [notices, setNotices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [useFallback, setUseFallback] = useState(false);

    // Form
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("REGULAR"); // REGULAR | HOLIDAY
    const [target, setTarget] = useState("ALL"); // ALL | TEACHERS | STUDENTS

    useEffect(() => {
        let isMounted = true;
        const q = useFallback
            ? query(collection(db, "notices"))
            : query(collection(db, "notices"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snap) => {
            if (!isMounted) return;
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (useFallback) {
                list = [...list].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }
            setNotices(list);
            setLoading(false);
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes("index") && !useFallback) {
                console.warn("Notices index missing, using fallback.");
                setUseFallback(true);
            } else if (!err.message.includes("index")) {
                console.error("Notice stream error:", err);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [useFallback]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/notices/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title, content, type, target })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to publish notice");

            toast({ title: "Notice Published", description: "Your notice is now live and audience notified.", type: "success" });

            setTitle("");
            setContent("");
            setType("REGULAR");
            setTarget("ALL");
        } catch (e: any) {
            toast({ title: "Failed", description: e.message || "Could not publish notice.", type: "error" });
        }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this notice?")) return;
        try {
            await deleteDoc(doc(db, "notices", id));
            toast({ title: "Deleted", description: "Notice removed.", type: "success" });
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete notice.", type: "error" });
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 max-w-none p-0 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-xl md:text-3xl font-display font-bold text-white">Notice Board</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Compose Column */}
                <Card className="bg-black/20 border-white/10 h-fit lg:col-span-1 shadow-xl backdrop-blur-sm">
                    <CardHeader className="py-3 px-4 md:py-6">
                        <CardTitle className="text-sm md:text-xl font-bold text-accent italic">Create Notice</CardTitle>
                        <CardDescription className="text-[10px] md:text-xs">Publish updates to the school.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
                        <form onSubmit={handleSend} className="space-y-3 md:space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] md:text-xs font-black uppercase tracking-tighter text-muted-foreground">Notice Type</label>
                                <Select onValueChange={setType} value={type}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-8 md:h-10 text-xs md:text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#0A192F] border-white/10">
                                        <SelectItem value="REGULAR">Regular Notice</SelectItem>
                                        <SelectItem value="HOLIDAY">Holiday Notice</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] md:text-xs font-black uppercase tracking-tighter text-muted-foreground">Target Audience</label>
                                <Select onValueChange={setTarget} value={target}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-8 md:h-10 text-xs md:text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#0A192F] border-white/10">
                                        <SelectItem value="ALL">Everyone</SelectItem>
                                        <SelectItem value="TEACHERS">Teachers Only</SelectItem>
                                        <SelectItem value="STUDENTS">Students Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Input required placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border-white/10 h-8 md:h-10 text-xs md:text-sm font-bold" />
                                <Textarea required placeholder="Notice content..." value={content} onChange={e => setContent(e.target.value)} className="bg-white/5 border-white/10 min-h-[80px] md:min-h-[120px] text-xs md:text-sm resize-none" />
                            </div>

                            <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 md:h-10 text-[10px] md:text-sm shadow-lg shadow-emerald-900/20">
                                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Publish Notice"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List Column */}
                <Card className="bg-black/20 border-white/10 lg:col-span-2 shadow-xl backdrop-blur-sm">
                    <CardHeader className="py-3 px-4 md:py-6">
                        <CardTitle className="text-sm md:text-xl font-bold text-accent italic">Notice History</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
                        <DataTable
                            data={notices}
                            isLoading={loading}
                            columns={[
                                {
                                    key: "title",
                                    header: "Notice Details",
                                    render: (n) => (
                                        <div className="flex flex-col gap-1 max-w-[300px]">
                                            <span className="font-bold text-sm text-white group-hover:text-accent transition-colors leading-tight">{n.title}</span>
                                            <p className="text-[10px] md:text-xs text-white/40 line-clamp-2 leading-relaxed">{n.content}</p>
                                        </div>
                                    )
                                },
                                {
                                    key: "type",
                                    header: "Type & Target",
                                    render: (n) => (
                                        <div className="flex flex-wrap gap-1">
                                            {n.type === "HOLIDAY" && <Badge className="text-[7px] md:text-[8px] bg-yellow-500/20 text-yellow-500 border-none px-1.5 py-0 h-4 uppercase font-black">Holiday</Badge>}
                                            <Badge variant="secondary" className="text-[7px] md:text-[8px] px-1.5 py-0 h-4 border-none bg-white/10 text-white/60 uppercase font-black">{n.target}</Badge>
                                        </div>
                                    )
                                },
                                {
                                    key: "meta",
                                    header: "Published",
                                    cellClassName: "hidden md:table-cell",
                                    headerClassName: "hidden md:table-cell",
                                    render: (n) => (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">{n.senderName}</span>
                                            <span className="text-[8px] text-muted-foreground/40 mt-1 uppercase font-mono">{n.createdAt ? new Date(n.createdAt?.seconds * 1000).toLocaleDateString() : "Just now"}</span>
                                        </div>
                                    )
                                }
                            ]}
                            actions={(n) => (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2 h-9 text-xs font-bold uppercase tracking-tighter text-red-400 hover:text-white hover:bg-red-500/20"
                                    onClick={() => handleDelete(n.id)}
                                >
                                    <Trash2 size={14} /> Delete Notice
                                </Button>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
