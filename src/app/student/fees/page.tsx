"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStudentData } from "@/context/StudentDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    CheckCircle,
    Wallet,
    History,
    Printer,
    CreditCard,
    Clock
} from "lucide-react";
import { printPaymentReceipt } from "@/lib/export-utils";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentFeesPage() {
    const { user } = useAuth();
    const { profile, ledger, transactions, loading } = useStudentData();

    const formatToDDMMYY = (dateVal: any) => {
        if (!dateVal) return "";
        let d: Date;
        if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
            d = new Date(dateVal.seconds * 1000);
        } else {
            d = new Date(dateVal);
        }
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    };

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({});
    const [paying, setPaying] = useState(false);
    const [activeTab, setActiveTab] = useState<'dues' | 'checkout' | 'history'>('dues');

    // Auto-select unpaid items and calculate initial payment amounts
    useEffect(() => {
        if (!ledger) return;
        const initialSelected = new Set<string>();
        const initialAmounts: { [key: string]: string } = {};
        const rawItems = ledger.items || [];
        const totalReduction = rawItems
            .filter((i: any) => i.amount < 0)
            .reduce((s: number, i: any) => s + Math.abs(i.amount - (i.paidAmount || 0)), 0);
        let reductionRemaining = totalReduction;

        rawItems.filter((i: any) => i.amount > 0).forEach((item: any) => {
            const remaining = item.amount - (item.paidAmount || 0);
            const discountForThisItem = Math.min(remaining, reductionRemaining);
            const netRemaining = remaining - discountForThisItem;
            reductionRemaining -= discountForThisItem;

            if (netRemaining > 0) {
                initialSelected.add(item.id);
                initialAmounts[item.id] = netRemaining.toString();
            }
        });
        setSelectedItems(initialSelected);
        setPaymentAmounts(initialAmounts);
    }, [ledger]);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleToggleItem = (itemId: string, remaining: number) => {
        if (remaining < 0) return; // reductions are not individually toggleable

        const next = new Set(selectedItems);
        if (next.has(itemId)) {
            next.delete(itemId);
            const nextAmounts = { ...paymentAmounts };
            delete nextAmounts[itemId];
            setPaymentAmounts(nextAmounts);
        } else {
            next.add(itemId);
            setPaymentAmounts({ ...paymentAmounts, [itemId]: remaining.toString() });
        }
        setSelectedItems(next);
    };

    const handleAmountChange = (itemId: string, val: string, max: number) => {
        const numeric = val.replace(/[^0-9.-]/g, "");

        if (max < 0) {
            if (Number(numeric) < max) return;
            if (Number(numeric) > 0) return;
        } else {
            if (Number(numeric) > max) return;
            if (Number(numeric) < 0) return;
        }

        setPaymentAmounts({ ...paymentAmounts, [itemId]: numeric });
    };

    // Current transactional total based on selected checked items
    const totalToPay = Array.from(selectedItems).reduce((sum, id) => {
        const item = ledger?.items?.find((i: any) => i.id === id);
        const amt = Number(paymentAmounts[id]) || 0;
        return sum + (item && item.amount > 0 ? amt : 0);
    }, 0);

    const handlePay = async () => {
        const hasPositiveSelection = Array.from(selectedItems).some(id => {
            const item = ledger?.items?.find((i: any) => i.id === id);
            return item && item.amount > 0 && (Number(paymentAmounts[id]) || 0) > 0;
        });

        if (totalToPay <= 0 && hasPositiveSelection) {
            alert("This selection is fully covered by your scholarship/benefits. No payment is required.");
            return;
        }

        if (totalToPay <= 0) {
            alert("Please select at least one item and enter a valid amount.");
            return;
        }

        setPaying(true);
        try {
            const res = await loadRazorpay();
            if (!res) {
                alert("Razorpay SDK failed to load. Are you online?");
                return;
            }

            // 1. Create Order via Backend API
            const orderRes = await fetch("/api/payments/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: totalToPay, currency: "INR" })
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const order = await orderRes.json();

            const studentId = profile?.schoolId || profile?.id;

            // 2. Options
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Spoorthy Concept School",
                description: `Fee Payment - ${profile?.studentName}`,
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
                                studentName: profile?.studentName || "Student",
                                amount: totalToPay,
                                ledger: ledger
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok) {
                            alert("Payment Successful! Receipt generated.");
                            window.location.reload(); // Refresh to rebuild cache context
                        } else {
                            alert("Payment Verification Failed: " + verifyData.error);
                        }
                    } catch (err) {
                        alert("Payment verification failed due to network error.");
                    }
                },
                prefill: {
                    name: profile?.studentName,
                    email: user?.email,
                    contact: profile?.parentMobile
                },
                theme: { color: "#3B82F6" }
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

    if (loading && !ledger) {
        return (
            <div className="h-[45vh] flex flex-col items-center justify-center gap-4 text-[#64FFDA]">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                    Loading outstanding ledger...
                </p>
            </div>
        );
    }

    const ledgerItems = ledger?.items || [];
    const ledgerTotalFee = ledgerItems.reduce((sum: number, i: any) => sum + (i.amount > 0 ? i.amount : 0), 0);
    const ledgerTotalReductions = ledgerItems.reduce((sum: number, i: any) => sum + (i.amount < 0 ? Math.abs(i.amount) : 0), 0);
    const ledgerPendingFee = Math.max(0, ledgerTotalFee - (ledger?.totalPaid || 0) - ledgerTotalReductions);

    const termFees = ledgerItems.filter((i: any) => i.type !== "CUSTOM" && i.amount > 0);
    const customFees = ledgerItems.filter((i: any) => i.type === "CUSTOM" && i.amount > 0);
    const reductions = ledgerItems.filter((i: any) => i.amount < 0);

    return (
        <div className="w-full h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] flex flex-col gap-4">
            {/* Glowing accents */}
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[30%] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Page Header (Shared for Desktop & Mobile) */}
            <div className="flex items-center justify-between gap-4 shrink-0">
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-black text-white tracking-tight truncate">
                        Fee Payment Portal
                    </h1>
                    <p className="text-white/60 font-medium text-xs md:text-sm truncate hidden xs:block">
                        Select individual classes or term elements to pay securely.
                    </p>
                </div>
                <Badge className={ledgerPendingFee <= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1.5 px-3 md:px-4 font-black uppercase tracking-widest text-[9px] md:text-[10px] shrink-0" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 py-1.5 px-3 md:px-4 font-black uppercase tracking-widest text-[9px] md:text-[10px] shrink-0"}>
                    {ledgerPendingFee <= 0 ? "Dues Cleared" : "Payment Outstanding"}
                </Badge>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 relative">
                {/* DESKTOP VIEW */}
                <div className="hidden lg:flex lg:flex-row gap-6 h-full w-full">
                    {/* Left Column: Scrollable Checklists */}
                    <div className="flex-[2] flex flex-col overflow-hidden gap-4 h-full">
                        {reductions.length > 0 && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="font-bold text-emerald-400 text-xs tracking-wide uppercase">
                                            Applied Scholarships / Credits
                                        </h3>
                                        <p className="text-[9px] text-emerald-400/60 font-bold uppercase">
                                            Scholarships are auto-deducted from terms below.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] text-emerald-500/50 uppercase font-black tracking-widest">Total Value</span>
                                    <p className="text-xl font-black text-emerald-400">- ₹{ledgerTotalReductions.toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 min-h-0 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                            {/* Standard Term Fees Checklist */}
                            <div className="bg-[#112240]/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="bg-white/[0.03] px-6 py-4 flex justify-between items-center border-b border-white/10">
                                    <h3 className="font-bold text-white tracking-wide uppercase text-xs">Standard Term Fees</h3>
                                    <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded font-black tracking-widest uppercase">Tuition</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    {(() => {
                                        let rollingReduction = ledgerTotalReductions;
                                        return termFees.length > 0 ? (
                                            termFees.map((item: any) => {
                                                const remaining = item.amount - (item.paidAmount || 0);
                                                const discountForThisItem = Math.min(remaining, rollingReduction);
                                                const netRemaining = Math.max(0, remaining - discountForThisItem);
                                                rollingReduction -= discountForThisItem;

                                                const isSelected = selectedItems.has(item.id);

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${
                                                            isSelected
                                                                ? "bg-[#3B82F6]/10 border-[#3B82F6]/20 shadow-[0_0_15px_-5px_#3B82F6]"
                                                                : "bg-[#0A192F]/60 hover:bg-white/5 border-transparent"
                                                        } ${netRemaining === 0 ? "opacity-60 grayscale-[0.3]" : ""}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            {netRemaining === 0 ? (
                                                                <div className="w-5 h-5 flex items-center justify-center bg-emerald-500 rounded-md">
                                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                                </div>
                                                            ) : (
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => handleToggleItem(item.id, netRemaining)}
                                                                />
                                                            )}
                                                            <div>
                                                                <h4 className="font-bold text-white text-base tracking-tight flex items-center flex-wrap gap-2">
                                                                    {item.name}
                                                                    {discountForThisItem > 0 && (
                                                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                                            ₹{discountForThisItem.toLocaleString()} Deducted
                                                                        </span>
                                                                    )}
                                                                </h4>
                                                                <p className="text-[10px] text-white/40 flex items-center gap-1 uppercase tracking-wider font-bold mt-1">
                                                                    <Clock className="w-3.5 h-3.5 text-white/30" /> Fee: ₹{item.amount.toLocaleString()} • Due: {item.dueDate || "N/A"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6 mt-4 md:mt-0 justify-between md:justify-end">
                                                            <div className="text-right">
                                                                <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Net Balance</span>
                                                                <p className={`font-mono font-bold text-base ${netRemaining === 0 ? "text-emerald-400" : "text-white"}`}>
                                                                    ₹{netRemaining.toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className={`w-32 bg-[#0A192F]/80 rounded-xl border border-white/10 p-1 flex items-center px-3 gap-1.5 ${netRemaining === 0 ? "opacity-25" : ""}`}>
                                                                <span className="text-xs text-white/40 font-bold">₹</span>
                                                                <input
                                                                    type="text"
                                                                    value={paymentAmounts[item.id] || ""}
                                                                    onChange={(e) => handleAmountChange(item.id, e.target.value, netRemaining)}
                                                                    className="bg-transparent border-none outline-none text-sm font-bold w-full text-white"
                                                                    placeholder="0"
                                                                    disabled={!isSelected || netRemaining === 0}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-white/40 text-sm">No standard term tuition assigned.</div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Custom Fees Checklist */}
                            {customFees.length > 0 && (
                                <div className="bg-[#112240]/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                                    <div className="bg-white/[0.03] px-6 py-4 flex justify-between items-center border-b border-white/10">
                                        <h3 className="font-bold text-amber-500 tracking-wide uppercase text-xs">Special / Custom Fees</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {customFees.map((item: any) => {
                                            const remaining = item.amount - (item.paidAmount || 0);
                                            const isSelected = selectedItems.has(item.id);

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${
                                                        isSelected
                                                            ? "bg-amber-500/10 border-amber-500/20"
                                                            : "bg-[#0A192F]/60 hover:bg-white/5 border-transparent"
                                                    } ${remaining === 0 ? "opacity-60 grayscale-[0.3]" : ""}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {remaining === 0 ? (
                                                            <div className="w-5 h-5 flex items-center justify-center bg-emerald-500 rounded-md">
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            </div>
                                                        ) : (
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => handleToggleItem(item.id, remaining)}
                                                                className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                            />
                                                        )}
                                                        <div>
                                                            <h4 className="font-bold text-white text-base tracking-tight">{item.name}</h4>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1">Special / Custom Activity</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 mt-4 md:mt-0 justify-between md:justify-end">
                                                        <div className="text-right">
                                                            <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Balance</span>
                                                            <p className={`font-mono font-bold text-base ${remaining === 0 ? "text-emerald-400" : "text-white"}`}>
                                                                ₹{remaining.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className={`w-32 bg-[#0A192F]/80 rounded-xl border border-white/10 p-1 flex items-center px-3 gap-1.5 ${remaining === 0 ? "opacity-25" : ""}`}>
                                                            <span className="text-xs text-white/40 font-bold">₹</span>
                                                            <input
                                                                type="text"
                                                                value={paymentAmounts[item.id] || ""}
                                                                onChange={(e) => handleAmountChange(item.id, e.target.value, remaining)}
                                                                className="bg-transparent border-none outline-none text-sm font-bold w-full text-white"
                                                                placeholder="0"
                                                                disabled={!isSelected || remaining === 0}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Checkout Summary & History */}
                    <div className="flex-[1.2] flex flex-col gap-4 overflow-hidden h-full">
                        {/* Checkout Card */}
                        <div className="bg-[#112240] p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none" />
                            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
                                <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                                Checkout Summary
                            </h2>

                            <div className="space-y-4 mb-4">
                                <div className="space-y-2 p-3 bg-[#0A192F]/60 rounded-2xl border border-white/5 text-[11px] font-bold font-mono">
                                    <div className="flex justify-between items-center text-white/50">
                                        <span>TUITION TOTAL</span>
                                        <span>₹{ledgerTotalFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-400">
                                        <span>SCHOLARSHIPS</span>
                                        <span>- ₹{ledgerTotalReductions.toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-white/15 my-1" />
                                    <div className="flex justify-between items-center text-[#3B82F6] text-xs">
                                        <span>TOTAL REMAINING</span>
                                        <span>₹{ledgerPendingFee.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5 w-full" />

                                <div className="space-y-1">
                                    <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">
                                        Amount selected to pay
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-bold text-[#3B82F6]">₹</span>
                                        <p className="text-3xl font-black text-white font-mono">
                                            {Math.max(0, totalToPay).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handlePay}
                                disabled={totalToPay === 0 || paying}
                                className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-2xl font-black text-base shadow-[0_10px_25px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2"
                            >
                                {paying ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" /> Pay Selected Fees
                                    </>
                                )}
                            </Button>

                            <p className="text-[8px] text-center text-white/40 mt-3 font-bold tracking-widest uppercase">
                                🔒 Secured Payments powered by Razorpay
                            </p>
                        </div>

                        {/* Transaction History Card */}
                        <Card className="bg-[#112240]/40 border-white/5 shadow-2xl rounded-3xl overflow-hidden flex-1 flex flex-col min-h-0">
                            <CardHeader className="bg-white/[0.01] border-b border-white/5 py-3 px-5 flex justify-between items-center shrink-0">
                                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                    <History className="w-3.5 h-3.5 text-emerald-400" /> Payment History
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-3 min-h-0">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-8 text-white/30 text-[10px] font-bold uppercase tracking-widest italic">
                                        No transaction logs found.
                                    </div>
                                ) : (
                                    transactions.map((tx, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0A192F]/60 border border-white/5 hover:border-emerald-500/20 transition-all"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <div className="font-mono font-bold text-xs text-white">
                                                        ₹{Number(tx.amount).toLocaleString()}
                                                    </div>
                                                    <div className="text-[8px] text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider mt-0.5">
                                                        <span>
                                                            {tx.createdAt?.seconds
                                                                ? formatToDDMMYY(tx.createdAt)
                                                                : tx.date?.seconds
                                                                ? formatToDDMMYY(tx.date)
                                                                : "Recent"}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="text-emerald-400">{tx.method || "ONLINE"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/10 text-white/60 hover:text-white text-[9px] font-bold py-0.5 px-2.5 h-7 rounded-lg"
                                                onClick={() =>
                                                    printPaymentReceipt({
                                                        payment: tx,
                                                        student: profile,
                                                        ledger
                                                    })
                                                }
                                            >
                                                <Printer className="w-3 h-3 mr-1" /> Receipt
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* MOBILE VIEW */}
                <div className="flex lg:hidden flex-col h-full w-full overflow-hidden">
                    {/* Tab Switcher */}
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full select-none shrink-0 mb-3">
                        <button
                            onClick={() => setActiveTab('dues')}
                            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                activeTab === 'dues'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <Wallet className="w-3.5 h-3.5" /> Dues
                        </button>
                        <button
                            onClick={() => setActiveTab('checkout')}
                            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative ${
                                activeTab === 'checkout'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <CreditCard className="w-3.5 h-3.5" /> Pay
                            {totalToPay > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-[#0a192f]">
                                    {selectedItems.size}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                activeTab === 'history'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <History className="w-3.5 h-3.5" /> History
                        </button>
                    </div>

                    {/* Content Panel (Animates transitions) */}
                    <div className="flex-1 min-h-0 relative">
                        <AnimatePresence mode="wait">
                            {activeTab === 'dues' && (
                                <motion.div
                                    key="mobile-dues"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-col h-full w-full gap-3 overflow-y-auto pr-1 pb-4 scrollbar-none"
                                >
                                    {/* Scholarships Info Card */}
                                    {reductions.length > 0 && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between gap-3 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h3 className="font-bold text-emerald-400 text-[10px] tracking-wide uppercase">
                                                        Applied Scholarships
                                                    </h3>
                                                    <p className="text-[8px] text-emerald-400/60 font-bold uppercase">
                                                        Auto-deducted from terms below.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-base font-black text-emerald-400">- ₹{ledgerTotalReductions.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Standard Term Fees Checklist */}
                                    <div className="bg-[#112240]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl shrink-0">
                                        <div className="bg-white/[0.03] px-4 py-3 flex justify-between items-center border-b border-white/10">
                                            <h3 className="font-bold text-white tracking-wide uppercase text-[10px]">Standard Term Fees</h3>
                                            <span className="text-[8px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Tuition</span>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {(() => {
                                                let rollingReduction = ledgerTotalReductions;
                                                return termFees.length > 0 ? (
                                                    termFees.map((item: any) => {
                                                        const remaining = item.amount - (item.paidAmount || 0);
                                                        const discountForThisItem = Math.min(remaining, rollingReduction);
                                                        const netRemaining = Math.max(0, remaining - discountForThisItem);
                                                        rollingReduction -= discountForThisItem;

                                                        const isSelected = selectedItems.has(item.id);

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={`flex flex-col p-3 rounded-xl border transition-all ${
                                                                    isSelected
                                                                        ? "bg-[#3B82F6]/10 border-[#3B82F6]/20 shadow-[0_0_10px_-3px_#3B82F6]"
                                                                        : "bg-[#0A192F]/60 hover:bg-white/5 border-transparent"
                                                                } ${netRemaining === 0 ? "opacity-60 grayscale-[0.3]" : ""}`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    {netRemaining === 0 ? (
                                                                        <div className="w-4 h-4 flex items-center justify-center bg-emerald-500 rounded-md shrink-0 mt-0.5">
                                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    ) : (
                                                                        <Checkbox
                                                                            checked={isSelected}
                                                                            onCheckedChange={() => handleToggleItem(item.id, netRemaining)}
                                                                            className="mt-0.5 shrink-0"
                                                                        />
                                                                    )}
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="font-bold text-white text-xs tracking-tight flex flex-wrap items-center gap-1.5">
                                                                            {item.name}
                                                                            {discountForThisItem > 0 && (
                                                                                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                                                    ₹{discountForThisItem.toLocaleString()} Off
                                                                                </span>
                                                                            )}
                                                                        </h4>
                                                                        <p className="text-[8px] text-white/40 flex items-center gap-1 uppercase tracking-wider font-bold mt-1">
                                                                            <Clock className="w-3 h-3 text-white/30" /> Fee: ₹{item.amount.toLocaleString()} • Due: {item.dueDate || "N/A"}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between gap-4 mt-3 pt-2.5 border-t border-white/5">
                                                                    <div className="text-left">
                                                                        <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">Net Balance</span>
                                                                        <p className={`font-mono font-bold text-xs ${netRemaining === 0 ? "text-emerald-400" : "text-white"}`}>
                                                                            ₹{netRemaining.toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    <div className={`w-28 bg-[#0A192F]/80 rounded-lg border border-white/10 p-0.5 flex items-center px-2 gap-1 ${netRemaining === 0 ? "opacity-25" : ""}`}>
                                                                        <span className="text-[10px] text-white/40 font-bold">₹</span>
                                                                        <input
                                                                            type="text"
                                                                            value={paymentAmounts[item.id] || ""}
                                                                            onChange={(e) => handleAmountChange(item.id, e.target.value, netRemaining)}
                                                                            className="bg-transparent border-none outline-none text-xs font-bold w-full text-white"
                                                                            placeholder="0"
                                                                            disabled={!isSelected || netRemaining === 0}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-6 text-center text-white/40 text-xs">No standard term tuition assigned.</div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Custom Fees Checklist */}
                                    {customFees.length > 0 && (
                                        <div className="bg-[#112240]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl shrink-0">
                                            <div className="bg-white/[0.03] px-4 py-3 flex justify-between items-center border-b border-white/10">
                                                <h3 className="font-bold text-amber-500 tracking-wide uppercase text-[10px]">Special / Custom Fees</h3>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {customFees.map((item: any) => {
                                                    const remaining = item.amount - (item.paidAmount || 0);
                                                    const isSelected = selectedItems.has(item.id);

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`flex flex-col p-3 rounded-xl border transition-all ${
                                                                isSelected
                                                                    ? "bg-amber-500/10 border-amber-500/20"
                                                                    : "bg-[#0A192F]/60 hover:bg-white/5 border-transparent"
                                                            } ${remaining === 0 ? "opacity-60 grayscale-[0.3]" : ""}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {remaining === 0 ? (
                                                                    <div className="w-4 h-4 flex items-center justify-center bg-emerald-500 rounded-md shrink-0 mt-0.5">
                                                                        <CheckCircle className="w-3 h-3 text-white" />
                                                                    </div>
                                                                ) : (
                                                                    <Checkbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={() => handleToggleItem(item.id, remaining)}
                                                                        className="mt-0.5 shrink-0 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                                    />
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="font-bold text-white text-xs tracking-tight">{item.name}</h4>
                                                                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-black mt-0.5">Special / Custom Activity</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-4 mt-3 pt-2.5 border-t border-white/5">
                                                                <div className="text-left">
                                                                    <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">Balance</span>
                                                                    <p className={`font-mono font-bold text-xs ${remaining === 0 ? "text-emerald-400" : "text-white"}`}>
                                                                        ₹{remaining.toLocaleString()}
                                                                    </p>
                                                                </div>
                                                                <div className={`w-28 bg-[#0A192F]/80 rounded-lg border border-white/10 p-0.5 flex items-center px-2 gap-1 ${remaining === 0 ? "opacity-25" : ""}`}>
                                                                    <span className="text-[10px] text-white/40 font-bold">₹</span>
                                                                    <input
                                                                        type="text"
                                                                        value={paymentAmounts[item.id] || ""}
                                                                        onChange={(e) => handleAmountChange(item.id, e.target.value, remaining)}
                                                                        className="bg-transparent border-none outline-none text-xs font-bold w-full text-white"
                                                                        placeholder="0"
                                                                        disabled={!isSelected || remaining === 0}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'checkout' && (
                                <motion.div
                                    key="mobile-checkout"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-col h-full w-full justify-center pb-4"
                                >
                                    <div className="bg-[#112240] p-5 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none" />
                                        <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                                            <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                                            Checkout Summary
                                        </h2>

                                        <div className="space-y-4 mb-5">
                                            <div className="space-y-2 p-3 bg-[#0A192F]/60 rounded-xl border border-white/5 text-[10px] font-bold font-mono">
                                                <div className="flex justify-between items-center text-white/50">
                                                    <span>TUITION TOTAL</span>
                                                    <span>₹{ledgerTotalFee.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-emerald-400">
                                                    <span>SCHOLARSHIPS</span>
                                                    <span>- ₹{ledgerTotalReductions.toLocaleString()}</span>
                                                </div>
                                                <div className="h-px bg-white/15 my-1" />
                                                <div className="flex justify-between items-center text-[#3B82F6] text-xs">
                                                    <span>TOTAL REMAINING</span>
                                                    <span>₹{ledgerPendingFee.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5 w-full" />

                                            <div className="space-y-1">
                                                <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">
                                                    Amount selected to pay
                                                </span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-[#3B82F6]">₹</span>
                                                    <p className="text-2xl font-black text-white font-mono">
                                                        {Math.max(0, totalToPay).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handlePay}
                                            disabled={totalToPay === 0 || paying}
                                            className="w-full h-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl font-black text-sm shadow-[0_8px_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2"
                                        >
                                            {paying ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            ) : (
                                                <>
                                                    <CreditCard className="w-4 h-4" /> Pay Selected Fees
                                                </>
                                            )}
                                        </Button>

                                        <p className="text-[8px] text-center text-white/40 mt-3 font-bold tracking-widest uppercase">
                                            🔒 Secured Payments powered by Razorpay
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'history' && (
                                <motion.div
                                    key="mobile-history"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-col h-full w-full overflow-hidden"
                                >
                                    <Card className="bg-[#112240]/40 border-white/5 shadow-xl rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
                                        <CardHeader className="bg-white/[0.01] border-b border-white/5 py-3 px-4 flex justify-between items-center shrink-0">
                                            <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                                                <History className="w-3.5 h-3.5 text-emerald-400" /> Payment History
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 flex-1 overflow-y-auto space-y-2 min-h-0 pb-4">
                                            {transactions.length === 0 ? (
                                                <div className="text-center py-10 text-white/30 text-[9px] font-bold uppercase tracking-widest italic">
                                                    No transaction logs found.
                                                </div>
                                            ) : (
                                                transactions.map((tx, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-2 rounded-xl bg-[#0A192F]/60 border border-white/5 hover:border-emerald-500/20 transition-all"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-mono font-bold text-xs text-white">
                                                                    ₹{Number(tx.amount).toLocaleString()}
                                                                </div>
                                                                <div className="text-[7px] text-white/40 flex items-center gap-1 font-bold uppercase tracking-wider mt-0.5 truncate">
                                                                    <span>
                                                                        {tx.createdAt?.seconds
                                                                            ? formatToDDMMYY(tx.createdAt)
                                                                            : tx.date?.seconds
                                                                            ? formatToDDMMYY(tx.date)
                                                                            : "Recent"}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className="text-emerald-400">{tx.method || "ONLINE"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/10 text-white/60 hover:text-white text-[8px] font-bold py-0.5 px-2 h-6 rounded-lg"
                                                            onClick={() =>
                                                                printPaymentReceipt({
                                                                    payment: tx,
                                                                    student: profile,
                                                                    ledger
                                                                })
                                                            }
                                                        >
                                                            <Printer className="w-3 h-3 mr-1" /> Receipt
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
