"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, updateDoc, addDoc, Timestamp, where, startAfter, getDocs } from "firebase/firestore";
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


const PAYMENTS_CACHE_KEY = "spoorthy_all_payments_cache";
const DEFAULT_PAYMENTS = [
    {
        id: "pay_default_1",
        studentId: "SHS1001",
        studentName: "Aarav Sharma",
        amount: 15000,
        type: "credit" as const,
        method: "cash" as const,
        date: { toDate: () => new Date("2026-05-10T10:00:00") },
        status: "success",
        remarks: "I Term Fee payment"
    },
    {
        id: "pay_default_2",
        studentId: "SHS1002",
        studentName: "Aadhya Reddy",
        amount: 34000,
        type: "credit" as const,
        method: "cash" as const,
        date: { toDate: () => new Date("2026-05-12T11:30:00") },
        status: "success",
        remarks: "I & II Term Fee payment"
    }
];

const formatPaymentDate = (date: any) => {
    if (!date) return "Just now";
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return new Date(date).toLocaleDateString();
};

export default function PaymentsPage() {
    const { user, role } = useAuth();
    const [allPayments, setAllPayments] = useState<Payment[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(PAYMENTS_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch(e) {}
            }
        }
        return DEFAULT_PAYMENTS;
    });
    const [paymentsLoaded, setPaymentsLoaded] = useState(true);
    const [studentsLoaded, setStudentsLoaded] = useState(true);
    const [open, setOpen] = useState(false);
    const { branding, selectedYear, classes = {}, villages = {} } = useMasterData();

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState(""); // For Record Fee Dialog
    const [searchQuery, setSearchQuery] = useState(""); // For main list search
    const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
    const [selectedVillageFilter, setSelectedVillageFilter] = useState("ALL");

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
        if (!selectedYear) return;
        let isMounted = true;

        // Listen to ALL payments ordered by date descending
        const allPaymentsQ = query(collection(db, "payments"), orderBy("date", "desc"));
        const unsubPayments = onSnapshot(allPaymentsQ, (snapshot) => {
            if (!isMounted) return;
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Payment[];
            setAllPayments(loaded);
            if (typeof window !== 'undefined') {
                localStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(loaded));
            }
            setPaymentsLoaded(true);
        }, (err) => {
            if (!isMounted) return;
            console.warn("Payments list listener error:", err.message);
        });

        // Listen to students of current year
        const sq = query(collection(db, "students"), where("academicYear", "==", selectedYear), orderBy("studentName", "asc"));
        const unsubStudents = onSnapshot(sq, (snapshot) => {
            if (!isMounted) return;
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllStudents(loaded);
            setStudentsLoaded(true);
        }, (err) => {
            if (!isMounted) return;
            console.warn("Students list listener error:", err.message);
        });

        return () => {
            isMounted = false;
            unsubPayments();
            unsubStudents();
        };
    }, [selectedYear]);

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
            const currentYearId = selectedYear || "2025-2026";
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
        if (!selectedStudent || !user) return;
        setCollectingFee(true);

        try {
            const amount = Number(feeForm.amount);
            if (amount <= 0) throw new Error("Invalid Amount");

            const token = await user.getIdToken();
            const res = await fetch("/api/admin/payments/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent.schoolId,
                    studentName: selectedStudent.studentName,
                    amount,
                    method: feeForm.method,
                    date: feeForm.date,
                    remarks: feeForm.remarks,
                    adminId: user.uid,
                    currentYearId: selectedYear || "2025-2026"
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to record payment");

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

            const currentYearId = selectedYear || "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${payment.studentId}_${currentYearId}`);
            const ledgerSnap = await getDoc(ledgerRef);
            const ledger = ledgerSnap.exists() ? ledgerSnap.data() : { totalFee: 0, totalPaid: 0 };

            printPaymentReceipt({ payment, student, ledger, schoolLogo: branding?.schoolLogo, schoolName: branding?.schoolName });
        } catch (e) {
            console.error(e);
            alert("Failed to fetch receipt data");
        }
    };

    // Client-side filtering logic for ultra high performance and total statistical consistency
    const yearPayments = allPayments.filter(p => !selectedYear || p.academicYear === selectedYear);

    const filteredPayments = yearPayments.filter((p) => {
        const student = allStudents.find(s => s.id === p.studentId || s.schoolId === p.studentId);

        // 1. Class Filter
        if (selectedClassFilter !== "ALL" && student?.classId !== selectedClassFilter) {
            return false;
        }

        // 2. Village Filter
        if (selectedVillageFilter !== "ALL" && student?.villageId !== selectedVillageFilter) {
            return false;
        }

        // 3. Search query: student name, student ID, remarks/receipt number, or payment ID
        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            const matchesName = p.studentName?.toLowerCase().includes(queryLower);
            const matchesId = p.studentId?.toLowerCase().includes(queryLower);
            const matchesRemarks = p.remarks?.toLowerCase().includes(queryLower);
            const matchesPaymentId = p.id?.toLowerCase().includes(queryLower);

            if (!matchesName && !matchesId && !matchesRemarks && !matchesPaymentId) {
                return false;
            }
        }

        return true;
    });

    const dynamicStats = filteredPayments.reduce(
        (acc, p) => {
            const amt = p.amount || 0;
            acc.total += amt;
            if (p.method === "razorpay" || p.method === "upi") acc.online += amt;
            if (p.method === "cash") acc.cash += amt;
            return acc;
        },
        { total: 0, online: 0, cash: 0 }
    );

    const loading = !paymentsLoaded || !studentsLoaded;

    const columns = [
        { key: "studentId", header: "Student ID", render: (p: Payment) => <span className="font-mono text-xs">{p.studentId}</span> },
        {
            key: "studentName",
            header: "Student Name",
            render: (p: Payment) => {
                const student = allStudents.find(s => s.id === p.studentId || s.schoolId === p.studentId);
                const className = student?.className || "N/A";
                const villageName = student?.villageName || "N/A";
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-accent transition-colors">{p.studentName}</span>
                        <span className="text-[10px] text-muted-foreground/80 font-medium mt-0.5">
                            {className} • {villageName}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "amount",
            header: "Amount",
            render: (p: Payment) => (
                <span className={`font-mono font-medium ${p.type === 'credit' ? 'text-green-500' : 'text-[#64FFDA]'}`}>
                    + ₹{p.amount.toLocaleString()}
                </span>
            )
        },
        {
            key: "method",
            header: "Method / Remarks",
            render: (p: Payment) => (
                <div className="flex flex-col">
                    <span className="capitalize text-xs text-white border border-white/10 px-2 py-0.5 rounded w-fit bg-white/5 font-semibold">
                        {p.method}
                    </span>
                    {p.remarks && (
                        <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[180px]" title={p.remarks}>
                            {p.remarks}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: "status",
            header: "Status",
            render: (p: Payment) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 capitalize">
                    {p.status}
                </span>
            )
        },
        { key: "date", header: "Date", render: (p: Payment) => <span className="text-muted-foreground text-xs">{formatPaymentDate(p.date)}</span> },
        {
            key: "actions",
            header: "",
            render: (p: Payment) => (
                <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(p)} title="Print Receipt" className="h-8 w-8 hover:bg-white/10">
                    <Printer className="w-4 h-4 text-white" />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200 max-w-none p-0 pb-20">
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
                        <h3 className="text-sm md:text-2xl font-bold mt-0.5 md:mt-1 text-white italic truncate">
                            {loading ? <div className="h-8 w-20 bg-white/5 animate-pulse rounded" /> : `₹ ${dynamicStats.total.toLocaleString()}`}
                        </h3>
                    </div>
                </div>
                <div className="bg-black/20 border border-white/5 backdrop-blur-sm p-3 md:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
                    <div>
                        <p className="text-[8px] md:text-sm text-muted-foreground uppercase font-black tracking-widest">Online</p>
                        <h3 className="text-sm md:text-2xl font-bold mt-0.5 md:mt-1 text-blue-400 italic truncate">
                            {loading ? <div className="h-8 w-20 bg-white/5 animate-pulse rounded" /> : `₹ ${dynamicStats.online.toLocaleString()}`}
                        </h3>
                    </div>
                </div>
                <div className="bg-black/20 border border-white/5 backdrop-blur-sm p-3 md:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
                    <div>
                        <p className="text-[8px] md:text-sm text-muted-foreground uppercase font-black tracking-widest">Cash</p>
                        <h3 className="text-sm md:text-2xl font-bold mt-0.5 md:mt-1 text-emerald-400 italic truncate">
                            {loading ? <div className="h-8 w-20 bg-white/5 animate-pulse rounded" /> : `₹ ${dynamicStats.cash.toLocaleString()}`}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Premium Search & Filter Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 bg-[#112240] border border-[#64FFDA]/10 p-3 md:p-4 rounded-2xl backdrop-blur-md">
                {/* Search Field */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student, ID, or receipt..."
                        className="pl-9 h-11 bg-[#0A192F] border-white/10 rounded-xl text-white placeholder-muted-foreground/60 text-xs md:text-sm focus:ring-accent/30 focus:border-[#64FFDA]/30"
                    />
                </div>

                {/* Class Dropdown */}
                <div className="relative">
                    <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                        <SelectTrigger className="h-11 bg-[#0A192F] border-white/10 text-white rounded-xl text-xs md:text-sm">
                            <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A192F] border-white/10 text-white rounded-xl">
                            <SelectItem value="ALL" className="text-xs md:text-sm">All Classes</SelectItem>
                            {Object.entries(classes).map(([id, cls]: any) => (
                                <SelectItem key={id} value={id} className="text-xs md:text-sm">{cls.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Village Dropdown */}
                <div className="relative">
                    <Select value={selectedVillageFilter} onValueChange={setSelectedVillageFilter}>
                        <SelectTrigger className="h-11 bg-[#0A192F] border-white/10 text-white rounded-xl text-xs md:text-sm">
                            <SelectValue placeholder="All Villages" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A192F] border-white/10 text-white rounded-xl">
                            <SelectItem value="ALL" className="text-xs md:text-sm">All Villages</SelectItem>
                            {Object.entries(villages).map(([id, vil]: any) => (
                                <SelectItem key={id} value={id} className="text-xs md:text-sm">{vil.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <DataTable
                data={filteredPayments}
                columns={columns}
                isLoading={loading}
                serverPagination={false}
                pageSize={20}
            />
        </div>
    );
}


