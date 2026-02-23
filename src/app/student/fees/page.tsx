"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Wallet, History, FileText, Printer } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { printPaymentReceipt } from "@/lib/export-utils";

export default function StudentFeesPage() {
    const { user } = useAuth();
    const [ledger, setLedger] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<any>(null);

    useEffect(() => {
        if (!user?.email) return;

        const schoolIdFromEmail = user.email.split('@')[0].toUpperCase();
        let unsubLedger: (() => void) | null = null;
        let unsubPayments: (() => void) | null = null;

        const setupChildListeners = (student: any, docId: string) => {
            const sId = student.schoolId || docId;
            setStudentId(sId);
            setStudentData(student);

            // 1. Listen to Ledger
            if (unsubLedger) unsubLedger();
            const yearId = "2025-2026";
            unsubLedger = onSnapshot(doc(db, "student_fee_ledgers", `${sId}_${yearId}`), (lSnap) => {
                if (lSnap.exists()) setLedger(lSnap.data());
                setLoading(false);
            }, (err) => {
                console.error("Ledger sync error:", err);
                setLoading(false);
            });

            // 2. Listen to Payments
            if (unsubPayments) unsubPayments();
            const pxQ = query(collection(db, "payments"), where("studentId", "==", sId), orderBy("date", "desc"), limit(20));
            unsubPayments = onSnapshot(pxQ, (pxSnap) => {
                setTransactions(pxSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (err) => {
                console.warn("Payments sync error (index?):", err);
                // Fallback query without orderBy if index is missing
                const pxQ2 = query(collection(db, "payments"), where("studentId", "==", sId));
                onSnapshot(pxQ2, (pxSnap2) => {
                    const sorted = pxSnap2.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
                    setTransactions(sorted);
                });
            });
        };

        // 1. Listen to Student Profile (Dual Strategy)
        const unsubProfile = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                setupChildListeners(pSnap.data(), pSnap.id);
            } else if (user.uid) {
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const unsubQuery = onSnapshot(q, (qSnap) => {
                    if (!qSnap.empty) setupChildListeners(qSnap.docs[0].data(), qSnap.docs[0].id);
                    else setLoading(false);
                });
            } else {
                setLoading(false);
            }
        }, (err) => {
            console.error("Profile sync error:", err);
            setLoading(false);
        });

        return () => {
            unsubProfile();
            if (unsubLedger) unsubLedger();
            if (unsubPayments) unsubPayments();
        };
    }, [user]);

    const fetchFees = () => { }; // No longer used, but kept to avoid breaking other calls if any

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePay = async (amount: number) => {
        setPaying(true);
        try {
            const res = await loadRazorpay();
            if (!res) {
                alert("Razorpay SDK failed to load. Are you online?");
                return;
            }

            // 1. Create Order
            const orderRes = await fetch("/api/payments/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, currency: "INR" })
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const order = await orderRes.json();

            // 2. Options
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Spoorthy School",
                description: "Fee Payment",
                order_id: order.id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await fetch("/api/payments/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                studentId: studentId,
                                studentName: studentData?.studentName || "Student",
                                amount: amount,
                                ledger: ledger
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok) {
                            alert("Payment Successful! Receipt generated.");
                            fetchFees(); // Refresh data
                        } else {
                            alert("Payment Verification Failed: " + verifyData.error);
                        }
                    } catch (err) {
                        alert("Payment verification failed due to network error.");
                    }
                },
                prefill: {
                    name: studentData?.studentName,
                    email: user?.email,
                    contact: studentData?.parentMobile
                },
                theme: {
                    color: "#3B82F6"
                }
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.open();

        } catch (error: any) {
            console.error(error);
            alert("Payment initialization failed: " + error.message);
        } finally {
            setPaying(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center text-[#E6F1FF]"><Loader2 className="animate-spin" /></div>;

    const ledgerItems = ledger?.items || [];
    const totalDue = ledgerItems.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[#E6F1FF]">Fee Payment</h1>
                <Badge variant={totalDue <= 0 ? "default" : "destructive"} className={totalDue <= 0 ? "bg-green-500/20 text-green-400" : ""}>
                    {totalDue <= 0 ? "All Dues Cleared" : "Payment Pending"}
                </Badge>
            </div>

            {/* Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Due Amount Card */}
                <Card className="bg-[#112240] border-[#64FFDA]/10 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-[#64FFDA] flex items-center gap-2">
                            <Wallet className="w-5 h-5" /> Total Payable
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-[#E6F1FF] font-mono">
                            ₹ {totalDue.toLocaleString()}
                        </div>
                        <p className="text-sm text-[#8892B0] mt-2 mb-6">
                            Outstanding amount for current academic year.
                        </p>

                        {totalDue > 0 ? (
                            <Button
                                onClick={() => handlePay(totalDue)}
                                disabled={paying}
                                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold h-12 text-lg shadow-[0_0_20px_-5px_#3B82F6]"
                            >
                                {paying ? <Loader2 className="animate-spin mr-2" /> : "Make Payment Now"}
                            </Button>
                        ) : (
                            <div className="flex items-center justify-center p-4 bg-green-500/10 rounded-lg text-green-400 font-medium">
                                <CheckCircle className="mr-2 h-5 w-5" /> No Dues Pending
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Transaction History */}
                <Card className="bg-[#112240] border-[#64FFDA]/10 lg:col-span-2 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-[#E6F1FF] flex items-center gap-2">
                            <History className="w-5 h-5" /> Payment History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto max-h-[300px] scrollbar-thin scrollbar-thumb-white/10">
                        {transactions.length === 0 ? (
                            <div className="text-center py-10 text-[#8892B0]">
                                No payment history found.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded bg-[#0A192F]/50 border border-white/5 hover:border-[#64FFDA]/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-green-500/10 text-green-400">
                                                <CheckCircle size={16} />
                                            </div>
                                            <div>
                                                <div className="font-mono text-[#E6F1FF]">
                                                    ₹{Number(tx.amount).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-[#8892B0] flex gap-2">
                                                    <span>{tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : 'N/A'}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{tx.method}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-[#64FFDA]/20 text-[#64FFDA] hover:bg-[#64FFDA]/10"
                                            onClick={() => printPaymentReceipt({ payment: tx, student: studentData, ledger })}
                                        >
                                            <Printer className="w-3 h-3 mr-2" /> Receipt
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Fee Structure / Ledger Breakdown */}
            <Card className="bg-[#112240] border-[#64FFDA]/10">
                <CardHeader>
                    <CardTitle className="text-[#E6F1FF] flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Fee Payment Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!ledgerItems.length ? (
                        <div className="text-center py-10 text-[#8892B0]">No active fee structure assigned.</div>
                    ) : (
                        <div className="space-y-4">
                            {ledgerItems.map((item: any, i: number) => {
                                const paid = item.paidAmount || 0;
                                const due = item.amount - paid;
                                const isPaid = due <= 0;

                                return (
                                    <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-[#0A192F]/50 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="mb-2 md:mb-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg text-[#E6F1FF]">{item.name}</span>
                                                <Badge variant="outline" className="text-xs border-white/10 text-[#8892B0] uppercase">{item.type || "FEE"}</Badge>
                                            </div>
                                            <div className="text-sm text-[#8892B0] mt-1">Due Date: {item.dueDate || "N/A"}</div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xs text-[#8892B0] uppercase tracking-wider mb-1">Status</div>
                                                <div className={`font-bold text-sm ${isPaid ? "text-green-400" : "text-yellow-400"}`}>
                                                    {isPaid ? "PAID" : "PENDING"}
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[100px]">
                                                <div className="text-xs text-[#8892B0] uppercase tracking-wider mb-1">Amount</div>
                                                <div className="font-mono text-xl text-[#E6F1FF]">₹ {item.amount.toLocaleString()}</div>
                                                {paid > 0 && !isPaid && (
                                                    <div className="text-xs text-green-400">Paid: ₹{paid.toLocaleString()}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
