"use client";

import { Card, CardContent } from "@/components/ui/card";
import { File, Upload, Download, Eye, FileBadge, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentsTabProps {
    student: any;
    loading?: boolean;
}

export function DocumentsTab({ student, loading }: DocumentsTabProps) {

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                <div className="h-[160px] bg-white/5 rounded-[2rem]" />
                <div className="h-[160px] bg-white/5 rounded-[2rem]" />
                <div className="h-[160px] bg-white/5 rounded-[2rem]" />
                <div className="h-[160px] bg-white/5 rounded-[2rem]" />
            </div>
        );
    }

    const docTypes = [
        { id: 'birth_cert', name: 'Birth Certificate', required: true, uploaded: false },
        { id: 'tc', name: 'Transfer Certificate', required: false, uploaded: false },
        { id: 'aadhaar', name: 'Aadhaar Card', required: true, uploaded: true },
        { id: 'photo', name: 'Passport Photo', required: true, uploaded: true },
        { id: 'caste', name: 'Caste Certificate', required: false, uploaded: false }
    ];

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300 pb-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                    <FileBadge className="w-4 h-4 text-indigo-400" /> Student Documents
                </h3>
            </div>
            
            <div className="space-y-1.5">
                {docTypes.map(doc => (
                    <div key={doc.id} className="bg-[#0f172a] border border-white/5 rounded-lg flex items-center justify-between p-2 min-h-[44px] transition-colors hover:bg-white/[0.02]">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                            <div className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center shadow-sm ${
                                doc.uploaded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[#8892B0]'
                            }`}>
                                <File className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-[12px] leading-tight truncate mb-0.5">{doc.name}</h4>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-1 py-[1px] rounded ${
                                        doc.required ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-[#8892B0]'
                                    }`}>
                                        {doc.required ? 'Required' : 'Optional'}
                                    </span>
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-1 py-[1px] rounded flex items-center gap-0.5 ${
                                        doc.uploaded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                        {doc.uploaded ? <CheckCircle2 size={8} /> : <AlertCircle size={8} />}
                                        {doc.uploaded ? 'Uploaded' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                            {doc.uploaded ? (
                                <>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-md hover:bg-white/10 text-white">
                                        <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-md hover:bg-white/10 text-white">
                                        <Download className="w-3.5 h-3.5" />
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" className="h-7 px-2.5 rounded-md border-dashed border-white/20 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold">
                                    <Upload className="w-3 h-3 mr-1" /> Upload
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
