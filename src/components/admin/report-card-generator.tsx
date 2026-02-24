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

    const [range, setRange] = useState({ start: 0, end: 50 });

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const readyStudents = students.filter(s => results[s.id]);
        const batch = readyStudents.slice(range.start, range.end);

        const html = `
            <html>
            <head>
                <title>Report Cards - Batch ${range.start + 1}-${Math.min(range.end, readyStudents.length)}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 0; background: #fff; }
                    .report-card { width: 210mm; height: 296mm; padding: 12mm; box-sizing: border-box; page-break-after: always; position: relative; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
                    .document-border { position: absolute; top: 5mm; left: 5mm; right: 5mm; bottom: 5mm; border: 2.5pt double #1e40af; z-index: 10; pointer-events: none; }
                    .header { border-bottom: 2pt solid #1e40af; padding-bottom: 5mm; margin-bottom: 8mm; display: flex; align-items: center; gap: 10mm; }
                    .logo { height: 90px; }
                    .school-name { font-size: 24pt; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin: 0; }
                    .document-title { margin-top: 4mm; display: inline-block; background: #1e40af; color: #fff; padding: 2mm 10mm; border-radius: 4px; font-weight: 800; text-transform: uppercase; font-size: 11pt; }
                    .profile-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 8mm; margin-bottom: 8mm; }
                    .data-card { background: #f1f5f9; border: 1pt solid #e2e8f0; padding: 5mm; border-radius: 6px; }
                    .data-row { display: flex; margin-bottom: 2mm; border-bottom: 0.5pt solid #ddd; padding-bottom: 1mm; }
                    .label { width: 35mm; font-size: 8.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
                    .value { font-size: 11pt; font-weight: 900; color: #0f172a; flex: 1; }
                    .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; border: 1pt solid #1e40af; }
                    .marks-table th { background: #1e40af; color: #fff; padding: 4mm 3mm; text-align: left; font-size: 9pt; }
                    .marks-table td { border: 1pt solid #e2e8f0; padding: 4mm 3mm; font-size: 11pt; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-bottom: 8mm; }
                    .summary-card { border: 1.5pt solid #1e40af; padding: 5mm; text-align: center; }
                    .sum-value { font-size: 20pt; font-weight: 900; }
                    .footer { margin-top: auto; display: flex; justify-content: space-between; padding-bottom: 5mm; }
                    .sign-line { border-top: 1.2pt solid #0f172a; margin-top: 8mm; width: 45mm; text-align: center; font-weight: 800; font-size: 9pt; }
                    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 120mm; opacity: 0.04; z-index: 0; pointer-events: none; }
                </style>
            </head>
            <body>
                ${batch.map(student => {
            const result = results[student.id];
            const classTimetable = exam.timetables?.[classId];
            const allSubEntries = Object.entries(result.subjects || {});
            let subEntries = classTimetable
                ? Object.keys(classTimetable).filter(sid => classTimetable[sid]?.enabled).map(sid => allSubEntries.find(([id]) => id === sid) || [sid, { obtained: '-', maxMarks: '-', remarks: '' }])
                : allSubEntries;

            let totalOb = 0, totalMax = 0;
            subEntries.forEach(([_, data]: any) => {
                const ob = parseFloat(data.obtained), mx = parseFloat(data.maxMarks);
                if (!isNaN(ob)) { totalOb += ob; totalMax += isNaN(mx) ? 100 : mx; }
            });
            const percentage = totalMax > 0 ? (totalOb / totalMax) * 100 : 0;
            const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 35 ? 'D' : 'E';

            return `
                        <div class="report-card">
                            <div class="document-border"></div>
                            <div class="watermark">${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" style="width:100%"/>` : ''}</div>
                            <div class="header">
                                ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                                <div class="header-content">
                                    <h1 class="school-name">${branding?.schoolName || "SPOORTHY SCHOOL"}</h1>
                                    <div class="document-title">Report Card</div>
                                </div>
                            </div>
                            <div class="profile-grid">
                                <div class="data-card">
                                    <div class="data-row"><span class="label">Name</span> <span class="value">${student.studentName}</span></div>
                                    <div class="data-row"><span class="label">ID</span> <span class="value">${student.schoolId}</span></div>
                                </div>
                                <div class="data-card">
                                    <div class="data-row"><span class="label">Exam</span> <span class="value">${exam.name}</span></div>
                                    <div class="data-row"><span class="label">Class</span> <span class="value">${student.className}</span></div>
                                </div>
                            </div>
                            <table class="marks-table">
                                <thead><tr><th>Subject</th><th>Max</th><th>Obtained</th><th>Remarks</th></tr></thead>
                                <tbody>
                                    ${subEntries.map(([subId, data]: any) => `
                                        <tr><td>${subjects[subId]?.name || subId}</td><td>${data.maxMarks}</td><td><b>${data.obtained}</b></td><td>${data.remarks}</td></tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="summary-grid">
                                <div class="summary-card"><span>Total</span><div class="sum-value">${totalOb}/${totalMax}</div></div>
                                <div class="summary-card"><span>Percentage</span><div class="sum-value">${percentage.toFixed(1)}%</div></div>
                                <div class="summary-card"><span>Grade</span><div class="sum-value">${grade}</div></div>
                            </div>
                            <div class="footer">
                                <div class="sign-line">Class Teacher</div>
                                <div class="sign-line">Parent</div>
                                <div class="sign-line">Principal</div>
                            </div>
                        </div>
                    `;
        }).join('')}
                <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
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
                        Select a range of students to print. Printing in smaller batches is faster.
                    </p>

                    {loading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                            <p className="text-xs">Preparing Student Records...</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Printing Range</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm"
                                    value={`${range.start}-${range.end}`}
                                    onChange={(e) => {
                                        const [s, f] = e.target.value.split('-').map(Number);
                                        setRange({ start: s, end: f });
                                    }}
                                >
                                    {Array.from({ length: Math.ceil(readyCount / 50) }).map((_, i) => (
                                        <option key={i} value={`${i * 50}-${(i + 1) * 50}`} className="bg-black text-white">
                                            Results {i * 50 + 1} - {Math.min((i + 1) * 50, readyCount)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                                    <p className="text-[10px] text-muted-foreground uppercase">Class Total</p>
                                    <p className="text-xl font-bold">{students.length}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                    <p className="text-[10px] text-emerald-400 uppercase">Ready to Print</p>
                                    <p className="text-xl font-bold text-emerald-400">{readyCount}</p>
                                </div>
                            </div>

                            <Button
                                onClick={handlePrint}
                                disabled={readyCount === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 gap-2 font-bold"
                            >
                                <Printer className="w-5 h-5" /> Print Selected Batch
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
