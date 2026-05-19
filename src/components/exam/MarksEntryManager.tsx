"use client";

import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { useAuth } from "@/context/AuthContext";

interface MarksEntryManagerProps {
    examId: string;
    backUrl: string; // URL to go back to (e.g. /teacher/exams or /admin/exams/123)
}

export function MarksEntryManager({ examId, backUrl }: MarksEntryManagerProps) {
    const router = useRouter();
    const { classes, sections, subjects, classSections, classSubjects, subjectTeachers, loading: mdLoading } = useMasterData();
    const { user, isAdmin } = useAuth();
    const [teacherId, setTeacherId] = useState<string | null>(null);

    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Selection State
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

    // Data State
    const [students, setStudents] = useState<any[]>([]);
    const [marks, setMarks] = useState<{ [studentId: string]: string }>({});
    const [maxMarks, setMaxMarks] = useState<string>("100");
    const [remarks, setRemarks] = useState<{ [studentId: string]: string }>({});

    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Teacher ID if logged in as teacher
    useEffect(() => {
        if (!user?.uid || isAdmin) return;
        const fetchTeacherId = async () => {
            try {
                const q = query(collection(db, "teachers"), where("uid", "==", user.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setTeacherId(snap.docs[0].id);
                }
            } catch (e) {
                console.error("Error fetching teacher doc ID:", e);
            }
        };
        fetchTeacherId();
    }, [user, isAdmin]);

    // Load Exam Details
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const docSnap = await getDoc(doc(db, "exams", examId));
                if (docSnap.exists()) {
                    setExam({ id: docSnap.id, ...docSnap.data() });
                } else {
                    // If exam not found, go back
                    router.push(backUrl);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [examId, backUrl, router]);

    // Derived Lists & Filters
    const filteredClasses = useMemo(() => {
        const rawClasses = Object.values(classes);
        if (isAdmin || !teacherId) return rawClasses;

        // Filter classes where teacher has any subject assigned in any section
        return rawClasses.filter((c: any) => {
            return Object.entries(subjectTeachers || {}).some(([classSectionKey, subs]: [string, any]) => {
                const [cId] = classSectionKey.split("_");
                if (cId !== c.id) return false;
                return Object.values(subs || {}).some(tId => tId === teacherId);
            });
        });
    }, [classes, subjectTeachers, teacherId, isAdmin]);

    const availableSections = useMemo(() => {
        return Object.values(classSections)
            .filter((cs: any) => cs.classId === selectedClassId && (cs.active || cs.isActive || cs.active !== false))
            .map((cs: any) => sections[cs.sectionId])
            .filter(Boolean)
            .filter((sec: any) => {
                if (isAdmin || !teacherId) return true;
                const classSectionKey = `${selectedClassId}_${sec.id}`;
                const subs = subjectTeachers?.[classSectionKey] || {};
                return Object.values(subs).some(tId => tId === teacherId);
            });
    }, [classSections, selectedClassId, sections, subjectTeachers, teacherId, isAdmin]);

    const availableSubjects = useMemo(() => {
        return Object.keys(classSubjects[selectedClassId] || {})
            .filter(sid => classSubjects[selectedClassId][sid] && subjects[sid])
            .filter(sid => {
                // Only show subjects that are in the exam timetable
                if (!exam?.timetables?.[selectedClassId]) return true; // If no timetable set, show all
                return !!exam.timetables[selectedClassId][sid];
            })
            .filter(sid => {
                if (isAdmin || !teacherId) return true;
                if (!selectedSectionId) return false;
                const classSectionKey = `${selectedClassId}_${selectedSectionId}`;
                return subjectTeachers?.[classSectionKey]?.[sid] === teacherId;
            })
            .map(sid => subjects[sid]);
    }, [classSubjects, selectedClassId, subjects, exam, selectedSectionId, subjectTeachers, teacherId, isAdmin]);

    // Fetch Students & Existing Marks
    const handleLoadStudents = async () => {
        if (!selectedClassId || !selectedSectionId || !selectedSubjectId) {
            alert("Please select Class, Section and Subject");
            return;
        }

        // Secure teacher assignment boundary
        if (!isAdmin && teacherId) {
            const classSectionKey = `${selectedClassId}_${selectedSectionId}`;
            const assignedTeacherId = subjectTeachers?.[classSectionKey]?.[selectedSubjectId];
            if (assignedTeacherId !== teacherId) {
                alert("Permission Denied: You are not the assigned subject teacher for this subject in this section.");
                return;
            }
        }

        setFetchingStudents(true);
        try {
            // 1. Fetch Students
            const q = query(
                collection(db, "students"),
                where("classId", "==", selectedClassId),
                where("sectionId", "==", selectedSectionId),
                where("status", "==", "ACTIVE")
            );
            const snap = await getDocs(q);
            const studentList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort by Roll No
            studentList.sort((a: any, b: any) => {
                const rA = parseInt(a.rollNo) || 9999;
                const rB = parseInt(b.rollNo) || 9999;
                return rA - rB || String(a.studentName || "").localeCompare(String(b.studentName || ""));
            });

            setStudents(studentList);

            // 2. Fetch Existing Marks
            const marksMap: any = {};
            const remarkMap: any = {};

            const fetchPromises = studentList.map(async (student: any) => {
                const docId = `${examId}_${student.id}`;
                const resSnap = await getDoc(doc(db, "exam_results", docId));
                if (resSnap.exists()) {
                    const data = resSnap.data();
                    const subData = data.subjects?.[selectedSubjectId];
                    if (subData) {
                        marksMap[student.id] = subData.obtained;
                        remarkMap[student.id] = subData.remarks || "";
                    }
                }
            });

            await Promise.all(fetchPromises);

            setMarks(marksMap);
            setRemarks(remarkMap);

        } catch (e) {
            console.error(e);
            alert("Error loading students");
        } finally {
            setFetchingStudents(false);
        }
    };

    // Real-time Marks Capping & Validation
    const handleMarkChange = (studentId: string, val: string) => {
        if (val === "") {
            setMarks(prev => ({ ...prev, [studentId]: "" }));
            return;
        }
        const maxVal = parseFloat(maxMarks) || 100;
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
            if (numVal > maxVal) {
                setMarks(prev => ({ ...prev, [studentId]: String(maxVal) }));
            } else if (numVal < 0) {
                setMarks(prev => ({ ...prev, [studentId]: "0" }));
            } else {
                setMarks(prev => ({ ...prev, [studentId]: val }));
            }
        } else {
            setMarks(prev => ({ ...prev, [studentId]: val }));
        }
    };

    const handleSave = async () => {
        if (!selectedSubjectId) return;

        // 1. Guard teacher assignments
        if (!isAdmin && teacherId) {
            const classSectionKey = `${selectedClassId}_${selectedSectionId}`;
            const assignedTeacherId = subjectTeachers?.[classSectionKey]?.[selectedSubjectId];
            if (assignedTeacherId !== teacherId) {
                alert("Permission Denied: You are not the assigned subject teacher for this subject in this section.");
                return;
            }
        }

        // 2. Validate marks don't exceed max marks
        const maxVal = parseFloat(maxMarks) || 100;
        for (const student of students) {
            const markStr = marks[student.id];
            if (markStr !== undefined && markStr !== "") {
                const markVal = parseFloat(markStr);
                if (isNaN(markVal)) {
                    alert(`Invalid mark entered for ${student.studentName}`);
                    return;
                }
                if (markVal > maxVal) {
                    alert(`Error: Entered marks (${markVal}) for ${student.studentName} exceeds maximum marks (${maxVal})`);
                    return;
                }
                if (markVal < 0) {
                    alert(`Error: Entered marks (${markVal}) for ${student.studentName} cannot be negative`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const batch = writeBatch(db);

            for (const student of students) {
                const docId = `${examId}_${student.id}`;
                const studentRef = doc(db, "exam_results", docId);

                const mark = marks[student.id];
                const remark = remarks[student.id] || "";

                if (mark === undefined) continue;

                const payload = {
                    subjects: {
                        [selectedSubjectId]: {
                            obtained: mark,
                            maxMarks: maxMarks,
                            remarks: remark
                        }
                    },
                    examId,
                    studentId: student.id,
                    studentName: student.studentName,
                    classId: selectedClassId,
                    className: classes[selectedClassId]?.name,
                    sectionId: selectedSectionId,
                    sectionName: sections[selectedSectionId]?.name,
                    rollNo: student.rollNo || ""
                };

                batch.set(studentRef, payload, { merge: true });
            }

            await batch.commit();

            // Notify System
            const className = classes[selectedClassId]?.name || "Unknown Class";
            const subjectName = subjects[selectedSubjectId]?.name || "Unknown Subject";
            const examName = exam.name || "Exam";

            // 1. Notify Manager (Admins)
            await createNotification({
                target: "ALL_ADMINS",
                title: "Marks Updated",
                message: `Marks entered for ${className} - ${subjectName} (${examName})`,
                type: "INFO"
            });

            // 2. Notify Students of that Class
            await createNotification({
                target: `class_${selectedClassId}`,
                title: "Exam Results Update",
                message: `Marks have been updated for ${subjectName} in ${examName}. Check your portal.`,
                type: "NOTICE"
            });

            alert("Marks saved successfully!");
        } catch (e: any) {
            console.error(e);
            alert("Error saving: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    // Check if marks entry is locked due to time
    const isLocked = useMemo(() => {
        if (!exam || !selectedClassId || !selectedSubjectId) return false;
        
        let targetKey = selectedClassId;
        // If there's an individual timetable for this section, prefer it
        if (selectedSectionId && exam.timetables?.[`${selectedClassId}_${selectedSectionId}`]) {
            targetKey = `${selectedClassId}_${selectedSectionId}`;
        }
        
        const subjectTimetable = exam.timetables?.[targetKey]?.[selectedSubjectId];
        if (!subjectTimetable || !subjectTimetable.date || !subjectTimetable.endTime) return false;
        
        const now = new Date();
        const endDateTime = new Date(`${subjectTimetable.date}T${subjectTimetable.endTime}`);
        
        return now < endDateTime;
    }, [exam, selectedClassId, selectedSubjectId, selectedSectionId]);

    // Prefill Max Marks from Timetable when selection changes
    useEffect(() => {
        if (!exam || !selectedClassId || !selectedSubjectId) return;

        let targetKey = selectedClassId;
        if (selectedSectionId && exam.timetables?.[`${selectedClassId}_${selectedSectionId}`]) {
            targetKey = `${selectedClassId}_${selectedSectionId}`;
        }

        const subjectTimetable = exam.timetables?.[targetKey]?.[selectedSubjectId];
        if (subjectTimetable?.maxMarks) {
            setMaxMarks(subjectTimetable.maxMarks);
        } else {
            setMaxMarks("100"); // fallback default
        }
    }, [exam, selectedClassId, selectedSectionId, selectedSubjectId]);

    if (loading || mdLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    if (!exam) return null;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-white/5 pb-6 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)} className="shrink-0 w-10 h-10">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">{exam.name}</h1>
                    <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70">Marks Entry Console</p>
                </div>
            </div>

            <Card className="bg-black/20 border-white/10">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Select Class & Subject</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic ml-1">Class</label>
                            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSectionId(""); setSelectedSubjectId(""); }}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 md:h-10 rounded-xl focus:ring-emerald-500/20"><SelectValue placeholder="Class" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {filteredClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic ml-1">Section</label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 md:h-10 rounded-xl focus:ring-emerald-500/20"><SelectValue placeholder="Section" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {availableSections.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic ml-1">Subject</label>
                            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedSectionId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 md:h-10 rounded-xl focus:ring-emerald-500/20"><SelectValue placeholder="Subject" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {availableSubjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleLoadStudents}
                            disabled={fetchingStudents || !selectedClassId || !selectedSectionId || !selectedSubjectId}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] h-11 md:h-10 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            {fetchingStudents ? <Loader2 className="animate-spin" /> : "Load Data"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {students.length > 0 && (
                <div className="space-y-4">
                    {isLocked && (
                        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl text-sm font-bold flex items-center gap-3">
                            ⚠️ Marks entry is locked. You can only enter marks after the scheduled exam time has concluded.
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-4 md:p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="flex items-center justify-between md:justify-start gap-4 flex-1">
                            <span className="font-bold text-lg text-white">{students.length} Students</span>
                            <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Max:</span>
                                <Input
                                    className="w-16 h-7 bg-transparent border-none text-center font-bold text-emerald-400 p-0 focus-visible:ring-0"
                                    value={maxMarks}
                                    onChange={e => setMaxMarks(e.target.value)}
                                />
                            </div>
                            {/* Pass Marks display */}
                            {(() => {
                                let targetKey = selectedClassId;
                                if (selectedSectionId && exam.timetables?.[`${selectedClassId}_${selectedSectionId}`]) {
                                    targetKey = `${selectedClassId}_${selectedSectionId}`;
                                }
                                const passVal = exam.timetables?.[targetKey]?.[selectedSubjectId]?.passMarks;
                                if (passVal) {
                                    return (
                                        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-rose-400 text-xs font-bold rounded-lg">
                                            Pass Marks: {passVal}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <Button onClick={handleSave} disabled={saving || isLocked} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white gap-2 h-11 md:h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save All Marks
                        </Button>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {students.map(student => (
                            <div key={student.id} className="bg-black/20 border border-white/10 rounded-3xl p-5 space-y-5 backdrop-blur-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full -mr-12 -mt-12 transition-all group-hover:bg-blue-500/20" />

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Roll No: {student.rollNo || "-"}</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-white tracking-tight">{student.studentName}</h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/5 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                            Obtained Marks
                                            <span className="text-[8px] text-emerald-500/60 lowercase font-normal italic">/ {maxMarks} max</span>
                                        </label>
                                        <Input
                                            className="h-12 bg-white/5 border-white/10 text-center text-xl font-bold text-emerald-400 rounded-2xl focus:ring-emerald-500/20 disabled:opacity-50"
                                            value={marks[student.id] || ""}
                                            onChange={e => handleMarkChange(student.id, e.target.value)}
                                            placeholder="0"
                                            type="number"
                                            disabled={isLocked}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Remarks</label>
                                        <Input
                                            className="h-12 bg-white/5 border-white/10 text-sm font-medium rounded-2xl focus:ring-blue-500/20 disabled:opacity-50"
                                            value={remarks[student.id] || ""}
                                            onChange={e => setRemarks({ ...remarks, [student.id]: e.target.value })}
                                            placeholder="Performance notes..."
                                            disabled={isLocked}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-2xl border border-white/10 overflow-hidden bg-black/20 backdrop-blur-md">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 font-black text-white/40 uppercase tracking-[0.2em] text-[10px] italic">
                                <tr>
                                    <th className="p-4 text-left w-20">Roll</th>
                                    <th className="p-4 text-left">Student</th>
                                    <th className="p-4 text-center w-32">Marks</th>
                                    <th className="p-4 text-left">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {students.map(student => (
                                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 font-mono text-xs opacity-50">{student.rollNo || "-"}</td>
                                        <td className="p-4 font-bold text-white tracking-tight">{student.studentName}</td>
                                        <td className="p-4 text-center">
                                            <Input
                                                className="w-24 h-9 text-center bg-black/40 border-white/10 focus:border-emerald-500 mx-auto rounded-lg font-bold text-emerald-400 disabled:opacity-50"
                                                value={marks[student.id] || ""}
                                                onChange={e => handleMarkChange(student.id, e.target.value)}
                                                placeholder="0"
                                                disabled={isLocked}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <Input
                                                className="w-full h-9 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 transition-all font-medium text-white/80 disabled:opacity-50"
                                                value={remarks[student.id] || ""}
                                                onChange={e => setRemarks({ ...remarks, [student.id]: e.target.value })}
                                                placeholder="Add remark..."
                                                disabled={isLocked}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4 pb-10">
                        <Button onClick={handleSave} disabled={saving} className="w-full md:w-48 bg-blue-600 hover:bg-blue-500 text-white gap-2 h-12 md:h-11 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save All
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
