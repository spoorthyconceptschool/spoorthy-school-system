"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Phone, MapPin, BookOpen, GraduationCap, DollarSign, Wallet, Edit, CheckCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { AdjustSalaryModal } from "@/components/admin/adjust-salary-modal";
import { EditTeacherModal } from "@/components/admin/edit-teacher-modal";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { KeyRound, Settings } from "lucide-react";

/**
 * TeacherProfilePage Component (Administrative)
 * 
 * Provides an administrative view of a specific teacher's profile.
 * Displays personal details, salary history, and dynamic assignments (Class/Subject)
 * derived directly from the Realtime Database and Firestore registries.
 * 
 * @returns {JSX.Element} The rendered administrative teacher profile view.
 */
export default function TeacherProfilePage() {
    const { user } = useAuth();
    const { id } = useParams();
    const { classSections, classes, sections, subjectTeachers, subjects: masterSubjects, loading: masterLoading } = useMasterData();
    const router = useRouter();
    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
        return () => unsub();
    }, [user]);

    // Salary History
    const [payments, setPayments] = useState<any[]>([]);

    // Pay Salary Modal
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payForm, setPayForm] = useState({
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear().toString(),
        amount: "",
        method: "CASH",
        notes: ""
    });
    const [paying, setPaying] = useState(false);

    // Adjust Salary
    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

    // Edit Profile
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Password Reset
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchTeacher();
            fetchPayments();
        }
    }, [id]);

    const fetchTeacher = async () => {
        try {
            const docRef = doc(db, "teachers", id as string);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setTeacher(snap.data());
            } else {
                alert("Teacher not found");
                router.back();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const q = query(
                collection(db, "salary_payments"),
                where("personId", "==", id),
                orderBy("createdAt", "desc") // requires index
            );
            // Index might be missing, so simplistic client sort for MVP if index fails
            // But let's try standard fetch
            const qSimple = query(collection(db, "salary_payments"), where("personId", "==", id));
            const snap = await getDocs(qSimple);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Client sort
            data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
            setPayments(data);
        } catch (e) { console.error(e); }
    };

    const handlePaySalary = async () => {
        setPaying(true);
        try {
            if (!payForm.amount) throw new Error("Amount required");

            // TODO: Move to API route if complex, but simple record creation is OK securely via Rules
            // Actually, Plan says Use API Route `api/admin/payroll/process`
            // Let's implement that properly or keep it client-side secure since it's admin only.
            // Requirement said "Backend Implementation (Mandatory Cloud Functions): paySalary(payload)".
            // So we MUST use API route.

            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/payroll/process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    personId: id,
                    personType: "TEACHER",
                    ...payForm,
                    amount: Number(payForm.amount)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("Salary Payment Recorded!");
            setIsPayModalOpen(false);
            fetchPayments();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setPaying(false);
        }
    };

    if (loading || masterLoading) return <div className="p-10 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
        <p className="text-muted-foreground text-xs uppercase tracking-widest font-black animate-pulse">Synchronizing Registry...</p>
    </div>;
    if (!teacher) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold">{teacher.name}</h1>
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground mt-1">
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400 font-mono">
                                {teacher.schoolId}
                            </Badge>
                            <span>•</span>
                            <span>{teacher.status}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto xl:ml-auto">
                    <Button onClick={() => setIsPasswordModalOpen(true)} variant="outline" className="border-white/10 hover:bg-white/5 flex-1 md:flex-none">
                        <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                    </Button>
                    <Button onClick={() => setIsEditModalOpen(true)} variant="outline" className="border-white/10 hover:bg-white/5 flex-1 md:flex-none">
                        <Edit className="w-4 h-4 mr-2" /> Edit Profile
                    </Button>
                    {role !== "MANAGER" && (
                        <>
                            <Button onClick={() => setIsSalaryModalOpen(true)} variant="outline" className="border-white/10 hover:bg-white/5 flex-1 md:flex-none">
                                <Settings className="w-4 h-4 mr-2" /> Adjust Salary
                            </Button>
                            <Button onClick={() => setIsPayModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none">
                                <Wallet className="w-4 h-4 mr-2" /> Pay Salary
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="md:col-span-2 bg-black/40 border-white/10">
                    <CardHeader><CardTitle className="text-lg">Personal Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Mobile Number</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Phone className="w-4 h-4 text-blue-400" />
                                    <span className="font-mono">{teacher.mobile}</span>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Age</Label>
                                <div className="mt-1">{teacher.age} years</div>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-muted-foreground">Address</Label>
                                <div className="flex items-start gap-2 mt-1">
                                    <MapPin className="w-4 h-4 text-red-400 mt-1" />
                                    <span>{teacher.address}</span>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-muted-foreground">Qualifications</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <GraduationCap className="w-4 h-4 text-yellow-400" />
                                    <span>{teacher.qualifications}</span>
                                </div>
                            </div>
                            {(() => {
                                const teacherId = teacher.schoolId || teacher.uid || id;
                                const assignedClasses = Object.values(classSections || {}).filter((cs: any) =>
                                    // Robust check: match teacher ID and ensure class/section exist in master data
                                    (cs.classTeacherId === id || cs.classTeacherId === teacher.schoolId || cs.classTeacherId === teacherId) &&
                                    classes[cs.classId] && sections[cs.sectionId]
                                );

                                if (assignedClasses.length === 0) return null;

                                return (
                                    <div className="col-span-2 space-y-3 mt-2">
                                        <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Class Teacher Roles (Live)
                                        </Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {assignedClasses.map((cs: any) => (
                                                <div key={cs.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-emerald-500/50 transition-all shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white text-sm">
                                                            {classes[cs.classId]?.name || cs.classId}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                            Section {sections[cs.sectionId]?.name || cs.sectionId}
                                                        </span>
                                                    </div>
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] uppercase font-black px-2">In-charge</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {(() => {
                                const teacherId = teacher.schoolId || id;
                                const assignments: any[] = [];

                                Object.keys(subjectTeachers || {}).forEach(key => {
                                    const subjectsObj = subjectTeachers[key];
                                    Object.keys(subjectsObj).forEach(subId => {
                                        if (subjectsObj[subId] === id || subjectsObj[subId] === teacher.schoolId) {
                                            const [cId, sId] = key.split('_');
                                            assignments.push({ classId: cId, sectionId: sId, subId });
                                        }
                                    });
                                });

                                if (assignments.length === 0) return null;

                                return (
                                    <div className="col-span-2 space-y-3 mt-4">
                                        <Label className="text-muted-foreground uppercase text-[10px] tracking-widest font-black">Subject Assignments</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {assignments.map((a: any, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white text-sm">
                                                            {classes[a.classId]?.name || a.classId} - {sections[a.sectionId]?.name || a.sectionId}
                                                        </span>
                                                        <span className="text-[10px] text-purple-400 uppercase tracking-tighter font-bold">
                                                            {masterSubjects[a.subId]?.name || a.subId}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground block mb-2">Primary Subject</Label>
                                {teacher.subjects?.[0] ? (
                                    <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1">
                                        <BookOpen className="w-3 h-3 mr-2" /> {teacher.subjects[0]}
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground italic text-sm">Not assigned</span>
                                )}
                            </div>
                            <div>
                                <Label className="text-muted-foreground block mb-2">Secondary Subject</Label>
                                {teacher.subjects?.[1] ? (
                                    <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1">
                                        <BookOpen className="w-3 h-3 mr-2" /> {teacher.subjects[1]}
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground italic text-sm">Not assigned</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Salary Overview */}
                {role !== "MANAGER" && (
                    <Card className="bg-black/40 border-white/10">
                        <CardHeader><CardTitle className="text-lg">Compensations</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                                <div className="text-muted-foreground text-sm uppercase tracking-wider mb-1">Current Salary</div>
                                <div className="text-3xl font-display font-bold">₹{teacher.salary?.toLocaleString()}</div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-3">Recent Payments</h4>
                                <div className="space-y-2">
                                    {payments.slice(0, 5).map(pay => (
                                        <div key={pay.id} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded">
                                            <div>
                                                <div className="font-bold">{pay.month} {pay.year}</div>
                                                <div className="text-xs text-muted-foreground">{pay.method}</div>
                                            </div>
                                            <div className="font-mono text-green-400 font-bold">+₹{pay.amount.toLocaleString()}</div>
                                        </div>
                                    ))}
                                    {payments.length === 0 && <div className="text-center text-muted-foreground text-sm">No payment history</div>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Pay Salary Modal */}
            <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
                <DialogContent className="bg-black/95 border-white/10 text-white">
                    <DialogHeader><DialogTitle>Pay Salary to {teacher.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select value={payForm.month} onValueChange={v => setPayForm({ ...payForm, month: v })}>
                                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input value={payForm.year} onChange={e => setPayForm({ ...payForm, year: e.target.value })} className="bg-white/5 border-white/10" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                    className="pl-9 bg-white/5 border-white/10"
                                    placeholder={teacher.salary?.toString()}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Base Salary: ₹{teacher.salary?.toLocaleString()}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select value={payForm.method} onValueChange={v => setPayForm({ ...payForm, method: v })}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI / Online</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                value={payForm.notes}
                                onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                                className="bg-white/5 border-white/10"
                                placeholder="e.g. Bonus included"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handlePaySalary} disabled={paying} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AdjustSalaryModal
                isOpen={isSalaryModalOpen}
                onClose={() => setIsSalaryModalOpen(false)}
                person={teacher ? {
                    id: id as string,
                    name: teacher.name,
                    schoolId: teacher.schoolId,
                    role: "TEACHER",
                    currentSalary: teacher.salary || 0
                } : null}
                onSuccess={() => fetchTeacher()}
            />

            <EditTeacherModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                teacher={teacher ? { id, ...teacher } : null}
                onSuccess={() => fetchTeacher()}
            />

            <AdminChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                user={teacher ? {
                    uid: teacher.uid,
                    schoolId: teacher.schoolId,
                    name: teacher.name,
                    role: "TEACHER"
                } : null}
            />
        </div>
    );
}
