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
    const { classes: classesData, sections: sectionsData, classSections, subjects: masterSubjects, branding, selectedYear } = useMasterData();
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

            const defaultTemplate = [
                { id: 1, name: "Period 1", type: "CLASS", startTime: "09:00", endTime: "09:45", isLeisureAllowed: true },
                { id: 2, name: "Period 2", type: "CLASS", startTime: "09:45", endTime: "10:30", isLeisureAllowed: true },
                { id: 3, name: "Short Break", type: "BREAK", startTime: "10:30", endTime: "10:45", isLeisureAllowed: false },
                { id: 4, name: "Period 3", type: "CLASS", startTime: "10:45", endTime: "11:30", isLeisureAllowed: true },
            ];

            const settingsSnap = await getDoc(doc(db, "timetable_settings", "global_settings"));
            const dayTemplate = settingsSnap.exists() && settingsSnap.data().dayTemplates?.["MONDAY"]
                ? settingsSnap.data().dayTemplates["MONDAY"].slots
                : defaultTemplate;

            if (dayTemplate.length === 0) {
                alert("Day structure template not found. Please configure the global structure first.");
                setLoading(false);
                return;
            }

            // Fetch teachers (Need them for names)
            const tSnap = await getDocs(query(collection(db, "teachers"), where("status", "==", "ACTIVE")));
            const allTeachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const currentYear = selectedYear || "2026-2027";

            // Fetch selected timetables
            for (const id of selectedIds) {
                // The id is already formatted as "classId_sectionId"
                const path = `${currentYear}_${id}`;
                console.log(`[BulkPrint] Attempting to fetch: ${path}`);
                
                let docRef = doc(db, "class_timetables", path);
                let docSnap = await getDoc(docRef);

                // Fallback for legacy format if not found
                if (!docSnap.exists()) {
                   const legacyPath = `${currentYear}_class_${id}`;
                   console.log(`[BulkPrint] Not found. Trying legacy: ${legacyPath}`);
                   docRef = doc(db, "class_timetables", legacyPath);
                   docSnap = await getDoc(docRef);
                }

                if (docSnap.exists()) {
                    // Extract cId and sId for metadata if needed, but we can also get them from the doc if we added them
                    const [cId, sId] = id.includes('_') ? [id.substring(0, id.lastIndexOf('_')), id.substring(id.lastIndexOf('_') + 1)] : [id, ''];
                    
                    // Actually, let's use the IDs stored in the document if they exist, or the ones from the split
                    const data = docSnap.data();
                    const classInfo = classesData[data.classId || id.split('_')[0]]; 
                    const sectionInfo = sectionsData[data.sectionId || id.split('_')[1]];
                    printData.push({
                        className: classInfo?.name || "Unknown Class",
                        sectionName: sectionInfo?.name || "Unknown Section",
                        schedule: docSnap.data().schedule || {},
                        dayTemplate
                    });
                } else {
                    console.error(`[BulkPrint] Failed to find timetable for ${id} (tried ${path})`);
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
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Bulk Timetable Print</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                        * { box-sizing: border-box; }
                        body { 
                            font-family: 'Inter', -apple-system, sans-serif; 
                            background: white; 
                            color: #0f172a; /* slate-900 */
                            margin: 0; 
                            padding: 0; 
                        }
                        .page { 
                            padding: 40px; 
                            page-break-after: always; 
                            min-height: 100vh; 
                            display: flex; 
                            flex-direction: column; 
                            margin: 0 auto;
                            max-width: 1200px;
                        }
                        /* Header */
                        .header { 
                            display: flex;
                            align-items: flex-end;
                            justify-content: space-between;
                            border-bottom: 2px solid #0f172a;
                            padding-bottom: 2rem;
                            margin-bottom: 3rem;
                        }
                        .header-left { display: flex; align-items: flex-end; gap: 20px; }
                        .logo { height: 60px; object-fit: contain; }
                        .title-block h1 { 
                            margin: 0 0 8px 0; 
                            font-size: 32px; 
                            font-weight: 900; 
                            text-transform: uppercase; 
                            letter-spacing: -0.02em; 
                            color: #0f172a; 
                        }
                        .title-block p { 
                            margin: 0; 
                            font-size: 14px; 
                            font-weight: 700; 
                            letter-spacing: 0.1em; 
                            text-transform: uppercase; 
                            color: #64748b; /* slate-500 */
                        }
                        .header-right { text-align: right; }
                        .header-right p.label {
                            margin: 0 0 4px 0;
                            font-size: 10px;
                            font-weight: 900;
                            letter-spacing: 0.1em;
                            text-transform: uppercase;
                            color: #94a3b8; /* slate-400 */
                        }
                        .header-right p.date {
                            margin: 0;
                            font-size: 14px;
                            font-weight: 500;
                            color: #1e293b; /* slate-800 */
                        }
                        /* Table */
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            border-top: 2px solid #0f172a;
                            border-bottom: 2px solid #0f172a;
                        }
                        th, td { 
                            padding: 16px; 
                            text-align: center; 
                            vertical-align: middle;
                        }
                        th { 
                            background-color: #f8fafc; /* slate-50 */
                            border-bottom: 2px solid #0f172a; 
                            font-size: 11px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                            color: #0f172a;
                        }
                        tr:not(:last-child) td {
                            border-bottom: 1px solid #e2e8f0; /* divide-y slate-200 */
                        }
                        td.day-col {
                            text-align: left;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                            color: #0f172a;
                            width: 100px;
                        }
                        td.border-l { border-left: 1px solid #f1f5f9; /* slate-100 */ }
                        td.break { 
                            background-color: #f8fafc; 
                            border-left: 1px solid #e2e8f0; 
                        }
                        td.break span {
                            font-size: 9px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: 0.2em;
                            color: #94a3b8;
                        }
                        .subject-block {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            gap: 4px;
                        }
                        .subject { 
                            font-size: 11px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            color: #0f172a; 
                        }
                        .teacher { 
                            font-size: 9px;
                            font-weight: 500;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            color: #64748b; 
                        }
                        .leisure .subject { color: #94a3b8; }
                        .empty { color: #e2e8f0; font-weight: 300; }
                        /* Footer */
                        .footer {
                            margin-top: 64px;
                            text-align: center;
                        }
                        .footer p {
                            margin: 0;
                            font-size: 10px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                            color: #94a3b8;
                        }
                        @media print {
                            .page { padding: 0; max-width: 100%; }
                            @page { margin: 1cm; size: landscape; }
                        }
                    </style>
                </head>
                <body>
                    ${data.map(item => `
                        <div class="page">
                            <div class="header">
                                <div class="header-left">
                                    ${branding.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                                    <div class="title-block">
                                        <h1>${branding.schoolName || 'SPOORTHY CONCEPT SCHOOL'}</h1>
                                        <p>MASTER TIMETABLE &bull; ${item.className} ${item.sectionName ? ' - ' + item.sectionName : ''}</p>
                                    </div>
                                </div>
                                <div class="header-right">
                                    <p class="label">Generated</p>
                                    <p class="date">${new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="text-align: left;">Day</th>
                                        ${item.dayTemplate.map((slot: any) => `
                                            <th>Period ${slot.id}</th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map(day => `
                                        <tr>
                                            <td class="day-col">${day.substring(0, 3)}</td>
                                            ${item.dayTemplate.map((slot: any) => {
                                                if (slot.type === "BREAK") return `<td class="break"><span>BREAK</span></td>`;
                                                const cell = item.schedule[day]?.[slot.id] || {};
                                                if (!cell.subjectId) return `<td class="border-l"><span class="empty">-</span></td>`;
                                                if (cell.subjectId === "leisure") return `<td class="border-l leisure"><div class="subject-block"><span class="subject">Leisure</span></div></td>`;
                                    
                                                const subject = subjectsList.find((s: any) => s.id === cell.subjectId);
                                                const teacher = allTeachers.find((t: any) => t.id === cell.teacherId || t.schoolId === cell.teacherId);
                                    
                                                return `
                                                    <td class="border-l">
                                                        <div class="subject-block">
                                                            <span class="subject">${subject?.name || cell.subjectId}</span>
                                                            <span class="teacher">${teacher?.name || ''}</span>
                                                        </div>
                                                    </td>
                                                `;
                                            }).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="footer">
                                <p>Official Document &bull; ${branding.schoolName || 'Spoorthy Concept School'}</p>
                            </div>
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
