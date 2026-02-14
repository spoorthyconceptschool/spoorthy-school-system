"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Printer, ArrowLeft, Calendar, Clock, FileText } from "lucide-react";
import { ReportCardGenerator } from "@/components/admin/report-card-generator";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);
    const router = useRouter();
    const { classes: classesData, subjects: subjectsData } = useMasterData();
    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedClassId, setSelectedClassId] = useState("");
    const [timetable, setTimetable] = useState<any>({}); // Current class timetable

    // Convert master data
    const classes = Object.values(classesData).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const allSubjects = Object.values(subjectsData)
        .filter((s: any) => s.isActive !== false)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

    const fetchExam = async () => {
        try {
            const docSnap = await getDoc(doc(db, "exams", examId));
            if (docSnap.exists()) {
                setExam({ id: docSnap.id, ...docSnap.data() });
            } else {
                router.push("/admin/exams");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExam();
    }, [examId]);

    useEffect(() => {
        if (selectedClassId && exam) {
            // Load existing timetable for this class or init empty
            const existing = exam.timetables?.[selectedClassId] || {};

            // Initialize with all subjects if empty? No, let user add.
            // Or auto-populate all subjects?
            // Let's prepopulate structure
            const initial: any = {};
            allSubjects.forEach(s => {
                if (existing[s.id]) {
                    initial[s.id] = { ...existing[s.id], enabled: true };
                } else {
                    initial[s.id] = { date: "", startTime: "09:00", endTime: "12:00", enabled: false };
                }
            });
            setTimetable(initial);
        }
    }, [selectedClassId, exam]); // Re-run if exam updates (after save)

    const handleSaveTimetable = async () => {
        if (!selectedClassId || !exam) {
            console.error("Missing selectedClassId or exam data", { selectedClassId, exam });
            return;
        }
        setSaving(true);
        console.log("Saving timetable for class:", selectedClassId);

        try {
            // Filter only enabled subjects
            const cleanTimetable: any = {};
            Object.entries(timetable).forEach(([subId, data]: any) => {
                if (data.enabled && data.date) {
                    cleanTimetable[subId] = {
                        date: data.date,
                        startTime: data.startTime || "09:00",
                        endTime: data.endTime || "12:00"
                    };
                }
            });

            console.log("Cleaned timetable data:", cleanTimetable);

            const { id, ...examDataWithoutId } = exam;
            const updatedTimetables = {
                ...(examDataWithoutId.timetables || {}),
                [selectedClassId]: cleanTimetable
            };

            await setDoc(doc(db, "exams", examId), {
                ...examDataWithoutId,
                timetables: updatedTimetables
            });

            // Update local state by recreating the exam object with its ID
            setExam({
                id: examId,
                ...examDataWithoutId,
                timetables: updatedTimetables
            });

            alert(`Timetable for ${classesData[selectedClassId]?.name || "Class"} Saved Successfully!`);
        } catch (e: any) {
            console.error("Save Timetable Error:", e);
            alert("Failed to save: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const updateSubject = (subId: string, field: string, value: any) => {
        setTimetable((prev: any) => ({
            ...prev,
            [subId]: { ...prev[subId], [field]: value }
        }));
    };

    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
        examCenter: "SCS-HYD",
        academicYear: "2025-26",
        instructions: "Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed."
    });

    // Initialize edit form when exam loads
    useEffect(() => {
        if (exam) {
            setEditForm({
                name: exam.name,
                startDate: exam.startDate,
                endDate: exam.endDate,
                examCenter: exam.examCenter || "SCS-HYD",
                academicYear: exam.academicYear || "2025-26",
                instructions: exam.instructions || "Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed."
            });
        }
    }, [exam]);

    const handleUpdateExam = async () => {
        if (!editForm.name || !editForm.startDate || !editForm.endDate) return;
        setSaving(true);
        try {
            await setDoc(doc(db, "exams", examId), {
                ...exam,
                ...editForm
            }, { merge: true });

            setExam({ ...exam, ...editForm });
            setEditOpen(false);
            alert("Exam Details Updated");
        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    if (!exam) return null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6 animate-in fade-in">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin/exams")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-display font-bold">{exam.name}</h1>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${exam.status === 'RESULTS_RELEASED'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                {exam.status === 'RESULTS_RELEASED' ? 'RESULTS PUBLISHED' : exam.status || 'ACTIVE'}
                            </span>
                            <Button size="sm" variant="outline" className="h-6 text-xs bg-white/5 border-white/10" onClick={() => setEditOpen(true)}>
                                Edit
                            </Button>
                        </div>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={async () => {
                            if (!confirm(exam.status === 'RESULTS_RELEASED' ? "Hide results from students?" : "Release results to students?")) return;
                            const newStatus = exam.status === 'RESULTS_RELEASED' ? 'ACTIVE' : 'RESULTS_RELEASED';
                            await setDoc(doc(db, "exams", examId), { status: newStatus }, { merge: true });
                            setExam({ ...exam, status: newStatus });
                        }}
                        className={exam.status === 'RESULTS_RELEASED' ? "bg-yellow-600 hover:bg-yellow-700" : "bg-emerald-600 hover:bg-emerald-700"}
                    >
                        {exam.status === 'RESULTS_RELEASED' ? "Unpublish Results" : "Release Results"}
                    </Button>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-black/95 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Exam Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Exam Name</Label>
                            <Input
                                className="bg-white/5 border-white/10"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Academic Year</Label>
                                <Input className="bg-white/5 border-white/10" value={editForm.academicYear} onChange={e => setEditForm({ ...editForm, academicYear: e.target.value })} placeholder="e.g. 2025-26" />
                            </div>
                            <div className="space-y-2">
                                <Label>Exam Center</Label>
                                <Input className="bg-white/5 border-white/10" value={editForm.examCenter} onChange={e => setEditForm({ ...editForm, examCenter: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Hall Ticket Instructions (one per line)</Label>
                            <textarea
                                className="w-full min-h-[100px] rounded-md bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                value={editForm.instructions}
                                onChange={e => setEditForm({ ...editForm, instructions: e.target.value })}
                            />
                        </div>
                        <Button onClick={handleUpdateExam} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4">
                            {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="timetable" className="space-y-6">
                <TabsList className="bg-black/20 border-white/10">
                    <TabsTrigger value="timetable"><Clock className="w-4 h-4 mr-2" /> Exam Timetable</TabsTrigger>
                    <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2" /> Documents (Tickets/Reports)</TabsTrigger>
                </TabsList>

                {/* TIMETABLE TAB */}
                <TabsContent value="timetable" className="space-y-6">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle>Configure Timetable</CardTitle>
                            <CardDescription>Select a class to set exam dates and times for each subject.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Label>Select Class:</Label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger className="w-[200px] bg-white/5 border-white/10"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {selectedClassId && (
                                    <Button onClick={handleSaveTimetable} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto">
                                        {saving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Timetable
                                    </Button>
                                )}
                            </div>

                            {selectedClassId && (
                                <div className="space-y-4">
                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3">
                                        {allSubjects.map(subject => {
                                            const data = timetable[subject.id] || { enabled: false };
                                            return (
                                                <div
                                                    key={subject.id}
                                                    className={cn(
                                                        "bg-black/20 border border-white/10 rounded-2xl p-4 space-y-4 backdrop-blur-md transition-all",
                                                        data.enabled ? "ring-1 ring-emerald-500/30" : "opacity-60"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!data.enabled}
                                                                    onChange={e => updateSubject(subject.id, 'enabled', e.target.checked)}
                                                                    className="w-5 h-5 rounded border-white/20 bg-black/40 accent-emerald-500"
                                                                />
                                                            </div>
                                                            <span className="font-bold text-sm text-white">{subject.name}</span>
                                                        </div>
                                                        <Badge variant={data.enabled ? "default" : "outline"} className={cn(
                                                            "text-[8px] font-black uppercase tracking-tighter py-0 h-4",
                                                            data.enabled ? "bg-emerald-500/10 text-emerald-400 border-none" : "text-white/20"
                                                        )}>
                                                            {data.enabled ? "Included" : "Excluded"}
                                                        </Badge>
                                                    </div>

                                                    {data.enabled && (
                                                        <div className="grid grid-cols-1 gap-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="space-y-1.5 font-mono">
                                                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5">
                                                                    <Calendar className="w-3 h-3" /> Exam Date
                                                                </label>
                                                                <Input
                                                                    type="date"
                                                                    value={data.date || ""}
                                                                    onChange={e => updateSubject(subject.id, 'date', e.target.value)}
                                                                    className="h-10 bg-white/5 border-white/10 w-full text-xs"
                                                                    min={exam.startDate}
                                                                    max={exam.endDate}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5 font-mono">
                                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5">
                                                                        <Clock className="w-3 h-3" /> Start
                                                                    </label>
                                                                    <Input
                                                                        type="time"
                                                                        value={data.startTime || ""}
                                                                        onChange={e => updateSubject(subject.id, 'startTime', e.target.value)}
                                                                        className="h-10 bg-white/5 border-white/10 w-full text-xs"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5 font-mono">
                                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5">
                                                                        <Clock className="w-3 h-3" /> End
                                                                    </label>
                                                                    <Input
                                                                        type="time"
                                                                        value={data.endTime || ""}
                                                                        onChange={e => updateSubject(subject.id, 'endTime', e.target.value)}
                                                                        className="h-10 bg-white/5 border-white/10 w-full text-xs"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block border border-white/10 rounded-lg overflow-x-auto">
                                        <table className="w-full text-sm min-w-[700px]">
                                            <thead className="bg-white/5">
                                                <tr>
                                                    <th className="p-3 text-left w-10">Include</th>
                                                    <th className="p-3 text-left">Subject</th>
                                                    <th className="p-3 text-left">Date</th>
                                                    <th className="p-3 text-left">Start Time</th>
                                                    <th className="p-3 text-left">End Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {allSubjects.map(subject => {
                                                    const data = timetable[subject.id] || { enabled: false };
                                                    return (
                                                        <tr key={subject.id} className={data.enabled ? "bg-white/[0.02]" : "opacity-50"}>
                                                            <td className="p-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!data.enabled}
                                                                    onChange={e => updateSubject(subject.id, 'enabled', e.target.checked)}
                                                                    className="w-4 h-4 rounded border-white/20 bg-black/40"
                                                                />
                                                            </td>
                                                            <td className="p-3 font-medium">{subject.name}</td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="date"
                                                                    value={data.date || ""}
                                                                    onChange={e => updateSubject(subject.id, 'date', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-40"
                                                                    disabled={!data.enabled}
                                                                    min={exam.startDate}
                                                                    max={exam.endDate}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="time"
                                                                    value={data.startTime || ""}
                                                                    onChange={e => updateSubject(subject.id, 'startTime', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-32"
                                                                    disabled={!data.enabled}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="time"
                                                                    value={data.endTime || ""}
                                                                    onChange={e => updateSubject(subject.id, 'endTime', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-32"
                                                                    disabled={!data.enabled}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DOCUMENTS TAB */}
                <TabsContent value="documents">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle>Generate Documents</CardTitle>
                            <CardDescription>Select a class to generate hall tickets or final report cards.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <Label className="shrink-0">Select Class:</Label>
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                        <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedClassId && (
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                        <div className="w-full sm:w-auto">
                                            <ReportCardGenerator exam={exam} classId={selectedClassId} />
                                        </div>
                                        <Button
                                            onClick={() => {
                                                window.open(`/admin/exams/${examId}/print/${selectedClassId}`, '_blank');
                                            }}
                                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11"
                                        >
                                            <Printer className="w-4 h-4" /> Print Hall Tickets
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-emerald-300 text-sm">
                                <h4 className="font-bold flex items-center mb-2"><FileText className="w-4 h-4 mr-2" /> Printing Instructions</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Ensure the timetable is configured for the selected class before printing.</li>
                                    <li>Hall tickets will be generated for all <b>ACTIVE</b> students in the class.</li>
                                    <li>The print view will open in a new tab. Use browser print (Ctrl+P) setting "Background Graphics" ON.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
