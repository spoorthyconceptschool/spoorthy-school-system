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
import { Loader2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { useAuth } from "@/context/AuthContext";
import { notifyManagerAction } from "@/lib/notifications";
import { onSnapshot } from "firebase/firestore";

interface EditTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: any;
    onSuccess: () => void;
}

export function EditTeacherModal({ isOpen, onClose, teacher, onSuccess }: EditTeacherModalProps) {
    const { subjects: masterSubjects } = useMasterData();
    const [subjects, setSubjects] = useState<any[]>([]);

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
    const [submitting, setSubmitting] = useState(false);

    const { user } = useAuth();
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (isOpen && teacher) {
            setForm({
                name: teacher.name || "",
                mobile: teacher.mobile || "",
                age: teacher.age?.toString() || "",
                address: teacher.address || "",
                qualifications: teacher.qualifications || "",
                primarySubject: teacher.subjects?.[0] || "",
                secondarySubject: teacher.subjects?.[1] || "NONE",
                classTeacherClass: teacher.classTeacherOf?.classId || "NONE",
                classTeacherSection: teacher.classTeacherOf?.sectionId || "A"
            });

            // Populate subjects from Master Data context
            const activeSubjects = Object.values(masterSubjects || {})
                .filter((s: any) => s.isActive !== false)
                .sort((a: any, b: any) => a.name.localeCompare(b.name));
            setSubjects(activeSubjects);
        }
    }, [isOpen, teacher, masterSubjects]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher?.id) return;
        setSubmitting(true);

        try {
            const selectedSubjects = [];
            if (form.primarySubject && form.primarySubject !== "NONE") selectedSubjects.push(form.primarySubject);
            if (form.secondarySubject && form.secondarySubject !== "NONE" && form.secondarySubject !== form.primarySubject) selectedSubjects.push(form.secondarySubject);

            const docRef = doc(db, "teachers", teacher.id);
            await updateDoc(docRef, {
                name: form.name,
                mobile: form.mobile,
                age: Number(form.age),
                address: form.address,
                qualifications: form.qualifications,
                subjects: selectedSubjects,
                classTeacherOf: (form.classTeacherClass && form.classTeacherClass !== "NONE") ? {
                    classId: form.classTeacherClass,
                    sectionId: form.classTeacherSection || "A"
                } : null,
                updatedAt: new Date().toISOString()
            });

            // Notification for Manager Action
            if (role === "MANAGER") {
                await notifyManagerAction({
                    userId: teacher.uid || teacher.id,
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
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Teacher Details</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-2">
                    {/* Left Col */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Mobile Number</Label>
                            <Input required type="tel" maxLength={10} value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-white/5 border-white/10 font-mono" />
                        </div>
                        <div className="space-y-2">
                            <Label>Age</Label>
                            <Input required type="number" min="18" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="bg-white/5 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-white/5 border-white/10" />
                        </div>
                    </div>

                    {/* Right Col */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Primary Subject</Label>
                            <Select value={form.primarySubject} onValueChange={v => setForm({ ...form, primarySubject: v })}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent className="bg-black border-white/10 text-white">
                                    {subjects.map(s => <SelectItem key={s.id} value={s.name || "Unknown"}>{s.name || "Unknown"}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Secondary Subject (Optional)</Label>
                            <Select value={form.secondarySubject} onValueChange={v => setForm({ ...form, secondarySubject: v })}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent className="bg-black border-white/10 text-white">
                                    <SelectItem value="NONE">None</SelectItem>
                                    {subjects.filter(s => s.name !== form.primarySubject).map(s => <SelectItem key={s.id} value={s.name || "Unknown"}>{s.name || "Unknown"}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                                    <SelectContent className="bg-black border-white/10 text-white">
                                        <SelectItem value="NONE">None</SelectItem>
                                        {Object.values(useMasterData().classes).sort((a: any, b: any) => a.order - b.order).map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={form.classTeacherSection} onValueChange={v => setForm({ ...form, classTeacherSection: v })}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                                    <SelectContent className="bg-black border-white/10 text-white">
                                        {Object.values(useMasterData().sections).map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="col-span-2 mt-4">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="bg-white text-black hover:bg-zinc-200">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
