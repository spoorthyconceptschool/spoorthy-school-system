"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DataTable } from "@/components/ui/data-table";
import { Loader2, Plus, Search, ArrowLeft, Printer } from "lucide-react";
import { printPaymentReceipt } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";

interface Payment {
    id: string;
    studentName: string;
    studentId: string;
    amount: number;
    type: "credit" | "debit";
    method: "razorpay" | "cash";
    date: any;
    status: string;
}


export default function PaymentsPage() {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const { branding } = useMasterData();
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
        return () => unsub();
    }, [user]);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Payment Form State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentLedger, setStudentLedger] = useState<any>(null);
    const [feeForm, setFeeForm] = useState({
        amount: "",
        method: "cash",
        date: new Date().toISOString().split('T')[0],
        remarks: ""
    });
    const [collectingFee, setCollectingFee] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // 1. Fetch live payments
        const pq = query(collection(db, "payments"), orderBy("date", "desc"), limit(50));
        const unsubPayments = onSnapshot(pq, (snapshot) => {
            if (!isMounted) return;
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Payment[];
            setPayments(loaded);
            setLoading(false);
        }, (err) => {
            if (!isMounted) return;
            console.error("Payments listener error:", err);
            setLoading(false);
        });

        // 2. Fetch all active students for the autocomplete
        const sq = query(collection(db, "students"), orderBy("studentName", "asc"));
        const unsubStudents = onSnapshot(sq, (snapshot) => {
            if (!isMounted) return;
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllStudents(loaded);
        }, (err) => {
            if (!isMounted) return;
            console.error("Students list listener error:", err);
        });

        return () => {
            isMounted = false;
            unsubPayments();
            unsubStudents();
        };
    }, []);

    const handleSearch = (val: string) => {
        setSearchTerm(val);
        if (!val) {
            setSuggestions([]);
            return;
        }
        const lowerVal = val.toLowerCase();
        const matches = allStudents.filter(s =>
            (s.schoolId && s.schoolId.toLowerCase().includes(lowerVal)) ||
            (s.studentName && s.studentName.toLowerCase().includes(lowerVal))
        ).slice(0, 5); // Limit suggestions
        setSuggestions(matches);
    };

    const selectStudent = async (student: any) => {
        setSelectedStudent(student);
        setSearchTerm("");
        setSuggestions([]);

        // Fetch Ledger
        try {
            const currentYearId = "2025-2026";
            const ref = doc(db, "student_fee_ledgers", `${student.schoolId}_${currentYearId}`);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setStudentLedger(snap.data());
            } else {
                setStudentLedger(null);
            }
        } catch (error) {
            console.error("Error fetching ledger:", error);
            setStudentLedger(null);
        }
    };

    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        setCollectingFee(true);

        try {
            const amount = Number(feeForm.amount);
            if (amount <= 0) throw new Error("Invalid Amount");

            const newPayment = {
                studentId: selectedStudent.schoolId,
                studentName: selectedStudent.studentName,
                amount,
                method: feeForm.method,
                date: Timestamp.fromDate(new Date(feeForm.date)),
                status: "success",
                remarks: feeForm.remarks,
                createdAt: Timestamp.now(),
                verifiedBy: "admin"
            };

            const ref = await addDoc(collection(db, "payments"), newPayment);

            // Update Ledger
            const currentYearId = "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${selectedStudent.schoolId}_${currentYearId}`);

            // We re-fetch or use state? Safer to fetch-modify-write or use state if we trust it. 
            // In StudentDetails we used state + amount.
            // Let's use the fetched ledger logic safely.
            const totalPaid = (studentLedger?.totalPaid || 0) + amount;
            const totalFee = studentLedger?.totalFee || 0;

            await updateDoc(ledgerRef, {
                totalPaid: totalPaid,
                status: totalPaid >= totalFee ? "PAID" : "PENDING",
                updatedAt: new Date().toISOString()
            });

            // === Notifications ===
            // 1. Notify Student
            if (selectedStudent.uid) {
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: selectedStudent.uid,
                        title: "Fee Payment Received",
                        message: `Payment of ₹${amount.toLocaleString()} received via ${feeForm.method}. ${feeForm.remarks ? `(${feeForm.remarks})` : ''}`,
                        type: "PAYMENT_RECEIVED",
                        status: "UNREAD",
                        createdAt: Timestamp.now(),
                        read: false
                    });
                } catch (e) {
                    console.error("Failed to notify student", e);
                }
            }

            // 2. Notify Admins
            try {
                await addDoc(collection(db, "notifications"), {
                    target: "ALL_ADMINS",
                    title: "Fee Collected",
                    message: `Collected ₹${amount.toLocaleString()} from ${selectedStudent.studentName} (${selectedStudent.schoolId}) via ${feeForm.method}.`,
                    type: "PAYMENT_COLLECTED",
                    status: "UNREAD",
                    createdAt: Timestamp.now(),
                    read: false
                });
            } catch (e) {
                console.error("Failed to notify admins", e);
            }

            setOpen(false);
            setFeeForm({ amount: "", method: "cash", date: new Date().toISOString().split('T')[0], remarks: "" });
            setSelectedStudent(null);
            setStudentLedger(null);
            alert("Payment Recorded & Ledger Updated");

        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setCollectingFee(false);
        }
    };

    // Derived Calculations for current form
    const currentDue = studentLedger ? (studentLedger.totalFee || 0) - (studentLedger.totalPaid || 0) : 0;

    const handlePrintReceipt = async (payment: Payment) => {
        try {
            const sRef = doc(db, "students", payment.studentId);
            const sSnap = await getDoc(sRef);
            const student = sSnap.exists() ? { id: sSnap.id, ...sSnap.data() } : { studentName: payment.studentName, schoolId: payment.studentId, className: "N/A" };

            const ledgerRef = doc(db, "student_fee_ledgers", `${payment.studentId}_2025-2026`);
            const ledgerSnap = await getDoc(ledgerRef);
            const ledger = ledgerSnap.exists() ? ledgerSnap.data() : { totalFee: 0, totalPaid: 0 };

            printPaymentReceipt({ payment, student, ledger, schoolLogo: branding?.schoolLogo, schoolName: branding?.schoolName });
        } catch (e) {
            console.error(e);
            alert("Failed to fetch receipt data");
        }
    };

    const columns = [
        { key: "studentId", header: "Student ID", render: (p: Payment) => <span className="font-mono text-xs">{p.studentId}</span> },
        { key: "studentName", header: "Student Name" },
        {
            key: "amount",
            header: "Amount",
            render: (p: Payment) => (
                <span className={`font-mono font-medium ${p.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                    {p.type === 'credit' ? '+' : '-'} ₹{p.amount.toLocaleString()}
                </span>
            )
        },
        {
            key: "method",
            header: "Method",
            render: (p: Payment) => (
                <span className="capitalize text-xs text-muted-foreground border border-white/10 px-2 py-0.5 rounded">
                    {p.method}
                </span>
            )
        },
        {
            key: "status",
            header: "Status",
            render: (p: Payment) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 capitalize">
                    {p.status}
                </span>
            )
        },
        { key: "date", header: "Date", render: (p: Payment) => <span className="text-muted-foreground text-xs">{p.date?.toDate ? p.date.toDate().toLocaleDateString() : 'Just now'}</span> },
        {
            key: "actions",
            header: "",
            render: (p: Payment) => (
                <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(p)} title="Print Receipt" className="h-8 w-8 hover:bg-white/10">
                    <Printer className="w-4 h-4" />
                </Button>
            )
        }
    ];

    const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0);
    const onlineCollection = payments.filter(p => p.method === "razorpay").reduce((sum, p) => sum + p.amount, 0);
    const cashCollection = payments.filter(p => p.method === "cash").reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-none p-0 pb-20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-2 md:px-0">
                <div className="space-y-0.5 md:space-y-1">
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Payments Ledger
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-lg tracking-tight uppercase font-black opacity-100">Tracking <span className="text-white">incoming fee payments</span> and collections</p>
                </div>
                {role !== "MANAGER" && (
                    <Dialog open={open} onOpenChange={(val) => {
                        setOpen(val);
                        if (!val) {
                            // Reset forms on close
                            setSelectedStudent(null);
                            setSearchTerm("");
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="h-10 md:h-12 w-full md:w-auto gap-2 bg-white text-black hover:bg-zinc-200 rounded-xl font-black uppercase tracking-tighter px-6 shadow-lg shadow-white/10 text-xs md:text-sm">
                                <Plus size={16} className="stroke-[3]" /> Record Fee
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black/95 border-white/10 backdrop-blur-xl sm:max-w-md w-[95vw] rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-display italic">
                                    {selectedStudent ? `Collect: ${selectedStudent.studentName}` : "Find Student"}
                                </DialogTitle>
                            </DialogHeader>

                            {!selectedStudent ? (
                                <div className="space-y-4 py-4 relative mb-12">
                                    <div className="space-y-2 relative">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Search Student</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                value={searchTerm}
                                                onChange={(e) => handleSearch(e.target.value)}
                                                placeholder="Type ID or Name..."
                                                className="pl-9 h-11 bg-white/5 border-white/10 rounded-xl focus:ring-accent/30"
                                                autoFocus
                                            />
                                        </div>

                                        {suggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-black/95 border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl">
                                                {suggestions.map((student) => (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => selectStudent(student)}
                                                        className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between border-b border-white/5 last:border-0"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm text-white">{student.studentName}</div>
                                                            <div className="text-xs text-muted-foreground font-mono">{student.schoolId}</div>
                                                        </div>
                                                        <div className="text-[10px] text-accent uppercase tracking-wider">{student.className}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchTerm && suggestions.length === 0 && (
                                            <div className="text-center p-4 text-sm text-muted-foreground">
                                                No students found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleCollectFee} className="space-y-4 py-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute left-4 top-4 h-6 px-2 text-xs text-muted-foreground hover:text-white"
                                        onClick={() => setSelectedStudent(null)}
                                    >
                                        <ArrowLeft className="w-3 h-3 mr-1" /> Back
                                    </Button>

                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex justify-between mt-2">
                                        <span>Current Due:</span>
                                        <span className="font-bold font-mono">₹{currentDue.toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount Received (₹) <span className="text-red-500">*</span></Label>
                                        <Input
                                            required
                                            type="number"
                                            min="1"
                                            placeholder="Enter amount..."
                                            className="bg-white/5 border-white/10 font-mono text-lg"
                                            value={feeForm.amount}
                                            onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Payment Mode</Label>
                                            <Select value={feeForm.method} onValueChange={v => setFeeForm({ ...feeForm, method: v })}>
                                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="upi">UPI / GPay</SelectItem>
                                                    <SelectItem value="cheque">Cheque</SelectItem>
                                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <Input
                                                type="date"
                                                required
                                                className="bg-white/5 border-white/10"
                                                value={feeForm.date}
                                                onChange={e => setFeeForm({ ...feeForm, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Remarks (Optional)</Label>
                                        <Input
                                            placeholder="e.g. Receipt #123"
                                            className="bg-white/5 border-white/10"
                                            value={feeForm.remarks}
                                            onChange={e => setFeeForm({ ...feeForm, remarks: e.target.value })}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={collectingFee} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                            {collectingFee ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-6">
                <div className="bg-black/20 border border-white/5 backdrop-blur-sm p-3 md:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
                    <div>
                        <p className="text-[8px] md:text-sm text-muted-foreground uppercase font-black tracking-widest">Total</p>
                        <h3 className="text-sm md:text-2xl font-bold mt-0.5 md:mt-1 text-white italic truncate">₹ {totalCollection.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-black/20 border border-white/5 backdrop-blur-sm p-3 md:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
                    <div>
                        <p className="text-[8px] md:text-sm text-muted-foreground uppercase font-black tracking-widest">Online</p>
                        <h3 className="text-sm md:text-2xl font-bold mt-0.5 md:mt-1 text-blue-400 italic truncate">₹ {onlineCollection.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-black/20 border border-white/5 backdrop-blur-sm p-3 md:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
                    <div>
                        <p className="text-[8px] md:text-sm text-muted-foreground uppercase font-black tracking-widest">Cash</p>
                        <h3 className="text-sm md:text-2xl font-bold mt-0.5 md:mt-1 text-emerald-400 italic truncate">₹ {cashCollection.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <DataTable
                data={payments}
                columns={columns}
                isLoading={loading}
            />
        </div>
    );
}


