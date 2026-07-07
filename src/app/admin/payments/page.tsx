"use client";

import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, updateDoc, addDoc, Timestamp, where, startAfter, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Plus, Search, ArrowLeftCircle, Printer, Upload, Wallet, CreditCard, Banknote, SlidersHorizontal, GraduationCap, MapPin, Menu, Bell, Home, Users, BookOpen, MoreVertical, ChevronLeft, ChevronRight, Calendar, Edit2, CheckCircle2, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { printPaymentReceipt } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useMasterData } from "@/context/MasterDataContext";
import Link from "next/link";
import { useMemo } from "react";

interface Payment {
    id: string;
    studentName: string;
    studentId: string;
    amount: number;
    type: "credit" | "debit";
    method: string;
    date: any;
    status: string;
    academicYear?: string;
    remarks?: string;
    isEdited?: boolean;
    adminName?: string;
    adminId?: string;
    allocations?: { name: string; amount: number; type?: string }[];
}

const PAYMENTS_CACHE_KEY = "spoorthy_all_payments_cache";

const formatPaymentDate = (date: any) => {
    if (!date) return "Just now";
    if (date.toDate) return date.toDate().toLocaleDateString('en-GB');
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-GB');
    return new Date(date).toLocaleDateString('en-GB');
};

const formatPaymentTime = (date: any) => {
    if (!date) return "";
    if (date.toDate) return date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function PaymentsPage() {
    const { user, userData, branchId: userBranchId, role } = useAuth();
    const { selectedBranchId } = useBranch();
    const activeBranchId = selectedBranchId || (role === "SUPER_ADMIN" ? "global" : (userBranchId || userData?.schoolId));

    const PAYMENTS_CACHE_KEY = activeBranchId ? `spoorthy_all_payments_cache_${activeBranchId}` : null;
    const [allPayments, setAllPayments] = useState<Payment[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined' && PAYMENTS_CACHE_KEY) {
            const cached = localStorage.getItem(PAYMENTS_CACHE_KEY);
            if (cached) {
                try {
                    setAllPayments(JSON.parse(cached));
                    return;
                } catch(e) {}
            }
        }
        setAllPayments([]);
    }, [PAYMENTS_CACHE_KEY]);

    const [paymentsLoaded, setPaymentsLoaded] = useState(true);
    const [studentsLoaded, setStudentsLoaded] = useState(true);
    const [open, setOpen] = useState(false);
    const { branding, selectedYear, classes = {}, villages = {} } = useMasterData();

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
    const [selectedVillageFilter, setSelectedVillageFilter] = useState("ALL");
    const [selectedDateFilter, setSelectedDateFilter] = useState("ALL");
    const [selectedMethodFilter, setSelectedMethodFilter] = useState("ALL");
    
    // Custom Date Range State
    const [customDateDialog, setCustomDateDialog] = useState(false);
    const [customDateFrom, setCustomDateFrom] = useState("");
    const [customDateTo, setCustomDateTo] = useState("");

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Payment Form State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentLedger, setStudentLedger] = useState<any>(null);
    const [feeForm, setFeeForm] = useState<{ amount: string; method: string; date: string; remarks: string; selectedItems: string[] }>({
        amount: "",
        method: "cash",
        date: new Date().toISOString().split('T')[0],
        remarks: "",
        selectedItems: []
    });
    const [collectingFee, setCollectingFee] = useState(false);
    const [showFeeSelector, setShowFeeSelector] = useState(false);

    // Edit Payment State
    const [editPaymentObj, setEditPaymentObj] = useState<Payment | null>(null);
    const [editForm, setEditForm] = useState({ amount: "", method: "cash", date: "", remarks: "" });
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const previewAllocations = useMemo(() => {
        if (!studentLedger) return [];
        const amt = Number(feeForm.amount || 0);
        if (amt <= 0) return [];
        
        let remaining = amt;
        const todayStr = new Date().toISOString().split('T')[0];
        const items = (studentLedger.items || []).map((i: any) => ({ ...i }));
        const allocations: any[] = [];
        
        const allocate = (filterFn: (i: any) => boolean) => {
            const group = items.filter(filterFn).sort((a: any, b: any) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"));
            for (const item of group) {
                if (remaining <= 0) break;
                const due = Number(item.amount || 0) - Number(item.paidAmount || 0);
                if (due > 0) {
                    const pay = Math.min(due, remaining);
                    remaining -= pay;
                    item.paidAmount = Number(item.paidAmount || 0) + pay;
                    allocations.push({ name: item.name, allocated: pay, id: item.id, type: item.type });
                }
            }
        };

        if (feeForm.selectedItems.length > 0) {
            allocate((i: any) => feeForm.selectedItems.includes(i.id));
        } else {
            allocate((i: any) => i.type === "TERM" && (i.dueDate || "9999-99-99") <= todayStr);
            allocate((i: any) => i.type === "CUSTOM");
            allocate((i: any) => i.type === "TERM" && (i.dueDate || "9999-99-99") > todayStr);
            allocate((i: any) => i.type === "TRANSPORT");
            allocate((i: any) => true);
        }
        return allocations;
    }, [feeForm.amount, feeForm.selectedItems, studentLedger]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = () => setActiveDropdown(null);
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    useEffect(() => {
        if (!selectedYear) return;
        if (!activeBranchId) {
            console.log("[PaymentsPage] activeBranchId is not yet resolved, skipping subscription.");
            return;
        }
        let isMounted = true;

        let basePaymentsConstraints: any[] = [];
        if (activeBranchId && activeBranchId !== "global") {
            basePaymentsConstraints.push(where("schoolId", "==", activeBranchId));
        }

        const allPaymentsQ = query(collection(db, "payments"), ...basePaymentsConstraints);
        const unsubPayments = onSnapshot(allPaymentsQ, (snapshot) => {
            if (!isMounted) return;
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Payment[];

            // Stable sort by date desc, then by createdAt desc
            loaded.sort((a, b) => {
                const getMs = (dateVal: any) => {
                    if (!dateVal) return 0;
                    if (dateVal.toDate) return dateVal.toDate().getTime();
                    if (dateVal.seconds) return dateVal.seconds * 1000;
                    return new Date(dateVal).getTime();
                };

                const dateA = getMs(a.date);
                const dateB = getMs(b.date);
                if (dateB !== dateA) return dateB - dateA;

                const createA = getMs((a as any).createdAt);
                const createB = getMs((b as any).createdAt);
                return createB - createA;
            });

            setAllPayments(loaded);
            if (typeof window !== 'undefined' && PAYMENTS_CACHE_KEY) {
                localStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(loaded));
            }
            setPaymentsLoaded(true);
        }, (err) => {
            if (!isMounted) return;
            console.warn("Payments list listener error:", err.message);
        });

        let baseStudentConstraints: any[] = [
            where("academicYear", "==", selectedYear)
        ];
        if (activeBranchId && activeBranchId !== "global") {
            baseStudentConstraints.push(where("branchId", "==", activeBranchId));
        }

        const sq = query(collection(db, "students"), ...baseStudentConstraints);
        const unsubStudents = onSnapshot(sq, (snapshot) => {
            if (!isMounted) return;
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort in memory by studentName to avoid composite index requirement
            loaded.sort((a: any, b: any) => String(a.studentName || "").localeCompare(String(b.studentName || "")));
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
    }, [selectedYear, activeBranchId, PAYMENTS_CACHE_KEY]);

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
        ).slice(0, 5);
        setSuggestions(matches);
    };

    const selectStudent = async (student: any) => {
        setSelectedStudent(student);
        setSearchTerm("");
        setSuggestions([]);

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

            const payload = {
                studentId: selectedStudent.schoolId,
                studentName: selectedStudent.studentName,
                amount,
                method: feeForm.method,
                date: feeForm.date,
                remarks: feeForm.remarks,
                adminId: user.uid,
                currentYearId: selectedYear || "2025-2026",
                allocations: previewAllocations
            };

            // Optimistically close dialog for zero-latency feel
            setOpen(false);
            setFeeForm({ amount: "", method: "cash", date: new Date().toISOString().split('T')[0], remarks: "", selectedItems: [] });
            setSelectedStudent(null);
            setStudentLedger(null);

            const token = await user.getIdToken();
            const res = await fetch("/api/admin/payments/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to record payment");

            // Assuming a toast function exists or we can just use alert for now if toast is not available.
            // But let's check if we can dispatch a custom event or just use alert since it was there.
            // Actually, since this is a background operation now (dialog is closed), an alert might be annoying.
            // Let's use a non-blocking console log and a simple notification if possible.
            console.log("Payment Recorded & Ledger Updated");
            
            if (data.payment) {
                // Auto-print receipt
                handlePrintReceipt(data.payment);
            }

        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setCollectingFee(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPaymentObj || !user) return;
        
        try {
            const pRef = doc(db, "payments", editPaymentObj.id);
            await updateDoc(pRef, {
                amount: Number(editForm.amount),
                method: editForm.method,
                remarks: editForm.remarks,
                isEdited: true
            });
            setEditPaymentObj(null);
            alert("Payment successfully edited!");
        } catch (error: any) {
            alert(error.message);
        }
    };

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

            // Find previous payment
            const studentPayments = allPayments.filter(p => p.studentId === payment.studentId && p.id !== payment.id);
            const currentPaymentDate = payment.date?.toDate ? payment.date.toDate() : new Date(payment.date?.seconds ? payment.date.seconds * 1000 : payment.date);
            const sortedPayments = studentPayments.sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date);
                return dateB.getTime() - dateA.getTime();
            });
            const previousPayment = sortedPayments.find(p => {
                const pDate = p.date?.toDate ? p.date.toDate() : new Date(p.date?.seconds ? p.date.seconds * 1000 : p.date);
                return pDate < currentPaymentDate;
            });

            printPaymentReceipt({ payment, student, ledger, schoolLogo: branding?.schoolLogo, schoolName: branding?.schoolName, previousPayment });
        } catch (e) {
            console.error(e);
            alert("Failed to fetch receipt data");
        }
    };

    const yearPayments = allPayments.filter(p => !selectedYear || p.academicYear === selectedYear);

    const filteredPayments = yearPayments.filter((p) => {
        const student = allStudents.find(s => s.id === p.studentId || s.schoolId === p.studentId);
        if (selectedClassFilter !== "ALL" && student?.classId !== selectedClassFilter) return false;
        if (selectedVillageFilter !== "ALL" && student?.villageId !== selectedVillageFilter) return false;
        
        // Date Filter Logic
        if (selectedDateFilter !== "ALL") {
            const pDate = p.date?.toDate ? p.date.toDate() : new Date(p.date?.seconds ? p.date.seconds * 1000 : p.date);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            if (selectedDateFilter === "TODAY") {
                if (pDate < today) return false;
            } else if (selectedDateFilter === "YESTERDAY") {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                if (pDate < yesterday || pDate >= today) return false;
            } else if (selectedDateFilter === "LAST_7_DAYS") {
                const last7 = new Date(today);
                last7.setDate(last7.getDate() - 7);
                if (pDate < last7) return false;
            } else if (selectedDateFilter === "THIS_MONTH") {
                if (pDate.getMonth() !== today.getMonth() || pDate.getFullYear() !== today.getFullYear()) return false;
            } else if (selectedDateFilter === "LAST_MONTH") {
                const lastMonth = new Date(today);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                if (pDate.getMonth() !== lastMonth.getMonth() || pDate.getFullYear() !== lastMonth.getFullYear()) return false;
            } else if (selectedDateFilter === "CUSTOM") {
                if (customDateFrom) {
                    const from = new Date(customDateFrom);
                    from.setHours(0,0,0,0);
                    if (pDate < from) return false;
                }
                if (customDateTo) {
                    const to = new Date(customDateTo);
                    to.setHours(23,59,59,999);
                    if (pDate > to) return false;
                }
            }
        }

        // Method Filter Logic
        if (selectedMethodFilter !== "ALL") {
            const m = (p.method || "").toLowerCase();
            if (selectedMethodFilter === "CASH" && !m.includes("cash")) return false;
            if (selectedMethodFilter === "ONLINE" && !m.includes("upi") && !m.includes("gpay") && !m.includes("razorpay") && !m.includes("card")) return false;
            if (selectedMethodFilter === "BANK" && !m.includes("bank") && !m.includes("transfer") && !m.includes("cheque")) return false;
        }

        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            const matchesName = p.studentName?.toLowerCase().includes(queryLower);
            const matchesId = p.studentId?.toLowerCase().includes(queryLower);
            const matchesRemarks = p.remarks?.toLowerCase().includes(queryLower);
            const matchesPaymentId = p.id?.toLowerCase().includes(queryLower);
            if (!matchesName && !matchesId && !matchesRemarks && !matchesPaymentId) return false;
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

    return (
        <div className="w-full h-full text-white flex flex-col font-sans bg-[#071A3A]">
            <div className="w-full px-4 md:px-8 pb-4 flex flex-col h-[calc(100vh-4rem)] md:h-full gap-3 overflow-hidden mt-2">
                
                {/* Header Row: Title on Left, Buttons on Right */}
                <div className="flex justify-between items-center shrink-0">
                    <div className="flex flex-col">
                        <Link href="/admin/fees" className="text-sm font-bold text-[#9AA7C7] hover:text-white flex items-center gap-2 transition-colors w-fit mb-1">
                            <ArrowLeftCircle className="w-6 h-6" strokeWidth={2.5} /> Fee Center
                        </Link>
                        <h1 className="text-xl md:text-2xl font-bold leading-none text-white tracking-tight">Fee Collection</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Dialog open={customDateDialog} onOpenChange={setCustomDateDialog}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="outline" className={cn("h-9 w-9 border-[rgba(255,255,255,0.06)] bg-[#0B2247] hover:bg-white/5 rounded-lg shrink-0", selectedDateFilter === "CUSTOM" ? "text-[#00D98B]" : "text-[#9AA7C7] hover:text-white")}>
                                        <Calendar className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#071A3A] border-[rgba(255,255,255,.06)] rounded-2xl text-white">
                                    <DialogHeader>
                                        <DialogTitle>Custom Date Range</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label className="text-[#9AA7C7]">From Date</Label>
                                            <Input type="date" className="bg-[#0B2247] border-[rgba(255,255,255,.06)] text-white [color-scheme:dark]" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[#9AA7C7]">To Date</Label>
                                            <Input type="date" className="bg-[#0B2247] border-[rgba(255,255,255,.06)] text-white [color-scheme:dark]" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} />
                                        </div>
                                        <Button className="w-full bg-[#00D98B] hover:bg-[#00D98B]/90 text-[#071A3A] font-bold" onClick={() => { setSelectedDateFilter("CUSTOM"); setCustomDateDialog(false); }}>Apply Filter</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
                                <SelectTrigger className="h-9 w-fit min-w-[85px] md:min-w-[100px] bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[10px] md:text-xs font-bold px-2.5">
                                    <SelectValue placeholder="All Time" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                                    <SelectItem value="ALL" className="text-xs">All Time</SelectItem>
                                    <SelectItem value="TODAY" className="text-xs">Today</SelectItem>
                                    <SelectItem value="YESTERDAY" className="text-xs">Yesterday</SelectItem>
                                    <SelectItem value="LAST_7_DAYS" className="text-xs">Last 7 Days</SelectItem>
                                    <SelectItem value="THIS_MONTH" className="text-xs">This Month</SelectItem>
                                    <SelectItem value="LAST_MONTH" className="text-xs">Last Month</SelectItem>
                                    {selectedDateFilter === "CUSTOM" && <SelectItem value="CUSTOM" className="text-xs hidden">Custom Range</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button variant="outline" size="sm" className="hidden md:flex h-9 text-xs border-[rgba(255,255,255,0.06)] bg-transparent text-white hover:bg-white/5 rounded-lg transition-all">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Export
                        </Button>
                        
                        {role !== "MANAGER" ? (
                            <Dialog open={open} onOpenChange={(val) => {
                                setOpen(val);
                                if (!val) {
                                    setSelectedStudent(null);
                                    setSearchTerm("");
                                    setFeeForm({ amount: "", method: "cash", date: new Date().toISOString().split('T')[0], remarks: "", selectedItems: [] });
                                    setShowFeeSelector(false);
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button size="icon" className="h-9 w-9 bg-[#00D98B] hover:bg-[#00D98B]/90 text-[#071A3A] rounded-lg shadow-[0_0_15px_-3px_rgba(0,217,139,0.3)] transition-all shrink-0">
                                        <Plus className="w-5 h-5 stroke-[3]" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white w-[90vw] sm:max-w-sm rounded-2xl border-white/10">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-display font-bold text-emerald-400">
                                            {selectedStudent ? `Collect Payment` : "Find Student"}
                                        </DialogTitle>
                                        {selectedStudent && (
                                            <div className="text-sm text-white/60 font-medium">Student: <span className="text-white">{selectedStudent.studentName}</span></div>
                                        )}
                                    </DialogHeader>

                                    {!selectedStudent ? (
                                        <div className="space-y-4 py-4 relative mb-12">
                                            <div className="space-y-2 relative">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9AA7C7]">Search Student</Label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA7C7]" />
                                                    <Input
                                                        value={searchTerm}
                                                        onChange={(e) => handleSearch(e.target.value)}
                                                        placeholder="Type ID or Name..."
                                                        className="pl-9 h-11 bg-[#0B2247] border-[rgba(255,255,255,.06)] rounded-xl focus:ring-[#00D98B]/30 text-white placeholder:text-[#9AA7C7]"
                                                        autoFocus
                                                    />
                                                </div>

                                                {suggestions.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-[#0B2247] border border-[rgba(255,255,255,.06)] rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl">
                                                        {suggestions.map((student) => (
                                                            <button
                                                                key={student.id}
                                                                type="button"
                                                                onClick={() => selectStudent(student)}
                                                                className="w-full px-4 py-3 text-left hover:bg-[rgba(255,255,255,.06)] transition-colors flex items-center justify-between border-b border-[rgba(255,255,255,.06)] last:border-0"
                                                            >
                                                                <div>
                                                                    <div className="font-bold text-sm text-white">{student.studentName}</div>
                                                                    <div className="text-xs text-[#9AA7C7] font-mono">{student.schoolId}</div>
                                                                </div>
                                                                <div className="text-[10px] text-[#00D98B] uppercase tracking-wider">{student.className}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleCollectFee} className="space-y-4 pt-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-12 top-4 h-6 px-2 text-[10px] uppercase font-bold text-white/50 hover:text-white hover:bg-white/5"
                                                onClick={() => setSelectedStudent(null)}
                                            >
                                                Change
                                            </Button>

                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between shadow-inner">
                                                <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Total Due</span>
                                                <span className="text-emerald-400 font-black text-lg font-mono">₹{currentDue.toLocaleString()}</span>
                                            </div>

                                            {studentLedger && (studentLedger.items?.length > 0) && (
                                                <div className="space-y-1 relative">
                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/70 ml-1">Target Fees (Optional)</Label>
                                                    <DropdownMenu open={showFeeSelector} onOpenChange={setShowFeeSelector}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="w-full h-10 text-xs font-bold bg-white/5 border-white/10 hover:bg-white/10 text-white flex justify-between items-center outline-none ring-0">
                                                                {feeForm.selectedItems.length > 0 ? `${feeForm.selectedItems.length} Fee(s) Selected` : "Select Specific Fee Types"}
                                                                <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded ml-2">▼</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-[#0F223B] border-white/20 text-white shadow-2xl p-1" align="center" sideOffset={8}>
                                                            <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-white/10">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Select Fees</span>
                                                                <Button variant="ghost" size="sm" onClick={() => setShowFeeSelector(false)} className="h-6 px-2 text-[9px] uppercase hover:bg-red-500/20 hover:text-red-400 text-white/50">Close</Button>
                                                            </div>
                                                            <div className="max-h-[120px] overflow-y-auto custom-scrollbar">
                                                                {studentLedger.items?.filter((i:any) => (Number(i.amount || 0) - Number(i.paidAmount || 0)) > 0).map((item: any) => {
                                                                    const due = Number(item.amount || 0) - Number(item.paidAmount || 0);
                                                                    return (
                                                                        <DropdownMenuCheckboxItem 
                                                                            key={item.id} 
                                                                            checked={feeForm.selectedItems.includes(item.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                const sel = feeForm.selectedItems;
                                                                                setFeeForm({ ...feeForm, selectedItems: checked ? [...sel, item.id] : sel.filter(id => id !== item.id) });
                                                                            }}
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            className="flex items-center gap-2 py-2 px-1 cursor-pointer focus:bg-white/10 data-[highlighted]:bg-white/10 border-none"
                                                                        >
                                                                            <div className="flex-1 flex justify-between items-center text-[11px] font-medium pl-1">
                                                                                <span className={feeForm.selectedItems.includes(item.id) ? "text-emerald-400" : "text-white/90"}>{item.name}</span>
                                                                                <span className="font-mono text-white/60">₹{due.toLocaleString()}</span>
                                                                            </div>
                                                                        </DropdownMenuCheckboxItem>
                                                                    );
                                                                })}
                                                            </div>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-1.5 text-white/90 font-bold">Amount Received (₹) <span className="font-black text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <IndianRupee className="h-4 w-4 text-emerald-400" />
                                                    </div>
                                                    <Input
                                                        required
                                                        type="number"
                                                        min="1"
                                                        max={currentDue || undefined}
                                                        placeholder="0"
                                                        className="bg-white/5 border-emerald-500/30 h-10 pl-9 text-lg font-mono font-bold focus:border-emerald-500 focus:ring-emerald-500/20 text-white"
                                                        value={feeForm.amount}
                                                        onChange={e => {
                                                            const val = Number(e.target.value);
                                                            if (currentDue && val > currentDue) {
                                                                setFeeForm({ ...feeForm, amount: currentDue.toString() });
                                                            } else {
                                                                setFeeForm({ ...feeForm, amount: e.target.value });
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                </div>
                                                {previewAllocations.length > 0 && (
                                                    <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <div className="text-[9px] uppercase font-bold text-white/50 tracking-wider">Allocating to:</div>
                                                        {previewAllocations.map((alloc, idx) => (
                                                            <div key={idx} className="flex justify-between text-[11px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded">
                                                                <span>{alloc.name}</span>
                                                                <span>-₹{alloc.allocated.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-white/70 uppercase">Payment Mode</Label>
                                                    <Select value={feeForm.method} onValueChange={v => setFeeForm({ ...feeForm, method: v })}>
                                                        <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs text-white focus:ring-emerald-500/20"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white border-white/10">
                                                            <SelectItem value="cash">Cash</SelectItem>
                                                            <SelectItem value="upi">UPI / GPay</SelectItem>
                                                            <SelectItem value="cheque">Cheque</SelectItem>
                                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-white/70 uppercase">Date</Label>
                                                    <Input
                                                        type="date"
                                                        required
                                                        className="bg-white/5 border-white/10 h-9 text-xs text-white [color-scheme:dark] focus:ring-emerald-500/20"
                                                        value={feeForm.date}
                                                        onChange={e => setFeeForm({ ...feeForm, date: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-white/70 uppercase">Remarks (Optional)</Label>
                                                <Input
                                                    placeholder="e.g. Receipt #123"
                                                    className="bg-white/5 border-white/10 h-9 text-xs text-white focus:ring-emerald-500/20"
                                                    value={feeForm.remarks}
                                                    onChange={e => setFeeForm({ ...feeForm, remarks: e.target.value })}
                                                />
                                            </div>
                                            <DialogFooter className="pt-2">
                                                <Button type="submit" disabled={collectingFee} className="w-full h-12 text-sm font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all">
                                                    {collectingFee ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    )}
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Button disabled size="sm" className="h-8 md:h-9 text-xs bg-[#00D98B]/50 text-[#071A3A]/50 rounded-lg cursor-not-allowed">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Record Fee
                            </Button>
                        )}
                    </div>
                </div>

                {/* Compact KPI Row */}
                <div className="grid grid-cols-3 gap-2 shrink-0">
                    <div className="bg-[#0B2247] border border-[rgba(255,255,255,0.06)] shadow-sm rounded-lg p-2.5 flex items-center justify-center md:justify-start gap-2.5">
                        <div className="hidden md:flex w-7 h-7 rounded bg-[#00D98B]/10 items-center justify-center shrink-0">
                            <Wallet className="w-3.5 h-3.5 text-[#00D98B]" />
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 w-full">
                            <span className="text-[9px] font-bold text-[#9AA7C7] uppercase tracking-widest leading-none">Total</span>
                            <span className="text-[13px] md:text-base font-bold text-[#00D98B] font-mono leading-none mt-1 truncate w-full">
                                {loading ? "..." : `₹${dynamicStats.total.toLocaleString()}`}
                            </span>
                        </div>
                    </div>
                    <div className="bg-[#0B2247] border border-[rgba(255,255,255,0.06)] shadow-sm rounded-lg p-2.5 flex items-center justify-center md:justify-start gap-2.5">
                        <div className="hidden md:flex w-7 h-7 rounded bg-[#3B82F6]/10 items-center justify-center shrink-0">
                            <CreditCard className="w-3.5 h-3.5 text-[#3B82F6]" />
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 w-full">
                            <span className="text-[9px] font-bold text-[#9AA7C7] uppercase tracking-widest leading-none">Online</span>
                            <span className="text-[13px] md:text-base font-bold text-[#3B82F6] font-mono leading-none mt-1 truncate w-full">
                                {loading ? "..." : `₹${dynamicStats.online.toLocaleString()}`}
                            </span>
                        </div>
                    </div>
                    <div className="bg-[#0B2247] border border-[rgba(255,255,255,0.06)] shadow-sm rounded-lg p-2.5 flex items-center justify-center md:justify-start gap-2.5">
                        <div className="hidden md:flex w-7 h-7 rounded bg-[#FFA629]/10 items-center justify-center shrink-0">
                            <Banknote className="w-3.5 h-3.5 text-[#FFA629]" />
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 w-full">
                            <span className="text-[9px] font-bold text-[#9AA7C7] uppercase tracking-widest leading-none">Cash</span>
                            <span className="text-[13px] md:text-base font-bold text-[#FFA629] font-mono leading-none mt-1 truncate w-full">
                                {loading ? "..." : `₹${dynamicStats.cash.toLocaleString()}`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Inline Search + Filters Row */}
                <div className="flex flex-col md:flex-row gap-2 shrink-0">
                    <div className="relative flex-grow min-w-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9AA7C7]" />
                        <Input 
                            placeholder="Search payments..."
                            className="w-full h-8 bg-[#0B2247] border-[rgba(255,255,255,0.06)] rounded-lg pl-8 pr-2 text-white placeholder:text-[#9AA7C7] text-xs focus-visible:ring-[#00D98B]/30"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide shrink-0 snap-x">
                        <Select value={selectedMethodFilter} onValueChange={setSelectedMethodFilter}>
                            <SelectTrigger className="h-8 w-fit min-w-[120px] bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[10px] font-medium px-2.5 snap-start">
                                <div className="flex items-center gap-1.5">
                                    <CreditCard className="w-3 h-3 text-[#9AA7C7]" />
                                    <SelectValue placeholder="All Methods" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                                <SelectItem value="ALL" className="text-xs">All Methods</SelectItem>
                                <SelectItem value="CASH" className="text-xs">Cash</SelectItem>
                                <SelectItem value="ONLINE" className="text-xs">Online / UPI / Card</SelectItem>
                                <SelectItem value="BANK" className="text-xs">Bank / Cheque</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                            <SelectTrigger className="h-8 w-fit min-w-[110px] bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[10px] font-medium px-2.5 snap-start">
                                <div className="flex items-center gap-1.5">
                                    <GraduationCap className="w-3 h-3 text-[#9AA7C7]" />
                                    <SelectValue placeholder="All Classes" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                                <SelectItem value="ALL" className="text-xs">All Classes</SelectItem>
                                {Object.entries(classes).map(([id, cls]: any) => (
                                    <SelectItem key={id} value={id} className="text-xs">{cls.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedVillageFilter} onValueChange={setSelectedVillageFilter}>
                            <SelectTrigger className="h-8 w-fit min-w-[110px] bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[10px] font-medium px-2.5 snap-start">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-[#9AA7C7]" />
                                    <SelectValue placeholder="All Villages" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                                <SelectItem value="ALL" className="text-xs">All Villages</SelectItem>
                                {Object.entries(villages).map(([id, vil]: any) => (
                                    <SelectItem key={id} value={id} className="text-xs">{vil.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table / List Container */}
                <div className="bg-[#0B2247] border border-[rgba(255,255,255,0.06)] rounded-lg flex-1 flex flex-col overflow-hidden shadow min-h-0 relative">
                    
                    {/* Desktop Header */}
                    <div className="hidden md:flex h-10 items-center px-4 border-b border-[rgba(255,255,255,0.06)] text-[11px] font-bold text-[#9AA7C7] uppercase tracking-wider bg-[#0B2247] shrink-0 divide-x divide-[rgba(255,255,255,0.06)]">
                        <div className="w-[40px] shrink-0 text-center pl-1 pr-2">#</div>
                        <div className="w-[200px] shrink-0 px-3">Student Info</div>
                        <div className="w-[180px] shrink-0 px-3">Payment Info</div>
                        <div className="flex-1 min-w-[200px] px-3">Remarks & Meta</div>
                        <div className="w-[140px] shrink-0 text-right px-3">Date & Time</div>
                        <div className="w-[60px] shrink-0 text-center pl-2">Acts</div>
                    </div>

                    {/* Mobile Header (Strictly fits screen) */}
                    <div className="flex md:hidden h-8 items-center px-1 border-b border-[rgba(255,255,255,0.06)] text-[9px] font-bold text-[#9AA7C7] uppercase tracking-wider bg-[#0B2247] shrink-0 divide-x divide-[rgba(255,255,255,0.06)]">
                        <div className="w-[70px] shrink-0 px-1 text-center truncate"># / ID</div>
                        <div className="flex-1 min-w-0 px-1 truncate">Name/Date</div>
                        <div className="w-[65px] shrink-0 text-right px-1 truncate">Amt</div>
                        <div className="w-[45px] shrink-0 text-center px-1 truncate">Acts</div>
                    </div>
                    
                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
                        {loading ? (
                            <div className="p-4 text-center text-[#9AA7C7] flex items-center justify-center gap-2 text-xs">
                                <Loader2 className="animate-spin w-4 h-4 text-[#00D98B]" />
                                Loading...
                            </div>
                        ) : filteredPayments.length === 0 ? (
                            <div className="p-4 text-center text-[#9AA7C7] text-xs">
                                No transactions found.
                            </div>
                        ) : (
                            filteredPayments.map((p, idx) => {
                                const student = allStudents.find(s => s.id === p.studentId || s.schoolId === p.studentId);
                                const className = student?.className || "Class N/A";
                                const formattedNum = (idx + 1).toString().padStart(2, '0');
                                
                                let methodColor = "text-white";
                                let methodBg = "bg-white/5 border-white/10";
                                
                                const methodLower = (p.method || "").toLowerCase();
                                if (methodLower.includes("cash")) {
                                    methodColor = "text-[#00D98B] border-[#00D98B]/20 bg-[#00D98B]/10";
                                } else if (methodLower.includes("upi") || methodLower.includes("gpay")) {
                                    methodColor = "text-[#A855F7] border-purple-500/20 bg-purple-500/10";
                                } else if (methodLower.includes("card")) {
                                    methodColor = "text-[#3B82F6] border-blue-500/20 bg-blue-500/10";
                                } else if (methodLower.includes("bank") || methodLower.includes("transfer") || methodLower.includes("cheque")) {
                                    methodColor = "text-[#FFA629] border-orange-500/20 bg-orange-500/10";
                                }

                                return (
                                    <div key={p.id} className="flex flex-col hover:bg-white/[0.02] transition-colors border-b border-[rgba(255,255,255,0.04)] last:border-0 relative">
                                        
                                        {/* Mobile Row */}
                                        <div className="flex md:hidden items-center min-h-[60px] py-1.5 px-1 w-full border-b border-[rgba(255,255,255,0.04)] last:border-0 relative divide-x divide-[rgba(255,255,255,0.06)]">
                                            {/* ID & Class */}
                                            <div className="flex flex-col w-[70px] shrink-0 justify-center px-1 items-center min-w-0 overflow-hidden">
                                                <span className="text-[10px] text-[#9AA7C7] font-mono font-bold leading-tight mb-0.5 w-full truncate text-center">
                                                    {formattedNum}. <span className="text-white">{student?.schoolId || p.studentId?.substring(0, 5)}</span>
                                                </span>
                                                <span className="text-[8px] text-[#9AA7C7] leading-tight truncate w-full text-center">{className}</span>
                                            </div>
                                            
                                            {/* Name & Date */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center px-1">
                                                <span className="text-[11px] font-extrabold text-white truncate leading-tight mb-0.5">{p.studentName}</span>
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="text-[9px] text-[#9AA7C7] font-medium leading-tight shrink-0">{formatPaymentDate(p.date)}</span>
                                                    {p.isEdited && <span className="text-[8px] text-[#FFA629] font-bold border border-[#FFA629]/20 px-1 rounded uppercase tracking-widest bg-[#FFA629]/10 leading-none py-0.5 shrink-0">Edited</span>}
                                                </div>
                                            </div>
                                            
                                            {/* Amount & Method */}
                                            <div className="w-[65px] shrink-0 flex flex-col items-end justify-center px-1 min-w-0">
                                                <span className="text-[11px] font-black text-[#00D98B] font-mono leading-tight mb-0.5 truncate w-full text-right">₹{p.amount.toLocaleString()}</span>
                                                <span className={cn("px-1 py-[2px] rounded text-[8px] w-fit font-bold capitalize border leading-none truncate max-w-full", methodBg, methodColor)}>{p.method}</span>
                                            </div>
                                            
                                            {/* Actions (Stacked Vertically to save horizontal space) */}
                                            <div className="w-[45px] shrink-0 flex flex-col items-center justify-center gap-1.5 px-0.5">
                                                <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(p)} className="h-5 w-5 text-white hover:bg-white/10 rounded p-0 shrink-0 bg-white/5">
                                                    <Printer className="w-3 h-3 text-[#9AA7C7]" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditForm({
                                                        amount: p.amount.toString(),
                                                        method: p.method,
                                                        date: p.date?.toDate ? p.date.toDate().toISOString().split('T')[0] : new Date(p.date?.seconds ? p.date.seconds * 1000 : p.date).toISOString().split('T')[0],
                                                        remarks: p.remarks || ""
                                                    });
                                                    setEditPaymentObj(p);
                                                    setActiveDropdown(null);
                                                }} className="h-5 w-5 text-white hover:bg-white/10 rounded p-0 shrink-0 bg-[#00D98B]/5">
                                                    <Edit2 className="w-3 h-3 text-[#00D98B]" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Desktop Row */}
                                        <div className="hidden md:flex items-center min-h-[64px] py-2 px-4 w-full divide-x divide-[rgba(255,255,255,0.06)] hover:bg-white/[0.04] transition-colors">
                                            <div className="w-[40px] shrink-0 text-sm text-[#9AA7C7] font-mono font-medium text-center pl-1 pr-2">{formattedNum}</div>
                                            
                                            <div className="w-[200px] shrink-0 px-3 flex flex-col justify-center gap-0.5">
                                                <span className="text-sm font-bold text-white truncate" title={p.studentName}>{p.studentName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#9AA7C7] font-mono">{p.studentId}</span>
                                                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-[#9AA7C7] font-bold">{className}</span>
                                                </div>
                                            </div>

                                            <div className="w-[180px] shrink-0 px-3 flex flex-col justify-center gap-1.5">
                                                <span className="text-base font-black text-[#00D98B] font-mono leading-none">₹{p.amount.toLocaleString()}</span>
                                                <div className={cn("px-2 py-0.5 rounded text-[10px] w-fit font-bold capitalize border leading-none", methodBg, methodColor)}>{p.method}</div>
                                                
                                                {/* Allocations Breakdown */}
                                                {p.allocations && p.allocations.length > 0 && (
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        {p.allocations.map((a, i) => (
                                                            <div key={i} className="text-[9px] flex justify-between items-center text-white/70 bg-white/5 px-1.5 py-0.5 rounded">
                                                                <span className="truncate max-w-[90px] font-medium">{a.name}</span>
                                                                <span className="font-mono font-bold text-[#00D98B]">₹{a.amount}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {(!p.allocations || p.allocations.length === 0) && (
                                                    <div className="text-[9px] flex justify-between items-center text-white/50 bg-white/5 px-1.5 py-0.5 rounded mt-1 italic">
                                                        <span>General Payment</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-[200px] px-3 flex flex-col justify-center gap-1">
                                                {p.remarks ? (
                                                    <span className="text-[13px] text-white/90 line-clamp-2 leading-tight" title={p.remarks}>{p.remarks}</span>
                                                ) : (
                                                    <span className="text-xs text-white/30 italic">No remarks provided</span>
                                                )}
                                                <span className="text-[10px] text-[#9AA7C7]">Collected by: <span className="text-white/70 font-medium">{p.adminName || p.adminId || "Admin"}</span></span>
                                            </div>

                                            <div className="w-[140px] shrink-0 px-3 flex flex-col items-end justify-center">
                                                <span className="text-[13px] text-white/90 font-medium">{formatPaymentDate(p.date)}</span>
                                                <span className="text-xs text-[#9AA7C7] font-mono mt-0.5">{formatPaymentTime(p.date)}</span>
                                                {p.isEdited && <span className="text-[9px] text-[#FFA629] mt-1 border border-[#FFA629]/30 bg-[#FFA629]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest leading-none">Edited</span>}
                                            </div>

                                            <div className="w-[60px] shrink-0 flex items-center justify-center gap-1 pl-2">
                                                <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(p)} className="h-7 w-7 text-[#9AA7C7] hover:text-white hover:bg-white/10 rounded shrink-0 p-0" title="Print Receipt">
                                                    <Printer className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === p.id ? null : p.id);
                                                    }} 
                                                    className="h-7 w-7 text-[#9AA7C7] hover:text-white hover:bg-white/10 rounded shrink-0 p-0"
                                                >
                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Shared Dropdown */}
                                        {activeDropdown === p.id && (
                                            <div className="absolute right-4 top-8 md:right-0 md:top-8 z-[9999] bg-[#071A3A] border border-[rgba(255,255,255,0.1)] rounded shadow-2xl py-1 w-32 flex flex-col overflow-hidden">
                                                <button 
                                                    className="w-full text-left px-3 py-2 text-[10px] text-white hover:bg-white/5 flex items-center gap-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditForm({
                                                            amount: p.amount.toString(),
                                                            method: p.method,
                                                            date: p.date?.toDate ? p.date.toDate().toISOString().split('T')[0] : new Date(p.date?.seconds ? p.date.seconds * 1000 : p.date).toISOString().split('T')[0],
                                                            remarks: p.remarks || ""
                                                        });
                                                        setEditPaymentObj(p);
                                                        setActiveDropdown(null);
                                                    }}
                                                >
                                                    <Edit2 className="w-3 h-3 text-[#00D98B]" /> Edit Payment
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Compact Pagination */}
                <div className="flex items-center justify-between pt-1 shrink-0">
                    <span className="text-[10px] font-medium text-[#9AA7C7]">
                        Showing {filteredPayments.length} Payments
                    </span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-[#9AA7C7] hover:text-white hover:bg-[#0B2247] rounded border border-[rgba(255,255,255,0.06)] shrink-0 p-0">
                            <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <Button className="w-6 h-6 p-0 text-[9px] text-[#071A3A] font-bold bg-[#00D98B] hover:bg-[#00D98B]/90 rounded shadow shrink-0">
                            1
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-[#9AA7C7] hover:text-white hover:bg-[#0B2247] rounded border border-[rgba(255,255,255,0.06)] shrink-0 p-0">
                            <ChevronRight className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Edit Payment Dialog */}
                <Dialog open={!!editPaymentObj} onOpenChange={(v) => !v && setEditPaymentObj(null)}>
                    <DialogContent className="bg-[#071A3A] border-[rgba(255,255,255,.06)] backdrop-blur-xl sm:max-w-md w-[95vw] rounded-2xl text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-[#00D98B]" /> Edit Payment
                            </DialogTitle>
                        </DialogHeader>
                        {editPaymentObj && (
                            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Amount (₹)</Label>
                                    <Input
                                        required
                                        type="number"
                                        min="1"
                                        className="bg-[#0B2247] border-[rgba(255,255,255,.06)] font-mono text-lg text-white"
                                        value={editForm.amount}
                                        onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Payment Mode</Label>
                                        <Select value={editForm.method} onValueChange={v => setEditForm({ ...editForm, method: v })}>
                                            <SelectTrigger className="bg-[#0B2247] border-[rgba(255,255,255,.06)] text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,.06)] text-white">
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="upi">UPI / GPay</SelectItem>
                                                <SelectItem value="cheque">Cheque</SelectItem>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Remarks</Label>
                                        <Input
                                            className="bg-[#0B2247] border-[rgba(255,255,255,.06)] text-white"
                                            value={editForm.remarks}
                                            onChange={e => setEditForm({ ...editForm, remarks: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setEditPaymentObj(null)} className="text-[#9AA7C7] hover:text-white hover:bg-white/5">Cancel</Button>
                                    <Button type="submit" className="bg-[#00D98B] hover:bg-[#00D98B]/90 text-[#071A3A] font-bold">
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
