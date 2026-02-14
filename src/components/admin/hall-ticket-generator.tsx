"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Printer, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect } from "react";

interface HallTicketGeneratorProps {
    students: any[];
}

export function HallTicketGenerator({ students }: HallTicketGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [examName, setExamName] = useState("ANNUAL EXAMINATIONS - 2025-26");
    const [branding, setBranding] = useState<any>(null);

    useEffect(() => {
        getDoc(doc(db, "settings", "branding")).then(d => {
            if (d.exists()) setBranding(d.data());
        });
    }, []);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>Hall Tickets - Official Batch</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { 
                        font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        background: #f0f2f5; 
                        color: #1e293b;
                    }
                    .page { 
                        width: 210mm;
                        height: 297mm;
                        padding: 10mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        gap: 10mm;
                        page-break-after: always;
                        background: #fff;
                    }
                    .ticket-container {
                        flex: 1;
                        position: relative;
                        border: 3pt double #1e40af; /* Formal Navy Blue Border */
                        padding: 8mm;
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        overflow: hidden;
                    }
                    
                    /* Security Watermark */
                    .watermark {
                        position: absolute;
                        top: 55%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-30deg);
                        font-size: 80pt;
                        font-weight: 900;
                        color: rgba(30, 64, 175, 0.03);
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 0;
                        text-transform: uppercase;
                    }

                    .header { 
                        position: relative;
                        z-index: 1;
                        border-bottom: 1.5pt solid #1e40af; 
                        padding-bottom: 4mm; 
                        margin-bottom: 6mm; 
                        display: flex;
                        align-items: center;
                        gap: 8mm;
                    }
                    .logo-container {
                        width: 25mm;
                        height: 25mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .logo { max-height: 100%; max-width: 100%; object-fit: contain; }
                    .header-content { flex: 1; }
                    .school-name { 
                        font-size: 22pt; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        color: #1e3a8a; 
                        margin: 0;
                        letter-spacing: -0.5px;
                    }
                    .sub-header { 
                        font-size: 9pt; 
                        text-transform: uppercase; 
                        font-weight: 700; 
                        letter-spacing: 1px; 
                        color: #64748b;
                        margin-top: 1mm;
                    }
                    .badge-container {
                        margin-top: 3mm;
                        display: inline-flex;
                        align-items: center;
                        background: #1e40af;
                        color: #fff;
                        padding: 1.5mm 6mm;
                        border-radius: 4px;
                        font-weight: 800;
                        font-size: 11pt;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                    }

                    .main-content { 
                        position: relative;
                        z-index: 1;
                        display: flex; 
                        gap: 8mm; 
                    }
                    .photo-area { 
                        width: 35mm; 
                        height: 45mm; 
                        border: 1pt solid #cbd5e1; 
                        background: #f8fafc;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        font-size: 7pt;
                        font-weight: 700;
                        color: #94a3b8;
                        text-transform: uppercase;
                    }
                    .barcode-box {
                        margin-top: 3mm;
                        width: 100%;
                        height: 10mm;
                        background: repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 3px);
                        opacity: 0.3;
                    }

                    .details-grid { 
                        flex: 1; 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 5mm; 
                    }
                    .field { display: flex; flex-direction: column; }
                    .field-full { grid-column: span 2; }
                    .field-label { 
                        font-size: 7.5pt; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        color: #64748b; 
                        margin-bottom: 0.5mm;
                    }
                    .field-value { 
                        font-size: 13pt; 
                        font-weight: 800; 
                        color: #0f172a;
                        padding: 1.5mm 0;
                        border-bottom: 0.5pt solid #e2e8f0;
                    }

                    .rules-section {
                        position: relative;
                        z-index: 1;
                        margin-top: 6mm;
                        padding: 4mm;
                        background: #f8fafc;
                        border-radius: 6px;
                    }
                    .rules-title {
                        font-size: 7.5pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        color: #1e40af;
                        margin-bottom: 2mm;
                        display: block;
                    }
                    .rules-list {
                        margin: 0;
                        padding-left: 4mm;
                        font-size: 8.5pt;
                        line-height: 1.4;
                        color: #475569;
                        font-weight: 500;
                    }

                    .footer { 
                        margin-top: auto; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end;
                        padding-top: 6mm;
                    }
                    .sign-col { text-align: center; width: 45mm; }
                    .sign-line { 
                        border-top: 1pt solid #0f172a; 
                        margin-top: 2mm; 
                        padding-top: 1mm; 
                        font-weight: 800; 
                        font-size: 9pt; 
                        text-transform: uppercase; 
                        color: #0f172a;
                    }
                    .principal-sign-img { height: 45px; margin-bottom: -12px; display: block; margin-left: auto; margin-right: auto; }

                    @media print {
                        body { background: #fff; }
                        .page { box-shadow: none; margin: 0; }
                    }
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
                                        <div class="logo-container">
                                            ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                                        </div>
                                        <div class="header-content">
                                            <h1 class="school-name">${branding?.schoolName || "Spoorthy Concept School"}</h1>
                                            <div class="sub-header">Affiliated to Recognition of Govt. of Telangana</div>
                                            <div class="badge-container">${examName}</div>
                                        </div>
                                    </div>

                                    <div class="main-content">
                                        <div class="photo-area">
                                            Paste Photo<br/>Here
                                            <div class="barcode-box"></div>
                                        </div>
                                        <div class="details-grid">
                                            <div class="field field-full">
                                                <span class="field-label">Student Name</span>
                                                <span class="field-value">${student.studentName.toUpperCase()}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">School ID / UID</span>
                                                <span class="field-value">${student.schoolId}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Roll Number</span>
                                                <span class="field-value">${student.rollNo || 'NOT ASSIGNED'}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Class & Section</span>
                                                <span class="field-value">${student.className} – ${student.sectionName || 'A'}</span>
                                            </div>
                                            <div class="field">
                                                <span class="field-label">Academic Year</span>
                                                <span class="field-value">2025-26</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="rules-section">
                                        <span class="rules-title">Examination Protocol</span>
                                        <ul class="rules-list">
                                            <li>Possession of electronic devices is strictly prohibited in the exam hall.</li>
                                            <li>Candidates must report 30 minutes prior to the commencement of exams.</li>
                                            <li>This hall ticket must be carried for all examination sessions.</li>
                                        </ul>
                                    </div>

                                    <div class="footer">
                                        <div class="sign-col">
                                            <div class="sign-line">Class Teacher</div>
                                        </div>
                                        <div class="sign-col">
                                            <div class="sign-line">Student Signature</div>
                                        </div>
                                        <div class="sign-col">
                                            ${branding?.principalSignature ? `<img src="${branding.principalSignature}" class="principal-sign-img" />` : ''}
                                            <div class="sign-line">Principal</div>
                                        </div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                `).join('')}
                <script>
                    window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 w-full sm:w-auto font-bold h-11"
                >
                    <CreditCard className="w-4 h-4" /> Hall Tickets
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Issue Hall Tickets</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label>Examination Name</Label>
                        <Input
                            value={examName}
                            onChange={(e) => setExamName(e.target.value.toUpperCase())}
                            className="bg-white/5 border-white/10"
                        />
                    </div>

                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <p className="text-sm font-bold">${students.length} Hall Tickets Selected</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Layout: 2 per A4 Page. Automatic handling of odd numbers (last half page will be empty).</p>
                    </div>

                    <Button
                        onClick={handlePrint}
                        disabled={students.length === 0}
                        className="w-full bg-white text-black hover:bg-white/90 font-bold h-12 gap-2"
                    >
                        <Printer className="w-5 h-5" /> Print ${students.length} Hall Tickets
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
