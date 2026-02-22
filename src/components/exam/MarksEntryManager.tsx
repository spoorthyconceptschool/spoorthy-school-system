"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, writeBatch, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { SingleReportCardButton } from "@/components/admin/SingleReportCardButton";
import { createNotification } from "@/lib/notifications";

interface MarksEntryManagerProps {
    examId: string;
    backUrl: string; // URL to go back to (e.g. /teacher/exams or /admin/exams/123)
}

export function MarksEntryManager({ examId, backUrl }: MarksEntryManagerProps) {
    const router = useRouter();
    const { classes, sections, subjects, classSections, classSubjects, loading: mdLoading } = useMasterData();

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

    // Derived Lists
    const availableSections = Object.values(classSections)
        .filter((cs: any) => cs.classId === selectedClassId && cs.active)
        .map((cs: any) => sections[cs.sectionId])
        .filter(Boolean);

    const availableSubjects = Object.keys(classSubjects[selectedClassId] || {})
        .filter(sid => classSubjects[selectedClassId][sid] && subjects[sid])
        .filter(sid => {
            // Only show subjects that are in the exam timetable
            if (!exam?.timetables?.[selectedClassId]) return true; // If no timetable set, show all
            return !!exam.timetables[selectedClassId][sid];
        })
        .map(sid => subjects[sid]);

    // Fetch Students & Existing Marks
    const handleLoadStudents = async () => {
        if (!selectedClassId || !selectedSectionId || !selectedSubjectId) {
            alert("Please select Class, Section and Subject");
            return;
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
                return rA - rB || a.studentName.localeCompare(b.studentName);
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
                        // Ideally we check maxMarks consistency here but we let user override
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

    const handleSave = async () => {
        if (!selectedSubjectId) return;
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
                            maxMarks: maxMarks, // Uses currently set max marks
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

    if (loading || mdLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    if (!exam) return null;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-display">{exam.name}</h1>
                    <p className="text-muted-foreground text-sm">Marks Entry</p>
                </div>
            </div>

            <Card className="bg-black/20 border-white/10">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Select Class & Subject</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2 w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Class</label>
                            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSectionId(""); setSelectedSubjectId(""); }}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Class" /></SelectTrigger>
                                <SelectContent>
                                    {Object.values(classes).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Section</label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Section" /></SelectTrigger>
                                <SelectContent>
                                    {availableSections.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Subject</label>
                            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Subject" /></SelectTrigger>
                                <SelectContent>
                                    {availableSubjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleLoadStudents}
                            disabled={fetchingStudents || !selectedClassId || !selectedSectionId || !selectedSubjectId}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {fetchingStudents ? <Loader2 className="animate-spin" /> : "Load Data"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {students.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-lg">{students.length} Students Found</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Max Marks:</span>
                                <Input
                                    className="w-20 h-8 bg-black border-white/20 text-center"
                                    value={maxMarks}
                                    onChange={e => setMaxMarks(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save All Marks
                        </Button>
                    </div>

                    <div className="rounded-lg border border-white/10 overflow-hidden bg-black/20">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 font-bold text-muted-foreground">
                                <tr>
                                    <th className="p-4 text-left w-20">Roll No</th>
                                    <th className="p-4 text-left">Student Name</th>
                                    <th className="p-4 text-center w-32">Obtained Marks</th>
                                    <th className="p-4 text-left">Remarks</th>
                                    <th className="p-4 text-center w-16">Print</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {students.map(student => (
                                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 font-mono text-xs">{student.rollNo || "-"}</td>
                                        <td className="p-4 font-bold">{student.studentName}</td>
                                        <td className="p-4 text-center">
                                            <Input
                                                className="w-24 text-center bg-black/40 border-white/10 focus:border-emerald-500 mx-auto"
                                                value={marks[student.id] || ""}
                                                onChange={e => setMarks({ ...marks, [student.id]: e.target.value })}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <Input
                                                className="w-full bg-transparent border-transparent hover:border-white/10 focus:border-white/20"
                                                value={remarks[student.id] || ""}
                                                onChange={e => setRemarks({ ...remarks, [student.id]: e.target.value })}
                                                placeholder="Add remark..."
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <SingleReportCardButton exam={exam} student={student} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-40">
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save All
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
