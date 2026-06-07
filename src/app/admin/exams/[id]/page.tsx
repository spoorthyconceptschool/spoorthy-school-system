"use client";

import { useEffect, useState, use, useMemo } from "react";
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { createNotification } from "@/lib/notifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Printer, ArrowLeft, Calendar, Clock, FileText, ClipboardCheck } from "lucide-react";
import { ReportCardGenerator } from "@/components/admin/report-card-generator";
import { SyllabusManager } from "@/components/exam/SyllabusManager";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);
    const router = useRouter();
    const { classes: classesData, subjects: subjectsData, classSubjects, sections: sectionsData, classSections } = useMasterData();
    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedClassId, setSelectedClassId] = useState("");
    const [timetableMode, setTimetableMode] = useState<"COMBINED" | "INDIVIDUAL">("COMBINED");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [timetable, setTimetable] = useState<any>({}); // Current class timetable
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        if (!selectedClassId) {
            setStudents([]);
            return;
        }
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const q = query(collection(db, "students"), where("classId", "==", selectedClassId), where("status", "==", "ACTIVE"));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                list.sort((a: any, b: any) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999));
                setStudents(list);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [selectedClassId]);

    const handleToggleOverride = async (studentId: string, currentOverride: boolean) => {
        if (!exam) return;
        try {
            const updatedOverrides = {
                ...(exam.hallTicketOverrides || {})
            };
            
            if (!currentOverride) {
                updatedOverrides[studentId] = true;
            } else {
                delete updatedOverrides[studentId];
            }

            const { id, ...examDataWithoutId } = exam;
            await setDoc(doc(db, "exams", examId), {
                ...examDataWithoutId,
                hallTicketOverrides: updatedOverrides
            });

            setExam((prev: any) => ({
                ...prev,
                hallTicketOverrides: updatedOverrides
            }));

            // Notify student of this release!
            if (!currentOverride) {
                await createNotification({
                    target: `student_${studentId}`,
                    title: "Hall Ticket Manually Released",
                    message: `Your hall ticket for "${exam.name}" has been manually released by the administrator. You can now download it on your portal.`,
                    type: "NOTICE"
                }).catch(err => console.error("Notification override error:", err));
            }
        } catch (e: any) {
            console.error("Override Toggle Error:", e);
            alert("Error: " + e.message);
        }
    };

    // Convert master data
    const classes = Object.values(classesData).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    const filteredClasses = useMemo(() => {
        if (exam?.classIds && Array.isArray(exam.classIds) && exam.classIds.length > 0) {
            return classes.filter((c: any) => exam.classIds.includes(c.id));
        }
        return classes;
    }, [classes, exam]);

    // Auto-select the first filtered class if the current selection is empty or invalid
    useEffect(() => {
        if (filteredClasses.length > 0) {
            if (!selectedClassId || !filteredClasses.some(c => c.id === selectedClassId)) {
                setSelectedClassId(filteredClasses[0].id);
            }
        }
    }, [filteredClasses, selectedClassId]);

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

    // All active subjects in the system, with a flag for those assigned to the class
    const relevantSubjects = useMemo(() => {
        if (!selectedClassId) return [];
        const classSubMapping = classSubjects[selectedClassId] || {};

        return Object.values(subjectsData)
            .filter((s: any) => s.isActive !== false)
            .map((s: any) => ({
                ...s,
                isMapped: !!(classSubMapping[s.id] && s.id !== 'id')
            }))
            .sort((a, b) => {
                // Mapped subjects first, then alphabetically
                if (a.isMapped && !b.isMapped) return -1;
                if (!a.isMapped && b.isMapped) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [selectedClassId, classSubjects, subjectsData]);

    useEffect(() => {
        if (selectedClassId && exam) {
            // Target key depends on mode and selection
            let targetKey = selectedClassId;
            if (timetableMode === "INDIVIDUAL") {
                if (!selectedSectionId) {
                    setTimetable({});
                    return;
                }
                targetKey = `${selectedClassId}_${selectedSectionId}`;
            }

            // Load existing timetable for this key or init empty
            const existing = exam.timetables?.[targetKey] || {};

            const initial: any = {};
            relevantSubjects.forEach(s => {
                if (existing[s.id]) {
                    initial[s.id] = {
                        ...existing[s.id],
                        maxMarks: existing[s.id].maxMarks || "100",
                        passMarks: existing[s.id].passMarks || "35",
                        enabled: true
                    };
                } else {
                    initial[s.id] = { date: "", startTime: "09:00", endTime: "12:00", maxMarks: "100", passMarks: "35", enabled: false };
                }
            });
            setTimetable(initial);
        } else {
            setTimetable({});
        }
    }, [selectedClassId, selectedSectionId, timetableMode, exam, relevantSubjects]);

    const handleSaveTimetable = async () => {
        if (!selectedClassId || !exam) {
            console.error("Missing selectedClassId or exam data");
            return;
        }

        let targetKey = selectedClassId;
        let targetLabel = classesData[selectedClassId]?.name || "Class";

        if (timetableMode === "INDIVIDUAL") {
            if (!selectedSectionId) {
                alert("Please select a section for Individual Timetable Mode.");
                return;
            }
            targetKey = `${selectedClassId}_${selectedSectionId}`;
            targetLabel = `${targetLabel} - ${sectionsData?.[selectedSectionId]?.name || "Section"}`;
        }

        setSaving(true);
        console.log("Saving timetable for targetKey:", targetKey);

        try {
            // Filter only enabled subjects
            const cleanTimetable: any = {};
            Object.entries(timetable).forEach(([subId, data]: any) => {
                if (data.enabled && data.date) {
                    cleanTimetable[subId] = {
                        date: data.date,
                        startTime: data.startTime || "09:00",
                        endTime: data.endTime || "12:00",
                        maxMarks: data.maxMarks || "100",
                        passMarks: data.passMarks || "35"
                    };
                }
            });

            console.log("Cleaned timetable data:", cleanTimetable);

            const { id, ...examDataWithoutId } = exam;
            const updatedTimetables = {
                ...(examDataWithoutId.timetables || {}),
                [targetKey]: cleanTimetable
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

            // Notify students of this class that the exam timetable has been updated!
            await createNotification({
                target: `class_${selectedClassId}`,
                title: "Exam Timetable Updated",
                message: `The examination timetable for "${exam?.name || 'Upcoming Exam'}" has been updated. Please check your exam portal.`,
                type: "NOTICE"
            }).catch(err => console.error("Timetable notification error:", err));

            alert(`Timetable for ${targetLabel} Saved Successfully!`);
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
        academicYear: "2025-2026",
        instructions: "Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed.",
        hallTicketRule: "NO_RESTRICTION",
        hallTicketLimitAmount: 0,
        hallTicketTerm: "",
        classIds: [] as string[]
    });

    // Initialize edit form when exam loads
    useEffect(() => {
        if (exam) {
            setEditForm({
                name: exam.name,
                startDate: exam.startDate,
                endDate: exam.endDate,
                examCenter: exam.examCenter || "SCS-HYD",
                academicYear: exam.academicYear || "2025-2026",
                instructions: exam.instructions || "Carry this Hall Ticket to the exam hall.\nReport 15 mins before time.\nNo electronic gadgets allowed.",
                hallTicketRule: exam.hallTicketRule || "NO_RESTRICTION",
                hallTicketLimitAmount: exam.hallTicketLimitAmount || 0,
                hallTicketTerm: exam.hallTicketTerm || "",
                classIds: exam.classIds || []
            });
        }
    }, [exam]);

    const handleUpdateExam = async () => {
        if (!editForm.name || !editForm.startDate || !editForm.endDate) return;
        if (editForm.classIds.length === 0) {
            alert("Please select at least one eligible class for this exam.");
            return;
        }
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
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/admin/exams")} className="shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">{exam.name}</h1>
                        <p className="text-[10px] md:text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                            {new Date(exam.startDate).toLocaleDateString('en-GB')} - {new Date(exam.endDate).toLocaleDateString('en-GB')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border shrink-0 ${exam.status === 'RESULTS_RELEASED'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                        {exam.status === 'RESULTS_RELEASED' ? 'PUBLISHED' : exam.status || 'ACTIVE'}
                    </span>
                    <Button size="sm" variant="outline" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-white/5 border-white/10 shrink-0" onClick={() => setEditOpen(true)}>
                        Edit
                    </Button>
                    <Link href={`/admin/exams/${examId}/marks`} className="shrink-0">
                        <Button size="sm" variant="secondary" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest gap-2">
                            <ClipboardCheck className="w-4 h-4" /> Marks
                        </Button>
                    </Link>
                    <Button
                        size="sm"
                        onClick={async () => {
                            if (!confirm(exam.status === 'RESULTS_RELEASED' ? "Hide results from students?" : "Release results to students?")) return;
                            const newStatus = exam.status === 'RESULTS_RELEASED' ? 'ACTIVE' : 'RESULTS_RELEASED';
                            await setDoc(doc(db, "exams", examId), { status: newStatus }, { merge: true });
                            setExam({ ...exam, status: newStatus });
                        }}
                        className={cn(
                            "h-9 px-4 text-[10px] font-bold uppercase tracking-widest shrink-0",
                            exam.status === 'RESULTS_RELEASED' ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                    >
                        {exam.status === 'RESULTS_RELEASED' ? "Unpublish" : "Release Results"}
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
                            <Label>Select Eligible Classes <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-white/10 rounded-xl p-3 bg-white/5">
                                {classes.map((cls: any) => {
                                    const isChecked = editForm.classIds.includes(cls.id);
                                    return (
                                        <label key={cls.id} className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none py-1 hover:text-blue-400 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    if (isChecked) {
                                                        setEditForm({ ...editForm, classIds: editForm.classIds.filter(id => id !== cls.id) });
                                                    } else {
                                                        setEditForm({ ...editForm, classIds: [...editForm.classIds, cls.id] });
                                                    }
                                                }}
                                                className="rounded bg-black/40 border-white/20 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                                            />
                                            {cls.name}
                                        </label>
                                    );
                                })}
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

                        <div className="space-y-4 border-t border-white/5 pt-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#64FFDA]">Hall Ticket Release Policy</h3>
                            
                            <div className="space-y-2">
                                <Label>Select Release Criteria</Label>
                                <Select 
                                    value={editForm.hallTicketRule} 
                                    onValueChange={val => setEditForm({ ...editForm, hallTicketRule: val })}
                                >
                                    <SelectTrigger className="w-full bg-white/5 border-white/10 h-10">
                                        <SelectValue placeholder="Select Criteria" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-white/10 text-white">
                                        <SelectItem value="NO_RESTRICTION">Unrestricted Access (Free for all)</SelectItem>
                                        <SelectItem value="PAID_FULL_FEE">Must Clear 100% of Total Dues</SelectItem>
                                        <SelectItem value="PAID_SPECIFIC_TERM">Must Clear Dues up to a Specific Term</SelectItem>
                                        <SelectItem value="PENDING_LIMIT">Dues Must be Below a Maximum Amount</SelectItem>
                                        <SelectItem value="PAID_EXAM_FEE">Must Clear the "Exam Fee" Item</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {editForm.hallTicketRule === "PENDING_LIMIT" && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <Label>Maximum Allowed Pending Balance (₹)</Label>
                                    <Input 
                                        type="number"
                                        className="bg-white/5 border-white/10"
                                        placeholder="e.g. 5000"
                                        value={editForm.hallTicketLimitAmount}
                                        onChange={e => setEditForm({ ...editForm, hallTicketLimitAmount: Number(e.target.value) })}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Students with outstanding dues greater than this amount will be locked.</p>
                                </div>
                            )}

                            {editForm.hallTicketRule === "PAID_SPECIFIC_TERM" && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <Label>Select Target Term</Label>
                                    <Select 
                                        value={editForm.hallTicketTerm} 
                                        onValueChange={val => setEditForm({ ...editForm, hallTicketTerm: val })}
                                    >
                                        <SelectTrigger className="w-full bg-white/5 border-white/10 h-10">
                                            <SelectValue placeholder="Choose Term" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black text-white border-white/10">
                                            <SelectItem value="Term 1">Term 1</SelectItem>
                                            <SelectItem value="Term 2">Term 2</SelectItem>
                                            <SelectItem value="Term 3">Term 3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">Ensures Term 1 and any terms prior to or including this target term are fully cleared.</p>
                                </div>
                            )}
                        </div>

                        <Button onClick={handleUpdateExam} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl">
                            {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="timetable" className="space-y-6">
                <TabsList className="bg-white/5 border border-white/10 w-full h-auto p-1 rounded-xl">
                    <TabsTrigger value="timetable" className="flex-1 py-2.5 text-[10px] md:text-sm font-bold uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-black transition-all">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Timetable
                    </TabsTrigger>
                    <TabsTrigger value="syllabus" className="flex-1 py-2.5 text-[10px] md:text-sm font-bold uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-black transition-all">
                        <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Syllabus
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 py-2.5 text-[10px] md:text-sm font-bold uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-black transition-all">
                        <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Documents
                    </TabsTrigger>
                </TabsList>

                {/* TIMETABLE TAB */}
                <TabsContent value="timetable" className="space-y-6">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle>Configure Timetable</CardTitle>
                            <CardDescription>Select a class to set exam dates and times for each subject.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col lg:flex-row lg:items-end gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs md:text-sm font-bold text-white/70">Timetable Mode</Label>
                                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                                        <button onClick={() => setTimetableMode("COMBINED")} className={cn("flex-1 py-2 text-xs font-bold rounded-md transition-all", timetableMode === "COMBINED" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white")}>Combined Sections</button>
                                        <button onClick={() => setTimetableMode("INDIVIDUAL")} className={cn("flex-1 py-2 text-xs font-bold rounded-md transition-all", timetableMode === "INDIVIDUAL" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white")}>Individual Sections</button>
                                    </div>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs md:text-sm font-bold text-white/70">Select Class</Label>
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                        <SelectTrigger className="w-full bg-black/40 border-white/10 h-10"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                                        <SelectContent>
                                            {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {timetableMode === "INDIVIDUAL" && selectedClassId && (
                                    <div className="space-y-2 flex-1 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs md:text-sm font-bold text-white/70">Select Section</Label>
                                        <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                                            <SelectTrigger className="w-full bg-black/40 border-white/10 h-10"><SelectValue placeholder="Choose Section" /></SelectTrigger>
                                            <SelectContent>
                                                {Object.values(classSections || {})
                                                    .filter((cs: any) => cs.classId === selectedClassId)
                                                    .map((cs: any) => {
                                                        const sec = sectionsData?.[cs.sectionId];
                                                        return sec ? <SelectItem key={cs.sectionId} value={cs.sectionId}>{sec.name}</SelectItem> : null;
                                                    })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Button onClick={handleSaveTimetable} disabled={saving || !selectedClassId || (timetableMode === 'INDIVIDUAL' && !selectedSectionId)} className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-[10px] font-black uppercase tracking-widest gap-2 shadow-[0_0_15px_-3px_theme(colors.emerald.500/0.4)]">
                                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        Save
                                    </Button>
                                </div>
                            </div>

                            {selectedClassId && (
                                <div className="space-y-4">
                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3">
                                        {relevantSubjects.map(subject => {
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
                                                            <div className="grid grid-cols-2 gap-3 mt-1">
                                                                <div className="space-y-1.5 font-mono">
                                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic">
                                                                        Max Marks
                                                                    </label>
                                                                    <Input
                                                                        type="number"
                                                                        value={data.maxMarks || "100"}
                                                                        onChange={e => updateSubject(subject.id, 'maxMarks', e.target.value)}
                                                                        className="h-10 bg-white/5 border-white/10 w-full text-xs text-center font-bold text-emerald-400"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5 font-mono">
                                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic">
                                                                        Pass Marks
                                                                    </label>
                                                                    <Input
                                                                        type="number"
                                                                        value={data.passMarks || "35"}
                                                                        onChange={e => updateSubject(subject.id, 'passMarks', e.target.value)}
                                                                        className="h-10 bg-white/5 border-white/10 w-full text-xs text-center font-bold text-rose-400"
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
                                                    <th className="p-3 text-left w-24">Max Marks</th>
                                                    <th className="p-3 text-left w-24">Pass Marks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {Object.keys(timetable).map(subId => {
                                                    const subject = subjectsData[subId];
                                                    if (!subject) return null;
                                                    const data = timetable[subId];
                                                    return (
                                                        <tr key={subId} className={data.enabled ? "bg-white/[0.02]" : "opacity-50"}>
                                                            <td className="p-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!data.enabled}
                                                                    onChange={e => updateSubject(subId, 'enabled', e.target.checked)}
                                                                    className="w-4 h-4 rounded border-white/20 bg-black/40"
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{subject.name}</span>
                                                                    {subject.isMapped && (
                                                                        <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-tighter">
                                                                            Mapped
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="date"
                                                                    value={data.date || ""}
                                                                    onChange={e => updateSubject(subId, 'date', e.target.value)}
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
                                                                    onChange={e => updateSubject(subId, 'startTime', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-32"
                                                                    disabled={!data.enabled}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="time"
                                                                    value={data.endTime || ""}
                                                                    onChange={e => updateSubject(subId, 'endTime', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-32"
                                                                    disabled={!data.enabled}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="number"
                                                                    value={data.maxMarks || "100"}
                                                                    onChange={e => updateSubject(subId, 'maxMarks', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-20 text-center font-bold text-emerald-400"
                                                                    disabled={!data.enabled}
                                                                    placeholder="100"
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <Input
                                                                    type="number"
                                                                    value={data.passMarks || "35"}
                                                                    onChange={e => updateSubject(subId, 'passMarks', e.target.value)}
                                                                    className="h-8 bg-black/20 border-white/10 w-20 text-center font-bold text-rose-400"
                                                                    disabled={!data.enabled}
                                                                    placeholder="35"
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

                {/* SYLLABUS TAB */}
                <TabsContent value="syllabus">
                    <SyllabusManager examId={examId} role="ADMIN" />
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
                                    <Label className="shrink-0 text-xs md:text-sm">Select Class:</Label>
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                        <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 h-10 md:h-9"><SelectValue placeholder="Choose Class" /></SelectTrigger>
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
                                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 md:h-9 text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <Printer className="w-4 h-4" /> Print Hall Tickets
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {selectedClassId && (
                                <div className="space-y-4 border-t border-white/5 pt-6 mt-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[#64FFDA]">Manual Student Hall Ticket Overrides</h3>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{students.length} Students found</span>
                                    </div>
                                    
                                    {loadingStudents ? (
                                        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-500" /></div>
                                    ) : (
                                        <div className="border border-white/10 rounded-xl overflow-hidden bg-black/10">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-white/5 border-b border-white/10 text-muted-foreground uppercase tracking-widest font-black text-[9px]">
                                                        <th className="p-3 w-16">Roll No</th>
                                                        <th className="p-3 w-32">Admission No</th>
                                                        <th className="p-3">Name</th>
                                                        <th className="p-3 w-48 text-center">Override Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {students.map((student: any) => {
                                                        const isOverridden = exam?.hallTicketOverrides?.[student.id] === true;
                                                        return (
                                                            <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                                                <td className="p-3 font-mono font-bold text-blue-400">{student.rollNo || "-"}</td>
                                                                <td className="p-3 font-mono">{student.admissionNo || "-"}</td>
                                                                <td className="p-3 font-bold text-white">{student.studentName}</td>
                                                                <td className="p-3 text-center">
                                                                    <Button
                                                                        size="sm"
                                                                        variant={isOverridden ? "default" : "outline"}
                                                                        onClick={() => handleToggleOverride(student.id, isOverridden)}
                                                                        className={cn(
                                                                            "h-8 px-4 font-bold text-[9px] uppercase tracking-widest rounded-lg transition-all",
                                                                            isOverridden 
                                                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black" 
                                                                                : "border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"
                                                                        )}
                                                                    >
                                                                        {isOverridden ? "Force Released" : "Policy Default"}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {students.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 text-center text-muted-foreground italic">
                                                                No active students found in this class.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

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
