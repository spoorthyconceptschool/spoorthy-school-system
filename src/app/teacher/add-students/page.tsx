"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, ArrowLeft, CheckCircle2, Clock, XCircle, User } from "lucide-react";
import Link from "next/link";
import { getDocs, limit } from "firebase/firestore";

export default function TeacherAddStudentsPage() {
    const { user } = useAuth();
    const { villages: villagesData, classes: classesData, sections: sectionsData, classSections, selectedYear } = useMasterData();

    const [teacherProfile, setTeacherProfile] = useState<any>(null);
    const [myClassSection, setMyClassSection] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        studentName: "",
        parentName: "",
        parentPhone: "",
        villageId: "",
        dateOfBirth: "",
        gender: "select",
        transportRequired: false
    });

    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    // Fetch teacher profile & determine class teacher assignment
    useEffect(() => {
        if (!user?.uid) return;

        const fetchTeacher = async () => {
            const tSnap = await getDocs(query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1)));
            if (!tSnap.empty) {
                const tData = tSnap.docs[0].data();
                const profile = { id: tSnap.docs[0].id, ...tData };
                setTeacherProfile(profile);

                // Find class teacher assignment
                const tId = tData.schoolId || tSnap.docs[0].id;
                const assigned = Object.values(classSections).find((cs: any) => cs.active && cs.classTeacherId === tId);
                if (assigned) {
                    setMyClassSection(assigned);
                }
            }
        };
        fetchTeacher();
    }, [user, classSections]);

    // Listen for pending students submitted by this teacher
    useEffect(() => {
        if (!teacherProfile) return;
        const tId = teacherProfile.schoolId || teacherProfile.id;

        const q = query(
            collection(db, "pending_students"),
            where("submittedBy", "==", tId)
        );

        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPendingStudents(docs);
        }, (err) => {
            console.warn("Pending students listener error:", err.message);
        });

        return () => unsub();
    }, [teacherProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myClassSection || !teacherProfile) return;
        if (!formData.studentName || formData.studentName.length < 2) return toast({ title: "Name Required", type: "error" });
        if (!/^\d{10}$/.test(formData.parentPhone)) return toast({ title: "Invalid Mobile (10 digits)", type: "error" });
        if (!formData.villageId) return toast({ title: "Village Required", type: "error" });
        if (formData.gender === "select") return toast({ title: "Gender Required", type: "error" });

        setLoading(true);
        try {
            const className = classesData[myClassSection.classId]?.name || myClassSection.classId;
            const sectionName = sectionsData[myClassSection.sectionId]?.name || myClassSection.sectionId;
            const villageName = villages.find(v => v.id === formData.villageId)?.name || "";

            await addDoc(collection(db, "pending_students"), {
                studentName: formData.studentName.trim(),
                parentName: formData.parentName.trim(),
                parentMobile: formData.parentPhone,
                villageId: formData.villageId,
                villageName,
                classId: myClassSection.classId,
                className,
                sectionId: myClassSection.sectionId,
                sectionName,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                transportRequired: formData.transportRequired,
                academicYear: selectedYear || "2026-2027",
                submittedBy: teacherProfile.schoolId || teacherProfile.id,
                submittedByName: teacherProfile.name || "Teacher",
                status: "PENDING",
                createdAt: Timestamp.now()
            });

            toast({ title: "Student Submitted!", description: "Waiting for admin approval.", type: "success" });
            setFormData({ studentName: "", parentName: "", parentPhone: "", villageId: "", dateOfBirth: "", gender: "select", transportRequired: false });
            setShowForm(false);
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (!myClassSection) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <Link href="/teacher" className="text-xs text-muted-foreground flex items-center gap-1 mb-6 hover:text-white transition-colors">
                    <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                </Link>
                <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Not a Class Teacher</h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        You need to be assigned as a class teacher to add students. Contact administration.
                    </p>
                </div>
            </div>
        );
    }

    const className = classesData[myClassSection.classId]?.name || myClassSection.classId;
    const sectionName = sectionsData[myClassSection.sectionId]?.name || myClassSection.sectionId;

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-20 animate-in fade-in">
            <Link href="/teacher" className="text-xs text-muted-foreground flex items-center gap-1 hover:text-white transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back to Dashboard
            </Link>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-4xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">
                        Add Students
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest">
                            {className} - {sectionName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Students require admin approval</span>
                    </div>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)} className="gap-2 bg-accent text-accent-foreground font-bold h-10">
                        <Plus size={16} /> New Student
                    </Button>
                )}
            </div>

            {/* Add Student Form */}
            {showForm && (
                <Card className="bg-black/40 border-amber-500/20 backdrop-blur-md">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Student Name *</Label>
                                    <Input required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} className="bg-white/5 border-white/10" placeholder="Full name" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Parent Name *</Label>
                                    <Input required value={formData.parentName} onChange={e => setFormData({ ...formData, parentName: e.target.value })} className="bg-white/5 border-white/10" placeholder="Father/Mother name" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Parent Mobile *</Label>
                                    <Input required maxLength={10} value={formData.parentPhone} onChange={e => setFormData({ ...formData, parentPhone: e.target.value.replace(/\D/g, '') })} className="bg-white/5 border-white/10" placeholder="10 digits" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Village *</Label>
                                    <Select onValueChange={val => setFormData({ ...formData, villageId: val })}>
                                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Village" /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date of Birth</Label>
                                    <Input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender *</Label>
                                    <Select value={formData.gender} onValueChange={val => setFormData({ ...formData, gender: val })}>
                                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="transport" className="w-4 h-4 accent-emerald-500" checked={formData.transportRequired} onChange={e => setFormData({ ...formData, transportRequired: e.target.checked })} />
                                <Label htmlFor="transport" className="cursor-pointer">Transport Required?</Label>
                            </div>

                            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-200/70">
                                Class: <strong>{className} - {sectionName}</strong> (auto-assigned based on your class teacher role)
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={loading} className="flex-1 bg-amber-500 text-black hover:bg-amber-600 font-bold h-11">
                                    {loading ? <Loader2 className="animate-spin" /> : "Submit for Approval"}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="h-11">Cancel</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Submitted Students List */}
            <div className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    My Submissions ({pendingStudents.length})
                </h2>

                {pendingStudents.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                        <User className="w-8 h-8 mx-auto text-white/20 mb-3" />
                        <p className="text-sm text-muted-foreground">No students submitted yet.</p>
                        <p className="text-xs text-white/30 mt-1">Click "New Student" to add one.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pendingStudents.map(s => (
                            <div key={s.id} className={`flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm transition-all ${s.status === "APPROVED" ? "bg-emerald-500/5 border-emerald-500/20" :
                                s.status === "REJECTED" ? "bg-red-500/5 border-red-500/20 opacity-60" :
                                    "bg-white/5 border-white/10"
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.status === "APPROVED" ? "bg-emerald-500/20" :
                                        s.status === "REJECTED" ? "bg-red-500/20" :
                                            "bg-amber-500/20"
                                        }`}>
                                        {s.status === "APPROVED" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                                            s.status === "REJECTED" ? <XCircle className="w-4 h-4 text-red-500" /> :
                                                <Clock className="w-4 h-4 text-amber-500" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">{s.studentName}</p>
                                        <p className="text-[10px] text-muted-foreground">{s.parentName} • {s.parentMobile}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className={`text-[9px] uppercase tracking-widest ${s.status === "APPROVED" ? "border-emerald-500/30 text-emerald-500" :
                                    s.status === "REJECTED" ? "border-red-500/30 text-red-500" :
                                        "border-amber-500/30 text-amber-500"
                                    }`}>
                                    {s.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
