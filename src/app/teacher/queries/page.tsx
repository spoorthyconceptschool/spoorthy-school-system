"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Send, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/lib/toast-store";

export default function TeacherQueriesPage() {
    const { user } = useAuth();
    const [queries, setQueries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ subject: "", message: "" });
    const [teacherProfile, setTeacherProfile] = useState<any>(null);

    useEffect(() => {
        if (!user) return;

        // Fetch teacher profile to get the correct name/ID
        const fetchProfile = async () => {
            const q = query(collection(db, "teachers"), where("uid", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setTeacherProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
            }
        };
        fetchProfile();

        const q = query(
            collection(db, "staff_queries"),
            where("senderId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            setQueries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.subject || !form.message || !user) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, "staff_queries"), {
                senderId: user.uid,
                senderName: teacherProfile?.name || user.displayName || "Teacher",
                senderSchoolId: teacherProfile?.schoolId || "Unknown",
                subject: form.subject,
                message: form.message,
                status: "PENDING",
                createdAt: Timestamp.now(),
                type: "TEACHER"
            });

            toast({
                title: "Query Sent",
                description: "Your query has been submitted to management.",
                type: "success"
            });
            setForm({ subject: "", message: "" });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to send query",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">
                    Help & Queries
                </h1>
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-black opacity-50">
                    Submit your queries directly to the management
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Submit Form */}
                <Card className="lg:col-span-1 bg-black/40 border-white/10 backdrop-blur-xl h-fit sticky top-24">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-display">
                            <Send className="w-5 h-5 text-accent" /> New Query
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g. Salary Query, Resource Request"
                                    value={form.subject}
                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:ring-accent/30"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Describe your query in detail..."
                                    value={form.message}
                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:ring-accent/30 min-h-[150px]"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-accent hover:bg-accent/80 text-black font-black uppercase tracking-tighter"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Query"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Query History */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 px-1">
                        <Clock className="w-5 h-5 text-muted-foreground" /> Recent Queries
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : queries.length === 0 ? (
                        <Card className="bg-black/20 border-dashed border-white/10">
                            <CardContent className="py-12 text-center text-muted-foreground italic">
                                No queries found. Submit one on the left.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {queries.map((q) => (
                                <Card key={q.id} className="bg-black/40 border-white/10 hover:border-accent/30 transition-all group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-accent/20 group-hover:bg-accent transition-colors" />
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn(
                                                        "text-[10px] font-black uppercase tracking-tighter h-5",
                                                        q.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                    )} variant="outline">
                                                        {q.status === 'PENDING' ? <Clock className="w-2.5 h-2.5 mr-1" /> : <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
                                                        {q.status}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {q.createdAt?.toDate().toLocaleString()}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-bold text-white group-hover:text-accent transition-colors">
                                                    {q.subject}
                                                </h4>
                                                <p className="text-muted-foreground text-sm leading-relaxed">
                                                    {q.message}
                                                </p>
                                            </div>
                                        </div>

                                        {q.reply && (
                                            <div className="mt-4 pt-4 border-t border-white/5 bg-white/5 -mx-6 px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                                                        <MessageSquare className="w-4 h-4 text-accent" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black uppercase text-accent tracking-widest">Management Response</span>
                                                        <p className="text-sm text-white/80 italic leading-relaxed">
                                                            "{q.reply}"
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground font-mono block">
                                                            {q.repliedAt?.toDate().toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
