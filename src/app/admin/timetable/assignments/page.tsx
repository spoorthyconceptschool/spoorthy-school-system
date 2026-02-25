"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";

export default function TeachingAssignmentsPage() {
    const { user } = useAuth();
    const { classes: classesData, subjects: masterSubjects } = useMasterData();
    const [loading, setLoading] = useState(true);
    const [yearId, setYearId] = useState("2025-2026");

    // Convert master data objects to arrays
    const classes = Object.values(classesData).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    // Master Data
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    // Selection
    const [selectedClassId, setSelectedClassId] = useState<string>("");

    // Form Data: { [subjectId]: teacherId }
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        // Keep subjects synced with Master Data RTDB
        const activeSubjects = Object.values(masterSubjects || {})
            .filter((s: any) => s.isActive !== false) // Default to true if not present
            .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
        setSubjects(activeSubjects);
    }, [masterSubjects]);

    useEffect(() => {
        if (selectedClassId) {
            fetchAssignments(selectedClassId);
        } else {
            setAssignments({});
        }
    }, [selectedClassId]);

    const fetchMasterData = async () => {
        try {
            const tSnap = await getDocs(query(collection(db, "teachers"), where("status", "==", "ACTIVE")));
            setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async (classId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/timetable/assign?yearId=${yearId}&classId=${classId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setAssignments(data.data.assignments || {});
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = (subjectId: string, teacherId: string) => {
        setAssignments(prev => ({ ...prev, [subjectId]: teacherId }));
    };

    const saveAssignments = async () => {
        if (!selectedClassId || !user) return;
        setSaving(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/timetable/assign", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    yearId,
                    classId: selectedClassId,
                    assignments
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Assignments Saved!");
            } else {
                alert("Error: " + data.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading && classes.length === 0) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold">Teaching Assignments</h1>
                    <p className="text-muted-foreground">Assign teachers to subjects for each class.</p>
                </div>
                <div className="w-[200px]">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {!selectedClassId ? (
                <div className="text-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                    Please select a class to begin assignments.
                </div>
            ) : (
                <Card className="bg-black/20 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Subject Mapping for {classes.find(c => c.id === selectedClassId)?.name}</CardTitle>
                        <Button
                            onClick={saveAssignments}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Assignments
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subjects.map(subject => (
                                <div key={subject.id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                                            {subject.code || subject.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{subject.name}</p>
                                            <p className="text-xs text-muted-foreground">{subject.type || "Theory"}</p>
                                        </div>
                                    </div>
                                    <div className="w-[250px]">
                                        <Select
                                            value={assignments[subject.id] || "unassigned"}
                                            onValueChange={(val) => handleAssign(subject.id, val === "unassigned" ? "" : val)}
                                        >
                                            <SelectTrigger className="bg-black/40 border-white/10 h-9">
                                                <SelectValue placeholder="Assign Teacher" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                                {teachers.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
