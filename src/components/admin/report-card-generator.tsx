"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Printer, CheckCircle, AlertCircle } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";

interface ReportCardGeneratorProps {
    exam: any;
    classId: string;
}

export function ReportCardGenerator({ exam, classId }: ReportCardGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [branding, setBranding] = useState<any>(null);
    const { subjects, classes } = useMasterData();
    const [students, setStudents] = useState<any[]>([]);
    const [results, setResults] = useState<Record<string, any>>({});

    useEffect(() => {
        if (open) {
            fetchBranding();
            fetchData();
        }
    }, [open, classId, exam.id]);

    const fetchBranding = async () => {
        const d = await getDoc(doc(db, "settings", "branding"));
        if (d.exists()) setBranding(d.data());
    };

    const fetchData = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            // 1. Fetch all active students in class
            const sQ = query(
                collection(db, "students"),
                where("classId", "==", classId),
                where("status", "==", "ACTIVE")
            );
            const sSnap = await getDocs(sQ);
            const studentList = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort by Roll No
            studentList.sort((a: any, b: any) => {
                const rA = parseInt(a.rollNo) || 999;
                const rB = parseInt(b.rollNo) || 999;
                return rA - rB || a.studentName.localeCompare(b.studentName);
            });
            setStudents(studentList);

            // 2. Fetch all results for this exam + class
            const rQ = query(
                collection(db, "exam_results"),
                where("examId", "==", exam.id),
                where("classId", "==", classId)
            );
            const rSnap = await getDocs(rQ);
            const resultsMap: Record<string, any> = {};
            rSnap.docs.forEach(d => {
                resultsMap[d.data().studentId] = d.data();
            });
            setResults(resultsMap);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>Report Cards - Academic Transcript</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { 
                        font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        background: #f8fafc; 
                        color: #1e293b;
                    }
                    .report-card { 
                        width: 210mm;
                        max-height: 297mm;
                        padding: 12mm;
                        box-sizing: border-box;
                        page-break-after: always;
                        position: relative;
                        background: #fff;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }
                    
                    /* Institutional Border */
                    .document-border {
                        position: absolute;
                        top: 5mm;
                        left: 5mm;
                        right: 5mm;
                        bottom: 5mm;
                        border: 2.5pt double #1e40af;
                        pointer-events: none;
                        z-index: 10;
                    }

                    /* Header Section */
                    .header { 
                        border-bottom: 2pt solid #1e40af; 
                        padding-bottom: 5mm; 
                        margin-bottom: 8mm; 
                        display: flex;
                        align-items: center;
                        gap: 10mm;
                    }
                    .logo { height: 90px; width: auto; object-fit: contain; }
                    .header-content { flex: 1; }
                    .school-name { 
                        font-size: 24pt; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        color: #1e3a8a; 
                        margin: 0;
                        letter-spacing: -1px;
                    }
                    .sub-header { 
                        font-size: 10pt; 
                        font-weight: 700; 
                        color: #64748b; 
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .document-title { 
                        margin-top: 4mm;
                        display: inline-block;
                        background: #1e40af;
                        color: #fff;
                        padding: 2mm 10mm;
                        border-radius: 4px;
                        font-weight: 800;
                        text-transform: uppercase;
                        font-size: 11pt;
                        letter-spacing: 2px;
                    }

                    /* Profile Grid */
                    .profile-grid { 
                        display: grid; 
                        grid-template-columns: 1.5fr 1fr; 
                        gap: 8mm; 
                        margin-bottom: 8mm;
                    }
                    .section-label { 
                        font-size: 8pt; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        color: #1e40af;
                        margin-bottom: 2mm;
                        display: block;
                    }
                    .data-card { 
                        background: #f1f5f9;
                        border: 1pt solid #e2e8f0;
                        padding: 5mm;
                        border-radius: 6px;
                    }
                    .data-row { display: flex; margin-bottom: 2mm; border-bottom: 0.5pt solid #ddd; padding-bottom: 1mm; }
                    .data-row:last-child { border: none; margin: 0; padding: 0; }
                    .label { width: 35mm; font-size: 8.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
                    .value { font-size: 11pt; font-weight: 900; color: #0f172a; flex: 1; }

                    /* Marks Table */
                    .marks-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 8mm;
                        border: 1pt solid #1e40af;
                    }
                    .marks-table th { 
                        background: #1e40af;
                        color: #fff;
                        border: 1pt solid #1e40af;
                        padding: 4mm 3mm;
                        text-align: left;
                        font-size: 9pt;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .marks-table td { 
                        border: 1pt solid #e2e8f0;
                        padding: 4mm 3mm;
                        font-size: 11pt;
                        font-weight: 500;
                    }
                    .marks-table tr:nth-child(even) { background: #f8fafc; }
                    .col-center { text-align: center; }
                    .col-marks { font-weight: 900; font-size: 14pt; color: #1e3a8a; }

                    /* Summary Boxes */
                    .summary-grid { 
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 5mm;
                        margin-bottom: 8mm;
                    }
                    .summary-card { 
                        background: #fff;
                        border: 1.5pt solid #1e40af;
                        padding: 5mm;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }
                    .summary-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0; height: 3pt;
                        background: #1e40af;
                    }
                    .sum-label { font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 1mm; display: block; }
                    .sum-value { font-size: 20pt; font-weight: 900; color: #0f172a; }

                    /* Remarks */
                    .remarks-box { 
                        padding: 5mm; 
                        background: #ecf2ff; 
                        border: 1pt solid #1e40af33; 
                        border-radius: 6px;
                        margin-bottom: 15mm;
                    }
                    .remarks-title { font-size: 8pt; font-weight: 900; text-transform: uppercase; color: #1e40af; margin-bottom: 2mm; display: block; }
                    .remarks-text { font-size: 11pt; font-weight: 500; color: #334155; line-height: 1.5; font-style: italic; }

                    /* Signatures */
                    .footer { 
                        margin-top: auto; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end;
                        padding: 0 5mm 5mm 5mm;
                    }
                    .signature { 
                        text-align: center;
                        width: 50mm;
                    }
                    .sign-line { 
                        border-top: 1.2pt solid #0f172a; 
                        margin-top: 3mm; 
                        padding-top: 1.5mm; 
                        font-weight: 800; 
                        font-size: 9pt; 
                        text-transform: uppercase; 
                        color: #0f172a;
                    }
                    .sign-stamp { height: 55px; margin-bottom: -15px; display: block; margin-left: auto; margin-right: auto; }

                    .watermark {
                        position: absolute;
                        top: 55%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 140mm;
                        opacity: 0.035;
                        z-index: 0;
                        pointer-events: none;
                    }
                    .watermark img { width: 100%; filter: grayscale(1); }
                </style>
            </head>
            <body>
                ${students.map(student => {
            const result = results[student.id];
            if (!result) return '';

            // Filter subjects enabled in the exam timetable for this class
            const classTimetable = exam.timetables?.[classId];

            // Get marks for all subjects
            const allSubEntries = Object.entries(result.subjects || {});

            let subEntries;
            if (classTimetable) {
                // If timetable exists, show ALL enabled subjects from timetable
                // Even if the student has no marks for them yet (display as blank/absent)
                const enabledSubjectIds = Object.keys(classTimetable).filter(sid => classTimetable[sid]?.enabled || true);

                subEntries = enabledSubjectIds.map(subId => {
                    const existingEntry = allSubEntries.find(([id]) => id === subId);
                    if (existingEntry) return existingEntry;

                    // Return placeholder for missing subject
                    return [subId, { obtained: '-', maxMarks: '-', remarks: 'Not Updated' }];
                });
            } else {
                // No timetable configured for this class -> Show all subjects with marks
                subEntries = allSubEntries;
            }

            let totalOb = 0;
            let totalMax = 0;
            subEntries.forEach(([_, data]: any) => {
                const ob = parseFloat(data.obtained);
                const mx = parseFloat(data.maxMarks);

                // Only count subjects where marks are valid numbers
                if (!isNaN(ob)) {
                    totalOb += ob;
                    // Only add to max marks if Obtained is present, otherwise it penalizes for un-entered marks
                    // OR: adjust logic as needed. Standard: Add max marks if the subject is listed.
                    if (!isNaN(mx)) {
                        totalMax += mx;
                    } else {
                        totalMax += 100; // Fallback default
                    }
                }
            });
            const percentage = totalMax > 0 ? (totalOb / totalMax) * 100 : 0;
            const gradeMap = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 35 ? 'D' : 'E (Fail)';

            return `
                        <div class="report-card">
                            <div class="document-border"></div>
                            <div class="watermark">
                                ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" />` : ''}
                            </div>

                            <div class="header">
                                ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                                <div class="header-content">
                                    <h1 class="school-name">${branding?.schoolName || "Spoorthy Concept School"}</h1>
                                    <div class="sub-header">Official Academic Record - Recognized by Govt. of Telangana</div>
                                    <div class="document-title">Scholastic Performance Report</div>
                                </div>
                            </div>

                            <div class="profile-grid">
                                <div>
                                    <span class="section-label">Student Identification</span>
                                    <div class="data-card">
                                        <div class="data-row"><span class="label">Legal Name</span> <span class="value">${student.studentName.toUpperCase()}</span></div>
                                        <div class="data-row"><span class="label">Enrollment ID</span> <span class="value">${student.schoolId}</span></div>
                                        <div class="data-row"><span class="label">Class/Section</span> <span class="value">${student.className} – ${student.sectionName || 'A'}</span></div>
                                        <div class="data-row"><span class="label">Roll Number</span> <span class="value">${student.rollNo || 'N/A'}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <span class="section-label">Academic Detail</span>
                                    <div class="data-card">
                                        <div class="data-row"><span class="label">Examination</span> <span class="value">${exam.name}</span></div>
                                        <div class="data-row"><span class="label">Session</span> <span class="value">2025-2026</span></div>
                                        <div class="data-row"><span class="label">Issue Date</span> <span class="value">${new Date().toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            </div>

                            <table class="marks-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40%">Subject Particulars</th>
                                        <th class="col-center">Max Marks</th>
                                        <th class="col-center">Obtained</th>
                                        <th>Academic Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${subEntries.map(([subId, data]: any) => `
                                        <tr>
                                            <td style="font-weight: 800; color: #1e3a8a;">${subjects[subId]?.name || subId}</td>
                                            <td class="col-center" style="color: #64748b;">${data.maxMarks}</td>
                                            <td class="col-center col-marks">${data.obtained}</td>
                                            <td style="font-size: 9pt; color: #475569;">${data.remarks || 'Satisfactory'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                            <div class="summary-grid">
                                <div class="summary-card">
                                    <span class="sum-label">Aggregate Score</span>
                                    <span class="sum-value">${totalOb} <small style="font-size: 10pt; color: #94a3b8;">/ ${totalMax}</small></span>
                                </div>
                                <div class="summary-card">
                                    <span class="sum-label">Percentage</span>
                                    <span class="sum-value">${percentage.toFixed(1)}%</span>
                                </div>
                                <div class="summary-card">
                                    <span class="sum-label">Scholastic Grade</span>
                                    <span class="sum-value" style="color: #1e40af;">${gradeMap}</span>
                                </div>
                            </div>

                            <div class="remarks-box">
                                <span class="remarks-title">Institutional Feedback</span>
                                <p class="remarks-text">
                                    ${percentage > 85 ? "Exceptional academic proficiency demonstrated. Continues to be an exemplary student." :
                    percentage > 70 ? "Commendable performance. Shows strong potential for further academic growth." :
                        percentage > 50 ? "Consistent effort is recommended in core subjects to achieve higher proficiency." :
                            "Focused remedial attention in specific areas required for academic advancement."}
                                </p>
                            </div>

                            <div class="footer">
                                <div class="signature">
                                    <div class="sign-line">Class Teacher</div>
                                </div>
                                <div class="signature">
                                    <div class="sign-line">Parent Signature</div>
                                </div>
                                <div class="signature">
                                    ${branding?.principalSignature ? `<img src="${branding.principalSignature}" class="sign-stamp" />` : ''}
                                    <div class="sign-line">Principal</div>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
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

    const readyCount = students.filter(s => results[s.id]).length;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 h-11 px-6">
                    <Printer className="w-4 h-4" /> Bulk Print Results
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10 text-white w-[95vw] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Generate Report Cards</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        This will generate formal report cards for the selected class.
                    </p>

                    {loading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                            <p className="text-xs">Preparing Student Records...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                                    <p className="text-[10px] text-muted-foreground uppercase">Class Strength</p>
                                    <p className="text-xl font-bold">{students.length}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                    <p className="text-[10px] text-emerald-400 uppercase">Results Ready</p>
                                    <p className="text-xl font-bold text-emerald-400">{readyCount}</p>
                                </div>
                            </div>

                            {readyCount === 0 ? (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-red-400">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-xs">No marks have been entered for this class yet. Teachers must enter marks before report cards can be generated.</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-blue-400">
                                    <CheckCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-xs">
                                        Ready to print {readyCount} report cards. Each student will get a full A4 page with
                                        breakdown of marks, total, percentage, and principal's signature.
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={handlePrint}
                                disabled={readyCount === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 gap-2 font-bold"
                            >
                                <Printer className="w-5 h-5" /> Print {readyCount} Report Cards
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
