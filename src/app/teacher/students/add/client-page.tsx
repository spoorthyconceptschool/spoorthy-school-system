"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function AddStudentClientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const classIdFromUrl = searchParams.get("classId");
    const sectionIdFromUrl = searchParams.get("sectionId");

    const { user } = useAuth();
    const { classes, sections, villages, selectedYear } = useMasterData();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        studentName: "",
        dateOfBirth: "",
        gender: "",
        parentName: "",
        parentMobile: "",
        alternativeMobile: "",
        address: "",
        bloodGroup: "",
        religion: "",
        caste: "",
        subCaste: "",
        aadhaarNumber: "",
        rollNumber: "",
        transportRequired: false,
        villageId: "",
        classId: classIdFromUrl || "",
        sectionId: sectionIdFromUrl || "",
        status: "ACTIVE"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.studentName || !formData.parentName || !formData.parentMobile || !formData.classId) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", type: "error" });
            return;
        }

        setSubmitting(true);
        try {
            // Add to Student Change Requests
            await addDoc(collection(db, "student_change_requests"), {
                teacherId: user?.uid,
                classId: formData.classId,
                sectionId: formData.sectionId,
                academicYear: selectedYear || "2026-2027",
                requestType: "ADD",
                status: "PENDING",
                oldData: null,
                newData: { ...formData, academicYear: selectedYear || "2026-2027" },
                createdAt: Timestamp.now()
            });

            toast({ title: "Request Submitted", description: "The new student request has been sent to Admin for approval.", type: "success" });
            router.push("/teacher/students");
        } catch (error: any) {
            console.error(error);
            toast({ title: "Submission Failed", description: error.message, type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto pb-20 p-2 md:p-6">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6 pt-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">Add New Student</h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1">Submit a new student request for admin approval.</p>
                </div>
            </div>

            <Card className="bg-black/20 border-white/10 shadow-2xl">
                <CardHeader className="border-b border-white/10 bg-white/5 py-3">
                    <CardTitle className="text-sm">Student Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black tracking-widest uppercase text-accent">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Full Name <span className="text-red-500">*</span></Label>
                                    <Input name="studentName" value={formData.studentName} onChange={handleChange} required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Roll Number</Label>
                                    <Input name="rollNumber" type="number" value={formData.rollNumber} onChange={handleChange} className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Date of Birth</Label>
                                    <Input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Gender</Label>
                                    <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Gender" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Aadhaar Number</Label>
                                    <Input name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className="bg-white/5 border-white/10" />
                                </div>
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-4 border-t border-white/10 pt-6">
                            <h3 className="text-xs font-black tracking-widest uppercase text-accent">Contact Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Parent Name <span className="text-red-500">*</span></Label>
                                    <Input name="parentName" value={formData.parentName} onChange={handleChange} required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Parent Mobile <span className="text-red-500">*</span></Label>
                                    <Input name="parentMobile" type="tel" value={formData.parentMobile} onChange={handleChange} required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Address</Label>
                                    <Textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Village/Area</Label>
                                    <Select value={formData.villageId} onValueChange={(val) => setFormData({ ...formData, villageId: val })}>
                                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Village" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            {Object.values(villages || {}).map((v: any) => (
                                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
                            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submitting} className="hover:bg-white/10">Cancel</Button>
                            <Button type="submit" disabled={submitting} className="bg-accent hover:bg-accent/80 text-black font-bold px-8">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Submit Request
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
