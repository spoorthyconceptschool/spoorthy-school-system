"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useMasterData } from "@/context/MasterDataContext";
import { rtdb, db } from "@/lib/firebase";
import { ref, update, push, set, remove } from "firebase/database";
import { Trash2, Plus, Edit, BookOpen, CheckCircle2, GraduationCap, Users, Download, Printer, Check } from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { exportAcademicLoad } from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ClassesSectionsPage() {
    const { classes, sections, classSections, subjects, classSubjects, subjectTeachers, branding, loading } = useMasterData();
    const [activeTab, setActiveTab] = useState("classes");

    // Simple state for forms
    const [newName, setNewName] = useState("");
    const [newOrder, setNewOrder] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Teachers State
    const [teachers, setTeachers] = useState<any[]>([]);

    // Fetch Teachers
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const q = query(collection(db, "teachers"), orderBy("name"));
                const snap = await getDocs(q);
                setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error("Failed to fetch teachers", e); }
        };
        fetchTeachers();
    }, []);

    // === CLASSES ===
    const addClass = async () => {
        if (!newName) return;
        setSubmitting(true);
        const newRef = push(ref(rtdb, 'master/classes'));
        await set(newRef, { id: newRef.key, name: newName, order: newOrder });
        setNewName(""); setSubmitting(false);
    };

    const deleteClass = async (id: string) => {
        if (confirm("Delete this Class?")) await remove(ref(rtdb, `master/classes/${id}`));
    };

    // === SECTIONS ===
    const addSection = async () => {
        if (!newName) return;
        setSubmitting(true);
        const newRef = push(ref(rtdb, 'master/sections'));
        await set(newRef, { id: newRef.key, name: newName });
        setNewName(""); setSubmitting(false);
    };

    const deleteSection = async (id: string) => {
        if (confirm("Delete this Section?")) await remove(ref(rtdb, `master/sections/${id}`));
    };

    // === COMBINATIONS ===
    const toggleCombination = async (cId: string, sId: string, currentStatus: boolean) => {
        const key = `${cId}_${sId}`;
        const targetRef = ref(rtdb, `master/classSections/${key}`);
        if (currentStatus) {
            await remove(targetRef);
        } else {
            await set(targetRef, { id: key, classId: cId, sectionId: sId, active: true });
        }
    };

    const assignClassTeacher = async (key: string, teacherId: string) => {
        if (!key) return;
        const targetRef = ref(rtdb, `master/classSections/${key}/classTeacherId`);
        await set(targetRef, teacherId);
    };

    const getCombinationStatus = (cId: string, sId: string) => {
        return !!classSections[`${cId}_${sId}`];
    };

    const getActiveCombinations = () => {
        return Object.values(classSections).filter((cs: any) => cs.active);
    };

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const getProcessedData = (ids: string[]) => {
        return Object.values(classSections)
            .filter((cs: any) => cs.active && ids.includes(cs.id))
            .map((cs: any) => {
                const assignedSubjects = Object.keys(classSubjects[cs.classId] || {})
                    .filter(sid => sid !== 'id' && classSubjects[cs.classId][sid] && subjects[sid])
                    .map(sid => ({
                        name: subjects[sid].name,
                        teacher: teachers.find(t => t.id === subjectTeachers[`${cs.classId}_${cs.sectionId}`]?.[sid])?.name || "Not Assigned"
                    }));

                return {
                    className: classes[cs.classId]?.name || "N/A",
                    sectionName: sections[cs.sectionId]?.name || "N/A",
                    classTeacher: teachers.find(t => t.id === cs.classTeacherId)?.name || "N/A",
                    subjects: assignedSubjects
                };
            }).sort((a, b) => a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName));
    };

    const handleExport = (ids: string[]) => {
        const data = getProcessedData(ids);
        exportAcademicLoad(data);
        setIsReportOpen(false);
    };

    const handlePrint = (ids: string[]) => {
        const data = getProcessedData(ids);
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Academic Assignments Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        th { background-color: #f4f4f4; }
                        .header { display: flex; align-items: center; justify-content: center; gap: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                        .logo { height: 80px; width: auto; object-fit: contain; }
                        .header-text { text-align: left; }
                        h1 { margin: 0; font-size: 28px; }
                        .section-title { font-size: 20px; font-weight: bold; margin-top: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
                        .page-container { page-break-after: always; padding-bottom: 40px; }
                        /* Don't add a page break after the last item */
                        .page-container:last-child { page-break-after: auto; }
                    </style>
                </head>
                <body>
                    ${data.map(item => `
                        <div class="page-container">
                            <div class="header">
                                ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                                <div class="header-text">
                                    <h1>${branding?.schoolName || 'Spoorthy Concept School'}</h1>
                                    <h3 style="margin: 5px 0 0 0; color: #666;">Academic Assignments: ${item.className} - ${item.sectionName}</h3>
                                </div>
                            </div>
                            <p style="text-align: right; font-size: 10px;">Generated: ${new Date().toLocaleString()}</p>
                            
                            <p><strong>Primary Class Teacher:</strong> ${item.classTeacher}</p>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 50%">Subject</th>
                                        <th>Assigned Teacher</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${item.subjects.length > 0
                ? item.subjects.map(s => `<tr><td>${s.name}</td><td>${s.teacher}</td></tr>`).join('')
                : '<tr><td colspan="2" style="text-align:center;">No Subjects Assigned</td></tr>'
            }
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
        setIsReportOpen(false);
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Academy Data...</div>;

    return (
        <div className="space-y-4 md:space-y-6 max-w-none p-0 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0 px-1">
                <h1 className="text-xl md:text-3xl font-display font-bold">Academic Structure</h1>
                <div className="flex gap-2">
                    <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full md:w-auto gap-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                            >
                                <Download size={14} /> Export / Print Reports
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black/95 border-white/10 text-white max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Select Classes for Report</DialogTitle>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-3 mt-4 max-h-[400px] overflow-y-auto pr-2">
                                <div className="col-span-2 flex justify-between items-center px-2 py-1">
                                    <div className="flex gap-4">
                                        <button
                                            className="text-[10px] uppercase tracking-widest text-accent hover:underline font-bold"
                                            onClick={() => {
                                                const allIds = getActiveCombinations().map(c => c.id);
                                                setSelectedIds(allIds);
                                            }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                                            onClick={() => setSelectedIds([])}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{selectedIds.length} Selected</span>
                                </div>

                                {getActiveCombinations().sort((a: any, b: any) => {
                                    const cA = classes[a.classId]?.order || 0;
                                    const cB = classes[b.classId]?.order || 0;
                                    if (cA !== cB) return cA - cB;
                                    return (sections[a.sectionId]?.name || "").localeCompare(sections[b.sectionId]?.name || "");
                                }).map((cs: any) => {
                                    const isSelected = selectedIds.includes(cs.id);
                                    return (
                                        <div
                                            key={cs.id}
                                            onClick={() => {
                                                setSelectedIds(prev => isSelected ? prev.filter(id => id !== cs.id) : [...prev, cs.id]);
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                                ? "bg-white/10 border-white/40"
                                                : "bg-white/5 border-white/5 opacity-60 hover:opacity-100"
                                                }`}
                                        >
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{classes[cs.classId]?.name}</div>
                                                <div className="text-[10px] text-muted-foreground">Section {sections[cs.sectionId]?.name}</div>
                                            </div>
                                            {isSelected && <Check size={14} className="text-emerald-400" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <Button
                                    disabled={selectedIds.length === 0}
                                    onClick={() => handleExport(selectedIds)}
                                    className="bg-emerald-500 text-white hover:bg-emerald-600 gap-2"
                                >
                                    <Download size={16} /> Excel Export {`(${selectedIds.length})`}
                                </Button>
                                <Button
                                    disabled={selectedIds.length === 0}
                                    onClick={() => handlePrint(selectedIds)}
                                    className="bg-zinc-100 text-black hover:bg-zinc-200 gap-2"
                                >
                                    <Printer size={16} /> Print View {`(${selectedIds.length})`}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/5 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
                    <TabsTrigger value="classes" className="flex-1 md:flex-none">Classes</TabsTrigger>
                    <TabsTrigger value="sections">Sections</TabsTrigger>
                    <TabsTrigger value="combinations">Combinations</TabsTrigger>
                </TabsList>

                {/* CLASSES TAB */}
                <TabsContent value="classes" className="space-y-4 mt-4">
                    <Card className="bg-black/20 border-white/10 p-4">
                        <div className="flex gap-2">
                            <Input placeholder="Class Name (e.g. Grade 1)" value={newName} onChange={e => setNewName(e.target.value)} />
                            <Input type="number" placeholder="Order" className="w-24" value={newOrder} onChange={e => setNewOrder(Number(e.target.value))} />
                            <Button onClick={addClass} disabled={submitting} className="bg-white text-black hover:bg-zinc-200"><Plus size={16} className="mr-2" /> Add</Button>
                        </div>
                    </Card>
                    <div className="grid gap-2">
                        {Object.values(classes).sort((a: any, b: any) => a.order - b.order).map((c: any) => (
                            <div key={c.id} className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center justify-between w-full md:w-auto md:gap-4">
                                    <span className="font-bold text-lg">{c.name}</span>
                                    <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">Order: {c.order}</span>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto justify-end">
                                    {/* SUBJECTS DIALOG */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2 border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20">
                                                <BookOpen size={14} /> Subjects
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-black/95 border-white/10 text-white max-w-md">
                                            <DialogHeader><DialogTitle>Subjects: {c.name}</DialogTitle></DialogHeader>
                                            <div className="grid grid-cols-1 gap-2 mt-4 max-h-[400px] overflow-y-auto pr-2">
                                                {Object.values(subjects || {}).map((s: any) => {
                                                    const isSelected = classSubjects[c.id]?.[s.id];
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            onClick={async () => await set(ref(rtdb, `master/classSubjects/${c.id}/${s.id}`), !isSelected)}
                                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "bg-indigo-500/20 border-indigo-500/50" : "bg-white/5 border-white/10 opacity-90 hover:opacity-100"
                                                                }`}
                                                        >
                                                            <span className="font-medium">{s.name}</span>
                                                            {isSelected && <CheckCircle2 size={16} className="text-indigo-400" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    {/* STAFFING DIALOG */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                                                <GraduationCap size={14} /> Staffing
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl">
                                            <DialogHeader><DialogTitle>Academic Assignments: {c.name}</DialogTitle></DialogHeader>
                                            <div className="space-y-6 mt-4 max-h-[70vh] overflow-y-auto pr-2">
                                                {Object.values(classSections).filter((cs: any) => cs.classId === c.id).map((cs: any) => {
                                                    const assignedSubjects = Object.keys(classSubjects[c.id] || {}).filter(sid => classSubjects[c.id][sid] && subjects[sid]);
                                                    return (
                                                        <div key={cs.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                                <span className="font-bold text-emerald-400 flex items-center gap-2"><Users size={16} /> Section {sections[cs.sectionId]?.name}</span>
                                                            </div>

                                                            {/* Class Teacher */}
                                                            <div className="flex items-center justify-between gap-4 py-2 border-b border-white/5">
                                                                <span className="text-sm font-bold text-white">Class Teacher</span>
                                                                <select
                                                                    className="bg-black border border-white/10 rounded px-2 py-1 text-xs w-[200px]"
                                                                    value={cs.classTeacherId || ""}
                                                                    onChange={(e) => assignClassTeacher(cs.id, e.target.value)}
                                                                >
                                                                    <option value="">-- No Class Teacher --</option>
                                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                </select>
                                                            </div>

                                                            {/* Subject Teachers */}
                                                            <div className="space-y-2">
                                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Subject Teachers</span>
                                                                {assignedSubjects.map(sid => (
                                                                    <div key={sid} className="flex items-center justify-between gap-4 pl-2">
                                                                        <span className="text-sm text-zinc-400">{subjects[sid]?.name}</span>
                                                                        <select
                                                                            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs w-[200px]"
                                                                            value={subjectTeachers[`${c.id}_${cs.sectionId}`]?.[sid] || ""}
                                                                            onChange={async (e) => await set(ref(rtdb, `master/subjectTeachers/${c.id}_${cs.sectionId}/${sid}`), e.target.value)}
                                                                        >
                                                                            <option value="">-- No Teacher --</option>
                                                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                        </select>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button variant="ghost" size="sm" onClick={() => deleteClass(c.id)} className="text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* SECTIONS TAB */}
                <TabsContent value="sections" className="space-y-4 mt-4">
                    <Card className="bg-black/20 border-white/10 p-4">
                        <div className="flex gap-2">
                            <Input placeholder="Section Name (e.g. A, B, Alpha)" value={newName} onChange={e => setNewName(e.target.value)} />
                            <Button onClick={addSection} disabled={submitting} className="bg-white text-black hover:bg-zinc-200"><Plus size={16} className="mr-2" /> Add</Button>
                        </div>
                    </Card>
                    <div className="grid gap-2">
                        {Object.values(sections).map((s: any) => (
                            <div key={s.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
                                <span className="font-bold text-lg">{s.name}</span>
                                <Button variant="ghost" size="sm" onClick={() => deleteSection(s.id)} className="text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></Button>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* COMBINATIONS TAB */}
                <TabsContent value="combinations" className="mt-4 space-y-4">
                    <Card className="bg-black/20 border-white/10 p-4 md:p-6 overflow-hidden">
                        {/* Mobile Combinations View */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {Object.values(classes).sort((a: any, b: any) => a.order - b.order).map((c: any) => (
                                <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                        <GraduationCap size={16} className="text-accent" />
                                        <span className="font-bold text-white uppercase tracking-tighter">{c.name}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.values(sections).map((s: any) => {
                                            const isActive = getCombinationStatus(c.id, s.id);
                                            return (
                                                <div
                                                    key={s.id}
                                                    onClick={() => toggleCombination(c.id, s.id, isActive)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer",
                                                        isActive ? "bg-accent/20 border-accent/40 text-accent font-black" : "bg-white/5 border-white/5 text-white/20"
                                                    )}
                                                >
                                                    <span className="text-[10px] uppercase font-bold">{s.name}</span>
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full mt-1.5",
                                                        isActive ? "bg-accent shadow-[0_0_8px_rgba(100,255,218,0.8)]" : "bg-white/10"
                                                    )} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Combinations View */}
                        <div className="hidden md:block overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-white/5 italic">
                                        <th className="p-3 border border-white/10 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground w-40">Class \ Section</th>
                                        {Object.values(sections).map((s: any) => <th key={s.id} className="p-3 border border-white/10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(classes).sort((a: any, b: any) => a.order - b.order).map((c: any) => (
                                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-3 border border-white/10 font-bold bg-white/5 text-white">{c.name}</td>
                                            {Object.values(sections).map((s: any) => {
                                                const isActive = getCombinationStatus(c.id, s.id);
                                                return (
                                                    <td key={s.id} className="p-3 border border-white/10 text-center">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isActive}
                                                                onChange={() => toggleCombination(c.id, s.id, isActive)}
                                                                className="w-5 h-5 cursor-pointer accent-accent"
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}
