import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { toast } from "@/lib/toast-store";
import { Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EditStudentRequestModalProps {
    student: any;
    onClose: () => void;
}

export function EditStudentRequestModal({ student, onClose }: EditStudentRequestModalProps) {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        studentName: student.studentName || "",
        dateOfBirth: student.dateOfBirth || "",
        gender: student.gender || "",
        parentName: student.parentName || "",
        parentMobile: student.parentMobile || "",
        alternativeMobile: student.alternativeMobile || "",
        address: student.address || "",
        bloodGroup: student.bloodGroup || "",
        religion: student.religion || "",
        caste: student.caste || "",
        subCaste: student.subCaste || "",
        aadhaarNumber: student.aadhaarNumber || "",
        rollNumber: student.rollNumber || "",
        transportRequired: student.transportRequired || false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, "student_change_requests"), {
                teacherId: user?.uid,
                studentId: student.id,
                schoolId: student.schoolId,
                classId: student.classId,
                sectionId: student.sectionId,
                requestType: "EDIT",
                status: "PENDING",
                oldData: student,
                newData: formData,
                createdAt: Timestamp.now()
            });

            toast({
                title: "Request Submitted",
                description: "Your edit request has been sent to the Admin for approval.",
                type: "success"
            });
            onClose();
        } catch (error: any) {
            console.error("Failed to submit request:", error);
            toast({
                title: "Error",
                description: "Failed to submit request. Please try again.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-[#0F172A] text-white border-white/10 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold">Request Profile Edit</DialogTitle>
                    <p className="text-sm text-muted-foreground">Submit changes for {student.studentName}. These changes require Admin approval before becoming active.</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Full Name</Label>
                            <Input name="studentName" value={formData.studentName} onChange={handleChange} className="bg-white/5 border-white/10" required />
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
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select Gender" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Parent Name</Label>
                            <Input name="parentName" value={formData.parentName} onChange={handleChange} className="bg-white/5 border-white/10" required />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Parent Mobile</Label>
                            <Input name="parentMobile" value={formData.parentMobile} onChange={handleChange} className="bg-white/5 border-white/10" required />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Alternative Mobile</Label>
                            <Input name="alternativeMobile" value={formData.alternativeMobile} onChange={handleChange} className="bg-white/5 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Aadhaar Number</Label>
                            <Input name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className="bg-white/5 border-white/10" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black">Address</Label>
                        <Textarea name="address" value={formData.address} onChange={handleChange} className="bg-white/5 border-white/10" rows={2} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="text-white hover:bg-white/10">Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-accent hover:bg-accent/80 text-black font-bold">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Submit Request
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
