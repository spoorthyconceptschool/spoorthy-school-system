import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";
import { Loader2, Save, Wand2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
            const idA = (a.schoolId || "").toString();
            const idB = (b.schoolId || "").toString();
            if (idA && idB && idA !== "-" && idB !== "-") {
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
            }
            const nameA = (a.studentName || "").toString();
            const nameB = (b.studentName || "").toString();
            return nameA.localeCompare(nameB);
        });

        // Map them sequentially 1 to N
        const updated = sorted.map((s, idx) => ({
            ...s,
            rollNumber: idx + 1
        }));

        setLocalStudents(updated);
        toast({ title: "Auto-Assigned", description: "Roll numbers have been ordered chronologically based on School ID starting from 1.", type: "info" });
    };

    const duplicateRolls = (() => {
        const counts: Record<string, number> = {};
        localStudents.forEach(s => {
            const r = String(s.rollNumber).trim();
            if (r !== "") {
                counts[r] = (counts[r] || 0) + 1;
            }
        });
        return Object.keys(counts).filter(k => counts[k] > 1);
    })();

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
            })); // Keep the nulls so they can clear roll numbers

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
            <DialogContent className="w-[95vw] max-w-md bg-gradient-to-b from-[#0A1628] to-[#050C16] text-white border border-white/10 max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl shadow-2xl shadow-black/80 sm:rounded-[2rem]">
                
                {/* Header */}
                <DialogHeader className="p-5 sm:p-6 border-b border-white/5 shrink-0 bg-[#0A1628]/50 backdrop-blur-md relative z-10">
                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex flex-col gap-2">
                        <div className="flex items-center justify-between w-full">
                            <span>Manage Rolls</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border border-[#10B981]/20">{className}</span>
                                <span className="bg-white/5 text-white/70 px-2 py-1 rounded-lg text-[10px] font-black uppercase border border-white/10">{sectionName}</span>
                            </div>
                        </div>
                    </DialogTitle>
                    <p className="text-[11px] sm:text-xs text-white/40 leading-relaxed font-medium mt-1">
                        Type custom numbers or let the system auto-assign sequentially (1 to {students.length}) based on admission ID.
                    </p>
                </DialogHeader>

                {/* Toolbar */}
                <div className="p-4 bg-white/[0.02] border-b border-white/5 shrink-0 flex flex-col gap-3">
                    <Button
                        onClick={handleAutoAssign}
                        variant="ghost"
                        className="w-full bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/20 rounded-xl h-11 font-black tracking-wide shadow-none"
                    >
                        <Wand2 className="w-4 h-4 mr-2" /> AUTO-ASSIGN BY ID
                    </Button>
                    
                    {duplicateRolls.length > 0 && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold flex gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="leading-tight">Warning: Duplicate roll numbers detected. Each student must have a unique number.</span>
                        </div>
                    )}
                </div>

                {/* Student List */}
                <div className="overflow-y-auto p-4 sm:p-5 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-white/10">
                    {localStudents.map((student, idx) => {
                        const isDuplicate = duplicateRolls.includes(String(student.rollNumber).trim());
                        
                        return (
                            <div 
                                key={student.id} 
                                className="flex items-center justify-between p-3.5 bg-black/20 rounded-2xl border border-white/5 hover:border-white/15 transition-all group"
                            >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 font-black text-xs shrink-0 border border-white/5">
                                        {idx + 1}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-sm text-white truncate pr-2">{student.studentName}</span>
                                        <span className="font-mono text-[10px] text-white/30 tracking-wider truncate mt-0.5">{student.schoolId}</span>
                                    </div>
                                </div>
                                
                                <div className="shrink-0 flex items-center gap-2">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest hidden sm:inline-block">Roll</span>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={student.rollNumber}
                                        onChange={(e) => handleRollChange(student.id, e.target.value)}
                                        className={cn(
                                            "w-[60px] h-10 text-center rounded-xl font-black text-sm shadow-inner transition-all",
                                            isDuplicate
                                                ? "border-rose-500/50 text-rose-400 focus:border-rose-500 bg-rose-500/10 focus:ring-rose-500/20"
                                                : "bg-[#040810] border-white/10 text-white focus:border-[#38bdf8] focus:bg-white/5 focus:ring-[#38bdf8]/20"
                                        )}
                                        placeholder="-"
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {localStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <AlertTriangle className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-white">No Students Found</span>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-white/5 bg-[#050C16] shrink-0 grid grid-cols-2 gap-3 z-10 relative">
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        disabled={submitting} 
                        className="w-full h-12 rounded-xl text-white/50 hover:text-white hover:bg-white/5 font-bold text-xs uppercase tracking-widest"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={submitting} 
                        className="w-full h-12 rounded-xl bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
