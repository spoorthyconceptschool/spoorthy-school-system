"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, ArrowRight, Shield, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-store";

interface Group {
    id: string;
    name: string;
    color: string;
}

interface Student {
    id: string; // Document ID (School ID)
    studentName: string;
    className: string;
    sectionName: string;
    rollNo?: string;
    groupId?: string; // The assigned group ID
    groupName?: string;
}

export function TeacherGroupManager() {
    const { classes: classesData, sections: sectionsData, classSections } = useMasterData();

    // Convert master data to arrays
    const classes = Object.values(classesData).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    // State
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
    const [groups, setGroups] = useState<Group[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [availableSections, setAvailableSections] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Selection state
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [targetGroupId, setTargetGroupId] = useState<string>("");
    const [assigning, setAssigning] = useState(false);

    // Initial Data Fetch (Groups)
    useEffect(() => {
        const fetchGroups = async () => {
            const snap = await getDocs(collection(db, "groups"));
            const list: Group[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as Group));
            setGroups(list);
        };
        fetchGroups();
    }, []);

    // Update sections when class changes
    useEffect(() => {
        if (selectedClassId) {
            const secs = Object.values(classSections)
                .filter((cs: any) => cs.classId === selectedClassId)
                .map((cs: any) => sectionsData[cs.sectionId])
                .filter(Boolean);
            setAvailableSections(secs);
            setSelectedSectionId("all");
        } else {
            setAvailableSections([]);
        }
    }, [selectedClassId, classSections, sectionsData]);

    // Fetch Students when Class/Section changes
    useEffect(() => {
        if (!selectedClassId) {
            setStudents([]);
            return;
        }

        const fetchStudents = async () => {
            setLoading(true);
            try {
                let q = query(collection(db, "students"), where("classId", "==", selectedClassId));
                if (selectedSectionId !== "all") {
                    q = query(q, where("sectionId", "==", selectedSectionId));
                }

                const snap = await getDocs(q);
                const list: Student[] = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() } as Student));

                // Sort by Name
                list.sort((a, b) => String(a.studentName || "").localeCompare(String(b.studentName || "")));
                setStudents(list);
                setSelectedStudentIds([]); // clear selection on refetch
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [selectedClassId, selectedSectionId]);

    // Filter Logic
    useEffect(() => {
        let res = students;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            res = res.filter(s => s.studentName.toLowerCase().includes(q));
        }
        setFilteredStudents(res);
    }, [students, searchQuery]);

    const handleAssign = async () => {
        if (!targetGroupId || selectedStudentIds.length === 0) return;
        setAssigning(true);

        const group = groups.find(g => g.id === targetGroupId);
        if (!group) return;

        try {
            const batch = writeBatch(db);
            selectedStudentIds.forEach(studentId => {
                const ref = doc(db, "students", studentId);
                batch.update(ref, {
                    groupId: group.id,
                    groupName: group.name, // Denormalize for easier display
                    groupColor: group.color
                });
            });

            await batch.commit();

            // Update local state
            setStudents(prev => prev.map(s => {
                if (selectedStudentIds.includes(s.id)) {
                    return { ...s, groupId: group.id, groupName: group.name };
                }
                return s;
            }));

            toast({
                title: "Assigned Successfully",
                description: `Moved ${selectedStudentIds.length} students to ${group.name}`,
                type: "success"
            });

            setSelectedStudentIds([]);
            setTargetGroupId("");

        } catch (e) {
            console.error(e);
            toast({
                title: "Assignment Failed",
                type: "error"
            });
        } finally {
            setAssigning(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Users className="text-emerald-500" />
                        Student Group Assignment
                    </CardTitle>
                    <CardDescription>Select a class, choose students, and assign them to a House/Group.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800/50">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                    <SelectValue placeholder="All Sections" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {availableSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.id}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-[2] space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Search Student</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search by name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-slate-900 border-slate-800 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Assignment Action Bar */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-lg">
                        <div className="text-sm text-emerald-200">
                            {selectedStudentIds.length} students selected
                        </div>
                        <div className="flex-1 max-w-sm flex gap-2">
                            <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                                <SelectTrigger className="bg-slate-900 border-emerald-900/50 text-white">
                                    <SelectValue placeholder="Select Target Group..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map(g => (
                                        <SelectItem key={g.id} value={g.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                                                {g.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleAssign}
                                disabled={assigning || !targetGroupId || selectedStudentIds.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                            >
                                {assigning ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : <div className="flex items-center">Assign <ArrowRight className="w-4 h-4 ml-2" /></div>}
                            </Button>
                        </div>
                    </div>

                    {/* Students List */}
                    <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <div className="bg-slate-950 p-3 border-b border-slate-800 flex items-center gap-4 text-sm font-bold text-slate-400">
                            <div className="w-8 flex justify-center">
                                <Checkbox
                                    checked={selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudents.length}
                                    onCheckedChange={(checked) => toggleAll(!!checked)}
                                    className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                            </div>
                            <div className="flex-1">Student Details</div>
                            <div className="w-40">Current Group</div>
                        </div>

                        {loading ? (
                            <div className="p-10 flex justify-center text-emerald-500"><Loader2 className="animate-spin" /></div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                {selectedClassId ? "No students found." : "Please select a class to view students."}
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-800/50">
                                {filteredStudents.map(student => {
                                    const assignedGroup = groups.find(g => g.id === student.groupId);
                                    return (
                                        <div
                                            key={student.id}
                                            className={`flex items-center gap-4 p-3 hover:bg-slate-900/50 transition-colors cursor-pointer ${selectedStudentIds.includes(student.id) ? 'bg-emerald-950/10' : ''}`}
                                            onClick={() => toggleSelection(student.id)}
                                        >
                                            <div className="w-8 flex justify-center" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onCheckedChange={() => toggleSelection(student.id)}
                                                    className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-slate-200">{student.studentName}</div>
                                                <div className="text-xs text-slate-500">{student.className} {student.sectionName ? `- ${student.sectionName}` : ''} • ID: {student.id}</div>
                                            </div>
                                            <div className="w-40">
                                                {assignedGroup ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-slate-700 bg-slate-900 text-white font-normal group-hover:border-slate-600"
                                                        style={{ borderColor: assignedGroup.color }}
                                                    >
                                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: assignedGroup.color }} />
                                                        {assignedGroup.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-600 text-xs italic">Unassigned</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
