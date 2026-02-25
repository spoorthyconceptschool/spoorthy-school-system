"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { useAuth } from "@/context/AuthContext";

interface AdjustFeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    academicYearId: string;
    ledgerItems: any[];
    onSuccess: () => void;
}

export function AdjustFeesModal({ isOpen, onClose, studentId, academicYearId, ledgerItems, onSuccess }: AdjustFeesModalProps) {
    const [selectedItemId, setSelectedItemId] = useState<string>("");
    const [adjType, setAdjType] = useState<"DISCOUNT" | "OVERRIDE">("DISCOUNT");
    const [value, setValue] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Calculate current preview
    const selectedItem = ledgerItems.find(i => i.id === selectedItemId);
    const resultPreview = selectedItem && value ? (
        adjType === "DISCOUNT"
            ? Math.max(0, selectedItem.amount - Number(value))
            : Number(value)
    ) : null;



    const { user } = useAuth();

    const handleSubmit = async () => {
        if (!selectedItemId || !value || !reason || !user) return;
        setSubmitting(true);

        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/fees/adjust", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId,
                    yearId: academicYearId,
                    adjustments: [{
                        id: selectedItemId,
                        type: adjType,
                        value: Number(value)
                    }],
                    reason
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast({
                title: "Fees Adjusted",
                description: "Student fees have been updated.",
                type: "success"
            });

            onSuccess();
            onClose();
        } catch (e: any) {
            toast({
                title: "Adjustment Failed",
                description: e.message || "Could not update fees.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Adjust Student Fees</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2 text-xs text-yellow-500">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>Adjustments are permanently recorded in the audit log. Ensure you have authorization to offer discounts or overrides.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Fee Term</Label>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                            <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Choose term..." /></SelectTrigger>
                            <SelectContent>
                                {ledgerItems.filter(i => i.status !== "PAID").map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name} (Current: ₹{item.amount})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Adjustment Type</Label>
                            <Select value={adjType} onValueChange={(v: any) => setAdjType(v)}>
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DISCOUNT">Discount (Reduce by)</SelectItem>
                                    <SelectItem value="OVERRIDE">Override (Set to)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Value (₹)</Label>
                            <Input
                                type="number"
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                className="bg-white/5 border-white/10"
                                placeholder="e.g. 5000"
                            />
                        </div>
                    </div>

                    {selectedItem && (
                        <div className="flex justify-between items-center text-sm p-2 bg-white/5 rounded px-3">
                            <span className="text-muted-foreground">New Amount:</span>
                            <span className="font-mono font-bold text-emerald-400">
                                {resultPreview !== null ? `₹${resultPreview.toLocaleString()}` : "-"}
                            </span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Reason (Mandatory)</Label>
                        <Input
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="bg-white/5 border-white/10"
                            placeholder="e.g. Merit Scholarship, Sibling Discount"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || !selectedItemId || !value || !reason} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Adjustment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
