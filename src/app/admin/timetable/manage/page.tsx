"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, setDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, Trash2, Calendar, LayoutGrid, Printer } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { DeclareHolidayModal } from "@/components/admin/declare-holiday-modal";
import { BulkPrintTimetableModal } from "@/components/admin/bulk-print-timetable-modal";
import { cn } from "@/lib/utils";
import Link from "next/link";

// --- TYPES ---
interface Slot {
    id: number;
    name: string; // "Period 1", "Lunch"
    type: "CLASS" | "BREAK";
    startTime: string;
    endTime: string;
    isLeisureAllowed: boolean;
}

export default function TimetableManagePage() {
    const { user } = useAuth();
    const { classes: classesData, sections: sectionsData, subjects: masterSubjects, classSubjects, subjectTeachers, branding } = useMasterData();
    const [activeTab, setActiveTab] = useState("settings");
    const [loading, setLoading] = useState(true);

    // Convert master data objects to arrays
    const classes = Object.values(classesData).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const sections = Object.values(sectionsData || {}).map((s: any) => ({ id: s.id, name: s.name }));

    // Settings State
    const [dayTemplate, setDayTemplate] = useState<Slot[]>([]);

    // Builder State
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [timetable, setTimetable] = useState<any>({}); // { [day]: { [slotId]: { subjectId, teacherId } } }
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    useEffect(() => {
        fetchMasterData();
        fetchSettings();
    }, []);

    const [holidays, setHolidays] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedClassId) {
            setSubjects([]);
            return;
        }

        const classSpecificSubjects = classSubjects[selectedClassId] || {};
        const filtered = Object.values(masterSubjects || {})
            .filter((s: any) => s.isActive !== false && classSpecificSubjects[s.id])
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        setSubjects(filtered);
    }, [selectedClassId, masterSubjects, classSubjects]);

    useEffect(() => {
        const fetchHolidays = async () => {
            const hQuery = query(collection(db, "notices"), where("type", "==", "HOLIDAY"));
            const hSnap = await getDocs(hQuery);
            const holidayList = hSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHolidays(holidayList);
        };
        fetchHolidays();
    }, []);

    useEffect(() => {
        if (selectedClassId && selectedSectionId) {
            fetchTimetable(selectedClassId, selectedSectionId);
        }
    }, [selectedClassId, selectedSectionId]);

    const fetchMasterData = async () => {
        try {
            const tSnap = await getDocs(query(collection(db, "teachers"), where("status", "==", "ACTIVE")));
            setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const fetchSettings = async () => {
        try {
            const docSnap = await getDoc(doc(db, "timetable_settings", "global_settings"));
            if (docSnap.exists() && docSnap.data().dayTemplates?.["MONDAY"]) {
                setDayTemplate(docSnap.data().dayTemplates["MONDAY"].slots);
            } else {
                setDayTemplate([
                    { id: 1, name: "Period 1", type: "CLASS", startTime: "09:00", endTime: "09:45", isLeisureAllowed: true },
                    { id: 2, name: "Period 2", type: "CLASS", startTime: "09:45", endTime: "10:30", isLeisureAllowed: true },
                    { id: 3, name: "Short Break", type: "BREAK", startTime: "10:30", endTime: "10:45", isLeisureAllowed: false },
                    { id: 4, name: "Period 3", type: "CLASS", startTime: "10:45", endTime: "11:30", isLeisureAllowed: true },
                ]);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const fetchTimetable = async (classId: string, sectionId: string) => {
        setLoading(true);
        try {
            const ttRef = doc(db, "class_timetables", `2025-2026_${classId}_${sectionId}`);
            const ttSnap = await getDoc(ttRef);
            if (ttSnap.exists()) {
                setTimetable(ttSnap.data().schedule || {});
            } else {
                setTimetable({});
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // --- ACTIONS ---

    const saveSettings = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "timetable_settings", "global_settings"), {
                dayTemplates: {
                    MONDAY: { slots: dayTemplate },
                    TUESDAY: { slots: dayTemplate },
                    WEDNESDAY: { slots: dayTemplate },
                    THURSDAY: { slots: dayTemplate },
                    FRIDAY: { slots: dayTemplate },
                    SATURDAY: { slots: dayTemplate }
                },
                updatedAt: new Date()
            }, { merge: true });
            alert("Global Timetable Structure Saved");
        } catch (e) { alert("Error saving settings"); }
        finally { setLoading(false); }
    };

    const updateSlot = (index: number, field: string, value: any) => {
        const newSlots = [...dayTemplate];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setDayTemplate(newSlots);
    };

    const addSlot = () => {
        const id = dayTemplate.length + 1;
        setDayTemplate([...dayTemplate, { id, name: `Period ${id}`, type: "CLASS", startTime: "", endTime: "", isLeisureAllowed: true }]);
    };

    const removeSlot = (index: number) => {
        setDayTemplate(dayTemplate.filter((_, i) => i !== index));
    };

    // --- BUILDER ACTIONS ---
    const updateTimeTable = (day: string, slotId: number, field: "subjectId" | "teacherId", value: string) => {
        setTimetable((prev: any) => {
            const daySchedule = prev[day] || {};
            const slotData = daySchedule[slotId] || {};

            let newData = { ...slotData, [field]: value };

            // AUTOMATIC TEACHER ASSIGNMENT FROM MASTER DATA
            if (field === "subjectId" && selectedClassId && selectedSectionId) {
                if (value === "leisure") {
                    newData.teacherId = "";
                } else {
                    const key = `${selectedClassId}_${selectedSectionId}`;
                    const assignedTeacherId = subjectTeachers[key]?.[value];
                    if (assignedTeacherId) {
                        newData.teacherId = assignedTeacherId;
                    } else {
                        newData.teacherId = "UNASSIGNED"; // Special state to trigger warning
                    }
                }
            }

            return {
                ...prev,
                [day]: {
                    ...daySchedule,
                    [slotId]: newData
                }
            };
        });
    };

    const publishTimetable = async () => {
        if (!selectedClassId || !selectedSectionId || !user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            await fetch("/api/admin/timetable/publish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    yearId: "2025-2026",
                    classId: `${selectedClassId}_${selectedSectionId}`,
                    schedule: timetable
                })
            });
            alert("Timetable Published Successfully!");
        } catch (e) { alert("Publish failed"); }
        finally { setLoading(false); }
    };

    const handlePrint = () => {
        if (!selectedClassId || !selectedSectionId) return;

        const currentClass = classes.find(c => c.id === selectedClassId);
        const currentSection = sections.find(s => s.id === selectedSectionId);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Timetable - ${currentClass?.name} ${currentSection?.name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { margin: 0; color: #1a365d; font-size: 24px; text-transform: uppercase; }
                        .header p { margin: 5px 0; color: #718096; font-size: 14px; text-transform: uppercase; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
                        th, td { border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-size: 12px; height: 60px; word-wrap: break-word; }
                        th { background-color: #f8fafc; color: #4a5568; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; height: auto; }
                        .day-col { background-color: #f8fafc; font-weight: bold; width: 80px; text-transform: uppercase; }
                        .period-info { font-size: 10px; color: #a0aec0; margin-bottom: 4px; }
                        .subject { font-weight: bold; color: #2d3748; display: block; margin-bottom: 2px; }
                        .teacher { font-size: 10px; color: #718096; line-height: 1.2; }
                        .break { background-color: #f1f5f9; color: #94a3b8; font-weight: bold; font-style: italic; letter-spacing: 0.2em; }
                        .leisure { color: #cbd5e0; font-style: italic; }
                        @media print {
                            body { padding: 0; }
                            @page { margin: 1cm; orientation: landscape; }
                            table { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${branding.schoolLogo ? `<img src="${branding.schoolLogo}" style="height: 60px; margin-bottom: 10px;" />` : ''}
                        <h1>${branding.schoolName || 'SPOORTHY CONCEPT SCHOOL'}</h1>
                        <p>Academic Timetable: ${currentClass?.name} - ${currentSection?.name}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th class="day-col">Day</th>
                                ${dayTemplate.map(slot => `
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
                                    ${dayTemplate.map(slot => {
            if (slot.type === "BREAK") return `<td class="break">BREAK</td>`;
            const cell = timetable[day]?.[slot.id] || {};
            if (!cell.subjectId) return `<td>-</td>`;
            if (cell.subjectId === "leisure") return `<td class="leisure">Leisure</td>`;

            const subject = subjects.find(s => s.id === cell.subjectId);
            const teacher = teachers.find(t => (t.schoolId || t.id) === cell.teacherId);

            return `
                                            <td>
                                                <span class="subject">${subject?.name || 'Unknown'}</span>
                                                <span class="teacher">${teacher?.name || 'Unassigned'}</span>
                                            </td>
                                        `;
        }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.onload = () => { window.print(); window.close(); };</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };


    return (
        <div className="space-y-4 md:space-y-6 max-w-none p-0 animate-in fade-in pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Timetable Manager
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-sm tracking-tight uppercase font-black opacity-100">
                        Design and publish <span className="text-accent">academic schedules</span>
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <BulkPrintTimetableModal />
                    <DeclareHolidayModal />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="px-2">
                    <TabsList className="bg-white/5 border border-white/10 w-full grid grid-cols-2 p-1 h-auto md:h-12 overflow-hidden">
                        <TabsTrigger value="settings" className="flex flex-col md:flex-row py-2.5 px-1 gap-1 md:gap-2 text-[7px] md:text-xs font-black uppercase tracking-tighter md:tracking-widest data-[state=active]:bg-accent data-[state=active]:text-black transition-all h-full text-center">
                            <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                            <span>Structure</span>
                        </TabsTrigger>
                        <TabsTrigger value="builder" className="flex flex-col md:flex-row py-2.5 px-1 gap-1 md:gap-2 text-[7px] md:text-xs font-black uppercase tracking-tighter md:tracking-widest data-[state=active]:bg-accent data-[state=active]:text-black transition-all h-full text-center">
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                            <span>Builder</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* --- SETTINGS TAB --- */}
                <TabsContent value="settings" className="space-y-6 px-2">
                    <Card className="bg-black/20 border-white/10 backdrop-blur-md overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-6">
                            <CardTitle className="text-sm md:text-xl font-bold italic text-white">Daily Structure Template</CardTitle>
                            <CardDescription className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-60">Define periods and breaks for a standard day.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-4">
                                {dayTemplate.map((slot, idx) => (
                                    <div key={idx} className="relative group bg-white/5 border border-white/10 p-4 rounded-xl transition-all hover:bg-white/10">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                            {/* Index and Name */}
                                            <div className="md:col-span-4 flex items-center gap-3">
                                                <div className="w-8 h-8 shrink-0 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center font-black text-[10px] text-accent">
                                                    {idx + 1}
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Description</label>
                                                    <Input
                                                        value={slot.name}
                                                        onChange={e => updateSlot(idx, 'name', e.target.value)}
                                                        className="h-9 md:h-10 bg-black/40 border-white/10 text-xs md:text-sm font-bold"
                                                        placeholder="Name"
                                                    />
                                                </div>
                                            </div>

                                            {/* Type */}
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Type</label>
                                                <Select value={slot.type} onValueChange={v => updateSlot(idx, 'type', v)}>
                                                    <SelectTrigger className="h-9 md:h-10 bg-black/40 border-white/10 text-xs md:text-sm"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-[#0A192F] border-white/10">
                                                        <SelectItem value="CLASS">Class</SelectItem>
                                                        <SelectItem value="BREAK">Break</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Times */}
                                            <div className="md:col-span-4 grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Start</label>
                                                    <Input type="time" value={slot.startTime} onChange={e => updateSlot(idx, 'startTime', e.target.value)} className="h-9 md:h-10 bg-black/40 border-white/10 text-xs font-mono" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">End</label>
                                                    <Input type="time" value={slot.endTime} onChange={e => updateSlot(idx, 'endTime', e.target.value)} className="h-9 md:h-10 bg-black/40 border-white/10 text-xs font-mono" />
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="md:col-span-2 flex justify-end md:pt-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSlot(idx)}
                                                    className="w-full md:w-auto text-red-400 hover:text-white hover:bg-red-500/20 gap-2 font-bold uppercase tracking-tighter text-[10px]"
                                                >
                                                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" /> Remove
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <Button variant="outline" onClick={addSlot} className="h-10 md:h-12 border-dashed border-white/20 hover:bg-white/5 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs">
                                        <Plus className="w-4 h-4 mr-2" /> Add Period / Break
                                    </Button>
                                    <Button onClick={saveSettings} className="h-10 md:h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-lg shadow-emerald-900/20">
                                        <Save className="w-4 h-4 mr-2" /> Save Global Configuration
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* --- BUILDER TAB --- */}
                <TabsContent value="builder" className="space-y-6 px-2">
                    <div className="flex flex-col md:flex-row gap-4 bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="grid grid-cols-2 md:flex items-center gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Class</label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger className="w-full md:w-[180px] h-10 bg-white/5 border-white/10 rounded-xl text-xs"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                                    <SelectContent className="bg-[#0A192F] border-white/10">{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Section</label>
                                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                                    <SelectTrigger className="w-full md:w-[150px] h-10 bg-white/5 border-white/10 rounded-xl text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                                    <SelectContent className="bg-[#0A192F] border-white/10">{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-wrap items-end justify-end gap-2 px-2 md:px-0">
                            <Button
                                variant="outline"
                                onClick={handlePrint}
                                disabled={!selectedClassId || !selectedSectionId}
                                className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px]"
                            >
                                <Printer className="mr-2 h-3 w-3" /> Print Timetable
                            </Button>
                            <Button onClick={publishTimetable} disabled={!selectedClassId || !selectedSectionId || loading} className="w-full md:w-auto h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/40">
                                {loading ? <Loader2 className="animate-spin mr-2 w-3 h-3" /> : <Save className="mr-2 h-3 w-3" />}
                                Publish Final Schedule
                            </Button>
                        </div>
                    </div>

                    {(!selectedClassId || !selectedSectionId) ? (
                        <div className="text-center py-20 bg-black/20 border border-dashed border-white/10 rounded-2xl">
                            <div className="flex flex-col items-center gap-4 opacity-40">
                                <Calendar size={40} strokeWidth={1} />
                                <p className="text-xs md:text-sm font-bold uppercase tracking-widest italic">Please select a class and section to design the schedule.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md overflow-hidden custom-scrollbar">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[480px] md:min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-white/5 italic">
                                            <th className="p-2 md:p-4 text-left border-b border-white/10 text-[7px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground w-14 md:w-28">Academic Day</th>
                                            {dayTemplate.map(slot => (
                                                <th key={slot.id} className="p-2 md:p-4 text-left border-b border-white/10 min-w-[80px] md:min-w-[150px]">
                                                    <div className="text-[6px] md:text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest mb-0.5 md:mb-1">{slot.startTime} - {slot.endTime}</div>
                                                    <div className="text-[8px] md:text-xs font-black text-accent uppercase tracking-tighter truncate">{slot.name}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map((day, dIdx) => {
                                            const today = new Date();
                                            const currentDay = today.getDay();
                                            const distance = (dIdx + 1) - currentDay;
                                            const targetDate = new Date(today);
                                            targetDate.setDate(today.getDate() + distance);

                                            const isHoliday = holidays.some(h => {
                                                const start = h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000) : new Date();
                                                const end = h.expiresAt?.seconds ? new Date(h.expiresAt.seconds * 1000) : new Date();
                                                start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
                                                return targetDate >= start && targetDate <= end;
                                            });

                                            return (
                                                <tr key={day} className="border-b border-white/5 hover:bg-[#64FFDA]/5 group transition-colors">
                                                    <td className="p-2 md:p-4 bg-white/5">
                                                        <div className="text-[10px] md:text-xs font-black text-white italic">{day.substring(0, 3)}</div>
                                                        <div className="text-[7px] md:text-[9px] text-muted-foreground font-mono opacity-100">{targetDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                                    </td>
                                                    {isHoliday ? (
                                                        <td colSpan={dayTemplate.length} className="p-2 md:p-4 bg-red-500/5 text-center border-l border-red-500/10">
                                                            <div className="flex flex-col items-center justify-center text-red-400 gap-1">
                                                                <span className="font-black text-[8px] md:text-sm tracking-[0.1em] md:tracking-[0.3em] uppercase italic opacity-60">Observance: Holiday</span>
                                                            </div>
                                                        </td>
                                                    ) : (
                                                        dayTemplate.map(slot => {
                                                            const cell = timetable[day]?.[slot.id] || {};

                                                            if (slot.type === "BREAK") {
                                                                return <td key={slot.id} className="p-2 md:p-4 bg-white/5 text-center text-[6px] md:text-[8px] font-black text-muted-foreground/20 tracking-[0.2em] md:tracking-[0.5em] diagonal-stripe italic">RECESS</td>
                                                            }

                                                            const teacher = teachers.find(t => (t.schoolId || t.id) === cell.teacherId);
                                                            const isUnassigned = cell.teacherId === "UNASSIGNED" || (cell.subjectId && cell.subjectId !== "leisure" && !cell.teacherId);

                                                            return (
                                                                <td key={slot.id} className="p-1.5 md:p-3 border-l border-white/5 min-w-[80px] md:min-w-[150px]">
                                                                    <div className="space-y-1 md:space-y-2 p-1 md:p-2 bg-white/5 rounded-lg md:rounded-xl border border-white/5 group-hover:bg-white/10 transition-all">
                                                                        <Select value={cell.subjectId} onValueChange={v => updateTimeTable(day, slot.id, "subjectId", v)}>
                                                                            <SelectTrigger className="h-6 md:h-8 text-[8px] md:text-[10px] bg-black/40 border-white/5 rounded-md md:rounded-lg focus:ring-accent/30"><SelectValue placeholder="Sub" /></SelectTrigger>
                                                                            <SelectContent className="bg-[#0A192F] border-white/10">
                                                                                <SelectItem value="leisure" className="text-[9px] md:text-[10px] uppercase font-bold">Leisure</SelectItem>
                                                                                {subjects.map(s => <SelectItem key={s.id} value={s.id} className="text-[9px] md:text-[10px] font-bold">{s.name}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>

                                                                        {cell.subjectId && cell.subjectId !== "leisure" && (
                                                                            <div className="px-0.5 md:px-1">
                                                                                {isUnassigned ? (
                                                                                    <div className="flex flex-col gap-0.5">
                                                                                        <span className="text-[6px] md:text-[8px] text-red-400 font-black uppercase tracking-tighter animate-pulse">Staff Needed</span>
                                                                                        <Link
                                                                                            href="/admin/master-data/classes-sections"
                                                                                            className="text-[6px] md:text-[7px] text-blue-400 underline decoration-blue-400/30 hover:text-blue-300 uppercase font-black"
                                                                                        >
                                                                                            Assign
                                                                                        </Link>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="text-[6px] md:text-[7px] text-muted-foreground font-black uppercase tracking-widest opacity-40 leading-none mb-0.5">Teacher</span>
                                                                                            <span className="text-[8px] md:text-[10px] text-emerald-400/90 font-bold truncate max-w-[60px] md:max-w-[100px]">
                                                                                                {teacher?.name}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

