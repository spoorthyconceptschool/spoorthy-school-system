"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CreditCard, Wallet, Calendar, Info, BookOpen, User, Bookmark, Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [ledger, setLedger] = useState<any>(null);
    const [config, setConfig] = useState<{ keyId: string } | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");

    // Selection & Partial Payment State
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({});
    const [useHomeworkFallback, setUseHomeworkFallback] = useState(false);
    const [recentHomework, setRecentHomework] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (!user?.uid) return;

        // 1. Load Razorpay Script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        // A. Listen to Student Profile
        // Strategy: Try direct Doc ID first (based on email), then fallback to UID query
        const schoolIdFromEmail = user?.email?.split('@')[0]?.toUpperCase();
        if (!schoolIdFromEmail) {
            console.warn("[Dashboard] Could not derive schoolId from email:", user?.email);
            setIsLoading(false);
            return;
        }

        let unsubLedger: (() => void) | null = null;

        const processProfileSnap = (pData: any, docId: string) => {
            setProfile(pData);
            const sId = pData.schoolId || docId;

            if (sId) {
                if (unsubLedger) unsubLedger();
                const yearId = "2025-2026";
                unsubLedger = onSnapshot(doc(db, "student_fee_ledgers", `${sId}_${yearId}`), (lSnap) => {
                    if (lSnap.exists()) {
                        const lData = lSnap.data();
                        setLedger(lData);
                        setPaymentStatus(lData.status === "PAID" ? "paid" : "pending");

                        const initialSelected = new Set<string>();
                        const initialAmounts: { [key: string]: string } = {};
                        const rawItems = lData.items || [];
                        const totalReduction = rawItems.filter((i: any) => i.amount < 0).reduce((s: number, i: any) => s + Math.abs(i.amount - (i.paidAmount || 0)), 0);
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
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.error("[Dashboard] Ledger sync error:", err);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        };

        // Primary Listener: Direct Document Access
        const unsubProfile = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                processProfileSnap(pSnap.data(), pSnap.id);
            } else {
                // Secondary Fallback: UID Query (in case doc ID is not schoolId)
                const qProfile = query(collection(db, "students"), where("uid", "==", user.uid));
                onSnapshot(qProfile, (qSnap) => {
                    if (!qSnap.empty) {
                        processProfileSnap(qSnap.docs[0].data(), qSnap.docs[0].id);
                    } else {
                        console.warn("[Dashboard] Student profile not found in any form.");
                        setIsLoading(false);
                    }
                });
            }
        }, (err) => {
            console.error("[Dashboard] Profile sync error:", err);
            setIsLoading(false);
        });

        // Razorpay Config
        const unsubConfig = onSnapshot(doc(db, "config", "razorpay"), (snap) => {
            if (snap.exists()) setConfig(snap.data() as { keyId: string });
        });

        return () => {
            unsubProfile();
            if (unsubLedger) unsubLedger();
            unsubConfig();
            if (script && document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [user]);

    const displaySchoolId = profile?.schoolId || user?.email?.split('@')[0].toUpperCase();

    // Homework Real-time Listener for Dashboard
    useEffect(() => {
        if (!profile?.classId) return;

        let isMounted = true;

        console.log("[Dashboard] Listening for homework targeting:", { classId: profile.classId, sectionId: profile.sectionId });

        const hQ = useHomeworkFallback
            ? query(collection(db, "homework"), where("classId", "==", profile.classId), limit(10))
            : query(collection(db, "homework"), where("classId", "==", profile.classId), orderBy("createdAt", "desc"), limit(10));

        const unsubscribe = onSnapshot(hQ, (snapshot) => {
            if (!isMounted) return;
            let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter by section if student has one, otherwise show all for class
            let filtered = profile.sectionId
                ? list.filter((hw: any) => !hw.sectionId || hw.sectionId === profile.sectionId || hw.sectionId === "ALL" || hw.sectionId === "GENERAL")
                : list;

            if (useHomeworkFallback) {
                filtered = [...filtered].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            }

            console.log("[Dashboard] Homework received/filtered:", filtered.length);
            setRecentHomework(filtered.slice(0, 3));
        }, (err) => {
            if (!isMounted) return;
            if (err.message.includes('index') && !useHomeworkFallback) {
                console.warn("[Dashboard] Index missing, switching to fallback query.");
                setUseHomeworkFallback(true);
            } else if (!err.message.includes('index')) {
                console.error("[Dashboard] Homework Sync Error:", err);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [profile?.classId, profile?.sectionId, useHomeworkFallback]);

    const handleToggleItem = (itemId: string, remaining: number) => {
        // Reductions (negative balance) cannot be unselected
        if (remaining < 0) return;

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
        // Allow leading minus sign and decimals
        const numeric = val.replace(/[^0-9.-]/g, '');

        // If it's a reduction (max < 0), we want to allow negative values up to that max
        if (max < 0) {
            if (Number(numeric) < max) return;
            if (Number(numeric) > 0) return; // Can't pay 'positive' on a reduction
        } else {
            if (Number(numeric) > max) return;
            if (Number(numeric) < 0) return; // Can't pay 'negative' on a normal fee
        }

        setPaymentAmounts({ ...paymentAmounts, [itemId]: numeric });
    };

    // 1. Transaction-specific total (What the user is paying right now)
    const totalToPay = Array.from(selectedItems).reduce((sum, id) => {
        // Find the item to check if it's a reduction
        const item = ledger?.items?.find((i: any) => i.id === id);
        // Only sum if it's a positive fee item
        const amt = Number(paymentAmounts[id]) || 0;
        return sum + (item && item.amount > 0 ? amt : 0);
    }, 0);

    // 2. Ledger-wide historical totals (The full picture)
    const ledgerTotalFee = ledger?.items?.reduce((sum: number, i: any) => sum + (i.amount > 0 ? i.amount : 0), 0) || 0;
    const ledgerTotalReductions = ledger?.items?.reduce((sum: number, i: any) => sum + (i.amount < 0 ? Math.abs(i.amount) : 0), 0) || 0;
    const ledgerPendingFee = Math.max(0, ledgerTotalFee - (ledger?.totalPaid || 0) - ledgerTotalReductions);

    const feeCurrency = "INR";

    const handlePayment = () => {
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

        if (!config?.keyId) {
            alert("Payment gateway not configured. Please contact admin.");
            return;
        }

        const options = {
            key: config.keyId,
            amount: Math.round(totalToPay * 100), // Amount in paise
            currency: feeCurrency,
            name: "Spoorthy Concept School",
            description: `Fee Payment - ${profile?.studentName}`,
            handler: function (response: any) {
                console.log(response);
                alert(`Payment Successful! (Demo Mode)\nPayment ID: ${response.razorpay_payment_id}\nAmount: ₹${totalToPay}`);
                // In production, sync with backend here
            },
            prefill: {
                name: profile?.studentName,
                email: user?.email,
                contact: profile?.parentMobile
            },
            theme: { color: "#d4af37" }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };

    const termFees = ledger?.items?.filter((i: any) => i.type === "TERM" && (i.amount - (i.paidAmount || 0)) >= 0) || [];
    const customFees = ledger?.items?.filter((i: any) => i.type === "CUSTOM" && (i.amount - (i.paidAmount || 0)) >= 0) || [];
    const reductions = ledger?.items?.filter((i: any) => (i.amount - (i.paidAmount || 0)) < 0) || [];

    return (
        <div className="space-y-6 md:space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
                <div>
                    <h1 className="font-display text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">
                        My Dashboard
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        Academic Year {ledger?.academicYearId || "2025-2026"}
                    </p>
                </div>
            </div>

            {/* Quick Stats / Homework Alert */}
            {isLoading ? <Skeleton className="h-32 w-full rounded-3xl" /> : (
                recentHomework.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top duration-700">
                        <div className="md:col-span-3 glass-panel p-6 rounded-3xl border-accent/20 bg-accent/5 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                                    <BookOpen className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg italic">New Assignments Received</h3>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                        {recentHomework.length} items requiring your attention
                                    </p>
                                </div>
                            </div>
                            <div className="flex -space-x-4 overflow-hidden">
                                {recentHomework.map((hw, i) => (
                                    <div key={hw.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-neutral-800 flex items-center justify-center text-[10px] font-black uppercase" title={hw.title}>
                                        {hw.subjectId?.substring(0, 1)}
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="rounded-xl border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground font-bold italic h-12 px-8" onClick={() => router.push('/student/homework')}>
                                View Homework Feed
                            </Button>
                        </div>
                    </div>
                )
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Detailed Selection */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Card */}
                    {isLoading ? <Skeleton className="h-64 w-full rounded-3xl" /> : (
                        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-colors" />
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <Info className="w-5 h-5 text-accent" />
                                Student Profile
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Full Name</span>
                                    <p className="text-lg font-semibold text-accent">{profile?.studentName || "..."}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">School ID</span>
                                    <p className="text-lg font-mono font-bold">{displaySchoolId}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Grade / Class</span>
                                    <p className="text-lg font-semibold">{profile?.className || "..."} {profile?.sectionName ? `(${profile.sectionName})` : ""}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Parent Contact</span>
                                    <p className="text-lg font-semibold">{profile?.parentName || "..."} - {profile?.parentMobile || "..."}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Fee Selection */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3 italic">
                            <Wallet className="w-6 h-6 text-accent" />
                            Fee Payment Breakdown & Selection
                        </h2>

                        {/* Applied Benefits Header (Non-selectable) */}
                        {reductions.length > 0 && (
                            <div className="glass-panel rounded-3xl overflow-hidden border-green-500/20 bg-green-500/5">
                                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-500/20 p-2 rounded-xl">
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-green-400 text-sm italic uppercase tracking-widest">Active Scholarships & Credits</h3>
                                            <p className="text-[10px] text-green-400/60 font-bold uppercase">These benefits are automatically deducted from your fee payment below.</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-green-500/50 uppercase font-black">Total Benefit Value</p>
                                        <p className="text-2xl font-black text-green-400">- ₹{ledgerTotalReductions.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoading ? <Skeleton className="h-96 w-full rounded-3xl" /> : (
                            <>
                                {/* Term Fees */}
                                <div className="glass-panel rounded-3xl overflow-hidden border-white/5 shadow-2xl">
                                    <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/10">
                                        <h3 className="font-bold text-accent tracking-wide uppercase text-xs">Fee Payment</h3>
                                        <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded">MANDATORY</span>
                                    </div>
                                    <div className="p-2">
                                        {(() => {
                                            let rollingReduction = ledgerTotalReductions;
                                            return termFees.length > 0 ? termFees.map((item: any) => {
                                                const remaining = item.amount - (item.paidAmount || 0);
                                                const discountForThisItem = Math.min(remaining, rollingReduction);
                                                const netRemaining = remaining - discountForThisItem;
                                                rollingReduction -= discountForThisItem;

                                                const isSelected = selectedItems.has(item.id);

                                                return (
                                                    <div key={item.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl mb-2 transition-all ${isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/5 border border-transparent'} ${netRemaining === 0 ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                                        <div className="flex items-center gap-4">
                                                            {netRemaining === 0 ? (
                                                                <div className="w-5 h-5 flex items-center justify-center bg-green-500 rounded-md">
                                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                                </div>
                                                            ) : (
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => handleToggleItem(item.id, netRemaining)}
                                                                />
                                                            )}
                                                            <div>
                                                                <p className="font-bold flex items-center gap-2">
                                                                    {item.name}
                                                                    {discountForThisItem > 0 && (
                                                                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                                                            ₹{discountForThisItem.toLocaleString()} DEDUCTED
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                                                                    <Clock className="w-3 h-3" /> Originally ₹{item.amount.toLocaleString()} • Due: {item.dueDate}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                                                            <div className="text-right hidden md:block">
                                                                <p className={`text-[10px] uppercase tracking-widest font-bold ${netRemaining === 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                                    {netRemaining === 0 ? 'PAID / COVERED' : 'Net Balance'}
                                                                </p>
                                                                <p className={`font-bold text-lg ${netRemaining === 0 ? 'text-green-400' : 'text-white'}`}>
                                                                    ₹{netRemaining.toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className={`w-32 bg-black/40 rounded-xl border border-white/10 p-1 flex items-center px-3 gap-1 ${netRemaining === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}>
                                                                <span className="text-xs text-muted-foreground">₹</span>
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
                                            }) : <p className="p-8 text-center text-muted-foreground text-sm">No fee payment assigned or all paid.</p>;
                                        })()}
                                    </div>
                                </div>

                                {/* Custom Fees */}
                                {customFees.length > 0 && (
                                    <div className="glass-panel rounded-3xl overflow-hidden border-white/5 shadow-2xl">
                                        <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/10">
                                            <h3 className="font-bold text-amber-500 tracking-wide uppercase text-xs">Special & Custom Fees</h3>
                                        </div>
                                        <div className="p-2">
                                            {customFees.map((item: any) => {
                                                const remaining = item.amount - (item.paidAmount || 0);
                                                const isSelected = selectedItems.has(item.id);
                                                return (
                                                    <div key={item.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl mb-2 transition-all ${isSelected ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => handleToggleItem(item.id, remaining)}
                                                                disabled={remaining === 0}
                                                                className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                            />
                                                            <div>
                                                                <p className="font-bold">{item.name}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Event / Special Fee</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                                                            <div className="text-right hidden md:block">
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Balance</p>
                                                                <p className="font-bold text-lg">₹{remaining.toLocaleString()}</p>
                                                            </div>
                                                            <div className="w-32 bg-black/40 rounded-xl border border-white/10 p-1 flex items-center px-3 gap-1">
                                                                <span className="text-xs text-muted-foreground">₹</span>
                                                                <input
                                                                    type="text"
                                                                    value={paymentAmounts[item.id] || ""}
                                                                    onChange={(e) => handleAmountChange(item.id, e.target.value, remaining)}
                                                                    className="bg-transparent border-none outline-none text-sm font-bold w-full text-white"
                                                                    placeholder="0"
                                                                    disabled={!isSelected}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Checkout Summary */}
                <div className="lg:col-span-1">
                    {isLoading ? <Skeleton className="h-96 w-full rounded-3xl" /> : (
                        <div className="sticky top-8 space-y-6">
                            <div className="glass-panel p-8 rounded-3xl border-accent/20 shadow-[0_20px_50px_rgba(212,175,55,0.1)] relative overflow-hidden">
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-accent" />
                                    Payment Summary
                                </h2>

                                <div className="space-y-4 mb-8">
                                    <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                            <span>Full Year Tuition</span>
                                            <span>₹{ledgerTotalFee.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-green-400 uppercase tracking-widest font-bold">
                                            <span>Scholarship Applied</span>
                                            <span>- ₹{ledgerTotalReductions.toLocaleString()}</span>
                                        </div>
                                        <div className="h-px bg-white/10 my-1" />
                                        <div className="flex justify-between items-center text-xs font-bold text-accent">
                                            <span>TOTAL PENDING FEE</span>
                                            <span className="text-sm">₹{ledgerPendingFee.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/5 w-full" />

                                    <div className="space-y-2 pt-2">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                                            {totalToPay > 0 ? "Amount to Pay Now" : "Select items to pay"}
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-medium text-accent">₹</span>
                                            <p className="text-5xl font-bold font-display drop-shadow-2xl text-white">
                                                {Math.max(0, totalToPay).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handlePayment}
                                    className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl font-black text-xl shadow-[0_10px_30px_rgba(212,175,55,0.3)] group transition-all transform hover:-translate-y-1"
                                    disabled={totalToPay === 0 || isLoading}
                                >
                                    {isLoading ? (
                                        <span className="animate-pulse">PROCESSING...</span>
                                    ) : (
                                        <>
                                            <CreditCard className="mr-2 group-hover:scale-125 transition-transform" />
                                            PROCEED TO PAY
                                        </>
                                    )}
                                </Button>

                                <p className="text-[9px] text-center text-muted-foreground mt-4 font-bold tracking-widest uppercase opacity-90">
                                    🔒 Secure Payment powered by Razorpay
                                </p>
                            </div>

                            {/* Status Legend */}
                            <div className="glass-panel p-6 rounded-3xl border-white/5 space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ledger Status</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Overall Status</span>
                                    {paymentStatus === "paid" ? (
                                        <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 px-4 py-2 rounded-xl text-xs">
                                            <CheckCircle className="w-4 h-4" /> CLEAR
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-yellow-500 font-bold bg-yellow-500/10 px-4 py-2 rounded-xl text-xs">
                                            <Clock className="w-4 h-4" /> PENDING
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
