"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStudentData } from "@/context/StudentDataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    CheckCircle,
    Wallet,
    History,
    FileText,
    Printer,
    CreditCard,
    Clock,
    Info,
    AlertCircle,
    ShieldCheck
} from "lucide-react";
import { printPaymentReceipt } from "@/lib/export-utils";

export default function StudentFeesPage() {
    const { user } = useAuth();
    const { profile, ledger, transactions, loading } = useStudentData();

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({});
    const [paying, setPaying] = useState(false);

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
                name: "Spoorthy High School",
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

    const handlePrintFeeStructure = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Fee Structure - ${profile?.studentName || "Student"}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
                        .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
                        h1 { margin: 0; font-size: 24px; color: #111827; }
                        h2 { margin: 5px 0 0 0; font-size: 16px; color: #4b5563; font-weight: normal; }
                        .student-info { margin-bottom: 30px; font-size: 14px; background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; }
                        .student-info table { width: 100%; border-collapse: collapse; }
                        .student-info td { padding: 5px 10px; }
                        .student-info td.label { font-weight: bold; color: #4b5563; width: 15%; }
                        table.fees-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        table.fees-table th { background: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 12px; border: 1px solid #e5e7eb; font-size: 14px; }
                        table.fees-table td { padding: 12px; border: 1px solid #e5e7eb; font-size: 14px; }
                        table.fees-table tr:nth-child(even) { background: #f9fafb; }
                        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                        @media print {
                            body { padding: 0; }
                            .print-btn { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>SPOORTHY HIGH SCHOOL</h1>
                        <h2>Official Fee Structure Overview</h2>
                    </div>
                    
                    <div class="student-info">
                        <table>
                            <tr>
                                <td class="label">Student Name:</td>
                                <td>${profile?.studentName || "N/A"}</td>
                                <td class="label">Admission No:</td>
                                <td>${profile?.admissionNo || "N/A"}</td>
                            </tr>
                            <tr>
                                <td class="label">Class & Sec:</td>
                                <td>${profile?.className || "N/A"} ${profile?.sectionName || ""}</td>
                                <td class="label">Academic Year:</td>
                                <td>${profile?.academicYear || "2025-2026"}</td>
                            </tr>
                        </table>
                    </div>

                    <table class="fees-table">
                        <thead>
                            <tr>
                                <th>Term</th>
                                <th>Tuition Fee (₹)</th>
                                <th>Other Fees (₹)</th>
                                <th>Total (₹)</th>
                                <th>Due Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight: 500;">I Term (Admission)</td>
                                <td>3,000</td>
                                <td>300</td>
                                <td style="font-weight: 600; color: #10b981;">3,300</td>
                                <td>Jun 15, 2026</td>
                            </tr>
                            <tr>
                                <td style="font-weight: 500;">II Term (Mid-Year)</td>
                                <td>30,000</td>
                                <td>3,000</td>
                                <td style="font-weight: 600; color: #10b981;">33,000</td>
                                <td>Oct 15, 2026</td>
                            </tr>
                            <tr>
                                <td style="font-weight: 500;">III Term (Final)</td>
                                <td>30,000</td>
                                <td>3,000</td>
                                <td style="font-weight: 600; color: #10b981;">33,000</td>
                                <td>Feb 15, 2027</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="margin-top: 20px; font-size: 12px; color: #6b7280; font-style: italic;">
                        * Fee structure is subject to change. Please contact the school administration office for billing clarifications.
                    </div>

                    <div class="footer">
                        This is an official document generated by the Spoorthy High School student portal.
                    </div>
                    <script>window.onload = () => { window.print(); };</script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    if (loading && !ledger) {
        return (
            <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-blue-500">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-white/40 font-mono animate-pulse">
                    Syncing Ledger Balance...
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
        <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500 pb-20 relative overflow-hidden bg-transparent">
            {/* Ambient visual background glow */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                        Fee Payment Portal
                    </h1>
                    <p className="text-white/60 text-sm mt-1">
                        Select individual classes or term elements to pay securely.
                    </p>
                </div>
                <Badge className={ledgerPendingFee <= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1.5 px-4 font-bold uppercase tracking-wider text-[10px] rounded-full" : "bg-amber-500/10 text-amber-500 border-amber-500/20 py-1.5 px-4 font-bold uppercase tracking-wider text-[10px] rounded-full"}>
                    {ledgerPendingFee <= 0 ? "● Dues Cleared" : "● Payment Outstanding"}
                </Badge>
            </div>

            {/* UPGRADE REQUIREMENT: Fee Structure Overview Table at the Top */}
            <Card className="bg-[#112240]/20 border border-white/[0.05] shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md">
                <CardHeader className="py-5 px-6 border-b border-white/[0.04] flex flex-row items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white tracking-wide uppercase text-xs">Fee Structure Overview</h3>
                            <Info className="w-4 h-4 text-white/40 cursor-help" title="Standard fee guidelines for the current session" />
                        </div>
                        <p className="text-[10px] text-white/40 font-medium">Approved school academic board tuition terms</p>
                    </div>
                    <Button
                        onClick={handlePrintFeeStructure}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl font-bold transition-all text-xs h-9 px-4 gap-2 flex items-center shadow-md shadow-black/10"
                    >
                        <Printer className="w-4 h-4 text-blue-400" /> Print Fee Structure
                    </Button>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                                <th className="p-4 px-6 text-xs font-bold text-white/50 uppercase tracking-wider">Term</th>
                                <th className="p-4 px-6 text-xs font-bold text-white/50 uppercase tracking-wider">Tuition Fee (₹)</th>
                                <th className="p-4 px-6 text-xs font-bold text-white/50 uppercase tracking-wider">Other Fees (₹)</th>
                                <th className="p-4 px-6 text-xs font-bold text-white/50 uppercase tracking-wider">Total (₹)</th>
                                <th className="p-4 px-6 text-xs font-bold text-white/50 uppercase tracking-wider">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-sm">
                            <tr className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 px-6 font-medium text-white/90">I Term (Admission)</td>
                                <td className="p-4 px-6 text-white/70">3,000</td>
                                <td className="p-4 px-6 text-white/70">300</td>
                                <td className="p-4 px-6 font-mono font-bold text-emerald-400">3,300</td>
                                <td className="p-4 px-6 text-white/60">Jun 15, 2026</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 px-6 font-medium text-white/90">II Term (Mid-Year)</td>
                                <td className="p-4 px-6 text-white/70">30,000</td>
                                <td className="p-4 px-6 text-white/70">3,000</td>
                                <td className="p-4 px-6 font-mono font-bold text-emerald-400">33,000</td>
                                <td className="p-4 px-6 text-white/60">Oct 15, 2026</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 px-6 font-medium text-white/90">III Term (Final)</td>
                                <td className="p-4 px-6 text-white/70">30,000</td>
                                <td className="p-4 px-6 text-white/70">3,000</td>
                                <td className="p-4 px-6 font-mono font-bold text-emerald-400">33,000</td>
                                <td className="p-4 px-6 text-white/60">Feb 15, 2027</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="p-4 px-6 bg-white/[0.01] border-t border-white/[0.03] flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Fee structure is subject to change. Please contact the administration for more details.</span>
                    </div>
                </CardContent>
            </Card>

            {/* Core Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Interactive checklist options */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Scholarships & Reductions Info Banner */}
                    {reductions.length > 0 && (
                        <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-emerald-400 text-xs tracking-wider uppercase">
                                        Scholarships / Credits Applied
                                    </h3>
                                    <p className="text-[10px] text-white/40 font-medium">
                                        Reductions are automatically computed and applied below.
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Deduction Credit</span>
                                <p className="text-xl font-bold text-emerald-400">- ₹{ledgerTotalReductions.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Select Terms to Pay Card */}
                    <Card className="bg-[#112240]/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                        <div className="bg-white/[0.02] px-6 py-4 flex justify-between items-center border-b border-white/[0.04]">
                            <h3 className="font-bold text-white tracking-wide uppercase text-xs">Select Terms To Pay</h3>
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold">Tuition</Badge>
                        </div>
                        <div className="p-4 space-y-3.5">
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
                                                className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border transition-all ${
                                                    isSelected
                                                        ? "bg-blue-500/[0.06] border-blue-500/30 shadow-lg shadow-blue-500/5"
                                                        : "bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.04]"
                                                } ${netRemaining === 0 ? "opacity-50" : ""}`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {netRemaining === 0 ? (
                                                        <div className="w-5 h-5 flex items-center justify-center bg-emerald-500 rounded-md shrink-0 mt-0.5">
                                                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    ) : (
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleItem(item.id, netRemaining)}
                                                            className="mt-1 border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                        />
                                                    )}
                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-white text-base tracking-tight flex items-center flex-wrap gap-2 leading-tight">
                                                            {item.name}
                                                            {discountForThisItem > 0 && (
                                                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase tracking-wider py-0 px-2 rounded-full font-bold">
                                                                    ₹{discountForThisItem.toLocaleString()} scholarship
                                                                </Badge>
                                                            )}
                                                        </h4>
                                                        <p className="text-[10px] text-white/40 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>Gross Fee: ₹{item.amount.toLocaleString()} • Due Date: {item.dueDate || "N/A"}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 mt-4 md:mt-0 justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Net Balance</span>
                                                        <p className={`font-mono font-bold text-base ${netRemaining === 0 ? "text-emerald-400" : "text-white"}`}>
                                                            ₹{netRemaining.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className={`w-32 bg-black/40 rounded-xl border border-white/10 p-1 flex items-center px-3 gap-1.5 ${netRemaining === 0 ? "opacity-25" : ""}`}>
                                                        <span className="text-xs text-white/30 font-bold">₹</span>
                                                        <input
                                                            type="text"
                                                            value={paymentAmounts[item.id] || ""}
                                                            onChange={(e) => handleAmountChange(item.id, e.target.value, netRemaining)}
                                                            className="bg-transparent border-none outline-none text-sm font-bold w-full text-white font-mono placeholder:text-white/10"
                                                            placeholder="0"
                                                            disabled={!isSelected || netRemaining === 0}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center text-white/40 text-sm">No tuition terms currently assigned.</div>
                                );
                            })()}
                        </div>
                    </Card>

                    {/* Custom Fees Checklist Card */}
                    {customFees.length > 0 && (
                        <Card className="bg-[#112240]/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                            <div className="bg-white/[0.02] px-6 py-4 flex justify-between items-center border-b border-white/[0.04]">
                                <h3 className="font-bold text-amber-500 tracking-wide uppercase text-xs">Special / Activity Fees</h3>
                            </div>
                            <div className="p-4 space-y-3.5">
                                {customFees.map((item: any) => {
                                    const remaining = item.amount - (item.paidAmount || 0);
                                    const isSelected = selectedItems.has(item.id);

                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border transition-all ${
                                                isSelected
                                                    ? "bg-amber-500/[0.04] border-amber-500/20"
                                                    : "bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.04]"
                                            } ${remaining === 0 ? "opacity-50" : ""}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {remaining === 0 ? (
                                                    <div className="w-5 h-5 flex items-center justify-center bg-emerald-500 rounded-md shrink-0 mt-0.5">
                                                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                ) : (
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => handleToggleItem(item.id, remaining)}
                                                        className="mt-1 border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                    />
                                                )}
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-white text-base tracking-tight leading-tight">{item.name}</h4>
                                                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Custom / One-off Activity</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 mt-4 md:mt-0 justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                                <div className="text-right">
                                                    <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Balance</span>
                                                    <p className={`font-mono font-bold text-base ${remaining === 0 ? "text-emerald-400" : "text-white"}`}>
                                                        ₹{remaining.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className={`w-32 bg-black/40 rounded-xl border border-white/10 p-1 flex items-center px-3 gap-1.5 ${remaining === 0 ? "opacity-25" : ""}`}>
                                                    <span className="text-xs text-white/30 font-bold">₹</span>
                                                    <input
                                                        type="text"
                                                        value={paymentAmounts[item.id] || ""}
                                                        onChange={(e) => handleAmountChange(item.id, e.target.value, remaining)}
                                                        className="bg-transparent border-none outline-none text-sm font-bold w-full text-white font-mono placeholder:text-white/10"
                                                        placeholder="0"
                                                        disabled={!isSelected || remaining === 0}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Security Notice */}
                    <div className="flex items-center gap-2.5 px-4 text-white/40 text-xs font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-5 h-5 text-emerald-500/80" />
                        <span>Your payment information is fully safe and secure.</span>
                    </div>
                </div>

                {/* Right Column: Checkout summary & history */}
                <div className="space-y-6">
                    {/* Checkout Card */}
                    <Card className="bg-[#112240]/30 border border-white/[0.05] p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-400" />
                            Checkout Summary
                        </h3>

                        <div className="space-y-5">
                            <div className="space-y-3 p-4 bg-black/30 rounded-2xl border border-white/[0.04] text-xs font-mono font-bold">
                                <div className="flex justify-between items-center text-white/50">
                                    <span>TUITION TOTAL</span>
                                    <span>₹{ledgerTotalFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-emerald-400">
                                    <span>SCHOLARSHIPS</span>
                                    <span>- ₹{ledgerTotalReductions.toLocaleString()}</span>
                                </div>
                                <div className="h-px bg-white/10 my-1" />
                                <div className="flex justify-between items-center text-blue-400">
                                    <span>TOTAL REMAINING</span>
                                    <span>₹{ledgerPendingFee.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-widest block">
                                    Amount selected to pay
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-blue-400">₹</span>
                                    <p className="text-4xl font-extrabold text-white tracking-tight font-mono">
                                        {Math.max(0, totalToPay).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handlePay}
                                disabled={totalToPay === 0 || paying}
                                className="w-full h-13 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/10 transition-all flex items-center justify-center gap-2 border-0"
                            >
                                {paying ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" /> Pay Selected Fees
                                    </>
                                )}
                            </Button>

                            <p className="text-[8px] text-center text-white/30 font-bold tracking-widest uppercase">
                                Secured payments powered by Razorpay
                            </p>
                        </div>
                    </Card>

                    {/* Transaction History Card */}
                    <Card className="bg-[#112240]/20 border border-white/[0.05] shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md">
                        <CardHeader className="bg-white/[0.01] border-b border-white/[0.04] py-4 px-6 flex justify-between items-center">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                <History className="w-4 h-4 text-emerald-400" /> Payment History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 max-h-[350px] overflow-y-auto scrollbar-none space-y-3">
                            {transactions.length === 0 ? (
                                <div className="text-center py-14 text-white/30 text-[10px] font-bold uppercase tracking-widest italic flex flex-col items-center justify-center gap-3">
                                    <FileText className="w-8 h-8 opacity-20" />
                                    <span>No transaction logs found.</span>
                                </div>
                            ) : (
                                transactions.map((tx, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-emerald-500/20 transition-all gap-4"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-mono font-bold text-sm text-white">
                                                    ₹{Number(tx.amount).toLocaleString()}
                                                </div>
                                                <div className="text-[9px] text-white/40 flex items-center gap-2 font-bold uppercase tracking-wider mt-1 truncate">
                                                    <span>
                                                        {tx.createdAt?.seconds
                                                            ? new Date(tx.createdAt.seconds * 1000).toLocaleDateString('en-GB')
                                                            : tx.date?.seconds
                                                            ? new Date(tx.date.seconds * 1000).toLocaleDateString('en-GB')
                                                            : "Recent"}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="text-emerald-400 font-medium">{tx.method || "ONLINE"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-white/10 hover:border-emerald-500/20 hover:bg-emerald-500/10 text-white/60 hover:text-white text-[10px] font-bold py-1 px-3 h-8 rounded-xl shrink-0"
                                            onClick={() =>
                                                printPaymentReceipt({
                                                    payment: tx,
                                                    student: profile,
                                                    ledger
                                                })
                                            }
                                        >
                                            <Printer className="w-3.5 h-3.5 mr-1" /> Receipt
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
