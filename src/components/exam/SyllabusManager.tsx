"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Printer, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface SyllabusManagerProps {
    examId: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
}

export function SyllabusManager({ examId, role }: SyllabusManagerProps) {
    const { user } = useAuth();
    const { classes, sections, subjects, classSections, classSubjects, subjectTeachers, branding, loading: mdLoading } = useMasterData();

    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filtered Selections
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [syllabusText, setSyllabusText] = useState("");
    const [currentSyllabus, setCurrentSyllabus] = useState<any>(null);

    // Teacher's specific assignments
    const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]); // {classId, sectionIds, subjectId}
    const [classTeacherClasses, setClassTeacherClasses] = useState<string[]>([]);

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const docSnap = await getDoc(doc(db, "exams", examId));
                if (docSnap.exists()) {
                    setExam({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [examId]);

    // Process Teacher/Student Assignments
    useEffect(() => {
        if (!user?.uid) return;

        if (role === "TEACHER") {
            // Find teacher's ID in firestore (we need the schoolId/docId, not just UID)
            const fetchTeacherProfile = async () => {
                const q = query(collection(db, "teachers"), where("uid", "==", user.uid));
                const snap = await getDocs(q);
                if (snap.empty) return;
                const teacherId = snap.docs[0].id;

                // 1. Subject Teacher Assignments
                const assignments: any[] = [];
                Object.entries(subjectTeachers).forEach(([classSectionKey, subs]: [string, any]) => {
                    const [cId, sId] = classSectionKey.split("_");
                    Object.entries(subs).forEach(([subId, tId]) => {
                        if (tId === teacherId) {
                            // Check if this combination already exists in our simplified list
                            const existing = assignments.find(a => a.classId === cId && a.subjectId === subId);
                            if (existing) {
                                if (!existing.sectionIds.includes(sId)) existing.sectionIds.push(sId);
                            } else {
                                assignments.push({ classId: cId, sectionIds: [sId], subjectId: subId });
                            }
                        }
                    });
                });
                setTeacherAssignments(assignments);

                // 2. Class Teacher Assignments
                const ctClasses: string[] = [];
                Object.values(classSections).forEach((cs: any) => {
                    if (cs.classTeacherId === teacherId && cs.active) {
                        if (!ctClasses.includes(cs.classId)) ctClasses.push(cs.classId);
                    }
                });
                setClassTeacherClasses(ctClasses);
            };

            fetchTeacherProfile();
        } else if (role === "STUDENT") {
            const fetchStudentProfile = async () => {
                const q = query(collection(db, "students"), where("uid", "==", user.uid));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const sData = snap.docs[0].data();
                    setSelectedClassId(sData.classId);
                    // For students, maybe we show an overview instead of subject-by-subject?
                    // But if we use the same UI, we should at least select a default subject if available
                    const classSubIds = Object.keys(classSubjects[sData.classId] || {}).filter(sid => classSubjects[sData.classId][sid] && subjects[sid]);
                    if (classSubIds.length > 0) setSelectedSubjectId(classSubIds[0]);
                }
            };
            fetchStudentProfile();
        }
    }, [role, user, subjectTeachers, classSections, classSubjects, subjects]);

    // Load Syllabus when selection changes
    useEffect(() => {
        if (!examId || !selectedClassId || !selectedSubjectId) {
            setSyllabusText("");
            return;
        }

        const fetchSyllabus = async () => {
            const docId = `${examId}_${selectedClassId}_${selectedSubjectId}`;
            const snap = await getDoc(doc(db, "exam_syllabus", docId));
            if (snap.exists()) {
                const data = snap.data();
                setSyllabusText(data.content || "");
                setCurrentSyllabus(data);
            } else {
                setSyllabusText("");
                setCurrentSyllabus(null);
            }
        };

        fetchSyllabus();
    }, [examId, selectedClassId, selectedSubjectId]);

    const handleSaveSyllabus = async () => {
        if (!selectedClassId || !selectedSubjectId) return;
        setSaving(true);
        try {
            const docId = `${examId}_${selectedClassId}_${selectedSubjectId}`;
            await setDoc(doc(db, "exam_syllabus", docId), {
                examId,
                classId: selectedClassId,
                subjectId: selectedSubjectId,
                content: syllabusText,
                updatedAt: new Date(),
                updatedBy: user?.uid,
                updatedByName: user?.displayName
            }, { merge: true });

            alert("Syllabus saved successfully!");
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePrintClassSyllabus = async (targetClassId: string) => {
        if (!targetClassId) return;

        // 1. Fetch ALL syllabus entries for this class and this exam
        const q = query(collection(db, "exam_syllabus"), where("examId", "==", examId), where("classId", "==", targetClassId));
        const snap = await getDocs(q);
        const syllabusItems = snap.docs.map(d => d.data());

        // 2. Map to subject names
        const timetableSubIds = exam?.timetables?.[targetClassId] ? Object.keys(exam.timetables[targetClassId]) : [];
        const masterSubIds = Object.keys(classSubjects[targetClassId] || {})
            .filter(sid => sid !== 'id' && classSubjects[targetClassId][sid] && subjects[sid]);

        // Use same priority as allowedSubjects
        const activeSubIds = timetableSubIds.length > 0 ? timetableSubIds : masterSubIds;

        const data = activeSubIds.map(sid => {
            const item = syllabusItems.find(i => i.subjectId === sid);
            return {
                subject: subjects[sid]?.name || "Unknown Subject",
                content: item?.content || "No syllabus provided yet."
            };
        });

        // 3. Print
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Syllabus - ${exam.name} - ${classes[targetClassId]?.name}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                        .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { height: 80px; margin-bottom: 10px; }
                        h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                        h2 { margin: 5px 0; font-size: 18px; color: #666; }
                        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                        .subject-box { margin-bottom: 25px; page-break-inside: avoid; }
                        .subject-title { font-size: 16px; font-weight: 800; background: #f4f4f4; padding: 8px 15px; border-left: 5px solid #333; margin-bottom: 10px; text-transform: uppercase; }
                        .content { padding-left: 15px; white-space: pre-wrap; font-size: 14px; }
                        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                        @media print {
                            body { padding: 0; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${branding.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                        <h1>${branding.schoolName}</h1>
                        <h2>${exam.name} - EXAMINATION SYLLABUS</h2>
                    </div>
                    
                    <div class="meta">
                        <span>CLASS: ${classes[targetClassId]?.name}</span>
                        <span>DATE: ${new Date().toLocaleDateString()}</span>
                    </div>

                    ${data.map(d => `
                        <div class="subject-box">
                            <div class="subject-title">${d.subject}</div>
                            <div class="content">${d.content}</div>
                        </div>
                    `).join('')}

                    <div class="footer">
                        This is an official document generated by the ${branding.schoolName} management system.
                    </div>
                    <script>window.onload = () => { window.print(); };</script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Derived Lists for UI
    const allowedClasses = useMemo(() => {
        if (role === "ADMIN") return Object.values(classes);
        if (role === "TEACHER") {
            return Object.values(classes).filter(c =>
                teacherAssignments.some(a => a.classId === c.id) ||
                classTeacherClasses.includes(c.id)
            );
        }
        return selectedClassId ? [classes[selectedClassId]] : [];
    }, [role, classes, teacherAssignments, classTeacherClasses, selectedClassId]);

    const allowedSubjects = useMemo(() => {
        if (!selectedClassId) return [];

        // 1. Source A: Subjects explicitly in the Timetable (Primary for Exams)
        const timetableSubIds = exam?.timetables?.[selectedClassId]
            ? Object.keys(exam.timetables[selectedClassId])
            : [];

        // 2. Source B: Subjects assigned to this class in Master Data (Fallback)
        const masterSubIds = Object.keys(classSubjects[selectedClassId] || {})
            .filter(sid => sid !== 'id' && classSubjects[selectedClassId][sid]);

        // Use timetable if it has data, otherwise show all assigned subjects
        let combinedIds = timetableSubIds.length > 0 ? timetableSubIds : masterSubIds;

        // 3. Role-based filtering for Teachers
        if (role === "TEACHER") {
            combinedIds = combinedIds.filter(sid =>
                teacherAssignments.some(a => a.classId === selectedClassId && a.subjectId === sid) ||
                classTeacherClasses.includes(selectedClassId)
            );
        }

        // Return subject objects, ensuring they exist in our master registry
        return combinedIds
            .map(sid => subjects[sid])
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedClassId, classSubjects, subjects, role, teacherAssignments, classTeacherClasses, exam]);

    // Check if user can EDIT the selected combination
    const canEdit = role === "ADMIN" || (role === "TEACHER" && teacherAssignments.some(a => a.classId === selectedClassId && a.subjectId === selectedSubjectId));

    if (loading || mdLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Examination Syllabus
                    </h2>
                    <p className="text-sm text-muted-foreground">Define and review syllabus for {exam?.name}</p>
                </div>
                {selectedClassId && (
                    <Button
                        onClick={() => handlePrintClassSyllabus(selectedClassId)}
                        variant="outline"
                        className="gap-2 border-zinc-500/20 hover:bg-zinc-500/10"
                    >
                        <Printer className="w-4 h-4" /> Print Full Class Syllabus
                    </Button>
                )}
            </div>

            <Card className={cn("bg-black/20 border-white/10 overflow-hidden", role === "STUDENT" && "hidden")}>
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-sm uppercase tracking-widest text-[#8892B0]">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Class</label>
                            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSubjectId(""); }}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-12">
                                    <SelectValue placeholder="Choose Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedClasses.sort((a: any, b: any) => a.order - b.order).map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Subject</label>
                            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-12">
                                    <SelectValue placeholder="Choose Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedSubjects.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {role === "STUDENT" && selectedClassId && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {allowedSubjects.map(s => (
                        <Button
                            key={s.id}
                            variant={selectedSubjectId === s.id ? "default" : "outline"}
                            className={cn(
                                "shrink-0 rounded-full px-6",
                                selectedSubjectId === s.id ? "bg-blue-600 hover:bg-blue-700" : "border-white/10 hover:bg-white/5 text-[#8892B0]"
                            )}
                            onClick={() => setSelectedSubjectId(s.id)}
                        >
                            {s.name}
                        </Button>
                    ))}
                </div>
            )}

            {selectedClassId && selectedSubjectId && (
                <Card className="bg-black/10 border-white/10 animate-in slide-in-from-bottom-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                    {classes[selectedClassId]?.name}
                                </Badge>
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                    {subjects[selectedSubjectId]?.name}
                                </Badge>
                            </div>
                            {!canEdit && (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                                    <AlertCircle className="w-3 h-3" /> View Only (Class Teacher Mode)
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Syllabus Content</label>
                            <Textarea
                                className={cn(
                                    "min-h-[300px] bg-white/5 border-white/10 focus:border-blue-500/50 text-base leading-relaxed p-4",
                                    !canEdit && "opacity-80 cursor-not-allowed bg-transparent"
                                )}
                                placeholder="Enter specific chapters, topics, and instructions for this exam..."
                                value={syllabusText}
                                onChange={(e) => setSyllabusText(e.target.value)}
                                readOnly={!canEdit}
                            />
                        </div>

                        {canEdit && (
                            <div className="flex justify-end gap-3">
                                <Button
                                    onClick={handleSaveSyllabus}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-8 rounded-xl shadow-[0_0_20px_-5px_theme(colors.blue.600/0.5)]"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Syllabus
                                </Button>
                            </div>
                        )}

                        {currentSyllabus && (
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Last updated by {currentSyllabus.updatedByName || "System"}
                                </div>
                                <div>
                                    {new Date(currentSyllabus.updatedAt.seconds * 1000).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
