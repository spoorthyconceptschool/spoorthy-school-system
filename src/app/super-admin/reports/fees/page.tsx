"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Printer, Upload, Wallet, CreditCard, Banknote, Calendar, ChevronLeft, ChevronRight, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useMasterData } from "@/context/MasterDataContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
}

export default function SuperAdminFeeCollectionReport() {
    const router = useRouter();
    const { user, userData, branchId: userBranchId, role } = useAuth();
    const { selectedBranchId } = useBranch();
    const activeBranchId = selectedBranchId || (role === "SUPER_ADMIN" ? "global" : (userBranchId || userData?.schoolId));

    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [paymentsLoaded, setPaymentsLoaded] = useState(false);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [studentsLoaded, setStudentsLoaded] = useState(false);
    
    const { selectedYear, branding } = useMasterData();

    // Print Receipt State
    const [receiptData, setReceiptData] = useState<Payment | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDateFilter, setSelectedDateFilter] = useState("ALL");
    const [selectedMethodFilter, setSelectedMethodFilter] = useState("ALL");

    useEffect(() => {
        if (!selectedYear) return;
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
            
            loaded.sort((a, b) => {
                const getMs = (dateVal: any) => {
                    if (!dateVal) return 0;
                    if (dateVal.toDate) return dateVal.toDate().getTime();
                    if (dateVal.seconds) return dateVal.seconds * 1000;
                    return new Date(dateVal).getTime();
                };
                return getMs(b.date) - getMs(a.date);
            });
            setAllPayments(loaded);
            setPaymentsLoaded(true);
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
            setAllStudents(loaded);
            setStudentsLoaded(true);
        });

        return () => {
            isMounted = false;
            unsubPayments();
            unsubStudents();
        };
    }, [selectedYear, activeBranchId]);

    const yearPayments = allPayments.filter(p => !selectedYear || p.academicYear === selectedYear);

    const filteredPayments = yearPayments.filter((p) => {
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
            if (!matchesName && !matchesId && !matchesRemarks) return false;
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

    const formatPaymentDate = (date: any) => {
        if (!date) return "N/A";
        if (date.toDate) return date.toDate().toLocaleDateString('en-GB');
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-GB');
        return new Date(date).toLocaleDateString('en-GB');
    };

    const loading = !paymentsLoaded || !studentsLoaded;

    return (
        <div className="w-full min-h-screen text-white flex flex-col font-sans bg-[#071A3A] animate-in fade-in duration-500 pb-20">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
                
                {/* Back Button and Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex flex-col">
                        <Button 
                            variant="ghost" 
                            onClick={() => router.push('/super-admin/reports')}
                            className="text-[#9AA7C7] hover:text-white px-0 h-8 font-bold tracking-tight text-sm flex items-center transition-colors w-fit -ml-2 pl-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
                        </Button>
                        <h1 className="text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent italic leading-tight pt-2">
                            Fee Collection Report
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm tracking-widest uppercase font-black opacity-90">
                            Total Records: <span className="text-emerald-400">{filteredPayments.length}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Button 
                            variant="outline" 
                            onClick={() => window.print()}
                            className="bg-black/20 border-white/10 hover:bg-white/5 text-white rounded-xl font-black uppercase tracking-tighter shadow-lg text-xs h-10 px-4"
                        >
                            <Printer className="w-4 h-4 mr-2" /> Print Report
                        </Button>
                        <Button 
                            variant="outline"
                            className="bg-[#00D98B]/10 border-[#00D98B]/20 hover:bg-[#00D98B]/20 text-[#00D98B] rounded-xl font-black uppercase tracking-tighter shadow-lg text-xs h-10 px-4"
                        >
                            <Upload className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0B2247] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Wallet className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Total Collection</span>
                            <span className="text-2xl font-black text-white font-mono">₹{loading ? "..." : dynamicStats.total.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-[#0B2247] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <CreditCard className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Online Payments</span>
                            <span className="text-2xl font-black text-white font-mono">₹{loading ? "..." : dynamicStats.online.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-[#0B2247] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Banknote className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Cash Collections</span>
                            <span className="text-2xl font-black text-white font-mono">₹{loading ? "..." : dynamicStats.cash.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-[#0B2247]/50 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Search by student name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/20 border-white/10 text-white rounded-xl h-12 focus:ring-emerald-500/30"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
                            <SelectTrigger className="w-full md:w-[150px] bg-black/20 border-white/10 text-white rounded-xl h-12">
                                <SelectValue placeholder="All Time" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B2247] border-white/10 text-white">
                                <SelectItem value="ALL">All Time</SelectItem>
                                <SelectItem value="TODAY">Today</SelectItem>
                                <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                                <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                                <SelectItem value="THIS_MONTH">This Month</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedMethodFilter} onValueChange={setSelectedMethodFilter}>
                            <SelectTrigger className="w-full md:w-[150px] bg-black/20 border-white/10 text-white rounded-xl h-12">
                                <SelectValue placeholder="All Methods" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B2247] border-white/10 text-white">
                                <SelectItem value="ALL">All Methods</SelectItem>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="ONLINE">Online</SelectItem>
                                <SelectItem value="BANK">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Report Table */}
                <div className="bg-[#0B2247] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-black/20 text-[#9AA7C7] text-xs font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Receipt #</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-right">Date</th>
                                    <th className="px-6 py-4 text-center print:hidden">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                                            <p className="mt-4 text-white/50 text-xs uppercase font-bold tracking-widest">Loading Report Data...</p>
                                        </td>
                                    </tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-white/50">
                                            No transactions found for the selected criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((p, idx) => {
                                        const student = allStudents.find(s => s.id === p.studentId || s.schoolId === p.studentId);
                                        return (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-mono text-white/50 text-xs">
                                                    #{p.id.slice(0,8).toUpperCase()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white">{p.studentName}</span>
                                                        <span className="text-[10px] text-white/40 font-mono tracking-wider">{p.studentId} • {student?.className || "Unknown Class"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border",
                                                        p.method === "cash" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                                                        p.method === "bank_transfer" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                                                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    )}>
                                                        {p.method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-black text-emerald-400 font-mono text-base">₹{p.amount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-white font-bold">{formatPaymentDate(p.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center print:hidden">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => setReceiptData(p)}
                                                        className="text-[#9AA7C7] hover:text-emerald-400 hover:bg-emerald-400/10"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
                <DialogContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white sm:max-w-md print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full border-white/10">
                    <DialogHeader className="print:hidden">
                        <DialogTitle className="text-emerald-400 flex items-center gap-2">Fee Receipt</DialogTitle>
                    </DialogHeader>
                    {receiptData && (
                        <div className="space-y-6 pt-4 print:p-0">
                            <div className="text-center space-y-2 border-b border-white/10 pb-6 print:border-black/10">
                                {branding?.schoolLogo && <img src={branding.schoolLogo} alt="School Logo" className="w-16 h-16 mx-auto object-contain hidden print:block mb-4" />}
                                <h2 className="text-2xl font-bold font-display uppercase tracking-widest print:text-black">{branding?.schoolName || "SPOORTHY HIGH SCHOOL"}</h2>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold print:text-black/60">Fee Receipt</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm print:text-black">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Receipt No</p>
                                    <p className="font-mono font-bold text-emerald-400 print:text-black">{receiptData.id?.slice(0,8).toUpperCase() || "N/A"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Date</p>
                                    <p className="font-mono font-bold print:text-black">
                                        {formatPaymentDate(receiptData.date)}
                                    </p>
                                </div>
                                <div className="col-span-2 bg-white/5 p-4 rounded-xl print:bg-black/5">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black mb-1 print:text-black/60">Received From</p>
                                    <p className="font-bold text-lg print:text-black">{receiptData.studentName}</p>
                                    <p className="text-xs font-mono text-muted-foreground print:text-black/60">ID: {receiptData.studentId}</p>
                                </div>
                                <div className="col-span-2 flex justify-between items-center border-y border-white/10 py-4 print:border-black/10">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Amount Received</p>
                                    <p className="text-2xl font-black text-emerald-400 print:text-black">₹{Number(receiptData.amount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Payment Mode</p>
                                    <p className="font-bold uppercase print:text-black">{receiptData.method}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Cashier</p>
                                    <p className="font-bold print:text-black text-xs">{receiptData.adminName || "Admin"}</p>
                                </div>
                                {receiptData.remarks && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Remarks</p>
                                        <p className="text-xs italic text-white/70 print:text-black/80">{receiptData.remarks}</p>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="print:hidden sm:justify-between pt-4 border-t border-white/10">
                                <Button variant="outline" onClick={() => setReceiptData(null)} className="bg-white/5 border-white/10 hover:bg-white/10">
                                    Done
                                </Button>
                                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                    <Printer className="w-4 h-4" /> Print Receipt
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
