"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Printer, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect } from "react";
import { useMasterData } from "@/context/MasterDataContext";

interface HallTicketGeneratorProps {
    // No props needed now, we fetch on demand
}

export function HallTicketGenerator({ }: HallTicketGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [examName, setExamName] = useState("ANNUAL EXAMINATIONS - 2025-26");
    const [branding, setBranding] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedSection, setSelectedSection] = useState("all");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { classes: classesData, sections: sectionsData } = useMasterData();
    const classes = Object.values(classesData).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    useEffect(() => {
        getDoc(doc(db, "settings", "branding")).then(d => {
            if (d.exists()) setBranding(d.data());
        });
    }, []);

    // Fetch students only when class/section changes and dialog is open
    useEffect(() => {
        if (!open || !selectedClass) {
            setStudents([]);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, "students"),
            where("classId", "==", selectedClass),
            where("status", "==", "ACTIVE")
        );

        getDocs(q).then((snap: any) => {
            let list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            if (selectedSection !== "all") {
                list = list.filter((s: any) => s.sectionId === selectedSection);
            }
            // Sort by roll number
            list.sort((a: any, b: any) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999));
            setStudents(list);
            setLoading(false);
        }).catch((err: any) => {
            console.error(err);
            setLoading(false);
        });
    }, [open, selectedClass, selectedSection]);

    const handlePrint = () => {
        if (students.length === 0) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>Hall Tickets - ${selectedClass}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 0; background: #fff; }
                    .page { width: 210mm; height: 297mm; padding: 10mm; box-sizing: border-box; display: flex; flex-direction: column; gap: 10mm; page-break-after: always; background: #fff; }
                    .ticket-container { flex: 1; position: relative; border: 3pt double #1e40af; padding: 8mm; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
                    .watermark { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80pt; font-weight: 900; color: rgba(30, 64, 175, 0.03); white-space: nowrap; pointer-events: none; z-index: 0; text-transform: uppercase; }
                    .header { position: relative; z-index: 1; border-bottom: 1.5pt solid #1e40af; padding-bottom: 4mm; margin-bottom: 6mm; display: flex; align-items: center; gap: 8mm; }
                    .logo { max-height: 80px; max-width: 80px; object-fit: contain; }
                    .school-name { font-size: 20pt; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin: 0; }
                    .main-content { position: relative; z-index: 1; display: flex; gap: 8mm; }
                    .photo-area { width: 35mm; height: 45mm; border: 1pt solid #cbd5e1; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 7pt; font-weight: 700; color: #94a3b8; }
                    .details-grid { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; }
                    .field-full { grid-column: span 2; }
                    .field-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: #64748b; }
                    .field-value { font-size: 12pt; font-weight: 800; color: #0f172a; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 1mm; }
                    .footer { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
                    .sign-line { border-top: 1pt solid #0f172a; width: 40mm; text-align: center; font-weight: 800; font-size: 9pt; padding-top: 1mm; }
                </style>
            </head>
            <body>
                ${Array.from({ length: Math.ceil(students.length / 2) }).map((_, pageIndex) => `
                    <div class="page">
                        ${[0, 1].map(offset => {
            const student = students[pageIndex * 2 + offset];
            if (!student) return '<div style="flex:1"></div>';
            return `
                                <div class="ticket-container">
                                    <div class="watermark">OFFICIAL</div>
                                    <div class="header">
                                        ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                                        <div class="header-content">
                                            <h1 class="school-name">${branding?.schoolName || "SPOORTHY SCHOOL"}</h1>
                                            <div style="font-weight: 800; color: #1e40af; margin-top: 2mm; font-size: 11pt;">${examName}</div>
                                        </div>
                                    </div>
                                    <div class="main-content">
                                        <div class="photo-area">PASTE PHOTO</div>
                                        <div class="details-grid">
                                            <div class="field-full"><div class="field-label">Student Name</div><div class="field-value">${student.studentName.toUpperCase()}</div></div>
                                            <div><div class="field-label">School ID</div><div class="field-value">${student.schoolId}</div></div>
                                            <div><div class="field-label">Roll Number</div><div class="field-value">${student.rollNo || '---'}</div></div>
                                            <div><div class="field-label">Class</div><div class="field-value">${student.className}</div></div>
                                            <div><div class="field-label">Section</div><div class="field-value">${student.sectionName || 'A'}</div></div>
                                        </div>
                                    </div>
                                    <div class="footer">
                                        <div class="sign-line">Class Teacher</div>
                                        <div class="sign-line">Principal</div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                `).join('')}
                <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 h-11 px-6 font-bold">
                    <CreditCard className="w-4 h-4" /> Bulk Hall Tickets
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Generate Batch Hall Tickets</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Examination Name</Label>
                        <Input value={examName} onChange={(e) => setExamName(e.target.value.toUpperCase())} className="bg-white/5 border-white/10" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Class</Label>
                            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm">
                                <option value="" className="bg-black">Choose Class</option>
                                {classes.map((c: any) => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Section</Label>
                            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm">
                                <option value="all" className="bg-black">All Sections</option>
                                {/* Filter sections for selected class */}
                                {Object.values(sectionsData).map((s: any) => <option key={s.id} value={s.id} className="bg-black">{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                            <p className="text-xs text-muted-foreground text-center">Identifying student records for specified node...</p>
                        </div>
                    ) : selectedClass && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-in fade-in slide-in-from-top-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-indigo-400">{students.length} Students Detected</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Ready to process {Math.ceil(students.length / 2)} A4 sheets.</p>
                                </div>
                                <Button onClick={handlePrint} disabled={students.length === 0} size="sm" className="bg-white text-black hover:bg-white/90 font-bold px-4">
                                    <Printer className="w-4 h-4 mr-2" /> Print
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
// End of file cleanup

