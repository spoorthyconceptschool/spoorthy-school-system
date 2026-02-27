"use client";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Download, CheckCircle2, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { exportSingleStudentFee, printStudentFeeStructure } from "@/lib/export-utils";

export function AddStudentModal({ onSuccess }: { onSuccess?: () => void }) {
    const { user } = useAuth();
    const { villages: villagesData, classes: classesData, sections: sectionsData, classSections, branding, loading: masterDataLoading, selectedYear } = useMasterData();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<{ schoolId: string, studentName: string, className: string } | null>(null);

    const [formData, setFormData] = useState({
        studentName: "",
        parentName: "",
        parentPhone: "",
        villageId: "",
        classId: "",
        sectionId: "",
        dateOfBirth: "",
        gender: "select",
        transportRequired: false
    });

    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const classesList = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name || "Unknown Class", order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    const availableSections = formData.classId
        ? Object.values(classSections || {})
            .filter((cs: any) => cs.classId === formData.classId)
            .map((cs: any) => sectionsData[cs.sectionId])
            .filter(Boolean)
            .map((s: any) => ({ id: s.id, name: s.name || "Unknown Section" }))
            .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.studentName || formData.studentName.length < 2) return toast({ title: "Name Required", type: "error" });
        if (!/^\d{10}$/.test(formData.parentPhone)) return toast({ title: "Invalid Mobile", type: "error" });
        if (!formData.villageId || !formData.classId) return toast({ title: "Missing Fields", type: "error" });

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const selectedVillage = villages.find(v => v.id === formData.villageId)?.name || "";
            const selectedClass = classesList.find(c => c.id === formData.classId)?.name || "";
            const selectedSection = availableSections.find(s => s.id === formData.sectionId)?.name || "";

            const payload = {
                studentName: formData.studentName.trim(),
                parentName: formData.parentName.trim(),
                parentMobile: formData.parentPhone,
                villageId: formData.villageId,
                villageName: selectedVillage,
                classId: formData.classId,
                className: selectedClass,
                sectionId: formData.sectionId,
                sectionName: selectedSection,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                transportRequired: formData.transportRequired,
                academicYear: selectedYear || "2026-2027"
            };

            console.log("Creating student with payload:", payload);

            const res = await fetch("/api/admin/students/create", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            let data;
            const resText = await res.text();
            try {
                data = JSON.parse(resText);
            } catch (pE) {
                console.error("Failed to parse response as JSON:", resText);
                throw new Error(`[HTTP ${res.status}] Server error. Body snippet: ${resText.substring(0, 200)}`);
            }

            if (!res.ok) throw new Error(data.error || data.message || "Admission failed on server");

            toast({ title: "Admission Successful", type: "success" });
            const finalSchoolId = data.data?.schoolId || data.schoolId;
            setSuccessData({ schoolId: finalSchoolId, studentName: formData.studentName, className: selectedClass || "N/A" });
            setFormData({ studentName: "", parentName: "", parentPhone: "", villageId: "", classId: "", sectionId: "", dateOfBirth: "", gender: "select", transportRequired: false });
            onSuccess?.();
        } catch (error: any) {
            toast({ title: "Admission Failed", description: error.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setSuccessData(null);
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-accent text-accent-foreground">
                    <Plus size={16} /> Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-black/95 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Student Admission</DialogTitle>
                </DialogHeader>

                {successData ? (
                    <div className="py-10 flex flex-col items-center space-y-6">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        <div className="text-center">
                            <h3 className="text-xl font-bold">Admission Confirmed!</h3>
                            <p className="text-sm text-muted-foreground">{successData.studentName} enrolled successfully.</p>
                        </div>
                        <div className="flex flex-col w-full gap-2">
                            <Button
                                className="w-full bg-emerald-500 hover:bg-emerald-600 gap-2 font-bold h-12"
                                onClick={async () => {
                                    setLoading(true);
                                    const q = query(collection(db, "student_fee_ledgers"), where("studentId", "==", successData.schoolId));
                                    const snap = await getDocs(q);
                                    if (!snap.empty) {
                                        const ledger = snap.docs[0].data();
                                        printStudentFeeStructure({
                                            studentName: successData.studentName,
                                            schoolId: successData.schoolId, // Use successData.schoolId not ledger.schoolId just in case
                                            className: successData.className,
                                            items: ledger.items || [],
                                            totalPaid: ledger.totalPaid || 0,
                                            schoolLogo: branding?.schoolLogo,
                                            schoolName: branding?.schoolName
                                        });
                                    } else {
                                        toast({ title: "Fee Structure Not Found", description: "The fee ledger for this student hasn't been generated yet. Please try syncing from the Fees page.", type: "warning" });
                                    }
                                    setLoading(false);
                                }}
                            >
                                <Printer size={18} /> Print / View Fee Structure
                            </Button>
                        </div>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Done</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Student Name</Label>
                                <Input required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Parent Name</Label>
                                <Input required value={formData.parentName} onChange={e => setFormData({ ...formData, parentName: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Parent Mobile</Label>
                                <Input required maxLength={10} value={formData.parentPhone} onChange={e => setFormData({ ...formData, parentPhone: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Village</Label>
                                <Select onValueChange={val => setFormData({ ...formData, villageId: val })}>
                                    <SelectTrigger><SelectValue placeholder="Select Village" /></SelectTrigger>
                                    <SelectContent>
                                        {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <Select onValueChange={val => setFormData({ ...formData, classId: val, sectionId: "" })}>
                                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                    <SelectContent>
                                        {classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <Select value={formData.sectionId} onValueChange={val => setFormData({ ...formData, sectionId: val })}>
                                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                                    <SelectContent>
                                        {availableSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <Input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="block w-full bg-black/50 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select value={formData.gender} onValueChange={val => setFormData({ ...formData, gender: val })}>
                                    <SelectTrigger className="bg-black/50 border-white/10"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                                    <SelectContent className="bg-black border-white/10">
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 py-2">
                            <input
                                type="checkbox"
                                id="transport"
                                className="w-4 h-4 rounded border-white/20 bg-black/50 accent-emerald-500"
                                checked={formData.transportRequired}
                                onChange={e => setFormData({ ...formData, transportRequired: e.target.checked })}
                            />
                            <Label htmlFor="transport" className="cursor-pointer">Transport Required?</Label>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground font-bold h-12">
                            {loading ? <Loader2 className="animate-spin" /> : "Confirm Admission"}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
