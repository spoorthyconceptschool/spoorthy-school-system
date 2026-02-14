"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Loader2, Users, User as UserIcon, History, Send, Check, X, ArrowLeft } from "lucide-react";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";

export default function LeaveManagementPage() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]); // Teacher's own leaves
    const [studentLeaves, setStudentLeaves] = useState<any[]>([]); // Student leaves
    const [loading, setLoading] = useState(true);
    const [studentLoading, setStudentLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);

    // Form
    const [form, setForm] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        type: "Personal",
        reason: ""
    });

    useEffect(() => {
        if (user) {
            fetchTeacherProfile();
            fetchLeaves();
            fetchStudentLeaves();
        }
    }, [user]);

    const fetchTeacherProfile = async () => {
        if (!user?.uid) return;
        const q = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) setTeacherProfile(snap.docs[0].data());
    };

    const fetchLeaves = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "leave_requests"),
                where("teacherId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(20)
            );
            const snap = await getDocs(q);
            setLeaves(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        } catch (e: any) {
            if (!e?.message?.includes('index')) console.error(e);
        } finally { setLoading(false); }
    };

    const fetchStudentLeaves = async () => {
        setStudentLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/teacher/student-leaves", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setStudentLeaves(data.data);
        } catch (e) { console.error(e); }
        finally { setStudentLoading(false); }
    };

    const handleAction = async (leaveId: string, action: "APPROVED" | "REJECTED") => {
        setActioning(leaveId);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/teacher/student-leaves", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ leaveId, action })
            });
            const data = await res.json();
            if (data.success) fetchStudentLeaves();
            else alert(data.error);
        } catch (e: any) { alert(e.message); }
        finally { setActioning(null); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/teacher/leaves/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                alert("Leave Requested Successfully");
                setForm({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], type: "Personal", reason: "" });
                fetchLeaves();
            } else alert(data.error);
        } catch (e: any) { alert(e.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-display font-bold">Leave Management</h1>
                    <p className="text-muted-foreground">Manage your absences and track your class students.</p>
                </div>
            </div>

            <Tabs defaultValue="my-leaves" className="space-y-6">
                <TabsList className="bg-white/5 border-white/10 p-1">
                    <TabsTrigger value="my-leaves" className="gap-2">
                        <UserIcon className="w-4 h-4" /> My Leaves
                    </TabsTrigger>
                    <TabsTrigger value="student-leaves" className="gap-2">
                        <Users className="w-4 h-4" /> Student Leaves
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="my-leaves" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Request Form */}
                        <Card className="bg-black/20 border-white/10 md:col-span-1 h-fit">
                            <CardHeader><CardTitle className="text-lg flex items-center gap-2">
                                <Send className="w-4 h-4 text-blue-400" /> Request Leave
                            </CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>From Date</Label>
                                            <Input type="date" required className="bg-white/5 text-sm" value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>To Date</Label>
                                            <Input type="date" className="bg-white/5 text-sm" value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                            <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Personal">Personal</SelectItem>
                                                <SelectItem value="Sick">Sick</SelectItem>
                                                <SelectItem value="Casual">Casual</SelectItem>
                                                <SelectItem value="Emergency">Emergency</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason</Label>
                                        <Textarea required className="bg-white/5" placeholder="Detailed reason..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                                    </div>
                                    <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                        {submitting ? <Loader2 className="animate-spin" /> : "Submit Request"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* My History */}
                        <Card className="bg-black/20 border-white/10 md:col-span-2">
                            <CardHeader><CardTitle className="text-lg flex items-center gap-2">
                                <History className="w-4 h-4 text-emerald-400" /> My Leave History
                            </CardTitle></CardHeader>
                            <CardContent className="p-0">
                                {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div> : (
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
                                                {leaves.map((leave: any) => (
                                                    <tr key={leave.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-xs font-medium">
                                                            {leave.fromDate === leave.toDate ? formatDateToDDMMYYYY(leave.fromDate) : `${formatDateToDDMMYYYY(leave.fromDate)} to ${formatDateToDDMMYYYY(leave.toDate)}`}
                                                        </td>
                                                        <td className="p-4"><Badge variant="outline" className="text-[10px]">{leave.type}</Badge></td>
                                                        <td className="p-4 text-xs text-muted-foreground max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                                                        <td className="p-4 text-right">
                                                            {leave.status === "PENDING" && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/10">Pending</Badge>}
                                                            {leave.status === "APPROVED" && <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/10">Approved</Badge>}
                                                            {leave.status === "REJECTED" && <Badge className="bg-red-500/20 text-red-500 border-red-500/10">Rejected</Badge>}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {leaves.length === 0 && (
                                                    <tr><td colSpan={4} className="p-10 text-center text-muted-foreground italic">No leave history.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="student-leaves">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-400" /> Class Student Absences
                            </CardTitle>
                            <CardDescription>
                                {teacherProfile?.classInCharge
                                    ? `Showing leaves for Class ${teacherProfile.classInCharge}${teacherProfile.sectionInCharge || ""}`
                                    : "You are not assigned as a Class In-charge."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {studentLoading ? (
                                <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 text-[10px] text-muted-foreground uppercase font-medium">
                                            <tr>
                                                <th className="p-4">Student</th>
                                                <th className="p-4">Dates</th>
                                                <th className="p-4">Reason</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {studentLeaves.map((l: any) => (
                                                <tr key={l.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-xs">{l.studentName}</div>
                                                        <div className="text-[10px] text-muted-foreground">{l.studentId}</div>
                                                    </td>
                                                    <td className="p-4 text-xs">
                                                        <div>{l.fromDate === l.toDate ? formatDateToDDMMYYYY(l.fromDate) : `${formatDateToDDMMYYYY(l.fromDate)} to ${formatDateToDDMMYYYY(l.toDate)}`}</div>
                                                    </td>
                                                    <td className="p-4 text-xs text-muted-foreground max-w-sm">
                                                        <Badge variant="outline" className="mr-2 mb-1 text-[9px]">{l.type}</Badge>
                                                        <p className="line-clamp-1" title={l.reason}>{l.reason}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        {l.status === "PENDING" && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/10">Pending</Badge>}
                                                        {l.status === "APPROVED" && <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/10">Approved</Badge>}
                                                        {l.status === "REJECTED" && <Badge className="bg-red-500/20 text-red-500 border-red-500/10">Rejected</Badge>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {l.status === "PENDING" && (
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 hover:bg-emerald-500/20 hover:text-emerald-500"
                                                                    onClick={() => handleAction(l.id, "APPROVED")}
                                                                    disabled={actioning === l.id}
                                                                >
                                                                    {actioning === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-500"
                                                                    onClick={() => handleAction(l.id, "REJECTED")}
                                                                    disabled={actioning === l.id}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {studentLeaves.length === 0 && (
                                                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground italic text-xs">No student leave requests found for your class.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
