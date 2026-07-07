"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMasterData } from "@/context/MasterDataContext";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, GraduationCap, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast-store";

interface GraduateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GraduateClassModal({ isOpen, onClose }: GraduateClassModalProps) {
    const { classes, selectedYear } = useMasterData();
    const { branchId } = useAuth();
    
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [isCounting, setIsCounting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Sorted classes
    const classList = Object.values(classes || {})
        .sort((a: any, b: any) => (a.order || 99) - (b.order || 99));

    // Auto-select highest order class initially
    useEffect(() => {
        if (isOpen && classList.length > 0 && !selectedClassId) {
            setSelectedClassId(classList[classList.length - 1].id);
        }
    }, [isOpen, classList, selectedClassId]);

    // Fetch count when class changes
    useEffect(() => {
        if (!isOpen || !selectedClassId || !branchId || branchId === "global") return;

        const fetchCount = async () => {
            setIsCounting(true);
            try {
                const q = query(
                    collection(db, "students"),
                    where("schoolId", "==", branchId),
                    where("classId", "==", selectedClassId),
                    where("status", "==", "ACTIVE")
                );
                const snapshot = await getCountFromServer(q);
                setStudentCount(snapshot.data().count);
            } catch (error) {
                console.error("Failed to fetch student count:", error);
                setStudentCount(0);
            } finally {
                setIsCounting(false);
            }
        };

        fetchCount();
    }, [selectedClassId, isOpen, branchId]);

    const handleGraduate = async () => {
        if (!selectedClassId || !selectedYear || studentCount === 0) return;
        
        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/alumni/graduate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classId: selectedClassId,
                    academicYear: selectedYear,
                    branchId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to graduate students");

            toast({
                title: "Success",
                description: `Successfully moved ${data.count} students to Alumni!`,
                type: "success"
            });
            onClose();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                type: "error"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-[#0B1120] border border-white/10 text-white rounded-2xl font-sans">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-cyan-400" />
                        Graduate Class
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Move an entire class of active students to the Alumni network for the {selectedYear} academic year.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-300">Select Class to Graduate</label>
                        <Select 
                            value={selectedClassId} 
                            onValueChange={setSelectedClassId}
                            disabled={isProcessing}
                        >
                            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-cyan-500/50">
                                <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B1524] border-white/10 text-white">
                                {classList.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedClassId && (
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-start gap-3">
                            {isCounting ? (
                                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                            ) : studentCount === 0 ? (
                                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                                <GraduationCap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">
                                    {isCounting 
                                        ? "Calculating students..." 
                                        : studentCount === 0 
                                            ? "No active students found in this class." 
                                            : `${studentCount} students ready to graduate.`
                                    }
                                </span>
                                {studentCount !== 0 && !isCounting && (
                                    <span className="text-xs text-cyan-400/80 mt-1">
                                        They will be marked as ALUMNI for the {selectedYear} session.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="bg-transparent border-white/10 hover:bg-white/5 text-white rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGraduate}
                        disabled={isProcessing || isCounting || studentCount === 0}
                        className="bg-cyan-500 text-black hover:bg-cyan-400 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                            "Graduate Students"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
