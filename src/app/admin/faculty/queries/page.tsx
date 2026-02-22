"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { collection, query, onSnapshot, orderBy, Timestamp, doc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, MessageSquare, Clock, CheckCircle2, User, Reply, Search, Filter } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function AdminStaffQueriesPage() {
    const { user } = useAuth();
    const [queries, setQueries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL"); // ALL, PENDING, RESOLVED

    // Reply Modal state
    const [selectedQuery, setSelectedQuery] = useState<any>(null);
    const [replyText, setReplyText] = useState("");
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "staff_queries"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            setQueries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const handleReply = async () => {
        if (!replyText || !selectedQuery) return;
        setReplying(true);
        try {
            await updateDoc(doc(db, "staff_queries", selectedQuery.id), {
                reply: replyText,
                repliedAt: Timestamp.now(),
                status: "RESOLVED",
                repliedBy: user?.displayName || "Admin"
            });

            toast({
                title: "Reply Sent",
                description: `Successfully responded to ${selectedQuery.senderName}'s query.`,
                type: "success"
            });
            setSelectedQuery(null);
            setReplyText("");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to send reply",
                type: "error"
            });
        } finally {
            setReplying(false);
        }
    };

    const filteredQueries = queries.filter(q => {
        const matchesSearch =
            q.senderName?.toLowerCase().includes(search.toLowerCase()) ||
            q.senderSchoolId?.toLowerCase().includes(search.toLowerCase()) ||
            q.subject?.toLowerCase().includes(search.toLowerCase());

        const matchesFilter = filter === "ALL" || q.status === filter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight uppercase">
                        Staff Queries
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-sm tracking-[0.2em] font-black uppercase opacity-50">
                        Managing <span className="text-white">{queries.filter(q => q.status === "PENDING").length} pending queries</span> from faculty and staff
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col md:flex-row gap-4 shadow-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, ID or subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-accent/30"
                    />
                </div>
                <div className="flex gap-2">
                    {["ALL", "PENDING", "RESOLVED"].map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? "default" : "outline"}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "h-12 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                                filter === f ? "bg-accent text-black" : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                            )}
                        >
                            {f}
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-accent" />
                </div>
            ) : filteredQueries.length === 0 ? (
                <Card className="bg-black/20 border-dashed border-white/10 p-20 text-center">
                    <CardContent>
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">No matching queries found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredQueries.map((q) => (
                        <Card key={q.id} className="bg-black/40 border-white/10 hover:border-accent/30 transition-all group overflow-hidden relative">
                            {q.status === 'PENDING' && (
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                            )}
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="md:w-64 space-y-3 shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                                                <User className="w-5 h-5 text-accent" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-white truncate text-sm">{q.senderName}</span>
                                                <span className="text-[10px] font-mono text-accent/50 uppercase tracking-tighter">{q.senderSchoolId}</span>
                                            </div>
                                        </div>
                                        <Badge className={cn(
                                            "text-[9px] font-black uppercase tracking-tighter h-5 border-none w-full justify-center",
                                            q.status === 'PENDING' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-400"
                                        )}>
                                            {q.status === 'PENDING' ? <Clock className="w-2.5 h-2.5 mr-1" /> : <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
                                            {q.status}
                                        </Badge>
                                        <div className="text-[10px] font-mono text-muted-foreground opacity-50 flex items-center gap-1">
                                            <Clock size={10} /> {q.createdAt?.toDate().toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-bold text-white group-hover:text-accent transition-colors leading-tight">
                                                {q.subject}
                                            </h4>
                                            <p className="text-muted-foreground text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 italic">
                                                "{q.message}"
                                            </p>
                                        </div>

                                        {q.reply ? (
                                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Reply className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Management Response</span>
                                                </div>
                                                <p className="text-sm text-white/80 leading-relaxed font-medium">
                                                    {q.reply}
                                                </p>
                                                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-2 border-t border-white/5">
                                                    <span>Replied by: {q.repliedBy || "Admin"}</span>
                                                    <span>{q.repliedAt?.toDate().toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => setSelectedQuery(q)}
                                                className="bg-accent hover:bg-accent/80 text-black font-black uppercase tracking-tighter rounded-xl px-6 h-10 shadow-lg shadow-accent/10"
                                            >
                                                <Reply className="w-4 h-4 mr-2 stroke-[3]" /> Send Response
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reply Dialog */}
            <Dialog open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[600px] p-0 overflow-hidden rounded-3xl backdrop-blur-3xl shadow-2xl">
                    <div className="p-6 space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-display font-bold italic tracking-tight">Respond to Query</DialogTitle>
                        </DialogHeader>

                        {selectedQuery && (
                            <div className="space-y-6">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-accent tracking-widest">Query from {selectedQuery.senderName}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">{selectedQuery.senderSchoolId}</span>
                                    </div>
                                    <p className="text-sm text-white italic">"{selectedQuery.message}"</p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">Your Response</Label>
                                    <Textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your response here..."
                                        className="bg-white/5 border-white/10 rounded-2xl focus:ring-accent/30 min-h-[150px] p-4 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-2 border-t border-white/5">
                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="ghost"
                                    onClick={() => setSelectedQuery(null)}
                                    className="flex-1 rounded-2xl h-12 uppercase font-black tracking-widest text-[10px] hover:bg-white/5 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleReply}
                                    disabled={replying || !replyText}
                                    className="flex-1 bg-accent hover:bg-accent/80 text-black rounded-2xl h-12 uppercase font-black tracking-widest text-[12px] shadow-lg shadow-accent/20"
                                >
                                    {replying ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : "Send Response"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
