"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Printer, Search, Filter, Sparkles, AlertCircle, Award, Percent, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AcademicResultsDashboard() {
    const { classes: classesData, subjects: subjectsData, classSections, selectedYear } = useMasterData();
    
    // Core state
    const [exams, setExams] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [results, setResults] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    
    // Filters State
    const [selectedExamId, setSelectedExamId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("ALL");
    const [selectedVillage, setSelectedVillage] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [receiptFilter, setReceiptFilter] = useState("");

    // Master lists converted to arrays
    const classesList = useMemo(() => {
        return Object.values(classesData || {})
            .map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 }))
            .sort((a, b) => a.order - b.order);
    }, [classesData]);

    const activeSections = useMemo(() => {
        if (!selectedClassId) return [];
        return Object.values(classSections || {})
            .filter((cs: any) => cs.classId === selectedClassId && (cs.active || cs.isActive || cs.active !== false));
    }, [selectedClassId, classSections]);

    const uniqueVillages = useMemo(() => {
        const villages = new Set<string>();
        students.forEach(s => {
            if (s.village) villages.add(s.village.trim());
            if (s.address?.village) villages.add(s.address.village.trim());
        });
        return Array.from(villages).sort();
    }, [students]);

    // Initial Fetch (Exams)
    useEffect(() => {
        const fetchExams = async () => {
            try {
                const q = query(
                    collection(db, "exams"), 
                    where("academicYear", "==", selectedYear || "2025-2026")
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setExams(list);
                if (list.length > 0) {
                    setSelectedExamId(list[0].id);
                }
            } catch (e) {
                console.error("Failed fetching exams:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, [selectedYear]);

    // Perform Search Query
    const handleSearch = async () => {
        if (!selectedExamId || !selectedClassId) {
            alert("Please select both an Exam and a Class to view results.");
            return;
        }
        setSearching(true);
        try {
            // 1. Fetch Students matching class
            const sQ = query(
                collection(db, "students"),
                where("classId", "==", selectedClassId),
                where("status", "==", "ACTIVE")
            );
            const sSnap = await getDocs(sQ);
            const studentList = sSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            
            // 2. Fetch Results matching exam and class
            const rQ = query(
                collection(db, "exam_results"),
                where("examId", "==", selectedExamId),
                where("classId", "==", selectedClassId)
            );
            const rSnap = await getDocs(rQ);
            const resultsMap: Record<string, any> = {};
            rSnap.docs.forEach(d => {
                resultsMap[d.data().studentId] = d.data();
            });

            setStudents(studentList);
            setResults(resultsMap);
        } catch (e: any) {
            console.error("Search results failed:", e);
            alert("Error loading results: " + e.message);
        } finally {
            setSearching(false);
        }
    };

    // Auto-search when Exam or Class changes
    useEffect(() => {
        if (selectedExamId && selectedClassId) {
            handleSearch();
        }
    }, [selectedExamId, selectedClassId]);

    // Apply Client-Side Filters (Section, Village, Text Search)
    const filteredStudents = useMemo(() => {
        return students.filter((s: any) => {
            // Section Filter
            if (selectedSectionId !== "ALL" && s.sectionId !== selectedSectionId) return false;
            
            // Village Filter
            const sVillage = (s.village || s.address?.village || "").trim();
            if (selectedVillage !== "ALL" && sVillage !== selectedVillage) return false;
            
            // Text Search Filter (Name, Roll No, Admission No)
            if (searchQuery.trim()) {
                const queryLower = searchQuery.toLowerCase();
                const matchesName = s.studentName?.toLowerCase().includes(queryLower);
                const matchesRoll = s.rollNo?.toLowerCase().includes(queryLower);
                const matchesAdm = s.admissionNo?.toLowerCase().includes(queryLower);
                if (!matchesName && !matchesRoll && !matchesAdm) return false;
            }

            // Receipt Filter (Search by fee receipt number if student fee record holds it)
            if (receiptFilter.trim()) {
                const recLower = receiptFilter.toLowerCase();
                const matchesReceipt = s.lastReceiptNo?.toLowerCase().includes(recLower);
                if (!matchesReceipt) return false;
            }

            return true;
        });
    }, [students, selectedSectionId, selectedVillage, searchQuery, receiptFilter]);

    // Active subjects for the current class timetable configuration
    const activeSubjectsList = useMemo(() => {
        const examObj = exams.find(e => e.id === selectedExamId);
        const timetable = examObj?.timetables?.[selectedClassId] || {};
        return Object.keys(timetable)
            .filter(subId => timetable[subId]?.enabled)
            .map(subId => ({
                id: subId,
                name: subjectsData[subId]?.name || subId
            }));
    }, [exams, selectedExamId, selectedClassId, subjectsData]);

    // Calculate Dashboard Statistics
    const statistics = useMemo(() => {
        if (filteredStudents.length === 0) {
            return { classAverage: 0, passRate: 0, topper: null };
        }

        let totalObtainedClass = 0;
        let totalMaxClass = 0;
        let totalStudentsWithResults = 0;
        let passedStudentsCount = 0;
        let highestPercentage = -1;
        let topperStudent: any = null;

        filteredStudents.forEach((student: any) => {
            const resultObj = results[student.id];
            if (!resultObj || !resultObj.subjects) return;

            let totalOb = 0;
            let totalMax = 0;
            let isPassed = true;

            activeSubjectsList.forEach(subject => {
                const subMarks = resultObj.subjects[subject.id];
                if (subMarks) {
                    const ob = parseFloat(subMarks.obtained);
                    const mx = parseFloat(subMarks.maxMarks || 100);
                    if (!isNaN(ob)) {
                        totalOb += ob;
                        totalMax += mx;
                        if (ob < (mx * 0.35)) {
                            isPassed = false;
                        }
                    }
                }
            });

            if (totalMax > 0) {
                totalObtainedClass += totalOb;
                totalMaxClass += totalMax;
                totalStudentsWithResults++;

                const percentage = (totalOb / totalMax) * 100;
                if (isPassed) {
                    passedStudentsCount++;
                }

                if (percentage > highestPercentage) {
                    highestPercentage = percentage;
                    topperStudent = {
                        name: student.studentName,
                        rollNo: student.rollNo,
                        percentage: percentage
                    };
                }
            }
        });

        const classAverage = totalMaxClass > 0 ? (totalObtainedClass / totalMaxClass) * 100 : 0;
        const passRate = totalStudentsWithResults > 0 ? (passedStudentsCount / totalStudentsWithResults) * 100 : 0;

        return {
            classAverage,
            passRate,
            topper: topperStudent
        };
    }, [filteredStudents, results, activeSubjectsList]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-200 print:p-0 print:bg-white print:text-black">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 print:hidden">
                <div className="space-y-1">
                    <Link href="/admin/exams" className="flex items-center text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-white transition-colors mb-2">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Examinations
                    </Link>
                    <div className="flex items-center gap-2">
                        <Award className="w-8 h-8 text-blue-400" />
                        <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
                            Academic Results Dashboard
                        </h1>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                        Analyze full student spreadsheets, topper lists, and print unified class results ledger spreadsheet.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handlePrint}
                        disabled={filteredStudents.length === 0}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-[9px] h-10 px-6 rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Print Spreadsheet
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center space-y-2 border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-black uppercase tracking-tight">Spoorthy Concept School</h1>
                <h2 className="text-xl font-bold uppercase tracking-widest">Academic Results Spreadsheet Summary</h2>
                <div className="flex justify-center gap-6 text-sm font-mono mt-1">
                    <span><b>Exam:</b> {exams.find(e => e.id === selectedExamId)?.name}</span>
                    <span><b>Class:</b> {classesData[selectedClassId]?.name}</span>
                    <span><b>Academic Year:</b> {selectedYear}</span>
                </div>
            </div>

            {/* Filters Dashboard Card */}
            <Card className="bg-[#0F172A] border-white/5 shadow-2xl print:hidden">
                <CardHeader className="border-b border-white/5 py-4">
                    <div className="flex items-center gap-2 text-blue-400">
                        <Filter className="w-4 h-4" />
                        <CardTitle className="text-xs uppercase font-black tracking-widest">Interactive Filters</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Select Exam */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Exam</label>
                            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="Choose Exam" /></SelectTrigger>
                                <SelectContent>
                                    {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Select Class */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                                <SelectContent>
                                    {classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Select Section */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Section</label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="Choose Section" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Sections</SelectItem>
                                    {activeSections.map((cs: any) => (
                                        <SelectItem key={cs.id} value={cs.id}>{cs.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Village Filter */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Village</label>
                            <Select value={selectedVillage} onValueChange={setSelectedVillage} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="Choose Village" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Villages</SelectItem>
                                    {uniqueVillages.map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                        {/* Student Search */}
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Search Student</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by Name, Roll No, or Admission No..."
                                    className="bg-white/5 border-white/10 h-10 pl-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Receipt Search */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receipt Number</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={receiptFilter}
                                    onChange={e => setReceiptFilter(e.target.value)}
                                    placeholder="Search by fee receipt number..."
                                    className="bg-white/5 border-white/10 h-10 pl-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Summary Blocks */}
            {selectedClassId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Class Average */}
                    <Card className="bg-[#0F172A] border-white/5 p-6 shadow-xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
                        <div className="absolute right-0 bottom-0 text-blue-500/5 -mr-4 -mb-4 transition-transform group-hover:scale-110 duration-500">
                            <Percent className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Class Average Percentage</p>
                            <h3 className="text-3xl font-black text-white font-mono">{statistics.classAverage.toFixed(1)}%</h3>
                            <p className="text-xs text-blue-400 font-medium">Overall aggregated percentage of class</p>
                        </div>
                    </Card>

                    {/* Class Pass Rate */}
                    <Card className="bg-[#0F172A] border-white/5 p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
                        <div className="absolute right-0 bottom-0 text-emerald-500/5 -mr-4 -mb-4 transition-transform group-hover:scale-110 duration-500">
                            <BookOpen className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Class Pass Rate</p>
                            <h3 className={cn("text-3xl font-black font-mono", statistics.passRate >= 70 ? "text-emerald-400" : "text-amber-400")}>
                                {statistics.passRate.toFixed(1)}%
                            </h3>
                            <p className="text-xs text-emerald-400/80 font-medium">Percentage of students scoring &ge; 35% in all subjects</p>
                        </div>
                    </Card>

                    {/* Class Topper */}
                    <Card className="bg-[#0F172A] border-white/5 p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
                        <div className="absolute right-0 bottom-0 text-amber-500/5 -mr-4 -mb-4 transition-transform group-hover:scale-110 duration-500">
                            <Award className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Class Topper</p>
                            <h3 className="text-xl font-black text-amber-400 truncate">
                                {statistics.topper ? statistics.topper.name : "N/A"}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono">
                                {statistics.topper 
                                    ? `Roll No: ${statistics.topper.rollNo || "-"} (${statistics.topper.percentage.toFixed(1)}%)` 
                                    : "No calculations available"
                                }
                            </p>
                        </div>
                    </Card>
                </div>
            )}

            {/* Results Ledger spreadsheet Card */}
            {searching ? (
                <div className="flex flex-col items-center justify-center p-20 bg-black/20 border border-white/5 rounded-3xl print:hidden">
                    <Loader2 className="animate-spin text-blue-500 w-10 h-10 mb-4" />
                    <p className="text-sm text-muted-foreground font-bold">Querying school database ledger...</p>
                </div>
            ) : !selectedClassId ? (
                <div className="flex flex-col items-center justify-center p-16 bg-black/20 border border-dashed border-white/10 rounded-3xl text-center print:hidden">
                    <AlertCircle className="w-12 h-12 text-muted-foreground/60 mb-3" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Class &amp; Exam</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                        Select an examination and school class from the filter controls above to view the unified academic results ledger.
                    </p>
                </div>
            ) : (
                <Card className="bg-[#0F172A] border-white/5 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
                    <CardHeader className="border-b border-white/5 py-4 flex flex-row items-center justify-between print:hidden">
                        <div className="flex items-center gap-2 text-[#64FFDA]">
                            <Sparkles className="w-4 h-4" />
                            <CardTitle className="text-xs uppercase font-black tracking-widest">Unified Results Ledger</CardTitle>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-white font-mono">
                            {filteredStudents.length} Students listed
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-left border-collapse text-xs print:text-[10px] print:w-full">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10 text-muted-foreground uppercase tracking-widest font-black text-[9px] print:bg-gray-100 print:text-black print:border-black print:border-b-2">
                                        <th className="p-4 w-12 print:p-2">Roll</th>
                                        <th className="p-4 w-28 print:p-2">Adm No</th>
                                        <th className="p-4 min-w-[150px] print:p-2">Student Name</th>
                                        {activeSubjectsList.map(subject => (
                                            <th key={subject.id} className="p-4 text-center min-w-[90px] print:p-2">
                                                {subject.name}
                                            </th>
                                        ))}
                                        <th className="p-4 text-center w-24 print:p-2">Total</th>
                                        <th className="p-4 text-center w-20 print:p-2">%</th>
                                        <th className="p-4 text-center w-16 print:p-2">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student: any) => {
                                        const resultObj = results[student.id];
                                        let totalObtained = 0;
                                        let totalMax = 0;
                                        let hasResults = false;
                                        let isPassed = true;

                                        if (resultObj && resultObj.subjects) {
                                            hasResults = true;
                                            activeSubjectsList.forEach(subject => {
                                                const subMarks = resultObj.subjects[subject.id];
                                                if (subMarks) {
                                                    const ob = parseFloat(subMarks.obtained);
                                                    const mx = parseFloat(subMarks.maxMarks || 100);
                                                    if (!isNaN(ob)) {
                                                        totalObtained += ob;
                                                        totalMax += mx;
                                                        if (ob < (mx * 0.35)) {
                                                            isPassed = false;
                                                        }
                                                    }
                                                }
                                            });
                                        }

                                        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
                                        const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 35 ? 'D' : 'E';

                                        return (
                                            <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-all print:border-black print:border-b print:hover:bg-transparent">
                                                <td className="p-4 font-mono font-bold text-blue-400 print:text-black print:p-2">{student.rollNo || "-"}</td>
                                                <td className="p-4 font-mono print:p-2">{student.admissionNo || "-"}</td>
                                                <td className="p-4 font-bold text-white print:text-black print:p-2">
                                                    <div className="font-bold">{student.studentName}</div>
                                                    <div className="text-[9px] text-muted-foreground font-normal print:hidden">
                                                        {student.village || student.address?.village || "No Village Specified"}
                                                    </div>
                                                </td>
                                                {activeSubjectsList.map(subject => {
                                                    const subMarks = resultObj?.subjects?.[subject.id];
                                                    const ob = subMarks ? parseFloat(subMarks.obtained) : NaN;
                                                    const mx = subMarks ? parseFloat(subMarks.maxMarks || 100) : 100;
                                                    const isSubFail = !isNaN(ob) && ob < (mx * 0.35);

                                                    return (
                                                        <td key={subject.id} className="p-4 text-center print:p-2">
                                                            {subMarks ? (
                                                                <span className={cn(
                                                                    "font-mono font-bold",
                                                                    isSubFail ? "text-red-400 print:text-black print:underline" : "text-white print:text-black"
                                                                )}>
                                                                    {subMarks.obtained}/{mx}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center font-mono font-bold print:p-2">
                                                    {hasResults ? `${totalObtained}/${totalMax}` : "-"}
                                                </td>
                                                <td className="p-4 text-center font-mono font-bold text-blue-300 print:text-black print:p-2">
                                                    {hasResults ? `${percentage.toFixed(1)}%` : "-"}
                                                </td>
                                                <td className="p-4 text-center print:p-2">
                                                    {hasResults ? (
                                                        <Badge 
                                                            variant={grade === "E" ? "destructive" : "default"}
                                                            className={cn(
                                                                "font-bold uppercase",
                                                                grade === "A+" || grade === "A" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white",
                                                                "print:bg-transparent print:text-black print:border print:border-black print:p-0.5"
                                                            )}
                                                        >
                                                            {grade}
                                                        </Badge>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={6 + activeSubjectsList.length} className="p-10 text-center text-muted-foreground italic">
                                                No student records matching current filters were discovered.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
