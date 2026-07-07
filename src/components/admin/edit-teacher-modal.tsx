"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Loader2, 
    Check, 
    User, 
    Phone, 
    MapPin, 
    GraduationCap, 
    BookOpen, 
    Plus, 
    X, 
    Sparkles, 
    Briefcase,
    Calendar,
    Award
} from "lucide-react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { useAuth } from "@/context/AuthContext";
import { notifyManagerAction } from "@/lib/notifications";

interface EditTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: any;
    onSuccess: () => void;
}

export function EditTeacherModal({ isOpen, onClose, teacher, onSuccess }: EditTeacherModalProps) {
    const { subjects: masterSubjects, classes: masterClasses, sections: masterSections, classSections, subjectTeachers } = useMasterData();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("profile");

    // Form
    const [form, setForm] = useState({
        name: "",
        mobile: "",
        age: "",
        address: "",
        qualifications: "",
        primarySubject: "",
        secondarySubject: "",
        classTeacherClass: "",
        classTeacherSection: ""
    });
    const [classTeacherOfList, setClassTeacherOfList] = useState<any[]>([]);
    const [tempCtClass, setTempCtClass] = useState("");
    const [tempCtSection, setTempCtSection] = useState("");

    const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);
    const [tempSubClassSection, setTempSubClassSection] = useState("");
    const [tempSubSubject, setTempSubSubject] = useState("");

    const addCtRole = () => {
        if (!tempCtClass || !tempCtSection) return;
        const alreadyExists = classTeacherOfList.some(r => r.classId === tempCtClass && r.sectionId === tempCtSection);
        if (!alreadyExists) {
            setClassTeacherOfList([...classTeacherOfList, { classId: tempCtClass, sectionId: tempCtSection }]);
            toast({
                title: "Class Added",
                description: "Assigned as class teacher",
                type: "success"
            });
        } else {
            toast({
                title: "Already Added",
                description: "This class charge is already assigned",
                type: "error"
            });
        }
        setTempCtClass("");
        setTempCtSection("");
    };

    const addSubAllocation = () => {
        if (!tempSubClassSection || !tempSubSubject) return;
        const cs = classSections[tempSubClassSection];
        if (!cs) return;
        const alreadyExists = subjectAssignments.some(a => a.classId === cs.classId && a.sectionId === cs.sectionId && a.subId === tempSubSubject);
        if (!alreadyExists) {
            setSubjectAssignments([...subjectAssignments, { classId: cs.classId, sectionId: cs.sectionId, subId: tempSubSubject }]);
            toast({
                title: "Subject Allocated",
                description: `Assigned to teach ${tempSubSubject}`,
                type: "success"
            });
        } else {
            toast({
                title: "Already Allocated",
                description: "This subject teaching mapping already exists",
                type: "error"
            });
        }
        setTempSubClassSection("");
        setTempSubSubject("");
    };

    const [submitting, setSubmitting] = useState(false);

    const { user } = useAuth();
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        }, (err) => console.warn("[EditTeacherModal] User session sync warning:", err.message));
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (isOpen && teacher && masterClasses && masterSections && classSections) {
            const teacherId = teacher.schoolId || teacher.id;
            setActiveTab("profile");
            
            // Populating multi class teacher roles from live RTDB
            const assignedCT = Object.values(classSections || {})
                .filter((cs: any) => cs.classTeacherId === teacherId && masterClasses[cs.classId] && masterSections[cs.sectionId])
                .map((cs: any) => ({ classId: cs.classId, sectionId: cs.sectionId }));
            setClassTeacherOfList(assignedCT);

            // Populating multi subject allocations from live RTDB
            const assignedSubs: any[] = [];
            Object.keys(subjectTeachers || {}).forEach(key => {
                const subjectsObj = subjectTeachers[key];
                if (subjectsObj && typeof subjectsObj === 'object') {
                    Object.keys(subjectsObj).forEach(subId => {
                        if (subjectsObj[subId] === teacherId) {
                            const cId = key.split('_').slice(0, 2).join('_');
                            const sId = key.split('_').slice(2).join('_');
                            if (masterClasses[cId] && masterSections[sId]) {
                                assignedSubs.push({ classId: cId, sectionId: sId, subId });
                            }
                        }
                    });
                }
            });
            setSubjectAssignments(assignedSubs);

            setForm({
                name: teacher.name || "",
                mobile: teacher.mobile || "",
                age: teacher.age?.toString() || "",
                address: teacher.address || "",
                qualifications: teacher.qualifications || "",
                primarySubject: teacher.subjects?.[0] || "",
                secondarySubject: teacher.subjects?.[1] || "NONE",
                classTeacherClass: assignedCT[0]?.classId || "NONE",
                classTeacherSection: assignedCT[0]?.sectionId || "A"
            });

            // Populate subjects from Master Data context
            const activeSubjects = Object.values(masterSubjects || {})
                .filter((s: any) => s.isActive !== false)
                .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
            setSubjects(activeSubjects);
        }
    }, [isOpen, teacher, masterSubjects]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const teacherId = teacher.schoolId || teacher.id;
        if (!teacherId) return;
        setSubmitting(true);

        try {
            const selectedSubjects = new Set<string>();
            if (form.primarySubject && form.primarySubject !== "NONE") selectedSubjects.add(form.primarySubject);
            if (form.secondarySubject && form.secondarySubject !== "NONE") selectedSubjects.add(form.secondarySubject);
            subjectAssignments.forEach(a => {
                if (a.subId) selectedSubjects.add(a.subId);
            });

            // 2. Perform RTDB sync FIRST (Canonical Registry)
            const { ref, set, get, update } = await import("firebase/database");
            const { rtdb } = await import("@/lib/firebase");

            // Clear all class teacher assignments for this teacher in RTDB
            const registryRef = ref(rtdb, 'master/classSections');
            const registrySnap = await get(registryRef);
            if (registrySnap.exists()) {
                const registry = registrySnap.val();
                const updates: any = {};
                Object.keys(registry).forEach(key => {
                    if (registry[key].classTeacherId === teacherId) {
                        updates[`${key}/classTeacherId`] = null;
                        updates[`${key}/classTeacherName`] = null;
                    }
                });
                if (Object.keys(updates).length > 0) {
                    await update(registryRef, updates);
                }
            }

            // Clear all subject assignments for this teacher in RTDB
            const stRef = ref(rtdb, 'master/subjectTeachers');
            const stSnap = await get(stRef);
            if (stSnap.exists()) {
                const stVal = stSnap.val();
                const stUpdates: any = {};
                Object.keys(stVal).forEach(classKey => {
                    const subjectsObj = stVal[classKey];
                    if (subjectsObj && typeof subjectsObj === 'object') {
                        Object.keys(subjectsObj).forEach(subId => {
                            if (subjectsObj[subId] === teacherId) {
                                stUpdates[`${classKey}/${subId}`] = null;
                            }
                        });
                    }
                });
                if (Object.keys(stUpdates).length > 0) {
                    await update(stRef, stUpdates);
                }
            }

            // Write new Class Teacher assignments to RTDB
            const csUpdates: any = {};
            classTeacherOfList.forEach(ct => {
                const key = `${ct.classId}_${ct.sectionId}`;
                csUpdates[`${key}/classTeacherId`] = teacherId;
                csUpdates[`${key}/classTeacherName`] = form.name;
            });
            if (Object.keys(csUpdates).length > 0) {
                await update(registryRef, csUpdates);
            }

            // Write new Subject assignments to RTDB
            const subUpdates: any = {};
            subjectAssignments.forEach(sa => {
                const key = `${sa.classId}_${sa.sectionId}`;
                subUpdates[`${key}/${sa.subId}`] = teacherId;
            });
            if (Object.keys(subUpdates).length > 0) {
                await update(stRef, subUpdates);
            }

            // 3. Update Firestore (Convenience Copy)
            const docRef = doc(db, "teachers", teacher.id);
            await updateDoc(docRef, {
                name: form.name,
                mobile: form.mobile,
                age: Number(form.age),
                address: form.address,
                qualifications: form.qualifications,
                subjects: Array.from(selectedSubjects),
                classTeacherOf: classTeacherOfList[0] || null,
                classTeacherOfList: classTeacherOfList,
                updatedAt: new Date().toISOString()
            });

            // Notification for Manager Action
            if (role === "MANAGER") {
                await notifyManagerAction({
                    userId: teacher.uid || teacherId,
                    title: "Profile Updated",
                    message: `Teacher profile ${form.name} has been updated by Manager ${user?.displayName || 'System'}.`,
                    type: "INFO",
                    actionBy: user?.uid,
                    actionByName: user?.displayName || "Manager"
                });
            }

            toast({
                title: "Teacher Updated",
                description: `Successfully updated details for ${form.name}`,
                type: "success"
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            toast({
                title: "Update Failed",
                description: err.message || "Could not update teacher details.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#050B14]/98 border border-white/10 text-white sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] backdrop-blur-2xl p-0">
                
                {/* Modal Header Banner */}
                <div className="bg-gradient-to-r from-emerald-500/10 via-purple-500/5 to-transparent px-8 py-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent italic flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                            Edit Teacher details
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">Modify teacher attributes and academic section mappings.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    
                    {/* Beautiful Segmented Navigation Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-white/[0.03] border border-white/10 p-1 rounded-xl h-12">
                            <TabsTrigger 
                                value="profile" 
                                className="rounded-lg font-bold text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 hover:text-white"
                            >
                                <User className="w-3.5 h-3.5 mr-1.5" />
                                1. Profile
                            </TabsTrigger>
                            <TabsTrigger 
                                value="allocations" 
                                className="rounded-lg font-bold text-xs md:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 hover:text-white"
                            >
                                <Award className="w-3.5 h-3.5 mr-1.5" />
                                2. Allocations
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: BASIC PROFILE DETAILS */}
                        <TabsContent value="profile" className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Fields */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-emerald-400" /> Full Name
                                        </Label>
                                        <Input required placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-blue-400" /> Mobile Number
                                        </Label>
                                        <Input required type="tel" maxLength={10} placeholder="10-digit mobile number" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-yellow-500" /> Age
                                        </Label>
                                        <Input required type="number" min="18" placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                    </div>
                                </div>

                                {/* Right Fields */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Qualifications
                                        </Label>
                                        <Input required placeholder="Qualifications" value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500" /> Address Details
                                        </Label>
                                        <Input required placeholder="Resident address..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                                <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Primary Subject
                                            </Label>
                                            <Select value={form.primarySubject} onValueChange={v => setForm({ ...form, primarySubject: v })}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/10 h-11 rounded-xl text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                                <SelectContent className="bg-[#050B14] border-white/10 text-white">
                                                    {subjects.map(s => <SelectItem key={s.id} value={s.name || "Unknown"}>{s.name || "Unknown"}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Secondary Subject
                                            </Label>
                                            <Select value={form.secondarySubject} onValueChange={v => setForm({ ...form, secondarySubject: v })}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/10 h-11 rounded-xl text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                                                <SelectContent className="bg-[#050B14] border-white/10 text-white">
                                                    <SelectItem value="NONE">None</SelectItem>
                                                    {subjects.filter(s => s.name !== form.primarySubject).map(s => <SelectItem key={s.id} value={s.name || "Unknown"}>{s.name || "Unknown"}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button 
                                    type="button" 
                                    onClick={() => {
                                        if (form.name && form.mobile && form.qualifications) {
                                            setActiveTab("allocations");
                                        } else {
                                            toast({
                                                title: "Profile Incomplete",
                                                description: "Please fill in the required fields first.",
                                                type: "error"
                                            });
                                        }
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 h-11 rounded-xl"
                                >
                                    Next: Academic Assignments →
                                </Button>
                            </div>
                        </TabsContent>

                        {/* TAB 2: ACADEMIC ALLOCATIONS */}
                        <TabsContent value="allocations" className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* Class Teacher Allocation Card */}
                                <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Class Teacher Assignment</h4>
                                            <p className="text-[10px] text-muted-foreground">Assign as official lead teacher for a class grade section.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Grade</Label>
                                            <Select value={tempCtClass} onValueChange={setTempCtClass}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/10 h-10 text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
                                                <SelectContent className="bg-[#050B14] border-white/10 text-white">
                                                    {Object.values(masterClasses || {}).sort((a: any, b: any) => (a.order || 99) - (b.order || 99)).map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Section</Label>
                                            <Select value={tempCtSection} onValueChange={setTempCtSection}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/10 h-10 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                                                <SelectContent className="bg-[#050B14] border-white/10 text-white">
                                                    {Object.values(masterSections || {}).map((s: any) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button 
                                        type="button" 
                                        onClick={addCtRole} 
                                        className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Assign Class Charge
                                    </Button>

                                    {/* Assigned Class Teacher Grid View */}
                                    <div className="pt-3 border-t border-emerald-500/10">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Active Class Charges ({classTeacherOfList.length})</span>
                                        <div className="flex flex-wrap gap-2">
                                            {classTeacherOfList.length === 0 ? (
                                                <span className="text-[11px] text-muted-foreground/60 italic block py-2">No class teacher charges assigned yet.</span>
                                            ) : (
                                                classTeacherOfList.map((ct, idx) => (
                                                    <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 flex items-center justify-between rounded-xl text-xs font-black text-emerald-400 uppercase gap-3">
                                                        <span>{masterClasses[ct.classId]?.name || ct.classId} - {masterSections[ct.sectionId]?.name || ct.sectionId}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setClassTeacherOfList(classTeacherOfList.filter((_, i) => i !== idx))} 
                                                            className="hover:text-red-400 transition-colors w-4 h-4 flex items-center justify-center bg-emerald-500/10 rounded-full"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Subject Allocation Card */}
                                <div className="bg-purple-500/[0.02] border border-purple-500/10 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                            <BookOpen className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-purple-400 uppercase tracking-wider">Subject Teaching Mappings</h4>
                                            <p className="text-[10px] text-muted-foreground">Assign teacher to specific course subjects within a class.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Class & Section</Label>
                                            <Select value={tempSubClassSection} onValueChange={setTempSubClassSection}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/10 h-10 text-xs"><SelectValue placeholder="Choose grade combination..." /></SelectTrigger>
                                                <SelectContent className="bg-[#050B14] border-white/10 text-white">
                                                    {Object.values(classSections || {}).filter((cs: any) => cs.isActive !== false).map((cs: any) => {
                                                        const cName = masterClasses[cs.classId]?.name || cs.classId;
                                                        const sName = masterSections[cs.sectionId]?.name || cs.sectionId;
                                                        return (
                                                            <SelectItem key={cs.id} value={cs.id}>{cName} - {sName}</SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Curriculum Subject</Label>
                                            <Select value={tempSubSubject} onValueChange={setTempSubSubject}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/10 h-10 text-xs"><SelectValue placeholder="Choose subject..." /></SelectTrigger>
                                                <SelectContent className="bg-[#050B14] border-white/10 text-white">
                                                    {subjects.map(s => (
                                                        <SelectItem key={s.id} value={s.name}>{s.name} ({s.code || "?"})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button 
                                        type="button" 
                                        onClick={addSubAllocation} 
                                        className="w-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs h-9 rounded-xl font-bold flex items-center justify-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Allocate Teaching Subject
                                    </Button>

                                    {/* Assigned Subject Assignments tag view */}
                                    <div className="pt-3 border-t border-purple-500/10">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block mb-2">Active Subject Allocations ({subjectAssignments.length})</span>
                                        <div className="flex flex-wrap gap-2">
                                            {subjectAssignments.length === 0 ? (
                                                <span className="text-[11px] text-muted-foreground/60 italic block py-2">No subject mapping allocated yet.</span>
                                            ) : (
                                                subjectAssignments.map((a, idx) => {
                                                    const cName = masterClasses[a.classId]?.name || a.classId;
                                                    const sName = masterSections[a.sectionId]?.name || a.sectionId;
                                                    return (
                                                        <div key={idx} className="bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 flex items-center justify-between rounded-xl text-xs font-black text-purple-400 uppercase gap-3">
                                                            <div className="flex flex-col">
                                                                <span>{cName} - {sName}</span>
                                                                <span className="text-[9px] text-purple-300/80 tracking-wide font-medium normal-case">{a.subId}</span>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setSubjectAssignments(subjectAssignments.filter((_, i) => i !== idx))} 
                                                                className="hover:text-red-400 transition-colors w-4 h-4 flex items-center justify-center bg-purple-500/10 rounded-full"
                                                            >
                                                                <X className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => setActiveTab("profile")} 
                                    className="text-muted-foreground hover:text-white"
                                >
                                    ← Back to profile details
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Dialog Footer Actions */}
                    <DialogFooter className="border-t border-white/5 pt-6 flex items-center justify-end gap-4 mt-6">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={onClose} 
                            disabled={submitting} 
                            className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl px-6 h-12 text-sm font-bold"
                        >
                            Cancel
                        </Button>
                        
                        <Button 
                            type="submit" 
                            disabled={submitting} 
                            className="bg-white text-black hover:bg-zinc-200 rounded-xl px-8 h-12 text-sm font-black shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Profile Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
