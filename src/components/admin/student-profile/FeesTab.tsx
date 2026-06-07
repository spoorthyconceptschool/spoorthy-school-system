"use client";

import { Button } from "@/components/ui/button";
import { Settings2, Printer, IndianRupee, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    loading
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
                {breakdown.items.map((item: any) => (
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
                                <span className="block text-[8px] text-[#8892B0] uppercase tracking-wider mb-0.5 sm:hidden">Due</span>
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
        </div>
    );
}
