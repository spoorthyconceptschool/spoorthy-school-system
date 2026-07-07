"use client";

import { Button } from "@/components/ui/button";
import { Settings2, Printer, IndianRupee, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface FeesTabProps {
    student: any;
    ledger: any;
    totalFee: number;
    totalPaid: number;
    dueAmount: number;
    breakdown: any;
    canEdit: boolean;
    isHistoricalMode: boolean;
    setIsAdjustModalOpen: (val: boolean) => void;
    printStudentFeeStructure: (data: any) => void;
    branding: any;
    loading?: boolean;
    previousLedger?: any;
}

export function FeesTab({
    student,
    ledger,
    totalFee,
    totalPaid,
    dueAmount,
    breakdown,
    canEdit,
    isHistoricalMode,
    setIsAdjustModalOpen,
    printStudentFeeStructure,
    branding,
    loading,
    previousLedger
}: FeesTabProps) {

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-[200px] bg-white/5 rounded-[2rem]" />
                <div className="space-y-3 mt-8">
                    <div className="h-24 bg-white/5 rounded-2xl" />
                    <div className="h-24 bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!ledger || !ledger.items || ledger.items.length === 0) {
        return (
            <div className="text-center py-16 text-[#8892B0] border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                No fee structure assigned. Please update details or adjust fees.
                {canEdit && !isHistoricalMode && (
                    <div className="mt-4">
                        <Button 
                            variant="outline" 
                            className="bg-white/5 hover:bg-white/10 border-white/10 text-white h-12 px-6 rounded-xl text-[14px]" 
                            onClick={() => setIsAdjustModalOpen(true)}
                        >
                            <Settings2 className="w-4 h-4 mr-2" /> Adjust Fees
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Filter out previous balance items from the present year dues
    const presentYearItems = (breakdown.items || []).filter(
        (item: any) => item.id !== "PREVIOUS_BALANCE" && !item.id.startsWith("PREVIOUS_")
    );

    // Find the previous balance roll-up item in the current ledger
    const prevBalanceItem = (breakdown.items || []).find(
        (item: any) => item.id === "PREVIOUS_BALANCE" || item.id.startsWith("PREVIOUS_")
    );

    // Process previous year pending details
    let previousYearPendingDetails: any[] = [];
    let previousYearTotalDues = 0;

    if (prevBalanceItem && prevBalanceItem.distributedDue > 0) {
        previousYearTotalDues = prevBalanceItem.distributedDue;

        if (previousLedger && Array.isArray(previousLedger.items)) {
            // A. Distribute the previous year's payments across the previous year's items first
            const prevPaid = Number(previousLedger.totalPaid || 0);
            const prevItems = [...previousLedger.items].sort((a: any, b: any) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                return dateA - dateB;
            });

            let remainingPrevPaid = prevPaid;
            const prevProcessed = prevItems.map((item: any) => {
                const amt = Number(item.amount) || 0;
                const paid = Math.min(remainingPrevPaid, amt);
                remainingPrevPaid -= paid;
                const due = amt - paid;
                return {
                    ...item,
                    originalDue: due
                };
            });

            // B. Filter only the items that had remaining balance at the end of the previous year
            const outstandingFromPrevYear = prevProcessed.filter(item => item.originalDue > 0);

            // C. Distribute the current year payments towards the previous year dues (FIFO)
            let currentPaymentsForPrevBalance = Number(prevBalanceItem.distributedPaid || 0);

            previousYearPendingDetails = outstandingFromPrevYear.map((item: any) => {
                const amt = item.originalDue;
                const paidInCurrentYear = Math.min(currentPaymentsForPrevBalance, amt);
                currentPaymentsForPrevBalance -= paidInCurrentYear;
                const currentRemainingDue = amt - paidInCurrentYear;

                let status = "PENDING";
                if (currentRemainingDue === 0) status = "PAID";
                else if (paidInCurrentYear > 0) status = "PARTIAL";

                return {
                    ...item,
                    currentPaid: paidInCurrentYear,
                    currentDue: currentRemainingDue,
                    currentStatus: status
                };
            });
        } else {
            // Fallback: If no previous ledger data is available, show the rollup item
            previousYearPendingDetails = [{
                id: "PREVIOUS_BALANCE_FALLBACK",
                name: prevBalanceItem.name || "Previous Balance",
                dueDate: prevBalanceItem.dueDate,
                originalDue: prevBalanceItem.amount,
                currentPaid: prevBalanceItem.distributedPaid,
                currentDue: prevBalanceItem.distributedDue,
                currentStatus: prevBalanceItem.distributedStatus
            }];
        }
    }

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 pb-8">
            {/* Master Summary Card - Ultra Compact */}
            <div className="flex flex-row items-center justify-between p-3 rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] border border-indigo-500/30 shadow-lg ring-1 ring-white/5 relative overflow-hidden gap-2">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
                
                <div className="flex-1 text-left pl-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-blue-400/80 mb-0.5">Total</p>
                    <h3 className="text-xl font-black text-white tracking-tight leading-none drop-shadow-md">
                        ₹{totalFee.toLocaleString()}
                    </h3>
                </div>
                
                <div className="w-[1px] h-8 bg-white/10" />
                
                <div className="flex-1 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400/80 mb-0.5">Paid</p>
                    <h3 className="text-lg font-bold text-emerald-400 tracking-tight leading-none">
                        ₹{totalPaid.toLocaleString()}
                    </h3>
                </div>
                
                <div className="w-[1px] h-8 bg-white/10" />
                
                <div className="flex-1 text-right pr-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-rose-400/80 mb-0.5">Pending</p>
                    <h3 className="text-lg font-bold text-rose-400 tracking-tight leading-none">
                        ₹{dueAmount.toLocaleString()}
                    </h3>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 mt-2 mb-2">
                <h3 className="text-[13px] font-bold text-white shrink-0">Fee Structure</h3>
                <div className="flex gap-1.5 shrink-0 ml-auto">
                    <Button 
                        variant="outline" 
                        className="h-7 px-2 rounded-md border-white/10 bg-white/5 text-[10px] font-bold hover:bg-white/10 text-white" 
                        onClick={() => printStudentFeeStructure({ 
                            studentName: student.studentName, 
                            schoolId: student.schoolId, 
                            className: student.className, 
                            items: ledger.items || [], 
                            totalPaid: ledger.totalPaid || 0, 
                            schoolLogo: branding?.schoolLogo, 
                            schoolName: branding?.schoolName 
                        })}
                    >
                        <Printer className="w-3 h-3 mr-1" /> Print
                    </Button>
                    {canEdit && !isHistoricalMode && (
                        <Button 
                            variant="outline" 
                            className="h-7 px-2 rounded-md border-white/10 bg-white/5 text-[10px] font-bold hover:bg-white/10 text-white" 
                            onClick={() => setIsAdjustModalOpen(true)}
                        >
                            <Settings2 className="w-3 h-3 mr-1" /> Adjust
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Ultra Slim Rows */}
            <div className="space-y-1.5">
                {presentYearItems.map((item: any) => (
                    <div key={item.id} className="bg-[#0f172a] border border-white/5 rounded-lg flex items-center justify-between p-2 min-h-[44px]">
                        <div className="flex-1 min-w-0 pr-2">
                            <h4 className="text-[12px] font-bold text-white flex items-center gap-1.5 truncate leading-tight">
                                {item.name}
                                {item.type === "CUSTOM" && <span className="px-1 py-0.5 rounded text-[7px] bg-purple-500/20 text-purple-400 uppercase tracking-widest shrink-0">Custom</span>}
                            </h4>
                            <p className="text-[9px] text-[#8892B0] font-medium mt-0.5">
                                Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="hidden sm:block">
                                <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5">Amount</span>
                                <span className="text-[11px] font-bold text-white">₹{item.amount.toLocaleString()}</span>
                            </div>
                            <div className="hidden sm:block">
                                <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5">Paid</span>
                                <span className="text-[11px] font-bold text-emerald-400">₹{item.distributedPaid.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5 sm:hidden font-mono">Due</span>
                                <span className="text-[12px] font-bold text-rose-400">
                                    {item.distributedDue > 0 ? `₹${item.distributedDue.toLocaleString()}` : '-'}
                                </span>
                                <span className={`mt-0.5 px-1 py-[1px] rounded text-[7px] font-black uppercase tracking-widest ${
                                    item.distributedStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                    item.distributedStatus === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-rose-500/10 text-rose-400'
                                }`}>
                                    {item.distributedStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Previous Year Dues Box */}
            {prevBalanceItem && prevBalanceItem.distributedDue > 0 && (
                <div className="space-y-3 mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            Previous Year Dues
                        </h3>
                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] font-black font-mono">
                            Total: ₹{previousYearTotalDues.toLocaleString()}
                        </Badge>
                    </div>

                    <div className="space-y-1.5">
                        {previousYearPendingDetails.map((item: any) => (
                            <div key={item.id} className="bg-rose-950/10 border border-rose-500/10 rounded-lg flex items-center justify-between p-2 min-h-[44px]">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h4 className="text-[12px] font-bold text-white/90 truncate leading-tight">
                                        {item.name} <span className="text-[9px] text-[#8892B0] font-normal font-mono">({prevBalanceItem.name?.match(/\(([^)]+)\)/)?.[1] || "Previous Year"})</span>
                                    </h4>
                                    <p className="text-[9px] text-[#8892B0] font-medium mt-0.5">
                                        Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : 'N/A'}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0 text-right">
                                    <div className="hidden sm:block">
                                        <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5">Original Due</span>
                                        <span className="text-[11px] font-bold text-white/60">₹{item.originalDue?.toLocaleString()}</span>
                                    </div>
                                    <div className="hidden sm:block">
                                        <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5">Paid (New)</span>
                                        <span className="text-[11px] font-bold text-emerald-500/80">₹{item.currentPaid?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5 sm:hidden font-mono">Pending</span>
                                        <span className="text-[12px] font-bold text-rose-400 font-mono">
                                            ₹{item.currentDue?.toLocaleString()}
                                        </span>
                                        <span className={`mt-0.5 px-1 py-[1px] rounded text-[7px] font-black uppercase tracking-widest ${
                                            item.currentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                            item.currentStatus === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400' :
                                            'bg-rose-500/10 text-rose-400'
                                        }`}>
                                            {item.currentStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
