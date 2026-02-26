"use client";

import { useState, useEffect } from "react";
import { toast } from "@/lib/toast-store";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { getDoc, getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/context/AuthContext";

interface AdjustSalaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: {
        id: string;
        name: string;
        schoolId: string;
        role: "TEACHER" | "STAFF";
        currentSalary: number;
        roleCode?: string;
    } | null;
    onSuccess: () => void;
}

export function AdjustSalaryModal({ isOpen, onClose, person, onSuccess }: AdjustSalaryModalProps) {
    const [salary, setSalary] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [roleBasicSalary, setRoleBasicSalary] = useState<number | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen && person) {
            setSalary(person.currentSalary.toString());
            if (person.role === "STAFF" && person.roleCode) {
                fetchRoleBasicSalary(person.roleCode);
            } else {
                setRoleBasicSalary(null);
            }
        }
    }, [isOpen, person]);





    const fetchRoleBasicSalary = async (roleCode: string) => {
        try {
            const q = query(collection(db, "master_staff_roles"), where("code", "==", roleCode));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const roleData = snap.docs[0].data();
                setRoleBasicSalary(roleData.basicSalary || 0);
            }
        } catch (e) {
            console.error(e);
            toast({
                title: "Error fetching role data",
                description: "Could not fetch role salary details.",
                type: "error"
            });
        }
    };



    const handleAdjust = async () => {
        if (!person || !salary) return;
        setSubmitting(true);
        try {
            if (!user) throw new Error("Not authenticated");
            const token = await user.getIdToken();

            const res = await fetch("/api/admin/payroll/adjust-salary", {
                method: "POST", // The actual endpoint expects POST based on previous conversation context
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    personId: person.id,
                    role: person.role,
                    amount: Number(salary),
                    roleCode: person.roleCode
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to adjust salary");

            toast({
                title: "Salary Adjusted",
                description: `Successfully updated salary for ${person.name}`,
                type: "success"
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            toast({
                title: "Adjustment Failed",
                description: err.message || "An error occurred while updating salary.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!person) return null;

    const current = person.currentSalary;
    const proposed = Number(salary) || 0;
    const difference = proposed - current;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[400px] w-[95vw] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-display italic">Adjust Salary</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 md:space-y-6 py-2 md:py-4">
                    <div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black text-sm md:text-base">
                            {person.name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-sm md:text-base">{person.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-70">{person.schoolId} • {person.role}</div>
                        </div>
                    </div>

                    {roleBasicSalary !== null && (
                        <div className="px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 flex justify-between items-center text-[10px]">
                            <span className="text-blue-400 font-black tracking-widest uppercase">Role Baseline</span>
                            <span className="font-mono font-bold text-blue-300">₹{roleBasicSalary.toLocaleString()}</span>
                        </div>
                    )}

                    <div className="space-y-1.5 md:space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Base Salary (₹)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="number"
                                value={salary}
                                onChange={e => setSalary(e.target.value)}
                                className="pl-9 bg-white/5 border-white/10 h-10 md:h-12 text-sm md:text-lg font-mono focus:ring-accent/30 rounded-xl"
                                placeholder="Enter Amount"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-center md:text-left">
                            <div className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-0.5 md:mb-1">Current</div>
                            <div className="text-sm md:text-lg font-mono font-bold">₹{current?.toLocaleString()}</div>
                        </div>
                        <div className="p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-center md:text-left">
                            <div className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-0.5 md:mb-1">Proposed</div>
                            <div className="text-sm md:text-lg font-mono font-bold">₹{proposed?.toLocaleString()}</div>
                        </div>
                    </div>

                    {difference !== 0 && (
                        <div className={`p-3 md:p-4 rounded-xl flex items-center justify-between ${difference > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
                                {difference > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {difference > 0 ? "Increase" : "Decrease"}
                            </div>
                            <div className="text-base md:text-xl font-mono font-bold">
                                {difference > 0 ? "+" : ""} ₹{Math.abs(difference).toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleAdjust}
                        disabled={submitting || proposed === current || proposed < 0}
                        className="w-full bg-white text-black hover:bg-zinc-200 h-10 md:h-12 rounded-xl font-black uppercase tracking-tighter text-xs md:text-sm shadow-lg shadow-white/5"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Adjustment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
