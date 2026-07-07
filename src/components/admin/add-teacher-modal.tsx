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
    Coins, 
    Sparkles, 
    Briefcase,
    Calendar,
    Award
} from "lucide-react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onOptimisticUpdate?: (teacher: any) => void;
}

export function AddTeacherModal({ isOpen, onClose, onSuccess, onOptimisticUpdate }: AddTeacherModalProps) {
    const { user } = useAuth();
    const { selectedBranchId } = useBranch();
    const { subjects: masterSubjects, classes: masterClasses, sections: masterSections, classSections } = useMasterData();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [role, setRole] = useState<string>("");
    const [activeTab, setActiveTab] = useState("profile");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        }, (err) => console.warn("[AddTeacherModal] User session sync warning:", err.message));
        return () => unsub();
    }, [user]);

    // Form
    const [form, setForm] = useState({
        name: "",
        mobile: "",
        age: "",
        address: "",
        salary: "",
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
    const [result, setResult] = useState<{ teacherId: string, password: string } | null>(null);

    // Only reset form when the modal is explicitly opened
    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setClassTeacherOfList([]);
            setSubjectAssignments([]);
            setActiveTab("profile");
            setForm({
                name: "",
                mobile: "",
                age: "",
                address: "",
                salary: "",
                qualifications: "",
                primarySubject: "",
                secondarySubject: "",
                classTeacherClass: "",
                classTeacherSection: ""
            });
        }
    }, [isOpen]);

    // Separate effect for subjects population to avoid resetting result
    useEffect(() => {
        if (!masterSubjects) return;
        const activeSubjects = Object.values(masterSubjects || {})
            .filter((s: any) => s.isActive !== false)
            .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
        setSubjects(activeSubjects);
    }, [masterSubjects]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation before shifting or submitting
        if (!form.name || !form.mobile || !form.qualifications) {
            setActiveTab("profile");
            toast({
                title: "Missing Details",
                description: "Please fill in the basic teacher profile details first.",
                type: "error"
            });
            return;
        }

        setSubmitting(true);

        // Unique subjects list from both selectors and allocations
        const selectedSubjects = new Set<string>();
        if (form.primarySubject && form.primarySubject !== "NONE") selectedSubjects.add(form.primarySubject);
        if (form.secondarySubject && form.secondarySubject !== "NONE") selectedSubjects.add(form.secondarySubject);
        subjectAssignments.forEach(a => {
            if (a.subId) selectedSubjects.add(a.subId);
        });

        // --- ZERO-LATENCY OPTIMISTIC PROJECTION ---
        if (onOptimisticUpdate) {
            const tempTeacher = {
                id: `TEMP-${Date.now()}`,
                schoolId: "PENDING...",
                name: form.name.trim(),
                mobile: form.mobile,
                salary: Number(form.salary) || 0,
                status: "ACTIVE",
                subjects: Array.from(selectedSubjects),
                isOptimistic: true
            };
            onOptimisticUpdate(tempTeacher);
        }

        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/teachers/create", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    age: Number(form.age),
                    salary: role === "MANAGER" ? 0 : Number(form.salary),
                    subjects: Array.from(selectedSubjects),
                    classTeacherOf: classTeacherOfList[0] || null,
                    classTeacherOfList: classTeacherOfList,
                    subjectAssignments: subjectAssignments,
                    branchId: selectedBranchId || "global"
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast({
                title: "Teacher Created",
                description: `Successfully created account for ${form.name}`,
                type: "success"
            });

            setResult({ teacherId: data.teacherId, password: form.mobile });
            onSuccess();
        } catch (err: any) {
            toast({
                title: "Creation Failed",
                description: err.message || "Could not create teacher account.",
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
                            Add New Teacher
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">Configure profile details and academic allocations.</p>
                    </div>
                </div>

                {result ? (
                    <div className="p-8 text-center space-y-6">
                        <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]">
                            <Check className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-emerald-400">Teacher Account Created</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">The teacher can now log in using these dynamic access credentials.</p>
                        </div>

                        <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl max-w-md mx-auto space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs uppercase tracking-widest font-black">Teacher ID</span>
                                <span className="font-mono font-bold text-2xl text-emerald-400">{result.teacherId}</span>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs uppercase tracking-widest font-black">Default Password</span>
                                <span className="font-mono font-bold text-2xl text-white">{result.password}</span>
                            </div>
                        </div>

                        <Button onClick={onClose} className="w-full max-w-md mx-auto bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-bold shadow-lg shadow-white/5">
                            Finish Setup
                        </Button>
                    </div>
                ) : (
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
                                            <Input required placeholder="e.g. Dr. Raghavendra Rao" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-blue-400" /> Mobile (Login Username)
                                            </Label>
                                            <Input required type="tel" maxLength={10} placeholder="10-digit mobile number" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-yellow-500" /> Age
                                                </Label>
                                                <Input required type="number" min="18" placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                            </div>

                                            {role !== "MANAGER" && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                                        <Coins className="w-3.5 h-3.5 text-amber-500" /> Monthly Salary
                                                    </Label>
                                                    <Input required type="number" placeholder="₹ Salary" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Fields */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Qualifications
                                            </Label>
                                            <Input required placeholder="e.g. B.Ed, M.Sc Mathematics" value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} className="bg-white/[0.02] border-white/10 h-11 rounded-xl placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-0 transition-all text-sm font-medium" />
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
                                                    description: "Please fill in the required fields (Name, Mobile, Qualifications) first.",
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
                        <DialogFooter className="border-t border-white/5 pt-6 flex items-center justify-between gap-4 mt-6">
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
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                                Create Teacher Account
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
