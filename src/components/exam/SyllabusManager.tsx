"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { createNotification } from "@/lib/notifications";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Printer, FileText, CheckCircle2, AlertCircle, Book, Calculator, Microscope, Globe, Laptop, Beaker, Code, Feather, Music, Dna, GraduationCap, Clock, MapPin, CalendarDays, BookOpen, Sparkles, ChevronDown, ChevronUp, Award, TrendingUp } from "lucide-react";
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
    const [syllabusMode, setSyllabusMode] = useState<"COMBINED" | "INDIVIDUAL">("COMBINED");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [syllabusText, setSyllabusText] = useState("");
    const [currentSyllabus, setCurrentSyllabus] = useState<any>(null);
    const [allStudentSyllabi, setAllStudentSyllabi] = useState<any[]>([]);

    const [currentTime, setCurrentTime] = useState(new Date());
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (role !== "STUDENT") return;
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 30000); // check countdowns every 30 seconds
        return () => clearInterval(interval);
    }, [role]);

    const formatTime12h = (time24?: string) => {
        if (!time24) return "";
        try {
            const [hoursStr, minutesStr] = time24.split(":");
            let hours = parseInt(hoursStr, 10);
            const minutes = minutesStr || "00";
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours}:${minutes} ${ampm}`;
        } catch (e) {
            return time24;
        }
    };

    const calculateHours = (startTime?: string, endTime?: string) => {
        if (!startTime || !endTime) return "";
        try {
            const [sh, sm] = startTime.split(":").map(Number);
            const [eh, em] = endTime.split(":").map(Number);
            const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
            if (diffMinutes <= 0) return "";
            const hours = diffMinutes / 60;
            return `${hours % 1 === 0 ? hours : hours.toFixed(1)} Hrs`;
        } catch (e) {
            return "";
        }
    };

    const chronologicalSubjects = useMemo(() => {
        if (role !== "STUDENT" || !selectedClassId || !exam?.timetables?.[selectedClassId]) return [];
        
        const timetable = exam.timetables[selectedClassId];
        return Object.entries(timetable)
            .map(([subId, d]: any) => {
                const subObj = subjects[subId];
                return {
                    id: subId,
                    name: subObj?.name || subId,
                    date: d.date || "",
                    startTime: d.startTime || "",
                    endTime: d.endTime || "",
                    maxMarks: d.maxMarks || "",
                    passMarks: d.passMarks || "",
                    room: d.room || "Exam Hall 1"
                };
            })
            .filter(s => s.date)
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.startTime || "00:00"}`);
                const dateB = new Date(`${b.date}T${b.startTime || "00:00"}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [selectedClassId, exam, subjects, role]);

    const durationDays = useMemo(() => {
        if (!exam?.startDate || !exam?.endDate) return 0;
        try {
            const start = new Date(exam.startDate);
            const end = new Date(exam.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays;
        } catch (e) {
            return 0;
        }
    }, [exam]);

    const nextExam = useMemo(() => {
        if (role !== "STUDENT") return null;
        return chronologicalSubjects.find(s => {
            const examStart = new Date(`${s.date}T${s.startTime || "00:00"}`);
            return examStart > currentTime;
        });
    }, [chronologicalSubjects, currentTime, role]);

    const getSubjectIcon = (subjectName: string) => {
        const name = subjectName.toLowerCase();
        if (name.includes("math")) return <Calculator className="w-8 h-8 text-blue-500" />;
        if (name.includes("sci") || name.includes("phys") || name.includes("chem")) return <Microscope className="w-8 h-8 text-emerald-500" />;
        if (name.includes("eng") || name.includes("lit") || name.includes("lang")) return <Book className="w-8 h-8 text-amber-500" />;
        if (name.includes("soc") || name.includes("hist") || name.includes("geo")) return <Globe className="w-8 h-8 text-orange-500" />;
        if (name.includes("comp") || name.includes("it")) return <Laptop className="w-8 h-8 text-cyan-500" />;
        return <FileText className="w-8 h-8 text-purple-500" />;
    };

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
                const teacherDoc = snap.docs[0];
                const teacherId = teacherDoc.id;
                const schoolId = teacherDoc.data().schoolId;

                // 1. Subject Teacher Assignments
                const assignments: any[] = [];
                Object.entries(subjectTeachers).forEach(([classSectionKey, subs]: [string, any]) => {
                    const [cId, sId] = classSectionKey.split("_");
                    Object.entries(subs).forEach(([subId, tId]) => {
                        if (tId === teacherId || tId === schoolId) {
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
                    if ((cs.classTeacherId === teacherId || cs.classTeacherId === schoolId) && (cs.active || cs.isActive || cs.active !== false)) {
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
        if (!examId || !selectedClassId) {
            setSyllabusText("");
            setAllStudentSyllabi([]);
            return;
        }

        const fetchSyllabus = async () => {
            if (role === "STUDENT") {
                const q = query(collection(db, "exam_syllabus"), where("examId", "==", examId), where("classId", "==", selectedClassId));
                const snap = await getDocs(q);
                setAllStudentSyllabi(snap.docs.map(d => d.data()));
            }

            if (!selectedSubjectId) return;

            let docId = `${examId}_${selectedClassId}_${selectedSubjectId}`;
            if (syllabusMode === "INDIVIDUAL" && selectedSectionId) {
                docId = `${examId}_${selectedClassId}_${selectedSectionId}_${selectedSubjectId}`;
            }

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
    }, [examId, selectedClassId, selectedSubjectId, syllabusMode, selectedSectionId, role]);

    const handleSaveSyllabus = async () => {
        if (!selectedClassId || !selectedSubjectId) return;
        if (syllabusMode === "INDIVIDUAL" && !selectedSectionId) {
            alert("Please select a section for Individual Syllabus Mode.");
            return;
        }

        setSaving(true);
        try {
            let docId = `${examId}_${selectedClassId}_${selectedSubjectId}`;
            let targetGroup = `class_${selectedClassId}`;

            if (syllabusMode === "INDIVIDUAL") {
                docId = `${examId}_${selectedClassId}_${selectedSectionId}_${selectedSubjectId}`;
                targetGroup = `section_${selectedSectionId}`;
            }

            await setDoc(doc(db, "exam_syllabus", docId), {
                examId,
                classId: selectedClassId,
                sectionId: syllabusMode === "INDIVIDUAL" ? selectedSectionId : null,
                subjectId: selectedSubjectId,
                content: syllabusText,
                updatedAt: new Date(),
                updatedBy: user?.uid,
                updatedByName: user?.displayName
            }, { merge: true });

            // Notify students of this class that the syllabus has been updated!
            const subjectName = subjects[selectedSubjectId]?.name || "Subject";
            await createNotification({
                target: targetGroup,
                title: "Exam Syllabus Updated",
                message: `The syllabus for "${subjectName}" in exam "${exam?.name || 'Upcoming Exam'}" has been updated. Please review the topics.`,
                type: "NOTICE"
            }).catch(err => console.error("Syllabus notification error:", err));

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
                        <span>DATE: ${new Date().toLocaleDateString('en-GB')}</span>
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
        let list = Object.values(classes);
        if (role === "TEACHER") {
            list = list.filter(c =>
                teacherAssignments.some(a => a.classId === c.id) ||
                classTeacherClasses.includes(c.id)
            );
        } else if (role === "STUDENT") {
            return selectedClassId ? [classes[selectedClassId]] : [];
        }

        // Apply exam class scoping if defined
        if (exam?.classIds && Array.isArray(exam.classIds) && exam.classIds.length > 0) {
            list = list.filter(c => exam.classIds.includes(c.id));
        }

        return list;
    }, [role, classes, teacherAssignments, classTeacherClasses, selectedClassId, exam]);

    // Auto-select first allowed class for admins/teachers if current selection is invalid or empty
    useEffect(() => {
        if ((role === "ADMIN" || role === "TEACHER") && allowedClasses.length > 0) {
            if (!selectedClassId || !allowedClasses.some(c => c.id === selectedClassId)) {
                setSelectedClassId(allowedClasses[0].id);
            }
        }
    }, [allowedClasses, role, selectedClassId]);

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

    if (role === "STUDENT") {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 text-[#E6F1FF]">
                {/* 1. Glassmorphic Hero block */}
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A192F]/80 p-6 md:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {classes[selectedClassId]?.name || "Class Portal"}
                            </div>
                            
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight font-display bg-gradient-to-r from-white via-[#E6F1FF] to-[#8892B0] bg-clip-text text-transparent">
                                {exam?.name || "Academic Examination"}
                            </h1>
                            
                            <p className="text-sm md:text-base text-[#8892B0] max-w-xl">
                                Your comprehensive examination timeline, syllabus, and scheduler portal. Prepare well and track your targets.
                            </p>
                            
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                                    <BookOpen className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-[#E6F1FF]">{chronologicalSubjects.length} Scheduled Exams</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                                    <CalendarDays className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-bold text-[#E6F1FF]">{durationDays ? `${durationDays} Days Duration` : "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 w-full">
                            {/* Live Countdown widget */}
                            {nextExam ? (
                                <div className="relative overflow-hidden rounded-2xl border border-[#64FFDA]/20 bg-gradient-to-br from-[#112240]/90 to-[#0A192F]/90 p-5 shadow-[0_8px_32px_rgba(100,255,218,0.15)] group hover:border-[#64FFDA]/40 transition-all">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#64FFDA]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#64FFDA]/10 transition-all" />
                                    
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#64FFDA] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#64FFDA]"></span>
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#64FFDA]">Next Examination Countdown</span>
                                        </div>
                                        <Sparkles className="w-4 h-4 text-[#64FFDA] opacity-80" />
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-baseline justify-between">
                                            <h3 className="text-lg font-bold text-white tracking-wide truncate max-w-[200px]">{nextExam.name}</h3>
                                            <span className="text-xs text-[#8892B0] font-medium bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{nextExam.room}</span>
                                        </div>
                                        
                                        {/* Digital Countdown block */}
                                        {(() => {
                                            const examStart = new Date(`${nextExam.date}T${nextExam.startTime || "00:00"}`);
                                            const diffMs = examStart.getTime() - currentTime.getTime();
                                            
                                            if (diffMs <= 0) return null;
                                            
                                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                            const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                            
                                            return (
                                                <div className="grid grid-cols-3 gap-2 text-center bg-black/40 p-3 rounded-xl border border-white/5">
                                                    <div>
                                                        <div className="text-2xl font-black text-white font-mono leading-none">{String(diffDays).padStart(2, "0")}</div>
                                                        <div className="text-[8px] font-black text-[#8892B0] uppercase tracking-wider mt-1">Days</div>
                                                    </div>
                                                    <div className="border-x border-white/5">
                                                        <div className="text-2xl font-black text-[#64FFDA] font-mono leading-none">{String(diffHrs).padStart(2, "0")}</div>
                                                        <div className="text-[8px] font-black text-[#8892B0] uppercase tracking-wider mt-1">Hours</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-black text-white font-mono leading-none">{String(diffMins).padStart(2, "0")}</div>
                                                        <div className="text-[8px] font-black text-[#8892B0] uppercase tracking-wider mt-1">Minutes</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        
                                        <div className="flex items-center justify-between text-[10px] text-[#8892B0] pt-1">
                                            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-[#64FFDA]" /> {new Date(nextExam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#64FFDA]" /> {formatTime12h(nextExam.startTime)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-white/5 bg-[#112240]/40 p-6 flex flex-col items-center justify-center text-center space-y-2 h-full">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">All Exams Completed!</h3>
                                    <p className="text-xs text-[#8892B0]">Fantastic effort. Check back for report cards and results.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Print Trigger Bar */}
                <div className="flex justify-between items-center bg-[#112240]/30 border border-white/5 rounded-2xl px-6 py-4">
                    <div className="text-sm font-medium text-[#8892B0]">
                        Need a physical copy? Access high-fidelity print layout.
                    </div>
                    <Button 
                        onClick={() => handlePrintClassSyllabus(selectedClassId)}
                        className="bg-white hover:bg-gray-100 text-[#0A192F] font-black text-xs tracking-widest uppercase rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 border-0"
                    >
                        <Printer className="w-4 h-4" /> Print Syllabus
                    </Button>
                </div>

                {/* 2. Chronological Connected Timeline */}
                <div className="relative pl-6 md:pl-10 space-y-6">
                    {/* Vertical timeline connector line */}
                    <div className="absolute left-[11px] md:left-[19px] top-4 bottom-4 w-1.5 rounded bg-gradient-to-b from-blue-500/40 via-[#64FFDA]/30 to-[#8892B0]/10" />

                    {chronologicalSubjects.map((s: any, idx: number) => {
                        const syllabusData = allStudentSyllabi.find(sy => sy.subjectId === s.id);
                        const content = syllabusData?.content?.trim();
                        const isUpdated = !!content;
                        const isExpanded = !!expandedSubjects[s.id];

                        // Calculate status
                        let statusText = "UPCOMING";
                        let statusColor = "text-[#64FFDA] bg-[#64FFDA]/10 border-[#64FFDA]/20";
                        const now = new Date();
                        const examStart = new Date(`${s.date}T${s.startTime || "00:00"}`);
                        const examEnd = new Date(`${s.date}T${s.endTime || "23:59"}`);

                        if (now > examEnd) {
                            statusText = "COMPLETED";
                            statusColor = "text-[#8892B0] bg-white/5 border-white/10";
                        } else if (now >= examStart && now <= examEnd) {
                            statusText = "ONGOING NOW";
                            statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse";
                        } else {
                            const diffMs = examStart.getTime() - now.getTime();
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            
                            const pieces = [];
                            if (diffDays > 0) pieces.push(`${diffDays}D`);
                            if (diffHrs > 0 || diffDays > 0) pieces.push(`${diffHrs}H`);
                            pieces.push(`${diffMins}M`);
                            
                            statusText = `UPCOMING ${pieces.join(" : ")}`;
                        }

                        const isNextExam = nextExam && nextExam.id === s.id;

                        return (
                            <div key={s.id} className="relative group animate-in slide-in-from-bottom-6 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                {/* Timeline circular node */}
                                <div className={cn(
                                    "absolute -left-[27px] md:-left-[37px] top-6 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center border-4 border-[#0A192F] transition-all z-10",
                                    isNextExam 
                                        ? "bg-amber-400 shadow-[0_0_15px_#F59E0B]" 
                                        : statusText === "COMPLETED" 
                                            ? "bg-[#112240] border-[#8892B0]/40" 
                                            : "bg-[#64FFDA] shadow-[0_0_15px_#64FFDA]"
                                )}>
                                    {statusText === "COMPLETED" ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#8892B0]" />
                                    ) : (
                                        <span className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-[#0A192F]" />
                                    )}
                                </div>

                                {/* Timeline card */}
                                <div className={cn(
                                    "rounded-2xl border bg-[#112240]/40 transition-all hover:bg-[#112240]/60",
                                    isNextExam 
                                        ? "border-amber-500/40 shadow-[0_4px_25px_rgba(245,158,11,0.05)]" 
                                        : "border-white/5 hover:border-[#64FFDA]/20"
                                )}>
                                    <div className="p-5 md:p-6 flex flex-col md:flex-row gap-5 items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 group-hover:scale-105 transition-transform shrink-0">
                                                {getSubjectIcon(s.name)}
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <h3 className="text-lg font-bold text-white tracking-wide">{s.name}</h3>
                                                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", statusColor)}>
                                                        {statusText}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#8892B0] font-medium">
                                                    <span className="flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-white/50">
                                                        <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                                                        {new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                                        {formatTime12h(s.startTime)} - {formatTime12h(s.endTime)} ({calculateHours(s.startTime, s.endTime)})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-end gap-2.5 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3.5 md:pt-0 justify-between md:justify-start">
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-[9px] uppercase font-bold text-[#8892B0] tracking-wider">Room Allocation</div>
                                                    <div className="text-xs font-bold text-white">{s.room}</div>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => toggleSubject(s.id)}
                                                variant="ghost"
                                                className="h-8 text-[10px] uppercase font-bold tracking-widest text-[#64FFDA] hover:text-[#64FFDA] hover:bg-[#64FFDA]/5 gap-1.5 px-3 rounded-lg border border-[#64FFDA]/10"
                                            >
                                                {isExpanded ? (
                                                    <>Collapse Syllabus <ChevronUp className="w-3.5 h-3.5" /></>
                                                ) : (
                                                    <>View Syllabus <ChevronDown className="w-3.5 h-3.5" /></>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expandable Syllabus Drawer */}
                                    {isExpanded && (
                                        <div className="px-5 pb-6 pt-1 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                                            {isUpdated ? (
                                                <div className="space-y-4 pt-3">
                                                    <div className="flex items-center justify-between text-[10px] text-[#8892B0] font-black uppercase tracking-widest bg-black/25 px-4 py-2.5 rounded-xl border border-white/5">
                                                        <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-[#64FFDA]" /> Topics & Chapters Covered</span>
                                                        <span>Max Marks: {s.maxMarks || "100"} (Pass: {s.passMarks || "35"})</span>
                                                    </div>
                                                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#E6F1FF] bg-black/20 p-5 rounded-2xl border border-white/5 font-sans">
                                                        {content}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-3">
                                                    <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[#8892B0]/20 rounded-2xl bg-black/10 text-center">
                                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400/90 mb-3 border border-amber-500/20">
                                                            <AlertCircle className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="text-xs font-black uppercase text-white tracking-widest">Topics Not Yet Finalized</h4>
                                                        <p className="text-[11px] text-[#8892B0] max-w-xs mt-1.5 leading-relaxed">
                                                            The subject teacher is currently reviewing the curriculum. Syllabus details will appear here as soon as they are saved.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {chronologicalSubjects.length === 0 && (
                        <div className="text-center py-20 bg-[#112240]/20 border border-dashed border-white/10 rounded-2xl text-[#8892B0]">
                            No exams have been scheduled in the class timetable yet.
                        </div>
                    )}
                </div>
            </div>
        );
    }

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

            <Card className="bg-black/20 border-white/10 overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-sm uppercase tracking-widest text-[#8892B0]">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {(role === "ADMIN" || role === "TEACHER") && (
                            <div className="space-y-2 flex-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Syllabus Mode</label>
                                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 h-12 items-center">
                                    <button onClick={() => setSyllabusMode("COMBINED")} className={cn("flex-1 py-2 text-xs font-bold rounded-md transition-all h-full", syllabusMode === "COMBINED" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white")}>Combined</button>
                                    <button onClick={() => setSyllabusMode("INDIVIDUAL")} className={cn("flex-1 py-2 text-xs font-bold rounded-md transition-all h-full", syllabusMode === "INDIVIDUAL" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white")}>Individual</button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2 flex-1">
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

                        {syllabusMode === "INDIVIDUAL" && selectedClassId && (role === "ADMIN" || role === "TEACHER") && (
                            <div className="space-y-2 flex-1 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Section</label>
                                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                                        <SelectValue placeholder="Choose Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(classSections || {})
                                            .filter((cs: any) => cs.classId === selectedClassId)
                                            .map((cs: any) => {
                                                const sec = sections[cs.sectionId];
                                                return sec ? <SelectItem key={cs.sectionId} value={cs.sectionId}>{sec.name}</SelectItem> : null;
                                            })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2 flex-1">
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

            {selectedClassId && selectedSubjectId && (
                <Card className="bg-black/10 border-white/10 animate-in slide-in-from-bottom-2 mt-6">
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
                                    {currentSyllabus.updatedAt?.seconds ? new Date(currentSyllabus.updatedAt.seconds * 1000).toLocaleString() : ""}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
