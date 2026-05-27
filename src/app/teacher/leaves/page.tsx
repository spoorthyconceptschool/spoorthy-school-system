"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc, onSnapshot } from "firebase/firestore";
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
import { Loader2, Users, User as UserIcon, History, Send, Check, X, ArrowLeft, Calendar } from "lucide-react";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { useMasterData } from "@/context/MasterDataContext";

/**
 * LeaveManagementPage Component
 * 
 * Provides a dual-purpose interface for teachers:
 * 1. Request personal leaves and track their own absence history.
 * 2. Review and take action on leave requests from students in their 
 *    assigned classes, resolved dynamically from the master registry.
 * 
 * @returns {JSX.Element} The rendered leave management interface.
 */
export default function LeaveManagementPage() {
    const { user } = useAuth();
    const DEFAULT_PROFILE = {
        name: "Prof. S. Praneeth",
        schoolId: "TCH-2026-042",
        teacherId: "TCH-2026-042",
        status: "ACTIVE",
        schoolName: "Spoorthy Concept School"
    };

    const DEFAULT_LEAVES = [
        { id: "l_1", type: "Personal", fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], reason: "Medical Checkup", status: "APPROVED", createdAt: { seconds: Date.now()/1000 } }
    ];

    const DEFAULT_STUDENT_LEAVES = [
        { id: "sl_1", studentName: "Vihaan Patel", type: "Sick Leave", fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], reason: "Fever", status: "PENDING", classId: "Class A", className: "Class A", sectionName: "Section A", createdAt: { seconds: Date.now()/1000 } }
    ];
    
    const { classSections } = useMasterData();
    const [leaves, setLeaves] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_LEAVES;
        const cached = localStorage.getItem("teacher_personal_leaves_cache");
        return cached ? JSON.parse(cached) : DEFAULT_LEAVES;
    });
    const [studentLeaves, setStudentLeaves] = useState<any[]>(() => {
        if (typeof window === 'undefined') return DEFAULT_STUDENT_LEAVES;
        const cached = localStorage.getItem("teacher_student_leaves_approval_cache");
        return cached ? JSON.parse(cached) : DEFAULT_STUDENT_LEAVES;
    });
    const [loading, setLoading] = useState(false);
    const [studentLoading, setStudentLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);
    const [teacherProfile, setTeacherProfile] = useState<any>(() => {
        if (typeof window === 'undefined') return DEFAULT_PROFILE;
        const cached = localStorage.getItem("teacher_profile_cache");
        return cached ? JSON.parse(cached) : DEFAULT_PROFILE;
    });

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
        if (!snap.empty) {
            const tData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setTeacherProfile(tData);
            if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(tData));
        }
    };

    const fetchHistory = async () => {
        if (!user) return;
        const hasCache = typeof window !== 'undefined' && localStorage.getItem("teacher_personal_leaves_cache");
        if (!hasCache) {
            setLoading(true);
        }
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/teacher/leaves/history", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLeaves(data.data);
                if (typeof window !== 'undefined') {
                    localStorage.setItem("teacher_personal_leaves_cache", JSON.stringify(data.data));
                }
            } else {
                console.warn("[Leaves] API Error:", data.error);
            }
        } catch (e: any) {
            console.warn("[Leaves] Fetch Error:", e.message);
        } finally {
            setLoading(false);
        }
    };


    const fetchLeaves = () => {
        fetchHistory();
    };

    const fetchStudentLeaves = async () => {
        const hasCache = typeof window !== 'undefined' && localStorage.getItem("teacher_student_leaves_approval_cache");
        if (!hasCache) {
            setStudentLoading(true);
        }
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/teacher/student-leaves", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setStudentLeaves(data.data);
                if (typeof window !== 'undefined') {
                    localStorage.setItem("teacher_student_leaves_approval_cache", JSON.stringify(data.data));
                }
            }
        } catch (e: any) { console.warn("[Leaves] Student leaves fetch error:", e.message); }
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
        <div className="w-full text-[#E6F1FF] pb-20 animate-in fade-in duration-300">
            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT (High-density, space-optimized leaves request & approvals) */}
            {/* ========================================================================= */}
            <div className="lg:hidden block p-3 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                        <Link href="/teacher" className="group flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-emerald-400">
                            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" /> Back
                        </Link>
                        <h1 className="text-xl font-display font-bold italic mt-0.5">Leaves & Absences</h1>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400/80">Manager</span>
                    </div>
                </div>

                {/* Mobile Tabs Switcher */}
                <Tabs defaultValue="my-leaves" className="space-y-4">
                    <TabsList className="grid grid-cols-2 gap-1 bg-black/20 p-1 rounded-xl border border-white/10 w-full h-fit">
                        <TabsTrigger value="my-leaves" className="py-1 text-[9px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-black gap-1.5">
                            <UserIcon className="w-3 h-3" /> My Leaves
                        </TabsTrigger>
                        <TabsTrigger value="student-leaves" className="py-1 text-[9px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-black gap-1.5">
                            <Users className="w-3 h-3" /> Students
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="my-leaves" className="space-y-4">
                        {/* Mobile Leave Request Form */}
                        <Card className="bg-black/20 border-white/10 rounded-2xl p-3.5 space-y-3.5">
                            <div className="border-b border-white/5 pb-2">
                                <div className="text-xs font-black uppercase tracking-wider text-white">Apply Personal Leave</div>
                                <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest mt-0.5">Absence request workflow</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-wider text-white/40 ml-0.5">From Date</label>
                                        <Input type="date" required className="h-9 bg-black/40 border-white/10 text-xs text-white rounded-lg" value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-wider text-white/40 ml-0.5">To Date</label>
                                        <Input type="date" className="h-9 bg-black/40 border-white/10 text-xs text-white rounded-lg" value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-wider text-white/40 ml-0.5">Leave Type</label>
                                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                        <SelectTrigger className="h-9 bg-black/40 border-white/10 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                                            <SelectItem value="Personal">Personal</SelectItem>
                                            <SelectItem value="Sick">Sick</SelectItem>
                                            <SelectItem value="Casual">Casual</SelectItem>
                                            <SelectItem value="Emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-wider text-white/40 ml-0.5">Reason Description</label>
                                    <Textarea required className="bg-black/40 border-white/10 text-xs rounded-lg min-h-[60px]" placeholder="Detailed justification..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                                </div>

                                <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-9 rounded-lg text-[10px] uppercase tracking-wider">
                                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Submit Leave Request"}
                                </Button>
                            </form>
                        </Card>

                        {/* Mobile Leave History List */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <History className="w-4 h-4 text-emerald-400" />
                                <h2 className="text-xs font-black uppercase tracking-wider text-white">Leave History</h2>
                            </div>

                            {loading ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-emerald-400" /></div>
                            ) : leaves.length === 0 ? (
                                <div className="text-center py-8 text-[10px] text-white/40 italic bg-black/10 rounded-xl border border-white/5">
                                    No leave history found.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {leaves.map((leave: any) => (
                                        <div key={leave.id} className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div className="text-[10px] font-bold text-white flex gap-1 items-center">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                                    {leave.fromDate === leave.toDate ? formatDateToDDMMYYYY(leave.fromDate) : `${formatDateToDDMMYYYY(leave.fromDate)} - ${formatDateToDDMMYYYY(leave.toDate)}`}
                                                </div>
                                                {leave.status === "PENDING" && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/10">Pending</span>}
                                                {leave.status === "APPROVED" && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">Approved</span>}
                                                {leave.status === "REJECTED" && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/10">Rejected</span>}
                                            </div>
                                            <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">{leave.type}</span>
                                                <p className="text-[10px] text-white/70 italic line-clamp-1 flex-1 text-right ml-4">"{leave.reason}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="student-leaves" className="space-y-3">
                        <div className="space-y-1">
                            <h2 className="text-xs font-black uppercase tracking-wider text-white">Student Absences</h2>
                            <p className="text-[8px] text-white/40 uppercase tracking-widest">
                                {(() => {
                                    const teacherId = teacherProfile?.schoolId || teacherProfile?.id;
                                    const myClasses = Object.values(classSections || {}).filter((cs: any) => cs.classTeacherId === teacherId);
                                    if (myClasses.length === 0) return "Not assigned as class teacher.";
                                    return `Absence Inbox • Class Teacher`;
                                })()}
                            </p>
                        </div>

                        {studentLoading ? (
                            <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-emerald-400" /></div>
                        ) : studentLeaves.length === 0 ? (
                            <div className="text-center py-10 text-[10px] text-white/40 italic bg-black/10 rounded-xl border border-white/5">
                                No student leave requests received.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {studentLeaves.map((l: any) => (
                                    <div key={l.id} className="bg-black/20 border border-white/5 rounded-xl p-3.5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-white text-xs leading-tight">{l.studentName}</div>
                                                <div className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">{l.studentId}</div>
                                            </div>
                                            {l.status === "PENDING" && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/10">Pending</span>}
                                            {l.status === "APPROVED" && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">Approved</span>}
                                            {l.status === "REJECTED" && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/10">Rejected</span>}
                                        </div>

                                        <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1.5">
                                            <div className="flex items-center justify-between text-[9px] text-white/50">
                                                <span className="font-bold">{l.fromDate === l.toDate ? formatDateToDDMMYYYY(l.fromDate) : `${formatDateToDDMMYYYY(l.fromDate)} - ${formatDateToDDMMYYYY(l.toDate)}`}</span>
                                                <span className="bg-white/5 px-2 py-0.5 rounded text-[8px] text-emerald-400 font-bold border border-white/10 uppercase tracking-widest">{l.type}</span>
                                            </div>
                                            <p className="text-[10px] text-white/70 italic leading-normal">"{l.reason}"</p>
                                        </div>

                                        {l.status === "PENDING" && (
                                            <div className="flex gap-2">
                                                <Button className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none h-8 rounded-lg text-[10px] font-black uppercase" onClick={() => handleAction(l.id, "APPROVED")} disabled={actioning === l.id}>
                                                    {actioning === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                                                    Approve
                                                </Button>
                                                <Button className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none h-8 rounded-lg text-[10px] font-black uppercase" onClick={() => handleAction(l.id, "REJECTED")} disabled={actioning === l.id}>
                                                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEWPORT (Wide, multi-column dashboard portal for Leave Desk)      */}
            {/* ========================================================================= */}
            <div className="hidden lg:block max-w-[1600px] mx-auto p-12 space-y-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="space-y-1">
                        <Link href="/teacher" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors mb-2 font-bold uppercase tracking-wider">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                        <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">Leave Desk</h1>
                        <p className="text-muted-foreground text-sm">Manage absence applications, schedule personal leave duties, and coordinate student records.</p>
                    </div>
                </div>

                <Tabs defaultValue="my-leaves" className="space-y-6">
                    <TabsList className="bg-black/20 border border-white/10 p-1.5 rounded-2xl h-fit">
                        <TabsTrigger value="my-leaves" className="px-6 py-2 rounded-xl text-xs uppercase font-black tracking-widest data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all gap-2">
                            <UserIcon className="w-4 h-4" /> Instructor Absences
                        </TabsTrigger>
                        <TabsTrigger value="student-leaves" className="px-6 py-2 rounded-xl text-xs uppercase font-black tracking-widest data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all gap-2">
                            <Users className="w-4 h-4" /> Classroom Requests
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="my-leaves" className="space-y-6">
                        <div className="grid grid-cols-12 gap-8 items-start">
                            {/* Request Form */}
                            <Card className="col-span-4 bg-black/40 border border-white/10 backdrop-blur-3xl shadow-2xl rounded-[2rem] overflow-hidden h-fit">
                                <CardHeader className="bg-white/5 p-8 border-b border-white/10">
                                    <CardTitle className="text-2xl font-display italic text-white flex items-center gap-3">
                                        <Send className="w-6 h-6 text-emerald-400" /> Apply Absence
                                    </CardTitle>
                                    <CardDescription className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-1">Submit request for structural leaves coverage</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">From Date</Label>
                                                <Input type="date" required className="h-12 bg-white/5 border-white/10 rounded-xl text-sm" value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">To Date</Label>
                                                <Input type="date" className="h-12 bg-white/5 border-white/10 rounded-xl text-sm" value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Absence Type</Label>
                                            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white font-bold">
                                                    <SelectItem value="Personal">Personal</SelectItem>
                                                    <SelectItem value="Sick">Sick</SelectItem>
                                                    <SelectItem value="Casual">Casual</SelectItem>
                                                    <SelectItem value="Emergency">Emergency</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Absence Reason</Label>
                                            <Textarea required className="bg-white/5 border border-white/10 rounded-xl min-h-[100px]" placeholder="State leave details..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                                        </div>
                                        <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-12 rounded-xl transition-all shadow-xl shadow-emerald-500/10 uppercase tracking-widest text-xs">
                                            {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Dispatch Request"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* My History */}
                            <Card className="col-span-8 bg-black/40 border border-white/10 backdrop-blur-3xl shadow-2xl rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-white/5 p-8 border-b border-white/10">
                                    <CardTitle className="text-2xl font-display italic text-white flex items-center gap-3">
                                        <History className="w-6 h-6 text-emerald-400" /> Attendance Ledger
                                    </CardTitle>
                                    <CardDescription className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-1">Review historical requests and approval status</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loading ? <div className="p-16 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-emerald-400" /></div> : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">Dates Covered</th>
                                                        <th className="px-6 py-4">Category</th>
                                                        <th className="px-6 py-4">Justification</th>
                                                        <th className="px-6 py-4 text-right">Approval Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {leaves.map((leave: any) => (
                                                        <tr key={leave.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-4 text-xs font-bold text-white">
                                                                {leave.fromDate === leave.toDate ? formatDateToDDMMYYYY(leave.fromDate) : `${formatDateToDDMMYYYY(leave.fromDate)} to ${formatDateToDDMMYYYY(leave.toDate)}`}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 border border-white/10 text-white/50 rounded-full">{leave.type}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                {leave.status === "PENDING" && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-yellow-500/20 text-yellow-500 border border-yellow-500/10">Pending</span>}
                                                                {leave.status === "APPROVED" && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-500 border border-emerald-500/10">Approved</span>}
                                                                {leave.status === "REJECTED" && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-500 border border-red-500/10">Rejected</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {leaves.length === 0 && (
                                                        <tr><td colSpan={4} className="p-16 text-center text-muted-foreground italic text-sm">No leave requested in ledger.</td></tr>
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
                        <Card className="bg-black/40 border border-white/10 backdrop-blur-3xl shadow-2xl rounded-[2rem] overflow-hidden">
                            <CardHeader className="bg-white/5 p-8 border-b border-white/10">
                                <CardTitle className="text-2xl font-display italic text-white flex items-center gap-3">
                                    <Users className="w-6 h-6 text-emerald-400" /> Student Absences Inbox
                                </CardTitle>
                                <CardDescription className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-1">
                                    {(() => {
                                        const teacherId = teacherProfile?.schoolId || teacherProfile?.id;
                                        const myClasses = Object.values(classSections || {}).filter((cs: any) => cs.classTeacherId === teacherId);
                                        if (!teacherProfile && studentLoading) return "Resolving roles...";
                                        if (myClasses.length === 0) return "No classrooms assigned to your signature.";
                                        return `Assigned to ${myClasses.length} class sections under your jurisdiction`;
                                    })()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {studentLoading ? (
                                    <div className="p-16 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-emerald-400" /></div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Student</th>
                                                    <th className="px-6 py-4">Dates Requested</th>
                                                    <th className="px-6 py-4">Justification Details</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {studentLeaves.map((l: any) => (
                                                    <tr key={l.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-sm text-white">{l.studentName}</div>
                                                            <div className="text-[10px] text-muted-foreground font-mono">{l.studentId}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-medium text-white">
                                                            <div>{l.fromDate === l.toDate ? formatDateToDDMMYYYY(l.fromDate) : `${formatDateToDDMMYYYY(l.fromDate)} to ${formatDateToDDMMYYYY(l.toDate)}`}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-muted-foreground max-w-sm">
                                                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-white/5 border border-white/10 text-emerald-400 rounded mr-2 inline-block mb-1">{l.type}</span>
                                                            <p className="line-clamp-1" title={l.reason}>{l.reason}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {l.status === "PENDING" && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-yellow-500/20 text-yellow-500 border border-yellow-500/10">Pending</span>}
                                                            {l.status === "APPROVED" && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-500 border border-emerald-500/10">Approved</span>}
                                                            {l.status === "REJECTED" && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-500 border border-red-500/10">Rejected</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
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
                                                    <tr><td colSpan={5} className="p-16 text-center text-muted-foreground italic text-sm">No student leave requests found for your class.</td></tr>
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
        </div>
    );
}
