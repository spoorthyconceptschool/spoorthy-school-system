import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";
import { Loader2, Save, Wand2, X } from "lucide-react";

interface ManageRollNumbersModalProps {
    students: any[];
    classId: string;
    sectionId: string;
    className: string;
    sectionName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ManageRollNumbersModal({ students, classId, sectionId, className, sectionName, onClose, onSuccess }: ManageRollNumbersModalProps) {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    // We maintain a local state array of the current students to edit their numbers inline
    const [localStudents, setLocalStudents] = useState<any[]>([]);

    useEffect(() => {
        // Initialize local copy, ensuring rollNumber is a number or empty
        setLocalStudents(
            students.map(s => ({
                id: s.id,
                schoolId: s.schoolId || "-",
                studentName: s.studentName,
                rollNumber: s.rollNumber || ""
            }))
        );
    }, [students]);

    const handleAutoAssign = () => {
        // Sort students chronologically by schoolId (e.g. SHS00001, SHS00002)
        const sorted = [...localStudents].sort((a, b) => {
            const idA = a.schoolId.toString();
            const idB = b.schoolId.toString();
            return idA.localeCompare(idB); // Basic alphanumeric sort
        });

        // Map them sequentially 1 to N
        const updated = sorted.map((s, idx) => ({
            ...s,
            rollNumber: idx + 1
        }));

        setLocalStudents(updated);
        toast({ title: "Auto-Assigned", description: "Roll numbers have been ordered chronologically based on School ID starting from 1.", type: "info" });
    };

    const handleRollChange = (studentId: string, val: string) => {
        setLocalStudents(prev => prev.map(s => s.id === studentId ? { ...s, rollNumber: val } : s));
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const token = await user.getIdToken();

            // Collect the updates
            const updates = localStudents.map(s => ({
                studentId: s.id,
                rollNumber: s.rollNumber === "" ? null : Number(s.rollNumber)
            })).filter(s => s.rollNumber !== null); // Ignore purely empty entries if we want, or allow them if null indicates "Remove"

            if (updates.length === 0) {
                toast({ title: "Nothing to save", type: "warning" });
                setSubmitting(false);
                return;
            }

            const res = await fetch("/api/teacher/students/manage-rolls", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ classId, sectionId, updates })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save roll numbers");

            toast({ title: "Success", description: data.message, type: "success" });
            onSuccess();
        } catch (error: any) {
            console.error("Failed to save roll numbers:", error);
            toast({ title: "Error", description: error.message, type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl bg-[#0F172A] text-white border-white/10 max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-white/10 shrink-0">
                    <DialogTitle className="text-2xl font-display font-bold flex items-center justify-between">
                        <span>Manage Roll Numbers</span>
                        <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground mr-8">
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/10">{className}</span>
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/10">{sectionName}</span>
                        </div>
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        You can manually type customized roll numbers below, or automatically assign sequential numbers (1 to {students.length}) ordered by their Admission ID chronologically.
                    </p>
                </DialogHeader>

                <div className="p-4 bg-accent/5 border-b border-white/5 flex justify-end shrink-0">
                    <Button
                        onClick={handleAutoAssign}
                        variant="outline"
                        size="sm"
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    >
                        <Wand2 className="w-4 h-4 mr-2" /> Auto-Assign by School ID
                    </Button>
                </div>

                <div className="overflow-y-auto p-6 space-y-2 flex-1">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-white/10">
                        <div className="col-span-3">School ID</div>
                        <div className="col-span-6">Student Name</div>
                        <div className="col-span-3 text-right">Roll No.</div>
                    </div>

                    {localStudents.map(student => (
                        <div key={student.id} className="grid grid-cols-12 gap-4 items-center px-4 py-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="col-span-3 font-mono text-sm text-white/70">{student.schoolId}</div>
                            <div className="col-span-6 font-medium truncate">{student.studentName}</div>
                            <div className="col-span-3 flex justify-end">
                                <Input
                                    type="number"
                                    min="1"
                                    value={student.rollNumber}
                                    onChange={(e) => handleRollChange(student.id, e.target.value)}
                                    className="w-20 h-8 text-center bg-black/40 border-white/20 focus:border-accent"
                                    placeholder="-"
                                />
                            </div>
                        </div>
                    ))}

                    {localStudents.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">No students enrolled in this section.</div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-[#0F172A]">
                    <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-white hover:bg-white/10">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-accent hover:bg-accent/80 text-black font-bold">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Numbers
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
