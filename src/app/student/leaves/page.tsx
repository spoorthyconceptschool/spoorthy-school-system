"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, History, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";

export default function StudentLeavesPage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [today, setToday] = useState("");
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        fromDate: "",
        toDate: "",
        type: "PERSONAL",
        reason: ""
    });

    useEffect(() => {
        if (!user?.email) return;

        const schoolIdFromEmail = user.email.split('@')[0].toUpperCase();

        // 1. Listen for Profile (Dual Strategy)
        const unsubDoc = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                setProfile(pSnap.data());
            } else if (user.uid) {
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const unsubQuery = onSnapshot(q, (qSnap) => {
                    if (!qSnap.empty) setProfile(qSnap.docs[0].data());
                });
                return () => unsubQuery();
            }
        }, (err) => {
            console.error("Profile sync error:", err);
        });

        // 2. Fetch history
        fetchLeaves();

        // Helpers...
        const getLocalTodayStr = (offsetDays = 0) => {
            const d = new Date();
            d.setDate(d.getDate() + offsetDays);
            return d.toISOString().split('T')[0];
        };

        const currentHour = new Date().getHours();
        const isPastMorningCutoff = currentHour >= 7;
        const minimumDate = getLocalTodayStr(isPastMorningCutoff ? 1 : 0);

        setToday(minimumDate);
        setForm(prev => ({ ...prev, fromDate: minimumDate, toDate: minimumDate }));

        return () => unsubDoc();
    }, [user]);

    const fetchLeaves = async () => {
        setLoading(true);
        setError("");
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/student/leaves", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLeaves(data.data);
            } else {
                setError(data.error || "Failed to load leave history");
            }
        } catch (e) {
            console.error(e);
            setError("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.reason) return alert("Please provide a reason");
        if (!profile) return alert("Profile loading, please wait...");

        setSubmitting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/student/leaves", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    studentName: profile.studentName || profile.name, // robust fallback
                    classId: profile.classId,
                    sectionId: profile.sectionId
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Leave application submitted successfully!");
                setForm({ ...form, reason: "" });
                fetchLeaves();
            } else {
                alert(data.error);
            }
        } catch (e: any) { alert(e.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold">Leave Management</h1>
                    <p className="text-muted-foreground">Apply for leave by selecting dates.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Apply Leave */}
                <Card className="md:col-span-1 bg-black/20 border-white/10 h-fit sticky top-24">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-400" /> Apply Leave
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label>From Date</Label>
                                    <DatePickerInput
                                        min={today}
                                        value={form.fromDate}
                                        onChange={(e: any) => setForm({ ...form, fromDate: e.target.value })}
                                        className="bg-black/40 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>To Date</Label>
                                    <DatePickerInput
                                        min={form.fromDate || today}
                                        value={form.toDate}
                                        onChange={(e: any) => setForm({ ...form, toDate: e.target.value })}
                                        className="bg-black/40 border-white/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Leave Type</Label>
                                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                    <SelectTrigger className="bg-black/40 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SICK">Sick Leave</SelectItem>
                                        <SelectItem value="PERSONAL">Personal</SelectItem>
                                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Reason</Label>
                                <Textarea
                                    placeholder="Brief explanation..."
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    className="bg-black/40 border-white/10 min-h-[100px]"
                                />
                            </div>

                            <Button disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : "Submit Request"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History */}
                <Card className="md:col-span-2 bg-black/20 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5 text-emerald-400" /> My Leave History
                        </CardTitle>
                        <CardDescription>View the status of your past and pending applications.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-[10px] text-muted-foreground uppercase font-medium">
                                        <tr>
                                            <th className="p-4">Dates</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">Reason</th>
                                            <th className="p-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {leaves.map((l: any) => (
                                            <tr key={l.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-xs font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                                        {l.fromDate === l.toDate
                                                            ? formatDateToDDMMYYYY(l.fromDate)
                                                            : `${formatDateToDDMMYYYY(l.fromDate)} - ${formatDateToDDMMYYYY(l.toDate)}`
                                                        }
                                                    </div>
                                                </td>
                                                <td className="p-4"><Badge variant="outline" className="text-[10px]">{l.type}</Badge></td>
                                                <td className="p-4 text-xs text-muted-foreground" title={l.reason}>
                                                    <p className="line-clamp-2 max-w-[200px]">{l.reason}</p>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {l.status === "PENDING" && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/10">Pending</Badge>}
                                                    {l.status === "APPROVED" && <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/10">Approved</Badge>}
                                                    {l.status === "REJECTED" && <Badge className="bg-red-500/20 text-red-500 border-red-500/10">Rejected</Badge>}
                                                </td>
                                            </tr>
                                        ))}
                                        {error ? (
                                            <tr><td colSpan={4} className="p-12 text-center text-red-400 italic text-sm">{error}</td></tr>
                                        ) : leaves.length === 0 ? (
                                            <tr><td colSpan={4} className="p-12 text-center text-muted-foreground italic text-sm">No leave history found.</td></tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
