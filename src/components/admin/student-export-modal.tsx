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

export function StudentExportModal({ students }: StudentExportModalProps) {
    const { classes: classesData, villages: villagesData, branding } = useMasterData();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
    const [groupBy, setGroupBy] = useState<"none" | "class" | "village">("none");

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

        const html = `
            <html>
            <head>
                <title>Student List report</title>
                <style>
                    @media print {
                        .page-break { page-break-after: always; }
                    }
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    .group-container { margin-bottom: 40px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                    th { background-color: #f2f2f2; }
                    h1 { text-align: center; color: #333; margin-bottom: 5px; }
                    .header-meta { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
                    .branding { display: flex; align-items: center; justify-content: center; gap: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .school-info h1 { margin: 0; font-size: 24px; text-align: left; }
                    .school-info p { margin: 2px 0; font-size: 12px; color: #666; }
                    .group-header { font-size: 16px; font-bold; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                </style>
            </head>
            <body>
                ${groupKeys.map((key, idx) => `
                    <div class="group-container ${groupBy !== "none" ? "page-break" : ""}">
                        <div class="branding">
                            ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" style="height: 60px;" />` : ''}
                            <div class="school-info">
                                <h1>${branding?.schoolName}</h1>
                                <p>${branding?.address || ""}</p>
                                <p><strong>${groupBy !== "none" ? `${groupBy.toUpperCase()} List: ${key}` : key}</strong> | ${timestamp}</p>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40px;">S.No</th>
                                    <th style="width: 80px;">ID</th>
                                    <th>Student Name</th>
                                    <th>Parent Name</th>
                                    <th>Mobile</th>
                                    <th>Class</th>
                                    <th>Village</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groups[key].map((s, sIdx) => `
                                    <tr>
                                        <td>${sIdx + 1}</td>
                                        <td>${s.schoolId}</td>
                                        <td>${s.studentName}</td>
                                        <td>${s.parentName}</td>
                                        <td>${s.parentMobile}</td>
                                        <td>${s.className}</td>
                                        <td>${s.villageName}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <p style="font-size: 10px; margin-top: 10px;">Total Students in this group: ${groups[key].length}</p>
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

            // 1. Process Students
            const headers = ["ID", "Student Name", "Parent Name", "Class", "Section", "Parent Mobile", "Village", "Status", "Login Password"];
            const data = targetStudents.map(s => ({
                "ID": s.schoolId,
                "Student Name": s.studentName,
                "Parent Name": s.parentName,
                "Class": s.className,
                "Section": s.sectionName || "N/A",
                "Parent Mobile": s.parentMobile,
                "Village": s.villageName,
                "Status": s.status,
                "Login Password": s.recoveryPassword || "N/A"
            }));
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
                <Button
                    variant="outline"
                    className="h-9 md:h-12 gap-2 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 rounded-xl px-4 md:px-6 transition-all"
                >
                    <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Reports & Export</span><span className="sm:hidden">Reports</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A192F] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl backdrop-blur-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold italic bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Student Reporting Center</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Print Section */}
                    <div className="space-y-6">
                        <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-tighter">
                                <Printer size={16} /> Student List Printing
                            </div>
                            <p className="text-[11px] text-blue-300 opacity-70 leading-relaxed italic">
                                Generate high-quality physical student directories. Use the filters on the right to target specific groups.
                            </p>

                            <div className="space-y-2 pt-1 border-t border-white/5 mt-2">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Grouping Strategy</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "none", label: "None" },
                                        { id: "class", label: "By Class" },
                                        { id: "village", label: "By Village" }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setGroupBy(opt.id as any)}
                                            className={cn(
                                                "py-2 px-2 rounded-xl text-[11px] font-bold border transition-all",
                                                groupBy === opt.id
                                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handlePrintList} variant="outline" className="w-full mt-2 h-12 gap-2 border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all font-black uppercase tracking-tighter">
                                <Printer size={16} /> Print Selected Students
                            </Button>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                <Download size={14} /> Quick Export
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Download student data in Excel format for offline management.</p>
                        </div>
                    </div>

                    {/* Filter Selectors */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <Label className="text-muted-foreground uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
                                <MapPin size={12} /> Filter Hierarchy
                            </Label>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Target Classes</span>
                                    <div className="flex gap-2">
                                        <button onClick={selectAllClasses} className="text-[9px] font-black text-emerald-400 hover:underline uppercase">All</button>
                                        <button onClick={clearClasses} className="text-[9px] font-black text-red-400 hover:underline uppercase">Clear</button>
                                    </div>
                                </div>
                                <div className="h-[120px] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                                    {classes.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => toggleClass(c.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-[11px] transition-colors",
                                                selectedClasses.includes(c.id) ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:bg-white/5"
                                            )}
                                        >
                                            <div className={cn("w-3 h-3 rounded-sm border", selectedClasses.includes(c.id) ? "bg-blue-500 border-blue-500" : "border-white/20")} />
                                            {c.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Target Villages</span>
                                    <div className="flex gap-2">
                                        <button onClick={selectAllVillages} className="text-[9px] font-black text-cyan-400 hover:underline uppercase">All</button>
                                        <button onClick={clearVillages} className="text-[9px] font-black text-red-500 hover:underline uppercase">Clear</button>
                                    </div>
                                </div>
                                <div className="h-[120px] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                                    {villages.map((v) => (
                                        <div
                                            key={v.id}
                                            onClick={() => toggleVillage(v.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-[11px] transition-colors",
                                                selectedVillages.includes(v.id) ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:bg-white/5"
                                            )}
                                        >
                                            <div className={cn("w-3 h-3 rounded-sm border", selectedVillages.includes(v.id) ? "bg-cyan-500 border-cyan-500" : "border-white/20")} />
                                            {v.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-white/5">
                    <Button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all uppercase tracking-tighter"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin w-4 h-4" /> Generating Package...
                            </span>
                        ) : `Export Student Dataset`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
