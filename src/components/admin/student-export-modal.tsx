"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileText, CreditCard, Users, Loader2, Receipt, Printer, MapPin } from "lucide-react";
import * as XLSX from "xlsx";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { cn } from "@/lib/utils";

interface StudentExportModalProps {
    students: any[];
}

export function StudentExportModal({ students, children }: StudentExportModalProps & { children?: React.ReactNode }) {
    const { classes: classesData, villages: villagesData, branding } = useMasterData();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
    const [groupBy, setGroupBy] = useState<"none" | "class" | "village">("none");
    const [printMode, setPrintMode] = useState<"full" | "minimal">("full");
    const [emptyColumnsCount, setEmptyColumnsCount] = useState<number>(0);
    const [excelMode, setExcelMode] = useState<"student" | "parent" | "total">("total");

    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

    const selectAllClasses = () => setSelectedClasses(classes.map(c => c.id));
    const clearClasses = () => setSelectedClasses([]);

    const selectAllVillages = () => setSelectedVillages(villages.map(v => v.id));
    const clearVillages = () => setSelectedVillages([]);

    const toggleClass = (classId: string) => {
        setSelectedClasses(prev =>
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const toggleVillage = (villageId: string) => {
        setSelectedVillages(prev =>
            prev.includes(villageId) ? prev.filter(id => id !== villageId) : [...prev, villageId]
        );
    };

    const getTargetStudents = () => {
        return students.filter(s => {
            const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(s.classId) || selectedClasses.includes(s.className);
            const matchesVillage = selectedVillages.length === 0 || selectedVillages.includes(s.villageId) || selectedVillages.includes(s.villageName);
            return matchesClass && matchesVillage;
        });
    };

    const handlePrintList = () => {
        let targetStudents = getTargetStudents();
        if (targetStudents.length === 0) { alert("No students selected"); return; }

        // Sort students alphabetically by name
        targetStudents.sort((a, b) => String(a.studentName || "").localeCompare(String(b.studentName || "")));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const timestamp = new Date().toLocaleString();

        // 1. Group Data
        const groups: Record<string, any[]> = {};
        if (groupBy === "none") {
            groups["Student Directory Report"] = targetStudents;
        } else {
            targetStudents.forEach(s => {
                const key = groupBy === "class" ? (s.className || "Other Class") : (s.villageName || "Other Village");
                if (!groups[key]) groups[key] = [];
                groups[key].push(s);
            });
        }

        const groupKeys = Object.keys(groups);

        // Columns structure based on options
        const isMinimal = printMode === "minimal";
        const emptyCols = Array.from({ length: emptyColumnsCount }, (_, i) => `Col ${i + 1}`);

        // Table Header HTML
        let headersHtml = `<th style="width: 50px; text-align: center;">Roll No</th>`;
        if (isMinimal) {
            headersHtml += `
                <th style="width: 150px;">School ID</th>
                <th style="min-width: 250px;">Student Name</th>
            `;
        } else {
            headersHtml += `
                <th style="width: 130px;">School ID</th>
                <th style="min-width: 180px;">Student Name</th>
                <th style="width: 140px;">Parent Name</th>
                <th style="width: 100px;">Mobile</th>
                <th style="width: 80px;">Class</th>
                <th style="width: 110px;">Village</th>
            `;
        }
        emptyCols.forEach((_, idx) => {
            headersHtml += `<th class="empty-header" style="width: 80px; border-left: 1px solid #94a3b8;">Col ${idx + 1}</th>`; // Blank header
        });

        const html = `
            <html>
            <head>
                <title>Student List report</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 1.2cm 1cm 1.2cm 1cm;
                    }
                    @media print {
                        .page-break { page-break-after: always; break-after: page; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    body { 
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                        padding: 0; 
                        margin: 0; 
                        color: #1e293b; 
                        background: #fff;
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .group-container { 
                        page-break-inside: avoid;
                        margin-bottom: 20px; 
                    }
                    .branding { 
                        display: flex; 
                        align-items: center; 
                        gap: 20px; 
                        border-bottom: 2px solid #0f172a; 
                        padding-bottom: 15px; 
                        margin-bottom: 20px; 
                    }
                    .logo-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 55px;
                        height: 55px;
                        border-radius: 8px;
                        background: #f1f5f9;
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    .logo-container img {
                        max-height: 48px;
                        max-width: 48px;
                        object-fit: contain;
                    }
                    .school-info {
                        flex: 1;
                    }
                    .school-info h1 { 
                        margin: 0; 
                        font-size: 20px; 
                        font-weight: 800; 
                        color: #0f172a;
                        letter-spacing: -0.025em;
                        text-transform: uppercase;
                    }
                    .school-info p { 
                        margin: 2px 0 0 0; 
                        font-size: 11px; 
                        color: #64748b; 
                        font-weight: 500;
                    }
                    .report-meta {
                        text-align: right;
                        font-size: 10px;
                        color: #475569;
                    }
                    .report-title {
                        font-weight: 700;
                        color: #0f172a;
                        font-size: 12px;
                        text-transform: uppercase;
                        margin-bottom: 2px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 15px; 
                        box-shadow: 0 0 0 1px #e2e8f0;
                        border-radius: 6px;
                        overflow: hidden;
                    }
                    th, td { 
                        border-bottom: 1px solid #e2e8f0; 
                        padding: 7px 10px; 
                        text-align: left; 
                    }
                    th { 
                        background-color: #f8fafc; 
                        color: #475569;
                        font-weight: 700;
                        text-transform: uppercase;
                        font-size: 9px;
                        letter-spacing: 0.05em;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    tr:nth-child(even) td {
                        background-color: #f8fafc;
                    }
                    td.roll-col {
                        text-align: center;
                        font-weight: 700;
                        color: #64748b;
                        font-family: monospace;
                    }
                    td.id-col {
                        font-family: monospace;
                        font-weight: 600;
                        color: #0f172a;
                    }
                    td.name-col {
                        font-weight: 600;
                        color: #0f172a;
                    }
                    td.empty-cell {
                        border-left: 1px solid #cbd5e1;
                        background-color: #fff !important;
                    }
                    th.empty-header {
                        color: #94a3b8;
                        background-color: #f8fafc;
                        font-weight: 500;
                    }
                    .summary-box {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 12px;
                        padding: 8px 12px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 10px;
                        font-weight: 600;
                        color: #475569;
                    }
                    .summary-badge {
                        background: #0f172a;
                        color: #fff;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 9px;
                        font-weight: 700;
                    }
                </style>
            </head>
            <body>
                ${groupKeys.map((key, idx) => `
                    <div class="group-container ${groupBy !== "none" ? "page-break" : ""}">
                        <div class="branding">
                            ${branding?.schoolLogo ? `
                                <div class="logo-container">
                                    <img src="${branding.schoolLogo}" />
                                </div>
                            ` : ''}
                            <div class="school-info">
                                <h1>${branding?.schoolName || "Spoorthy High School"}</h1>
                                <p>${branding?.address || ""}</p>
                            </div>
                            <div class="report-meta">
                                <div class="report-title">${groupBy !== "none" ? `${groupBy} List: ${key}` : key}</div>
                                <div>Printed: ${timestamp}</div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    ${headersHtml}
                                </tr>
                            </thead>
                            <tbody>
                                ${groups[key].map((s, sIdx) => {
                                    const resolvedId = s.schoolId || "---";
                                    let rowHtml = `<td class="roll-col">${s.rollNumber || (sIdx + 1)}</td>`;
                                    if (isMinimal) {
                                        rowHtml += `
                                            <td class="id-col">${resolvedId}</td>
                                            <td class="name-col">${s.studentName}</td>
                                        `;
                                    } else {
                                        rowHtml += `
                                            <td class="id-col">${resolvedId}</td>
                                            <td class="name-col">${s.studentName}</td>
                                            <td>${s.parentName || ""}</td>
                                            <td>${s.parentMobile || ""}</td>
                                            <td>${s.className || ""}</td>
                                            <td>${s.villageName || ""}</td>
                                        `;
                                    }
                                    for (let i = 0; i < emptyColumnsCount; i++) {
                                        rowHtml += `<td class="empty-cell"></td>`;
                                    }
                                    return `<tr>${rowHtml}</tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                        
                        <div class="summary-box">
                            <span>TOTAL REGISTERED IN THIS SECTION</span>
                            <span class="summary-badge">${groups[key].length} Students</span>
                        </div>
                    </div>
                `).join('')}
                <script>
                    window.onload = () => { window.print(); window.close(); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const wb = XLSX.utils.book_new();
            const targetStudents = getTargetStudents();

            if (targetStudents.length === 0) {
                alert("No students found for the selected filters.");
                setLoading(false);
                return;
            }

            // 1. Process Columns & Headers based on excelMode
            let headers: string[] = [];
            let data: any[] = [];

            if (excelMode === "student") {
                headers = ["School ID", "Student Name", "Class", "Section", "Date of Birth", "Gender"];
                data = targetStudents.map(s => ({
                    "School ID": s.schoolId || "N/A",
                    "Student Name": s.studentName,
                    "Class": s.className,
                    "Section": s.sectionName || "N/A",
                    "Date of Birth": s.dateOfBirth || "N/A",
                    "Gender": s.gender || "N/A"
                }));
            } else if (excelMode === "parent") {
                headers = ["School ID", "Student Name", "Parent Name", "Parent Mobile", "Class", "Section", "Village", "Date of Birth", "Gender"];
                data = targetStudents.map(s => ({
                    "School ID": s.schoolId || "N/A",
                    "Student Name": s.studentName,
                    "Parent Name": s.parentName || "N/A",
                    "Parent Mobile": s.parentMobile || "N/A",
                    "Class": s.className,
                    "Section": s.sectionName || "N/A",
                    "Village": s.villageName || "N/A",
                    "Date of Birth": s.dateOfBirth || "N/A",
                    "Gender": s.gender || "N/A"
                }));
            } else {
                // "total"
                headers = ["School ID", "Student Name", "Parent Name", "Class", "Section", "Parent Mobile", "Village", "Status", "Date of Birth", "Gender", "Transport", "Login Password"];
                data = targetStudents.map(s => ({
                    "School ID": s.schoolId || "N/A",
                    "Student Name": s.studentName,
                    "Parent Name": s.parentName || "N/A",
                    "Class": s.className,
                    "Section": s.sectionName || "N/A",
                    "Parent Mobile": s.parentMobile || "N/A",
                    "Village": s.villageName || "N/A",
                    "Status": s.status,
                    "Date of Birth": s.dateOfBirth || "N/A",
                    "Gender": s.gender || "N/A",
                    "Transport": s.transportRequired ? "YES" : "NO",
                    "Login Password": s.recoveryPassword || "N/A"
                }));
            }

            const ws = XLSX.utils.json_to_sheet(data, { header: headers });
            XLSX.utils.book_append_sheet(wb, ws, "Students");

            // No other types needed based on user request "those are not required here"


            // Generate File
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Student_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setOpen(false);
        } catch (error: any) {
            console.error(error);
            alert("Export Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button
                        variant="outline"
                        className="h-9 md:h-12 gap-2 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 rounded-xl px-4 md:px-6 transition-all"
                    >
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Reports & Export</span><span className="sm:hidden">Reports</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#0B1524]/95 border-white/10 text-white w-[92vw] sm:max-w-md p-4 rounded-[20px] shadow-2xl backdrop-blur-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 !data-[state=open]:slide-in-from-left-1/2 !data-[state=open]:slide-in-from-top-[50%] !data-[state=closed]:slide-out-to-left-1/2 !data-[state=closed]:slide-out-to-top-[50%] ease-out !gap-0 max-h-[85vh] overflow-y-auto">
                <DialogHeader className="mb-3">
                    <DialogTitle className="text-[20px] font-sans font-bold text-white leading-tight text-center sm:text-left">
                        Reports & Export
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    {/* Print Section */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-blue-400 text-[13px] font-bold uppercase tracking-tighter">
                                <Printer size={16} /> Student List Printing
                            </span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label className="text-[12px] font-black text-white/50 uppercase tracking-widest shrink-0">Group By:</Label>
                            <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-lg w-full sm:w-auto">
                                {[
                                    { id: "none", label: "None" },
                                    { id: "class", label: "Class" },
                                    { id: "village", label: "Village" }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setGroupBy(opt.id as any)}
                                        className={cn(
                                            "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[12px] font-bold transition-all text-center",
                                            groupBy === opt.id
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Print Columns Selection */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label className="text-[12px] font-black text-white/50 uppercase tracking-widest shrink-0">Print Columns:</Label>
                            <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-lg w-full sm:w-auto">
                                {[
                                    { id: "full", label: "Full Details" },
                                    { id: "minimal", label: "ID & Name" }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setPrintMode(opt.id as any)}
                                        className={cn(
                                            "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[11px] font-bold transition-all text-center",
                                            printMode === opt.id
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Empty Columns Selection */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label className="text-[12px] font-black text-white/50 uppercase tracking-widest shrink-0">Empty Columns:</Label>
                            <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-lg w-full sm:w-auto">
                                {[0, 1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setEmptyColumnsCount(num)}
                                        className={cn(
                                            "flex-1 sm:flex-none sm:w-7 h-7 flex items-center justify-center rounded-md text-[11px] font-bold transition-all",
                                            emptyColumnsCount === num
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handlePrintList} variant="outline" className="w-full h-10 gap-2 border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all font-black text-[13px] uppercase tracking-tighter">
                            <Printer size={16} /> Print List
                        </Button>
                    </div>

                    {/* Excel Export Configuration */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-emerald-400 text-[13px] font-bold uppercase tracking-tighter">
                                <Download size={16} /> Excel Export Columns
                            </span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label className="text-[12px] font-black text-white/50 uppercase tracking-widest shrink-0">Export Mode:</Label>
                            <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-lg w-full sm:w-auto">
                                {[
                                    { id: "student", label: "Student Only" },
                                    { id: "parent", label: "With Parents" },
                                    { id: "total", label: "Total Details" }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setExcelMode(opt.id as any)}
                                        className={cn(
                                            "flex-1 sm:flex-none px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all text-center",
                                            excelMode === opt.id
                                                ? "bg-emerald-600 text-white shadow-sm"
                                                : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Filter Selectors */}
                    <div className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                        <Label className="text-white/50 uppercase text-[12px] font-black tracking-widest flex items-center gap-1.5">
                            <MapPin size={14} /> Target Filters
                        </Label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            {/* Classes */}
                            <div className="flex flex-col gap-2 border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                                <div className="flex justify-between items-center pb-1 border-b border-white/5">
                                    <span className="text-[11px] font-bold text-white/50 uppercase">Classes</span>
                                    <div className="flex gap-2">
                                        <button onClick={selectAllClasses} className="text-[10px] font-black text-emerald-400 hover:underline uppercase">All</button>
                                        <button onClick={clearClasses} className="text-[10px] font-black text-red-400 hover:underline uppercase">X</button>
                                    </div>
                                </div>
                                <div className="h-[90px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                                    {classes.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => toggleClass(c.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-[13px] font-medium transition-colors",
                                                selectedClasses.includes(c.id) ? "bg-blue-500/20 text-blue-400" : "text-white/70 hover:bg-white/5"
                                            )}
                                        >
                                            <div className={cn("w-3 h-3 rounded-[3px] shrink-0", selectedClasses.includes(c.id) ? "bg-blue-500" : "bg-white/10")} />
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Villages */}
                            <div className="flex flex-col gap-2 border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                                <div className="flex justify-between items-center pb-1 border-b border-white/5">
                                    <span className="text-[11px] font-bold text-white/50 uppercase">Villages</span>
                                    <div className="flex gap-2">
                                        <button onClick={selectAllVillages} className="text-[10px] font-black text-cyan-400 hover:underline uppercase">All</button>
                                        <button onClick={clearVillages} className="text-[10px] font-black text-red-400 hover:underline uppercase">X</button>
                                    </div>
                                </div>
                                <div className="h-[90px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                                    {villages.map((v) => (
                                        <div
                                            key={v.id}
                                            onClick={() => toggleVillage(v.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-[13px] font-medium transition-colors",
                                                selectedVillages.includes(v.id) ? "bg-cyan-500/20 text-cyan-400" : "text-white/70 hover:bg-white/5"
                                            )}
                                        >
                                            <div className={cn("w-3 h-3 rounded-[3px] shrink-0", selectedVillages.includes(v.id) ? "bg-cyan-500" : "bg-white/10")} />
                                            <span className="truncate">{v.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-10 rounded-xl shadow-lg shadow-emerald-500/20 transition-all uppercase text-[11px] tracking-tighter"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin w-4 h-4" /> Generating...
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <Download size={14} /> Export Dataset (Excel)
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
