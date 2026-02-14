"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, X, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";
import { useMasterData } from "@/context/MasterDataContext";

interface FeeSlipGeneratorProps {
    students: any[];
}

export function FeeSlipGenerator({ students }: FeeSlipGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [slips, setSlips] = useState<any[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [step, setStep] = useState<"SELECT" | "PREVIEW">("SELECT");
    const { branding } = useMasterData();

    const availableClasses = Array.from(new Set(students.map(s => s.className))).filter(Boolean).sort();

    useEffect(() => {
        if (open) {
            setSelectedClasses(availableClasses);
            setStep("SELECT");
            setSlips([]);
        }
    }, [open]);

    const handleClassToggle = (className: string) => {
        setSelectedClasses(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    const generateSlips = async () => {
        if (selectedClasses.length === 0) {
            alert("Please select at least one class");
            return;
        }

        setLoading(true);
        try {
            const ledgersRef = collection(db, "student_fee_ledgers");
            const q = query(ledgersRef, where("academicYearId", "==", "2025-2026"));
            const lSnap = await getDocs(q);
            const ledgerMap: Record<string, any> = {};
            lSnap.forEach(doc => ledgerMap[doc.data().studentId] = doc.data());

            const today = new Date().toISOString().split('T')[0];
            const targetStudents = students.filter(s => selectedClasses.includes(s.className));

            const processedSlips = targetStudents.map(s => {
                const ledger = ledgerMap[s.schoolId];
                if (!ledger) return null;

                const sortedItems = (ledger.items || []).sort((a: any, b: any) => (a.dueDate || "").localeCompare(b.dueDate || ""));
                const termItems = sortedItems.filter((item: any) => item.type === "TERM");
                const transportItems = sortedItems.filter((item: any) => item.type === "TRANSPORT");
                const customItems = sortedItems.filter((item: any) => item.type === "CUSTOM");

                let totalPaidRemaining = ledger.totalPaid || 0;
                let thisTerm = termItems.find((t: any) => t.dueDate >= today) || termItems[termItems.length - 1];

                const pendingTerms: { name: string, total: number, pending: number, dueDate: string }[] = [];

                termItems.forEach((term: any) => {
                    const termAmount = term.amount || 0;
                    const paid = Math.min(termAmount, totalPaidRemaining);
                    const pending = termAmount - paid;
                    totalPaidRemaining -= paid;

                    if (pending > 0) {
                        pendingTerms.push({
                            name: term.name,
                            total: termAmount,
                            pending: pending,
                            dueDate: term.dueDate
                        });
                    }
                });

                let busPending = 0;
                transportItems.forEach((item: any) => {
                    const paid = Math.min(item.amount || 0, totalPaidRemaining);
                    busPending += (item.amount || 0) - paid;
                    totalPaidRemaining -= paid;
                });

                let customPending = 0;
                customItems.forEach((item: any) => {
                    const paid = Math.min(item.amount || 0, totalPaidRemaining);
                    customPending += (item.amount || 0) - paid;
                    totalPaidRemaining -= paid;
                });

                const currentTermDueDate = thisTerm?.dueDate || "";
                // Only show terms that are due or past due
                const activePendingTerms = pendingTerms.filter(pt => pt.dueDate <= currentTermDueDate);

                if (activePendingTerms.length === 0 && busPending <= 0 && customPending <= 0) return null;

                const activePendingTotal = activePendingTerms.reduce((sum: number, pt: any) => sum + pt.pending, 0);
                const totalDisplayPending = activePendingTotal + busPending + customPending;

                return {
                    name: s.studentName,
                    id: s.schoolId,
                    class: s.className,
                    section: s.sectionName,
                    totalFee: ledger.totalFee || 0,
                    totalPending: totalDisplayPending,
                    pendingTerms: activePendingTerms,
                    busPending,
                    customPending,
                    printDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                };
            }).filter(Boolean);

            setSlips(processedSlips);
            setStep("PREVIEW");
        } catch (error) {
            console.error(error);
            alert("Failed to load fee data");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const groupedSlips: Record<string, any[]> = {};
        slips.forEach(s => {
            if (!groupedSlips[s.class]) groupedSlips[s.class] = [];
            groupedSlips[s.class].push(s);
        });

        const html = `
            <html>
            <head>
                <title>Fee Slips</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: sans-serif; margin: 0; padding: 0; background: #fff; line-height: 1.1; }
                    .slips-container { 
                        display: grid; 
                        grid-template-columns: 1fr 1fr; 
                        grid-template-rows: auto repeat(5, 1fr); 
                        gap: 1.5mm; 
                        height: 297mm;
                        width: 210mm;
                        padding: 4mm 6mm;
                        box-sizing: border-box;
                        page-break-after: always;
                    }
                    .slip { 
                        border: 2pt solid #000;
                        padding: 2mm; 
                        display: flex; 
                        flex-direction: column; 
                        justify-content: flex-start;
                        font-size: 8.5px;
                        overflow: hidden;
                        height: 100%;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .header { text-align: center; border-bottom: 2pt solid #000; margin-bottom: 1mm; padding-bottom: 0.5mm; display: flex; align-items: center; justify-content: center; gap: 5mm; }
                    .school-name { font-weight: 900; font-size: 11px; text-transform: uppercase; }
                    .logo-mini { height: 25px; width: auto; object-fit: contain; }
                    .title { font-size: 8px; font-weight: bold; background: #000; color: #fff; padding: 1px 4px; display: inline-block; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 0.5mm; }
                    .label { color: #000; font-weight: bold; }
                    .value { font-weight: bold; }
                    
                    .fee-table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
                    .fee-table th, .fee-table td { border: 0.5pt solid #000; padding: 0.3mm 1mm; text-align: left; font-size: 7.5px; }
                    .fee-table th { background: #f0f0f0; font-weight: bold; }
                    .fee-table td.amount { text-align: right; font-weight: 800; }
                    
                    .total-box-horizontal { 
                        border: 1.5pt solid #000; 
                        padding: 1mm 2mm; 
                        margin-top: 1.5mm; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        background: #000;
                        color: #fff;
                    }
                    .total-label { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; }
                    .total-value { font-size: 11px; font-weight: 900; }
                    .footer { text-align: center; font-size: 7px; color: #000; margin-top: auto; padding-top: 1mm; border-top: 0.5pt dashed #ccc; }
                    .class-header { 
                        grid-column: span 2; 
                        text-align: center; 
                        font-weight: 900; 
                        font-size: 10px; 
                        color: #000; 
                        border-bottom: 1.5pt solid #000;
                        margin-bottom: 1.5mm;
                        padding: 0.5mm;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                    }
                </style>
            </head>
            <body>
                ${Object.entries(groupedSlips).map(([className, classSlips]) => {
            const chunks = [];
            for (let i = 0; i < classSlips.length; i += 10) {
                chunks.push(classSlips.slice(i, i + 10));
            }
            return chunks.map(chunk => `
                        <div class="slips-container">
                            <div class="class-header">CLASS: ${className}</div>
                            ${chunk.map(slip => `
                                <div class="slip">
                                    <div class="header">
                                        ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo-mini" />` : ''}
                                        <div>
                                            <div class="school-name">${branding?.schoolName}</div>
                                            <div class="title">FEE REMINDER SLIP</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <span class="label">Student:</span>
                                        <span class="value">${slip.name.toUpperCase()}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label">ID / Class:</span>
                                        <span class="value">${slip.id} (${slip.class}) ${slip.section ? `- ${slip.section}` : ''}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label">Print Date:</span>
                                        <span class="value">${slip.printDate}</span>
                                    </div>
                                    
                                    <div style="margin: 0.5mm 0; border-top: 1pt solid #000;"></div>
                                    
                                    <table class="fee-table">
                                        <thead>
                                            <tr>
                                                <th>Fee Particulars</th>
                                                <th style="text-align:right">Pending Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(slip.pendingTerms || []).map((pt: any) => `
                                                <tr>
                                                    <td>${pt.name}</td>
                                                    <td class="amount" style="color:#d32f2f">₹${pt.pending}</td>
                                                </tr>
                                            `).join('')}
                                            ${slip.busPending > 0 ? `
                                                <tr>
                                                    <td>Transport Fee</td>
                                                    <td class="amount">₹${slip.busPending}</td>
                                                </tr>
                                            ` : ''}
                                            ${slip.customPending > 0 ? `
                                                <tr>
                                                    <td>Other Fees</td>
                                                    <td class="amount">₹${slip.customPending}</td>
                                                </tr>
                                            ` : ''}
                                        </tbody>
                                    </table>

                                    <div class="total-box-horizontal">
                                        <span class="total-label">PLEASE PAY TOTAL:</span>
                                        <span class="total-value">₹${slip.totalPending}</span>
                                    </div>
                                    
                                    <div class="footer">Kindly clear the dues at office. Thank you.</div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('');
        }).join('')}
                <script>
                    window.onload = () => { window.print(); window.close(); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="h-11 gap-2 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 rounded-xl px-4 md:px-6 transition-all"
                >
                    <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Fee Slips</span><span className="sm:hidden">Slips</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-amber-500" />
                        Generate Fee Slips
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2">
                    {step === "SELECT" && (
                        <div className="space-y-4">
                            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-xs text-amber-200/70">
                                Select the classes you want to generate slips for. Only students with pending term fees will be included.
                            </div>

                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Classes</span>
                                <div className="flex gap-4">
                                    <Button
                                        variant="link"
                                        className="text-amber-500 h-auto p-0 text-xs"
                                        onClick={() => setSelectedClasses(availableClasses)}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="link"
                                        className="text-white/40 hover:text-white h-auto p-0 text-xs"
                                        onClick={() => setSelectedClasses([])}
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1 pr-2">
                                {availableClasses.map(c => (
                                    <div
                                        key={c}
                                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedClasses.includes(c)
                                            ? "bg-amber-500/10 border-amber-500/30 text-white"
                                            : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                                            }`}
                                        onClick={() => handleClassToggle(c)}
                                    >
                                        <Checkbox
                                            id={`class-${c}`}
                                            checked={selectedClasses.includes(c)}
                                            onCheckedChange={() => handleClassToggle(c)}
                                            className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                                        />
                                        <label
                                            htmlFor={`class-${c}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {c}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <Button
                                className="w-full h-12 bg-amber-500 text-black hover:bg-amber-600 font-bold gap-2 mt-4"
                                onClick={generateSlips}
                                disabled={loading || selectedClasses.length === 0}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                                {loading ? "Analyzing Data..." : `Proceed with ${selectedClasses.length} Classes`}
                            </Button>
                        </div>
                    )}

                    {step === "PREVIEW" && (
                        <div className="space-y-6">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-4">
                                <div className="bg-green-500 p-2 rounded-full text-black">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{slips.length} Slips Prepared</p>
                                    <p className="text-xs text-muted-foreground">Automatically grouped by class for easy sorting.</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-2 max-h-[200px] overflow-y-auto">
                                {slips.slice(0, 5).map(s => (
                                    <div key={s.id} className="flex justify-between items-center p-2 border-b border-white/5 last:border-0 text-xs text-muted-foreground">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{s.name}</span>
                                            <span className="text-[10px]">{s.class}</span>
                                        </div>
                                        <span className="text-amber-500 font-mono">₹{s.totalPending}</span>
                                    </div>
                                ))}
                                {slips.length > 5 && <p className="text-center py-2 text-[10px] text-muted-foreground italic">And {slips.length - 5} others...</p>}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button className="flex-1 bg-white text-black hover:bg-white/90 font-bold h-12 gap-2 text-lg" onClick={handlePrint}>
                                    <Printer className="w-5 h-5" /> Print All Slips
                                </Button>
                                <Button variant="ghost" className="h-12 px-6" onClick={() => setOpen(false)}>Close</Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
