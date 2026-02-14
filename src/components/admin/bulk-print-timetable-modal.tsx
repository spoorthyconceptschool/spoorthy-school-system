"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Loader2, Check, X } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { doc, getDoc, getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export function BulkPrintTimetableModal() {
    const { classes: classesData, sections: sectionsData, classSections, subjects: masterSubjects, branding } = useMasterData();
    const [open, setOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Convert and sort classes
    const classes = Object.values(classesData).sort((a, b) => (a.order || 0) - (b.order || 0));
    const sections = Object.values(sectionsData);
    const subjectsList = Object.values(masterSubjects);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const allIds = Object.keys(classSections);
        setSelectedIds(selectedIds.length === allIds.length ? [] : allIds);
    };

    const handleBulkPrint = async () => {
        if (selectedIds.length === 0) return;
        setLoading(true);

        try {
            const printData = [];

            // Get Day Template (Assuming same for all, fetched from global_settings)
            const settingsSnap = await getDoc(doc(db, "timetable_settings", "global_settings"));
            const dayTemplate = settingsSnap.exists() && settingsSnap.data().dayTemplates?.["MONDAY"]
                ? settingsSnap.data().dayTemplates["MONDAY"].slots
                : [];

            if (dayTemplate.length === 0) {
                alert("Day structure template not found. Please configure the global structure first.");
                setLoading(false);
                return;
            }

            // Fetch teachers (Need them for names)
            const tSnap = await getDocs(query(collection(db, "teachers"), where("status", "==", "ACTIVE")));
            const allTeachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Fetch selected timetables
            for (const id of selectedIds) {
                const [cId, sId] = id.split('_');
                const docRef = doc(db, "timetables", `2025-2026_${cId}_${sId}`);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const classInfo = classesData[cId];
                    const sectionInfo = sectionsData[sId];
                    printData.push({
                        className: classInfo?.name || "Unknown Class",
                        sectionName: sectionInfo?.name || "Unknown Section",
                        schedule: docSnap.data().schedule || {},
                        dayTemplate
                    });
                }
            }

            if (printData.length === 0) {
                alert("No published timetables found for selected classes.");
                setLoading(false);
                return;
            }

            generatePrintWindow(printData, allTeachers);
        } catch (e) {
            console.error(e);
            alert("Failed to prepare print job.");
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    const generatePrintWindow = (data: any[], allTeachers: any[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Bulk Timetable Print</title>
                    <style>
                        body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
                        .page { padding: 40px; page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header img { height: 60px; margin-bottom: 10px; }
                        .header h1 { margin: 0; color: #1a365d; font-size: 24px; text-transform: uppercase; }
                        .header p { margin: 5px 0; color: #718096; font-size: 14px; text-transform: uppercase; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
                        th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 10px; height: 50px; word-wrap: break-word; }
                        th { background-color: #f8fafc; color: #4a5568; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; font-size: 9px; height: auto; }
                        .day-col { background-color: #f8fafc; font-weight: bold; width: 60px; text-transform: uppercase; }
                        .period-info { font-size: 8px; color: #a0aec0; margin-bottom: 2px; }
                        .subject { font-weight: bold; color: #2d3748; display: block; margin-bottom: 1px; }
                        .teacher { font-size: 8px; color: #718096; line-height: 1.1; }
                        .break { background-color: #f1f5f9; color: #94a3b8; font-weight: bold; font-style: italic; letter-spacing: 0.2em; }
                        .leisure { color: #cbd5e0; font-style: italic; }
                        @media print {
                            .page { padding: 0; }
                            @page { margin: 1cm; orientation: landscape; }
                        }
                    </style>
                </head>
                <body>
                    ${data.map(item => `
                        <div class="page">
                            <div class="header">
                                ${branding.schoolLogo ? `<img src="${branding.schoolLogo}" />` : ''}
                                <h1>${branding.schoolName || 'SPOORTHY CONCEPT SCHOOL'}</h1>
                                <p>Academic Timetable: ${item.className} - ${item.sectionName}</p>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th class="day-col">Day</th>
                                        ${item.dayTemplate.map((slot: any) => `
                                            <th>
                                                <div class="period-info">${slot.startTime} - ${slot.endTime}</div>
                                                <div>${slot.name}</div>
                                            </th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map(day => `
                                        <tr>
                                            <td class="day-col">${day.substring(0, 3)}</td>
                                            ${item.dayTemplate.map((slot: any) => {
            if (slot.type === "BREAK") return `<td class="break">BREAK</td>`;
            const cell = item.schedule[day]?.[slot.id] || {};
            if (!cell.subjectId) return `<td>-</td>`;
            if (cell.subjectId === "leisure") return `<td class="leisure">Leisure</td>`;

            const subject = subjectsList.find((s: any) => s.id === cell.subjectId);
            const teacher = allTeachers.find((t: any) => (t.schoolId || t.id) === cell.teacherId);

            return `
                                                    <td>
                                                        <span class="subject">${subject?.name || 'Subject'}</span>
                                                        <span class="teacher">${teacher?.name || ''}</span>
                                                    </td>
                                                `;
        }).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}
                    <script>window.onload = () => { window.print(); window.close(); };</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px]">
                    <Printer className="w-4 h-4" /> Bulk Print
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0A192F] border-white/10 text-white max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Printer className="text-accent" /> Bulk Print Timetables
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                        Select multiple class-sections to generate a combined print report.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4 custom-scrollbar">
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Selection Actions</span>
                        <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] uppercase font-black text-accent hover:bg-accent/10">
                            {selectedIds.length === Object.keys(classSections).length ? "Deselect All" : "Select All Available"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {classes.map(cls => {
                            const classSecs = Object.values(classSections).filter((cs: any) => cs.classId === cls.id);
                            if (classSecs.length === 0) return null;

                            return (
                                <div key={cls.id} className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground ml-1">{cls.name}</h4>
                                    <div className="space-y-1">
                                        {classSecs.map((cs: any) => {
                                            const section = sections.find(s => s.id === cs.sectionId);
                                            const isSelected = selectedIds.includes(cs.id);
                                            return (
                                                <div
                                                    key={cs.id}
                                                    onClick={() => toggleSelection(cs.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                                        isSelected
                                                            ? "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(100,255,218,0.1)]"
                                                            : "bg-white/5 border-white/5 text-white/60 hover:border-white/20 hover:text-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                            isSelected ? "bg-accent border-accent" : "border-white/20 group-hover:border-white/40"
                                                        )}>
                                                            {isSelected && <Check className="w-3 h-3 text-black stroke-[4]" />}
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-widest">Section {section?.name || '?'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter className="border-t border-white/5 pt-4 bg-white/5 p-6 -mx-6 rounded-b-2xl">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="uppercase text-[10px] font-black tracking-widest">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleBulkPrint}
                        disabled={loading || selectedIds.length === 0}
                        className="bg-accent text-black hover:bg-accent/80 uppercase text-[10px] font-black tracking-widest gap-2 shadow-lg shadow-accent/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        Print {selectedIds.length} Timetables
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
