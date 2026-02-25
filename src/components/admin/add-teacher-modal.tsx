"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { rtdb } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { onSnapshot, doc } from "firebase/firestore";

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddTeacherModal({ isOpen, onClose, onSuccess }: AddTeacherModalProps) {
    const { user } = useAuth();
    const { subjects: masterSubjects } = useMasterData();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
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
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ teacherId: string, password: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setResult(null);
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

            // Populate subjects from Master Data context
            const activeSubjects = Object.values(masterSubjects || {})
                .filter((s: any) => s.isActive !== false)
                .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
            setSubjects(activeSubjects);
        }
    }, [isOpen, masterSubjects]);

    const fetchSubjects = async () => {
        // No longer needed, using masterSubjects context
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const selectedSubjects = [];
            if (form.primarySubject) selectedSubjects.push(form.primarySubject);
            if (form.secondarySubject && form.secondarySubject !== form.primarySubject) selectedSubjects.push(form.secondarySubject);

            const res = await fetch("/api/admin/teachers/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    age: Number(form.age),
                    salary: role === "MANAGER" ? 0 : Number(form.salary),
                    subjects: selectedSubjects,
                    classTeacherOf: form.classTeacherClass ? {
                        classId: form.classTeacherClass,
                        sectionId: form.classTeacherSection || "A"
                    } : null
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
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add New Teacher</DialogTitle>
                </DialogHeader>

                {result ? (
                    <div className="py-6 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                            <Check className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-blue-400">Teacher Account Created</h3>
                            <p className="text-muted-foreground">The teacher can now login using these credentials.</p>
                        </div>

                        <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-sm mx-auto space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-sm uppercase tracking-wider">Teacher ID</span>
                                <span className="font-mono font-bold text-xl">{result.teacherId}</span>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-sm uppercase tracking-wider">Password</span>
                                <span className="font-mono font-bold text-xl">{result.password}</span>
                            </div>
                        </div>

                        <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            Done
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-2">
                        {/* Left Col */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mobile (Login Password)</Label>
                                <Input required type="tel" maxLength={10} value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-white/5 border-white/10 font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label>Age</Label>
                                <Input required type="number" min="18" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="bg-white/5 border-white/10" />
                            </div>
                            {role !== "MANAGER" && (
                                <div className="space-y-2">
                                    <Label>Monthly Salary (₹)</Label>
                                    <Input required type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="bg-white/5 border-white/10" />
                                </div>
                            )}
                        </div>

                        {/* Right Col */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Primary Subject</Label>
                                <Select value={form.primarySubject} onValueChange={v => setForm({ ...form, primarySubject: v })}>
                                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => <SelectItem key={s.id} value={s.name || "Unknown"}>{s.name || "Unknown"} ({s.code || "?"})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Secondary Subject (Optional)</Label>
                                <Select value={form.secondarySubject} onValueChange={v => setForm({ ...form, secondarySubject: v })}>
                                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">None</SelectItem>
                                        {subjects.filter(s => s.name !== form.primarySubject).map(s => <SelectItem key={s.id} value={s.name || "Unknown"}>{s.name || "Unknown"} ({s.code || "?"})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Qualifications</Label>
                                <Input required value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} className="bg-white/5 border-white/10" placeholder="e.g. B.Ed, M.Sc" />
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <Label className="text-xs text-muted-foreground uppercase mb-2 block">Class Teacher Assignment</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={form.classTeacherClass} onValueChange={v => setForm({ ...form, classTeacherClass: v })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">None</SelectItem>
                                            {Object.values(useMasterData().classes).sort((a: any, b: any) => a.order - b.order).map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={form.classTeacherSection} onValueChange={v => setForm({ ...form, classTeacherSection: v })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                                        <SelectContent>
                                            {Object.values(useMasterData().sections).map((s: any) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="col-span-2 mt-4">
                            <Button type="submit" disabled={submitting} className="w-full bg-white text-black hover:bg-zinc-200">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Teacher Account"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
