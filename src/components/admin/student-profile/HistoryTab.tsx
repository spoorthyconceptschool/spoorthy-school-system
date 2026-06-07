"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, CheckCircle2, FileText, AlertCircle, IndianRupee } from "lucide-react";

interface HistoryTabProps {
    payments: any[];
    loading?: boolean;
}

export function HistoryTab({ payments, loading }: HistoryTabProps) {

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-[400px] bg-white/5 rounded-[2rem]" />
            </div>
        );
    }

    if (!payments || payments.length === 0) {
        return (
            <div className="text-center py-20 text-[#8892B0] border border-dashed border-white/10 rounded-[2rem] bg-white/[0.02]">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Recent Activity</h3>
                <p className="text-sm">No transaction or payment history found.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300 pb-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" /> Transaction Timeline
                </h3>
            </div>
            
            <Card className="bg-[#0f172a] border-white/5 rounded-[1.5rem] shadow-2xl overflow-hidden">
                <CardContent className="p-3 md:p-4">
                    <div className="relative border-l-2 border-white/5 ml-3 space-y-6 pb-2 pt-2">
                        {payments.map((p, index) => (
                            <div key={p.id || index} className="relative pl-5 group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#0f172a] shadow-sm ${
                                    p.status === 'success' || p.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' : 
                                    p.status === 'pending' ? 'bg-amber-500/20 text-amber-400 shadow-amber-500/20' : 'bg-rose-500/20 text-rose-400 shadow-rose-500/20'
                                }`}>
                                    {p.status === 'success' || p.status === 'PAID' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                                     p.status === 'pending' ? <History className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                </div>
                                
                                <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 p-2.5 rounded-xl transition-all duration-300">
                                    <div className="flex justify-between items-center gap-1.5 mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-black text-[14px] tracking-tight ${p.status === 'success' || p.status === 'PAID' ? 'text-emerald-400' : 'text-white/80'}`}>
                                                +₹{Number(p.amount).toLocaleString()}
                                            </span>
                                            <div className={`px-1.5 py-[1px] rounded text-[7px] font-black uppercase tracking-widest ${
                                                p.status === 'success' || p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 
                                                p.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                                            }`}>
                                                {p.status || 'PAID'}
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-[#8892B0] font-black uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                            {p.date ? new Date(p.date.seconds ? p.date.seconds * 1000 : p.date).toLocaleDateString('en-GB') : 'N/A'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <div className="flex items-center gap-1 px-1.5 py-[1px] rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                                            <IndianRupee className="w-2.5 h-2.5" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">{p.method || 'CASH'}</span>
                                        </div>
                                        
                                        {p.verifiedBy && (
                                            <div className="flex items-center gap-1 px-1.5 py-[1px] rounded-md bg-white/5 border border-white/10 text-[#8892B0]">
                                                <FileText className="w-2.5 h-2.5" />
                                                <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[100px]">By: {p.verifiedBy}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {p.remarks && (
                                        <div className="mt-2 px-2 py-1.5 bg-black/20 rounded-md border border-white/5 border-l-2 border-l-white/10">
                                            <p className="text-[10px] text-[#8892B0] italic leading-tight">
                                                "{p.remarks}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
