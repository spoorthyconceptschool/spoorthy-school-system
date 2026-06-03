"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserCheck, BookOpen, GraduationCap, Phone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TeacherAssignmentsManager() {
    const { classes, sections, classSections, subjectTeachers, subjects: masterSubjects } = useMasterData();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState("ALL");
    const [selectedSubject, setSelectedSubject] = useState("ALL");

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const q = query(collection(db, "teachers"), orderBy("name"));
                const snap = await getDocs(q);
                setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Failed to load teachers for allocations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
    }, []);

    // Processed Assignments mapping teacher ID -> details
    const teacherAllocations = useMemo(() => {
        return teachers.map(teacher => {
            const tId = teacher.schoolId || teacher.id;

            // 1. Get Class Teacher charges from live RTDB classSections
            const ctCharges = Object.values(classSections || {})
                .filter((cs: any) => cs.classTeacherId === tId && classes[cs.classId] && sections[cs.sectionId])
                .map((cs: any) => ({
                    key: cs.id,
                    classId: cs.classId,
                    sectionId: cs.sectionId,
                    className: classes[cs.classId]?.name || cs.classId,
                    sectionName: sections[cs.sectionId]?.name || cs.sectionId
                }));

            // 2. Get Subject teaching allocations from live RTDB subjectTeachers
            const subAssignments: any[] = [];
            Object.keys(subjectTeachers || {}).forEach(key => {
                const subjectsObj = subjectTeachers[key];
                if (subjectsObj && typeof subjectsObj === 'object') {
                    Object.keys(subjectsObj).forEach(subId => {
                        if (subjectsObj[subId] === tId) {
                            const cId = key.split('_').slice(0, 2).join('_');
                            const sId = key.split('_').slice(2).join('_');
                            if (classes[cId] && sections[sId]) {
                                subAssignments.push({
                                    key,
                                    classId: cId,
                                    sectionId: sId,
                                    className: classes[cId]?.name || cId,
                                    sectionName: sections[sId]?.name || sId,
                                    subId,
                                    subName: masterSubjects[subId]?.name || subId
                                });
                            }
                        }
                    });
                }
            });

            return {
                ...teacher,
                tId,
                ctCharges,
                subAssignments
            };
        });
    }, [teachers, classSections, subjectTeachers, classes, sections, masterSubjects]);

    // Apply Search and Filters
    const filteredAllocations = useMemo(() => {
        return teacherAllocations.filter(t => {
            const matchesSearch = 
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tId.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesClass = 
                selectedClass === "ALL" ||
                t.ctCharges.some(c => c.key === selectedClass) ||
                t.subAssignments.some(a => a.key === selectedClass);

            const matchesSubject = 
                selectedSubject === "ALL" ||
                t.subAssignments.some(a => a.subName.toLowerCase() === selectedSubject.toLowerCase() || a.subId.toLowerCase() === selectedSubject.toLowerCase());

            return matchesSearch && matchesClass && matchesSubject;
        });
    }, [teacherAllocations, searchQuery, selectedClass, selectedSubject]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="animate-spin text-accent w-8 h-8" />
                <p className="text-muted-foreground text-xs uppercase tracking-widest animate-pulse font-black">Loading Allocations Registry...</p>
            </div>
        );
    }

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl relative">
            <CardHeader className="border-b border-white/5 bg-zinc-950/40 p-6 md:p-8 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg md:text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic flex items-center gap-2.5">
                            <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                            Teacher Academic Allocations
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Live directory of class teacher charges and subject teaching assignments.</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder-muted-foreground focus:border-emerald-500/50 focus:ring-0 transition-all rounded-xl h-10 text-sm"
                        />
                    </div>

                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm">
                            <SelectValue placeholder="Filter by Class" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/10 text-white">
                            <SelectItem value="ALL">All Classes & Sections</SelectItem>
                            {Object.values(classSections || {}).filter((cs: any) => cs.isActive !== false).map((cs: any) => {
                                const cName = classes[cs.classId]?.name || cs.classId;
                                const sName = sections[cs.sectionId]?.name || cs.sectionId;
                                return (
                                    <SelectItem key={cs.id} value={cs.id}>{cName} - {sName}</SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm">
                            <SelectValue placeholder="Filter by Subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/10 text-white">
                            <SelectItem value="ALL">All Subjects</SelectItem>
                            {Object.values(masterSubjects || {}).filter((s: any) => s.isActive !== false).map((s: any) => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
                {filteredAllocations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
                        <p className="italic">No teachers found matching your filters.</p>
                        <p className="text-xs text-muted-foreground/60">Try updating your search query or selecting a different class combination.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {filteredAllocations.map(teacher => (
                            <div 
                                key={teacher.id} 
                                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-5 md:p-6 transition-all duration-300 hover:border-emerald-500/20 hover:shadow-[0_0_30px_-15px_rgba(16,185,129,0.1)] flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    {/* Teacher Header Info */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <h3 className="font-display font-bold text-white text-lg md:text-xl group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                                {teacher.name}
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] uppercase font-black tracking-widest px-2 py-0.5">
                                                    {teacher.tId}
                                                </Badge>
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                                                <div className="flex items-center gap-1">
                                                    <GraduationCap className="w-3.5 h-3.5 text-yellow-500/80" />
                                                    <span>{teacher.qualifications || "N/A"}</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-1 font-mono">
                                                    <Phone className="w-3 h-3 text-blue-400" />
                                                    <span>{teacher.mobile || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allocation Areas */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                        {/* Class Teacher Charge */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Class Teacher of
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {teacher.ctCharges.length === 0 ? (
                                                    <Badge variant="outline" className="border-white/5 bg-white/5 text-muted-foreground/60 text-[9px] uppercase font-bold tracking-tight">
                                                        None
                                                    </Badge>
                                                ) : (
                                                    teacher.ctCharges.map((cs: any) => (
                                                        <Badge key={cs.key} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-black tracking-tighter px-2 py-1 rounded-md">
                                                            {cs.className} - {cs.sectionName}
                                                        </Badge>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Subject Assignments */}
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                Subject Assignments
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {teacher.subAssignments.length === 0 ? (
                                                    <Badge variant="outline" className="border-white/5 bg-white/5 text-muted-foreground/60 text-[9px] uppercase font-bold tracking-tight">
                                                        None
                                                    </Badge>
                                                ) : (
                                                    teacher.subAssignments.map((a: any, idx: number) => (
                                                        <Badge key={idx} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black tracking-tighter px-2 py-1 rounded-md flex flex-col items-start gap-0.5">
                                                            <span>{a.className} - {a.sectionName}</span>
                                                            <span className="text-[8px] text-purple-300 uppercase leading-none font-bold">{a.subName}</span>
                                                        </Badge>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
