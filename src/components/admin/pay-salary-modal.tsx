"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PaySalaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: {
        id: string;
        name: string;
        personType: "TEACHER" | "STAFF";
        baseSalary?: number;
        schoolId?: string;
    } | null;
    payment?: any; // Existing payment record for editing
    paidAmount?: number; // Total amount already paid for this month
    leavesCount?: number;
    defaultMonth?: string;
    defaultYear?: string;
    onSuccess: () => void;
}

export function PaySalaryModal({
    isOpen,
    onClose,
    employee,
    payment,
    paidAmount = 0,
    leavesCount = 0,
    defaultMonth,
    defaultYear,
    onSuccess
}: PaySalaryModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [payForm, setPayForm] = useState({
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear().toString(),
        amount: "",
        deductions: "",
        bonuses: "",
        method: "CASH",
        notes: "",
        type: "SALARY"
    });
    const [deleting, setDeleting] = useState(false);

    // Reset or update form when employee or payment changes
    useEffect(() => {
        if (employee && isOpen) {
            if (payment) {
                setPayForm({
                    month: payment.month,
                    year: payment.year,
                    amount: payment.baseAmount?.toString() || payment.amount?.toString() || "",
                    deductions: payment.deductions?.toString() || "0",
                    bonuses: payment.bonuses?.toString() || "0",
                    method: payment.method || "CASH",
                    notes: payment.notes || "",
                    type: payment.type || "SALARY"
                });
            } else {
                // For new payment, default to remaining balance
                const balance = Math.max(0, (employee.baseSalary || 0) - paidAmount);
                setPayForm({
                    month: defaultMonth || new Date().toLocaleString('default', { month: 'long' }),
                    year: defaultYear || new Date().getFullYear().toString(),
                    amount: balance > 0 ? balance.toString() : "",
                    deductions: "",
                    bonuses: "",
                    method: "CASH",
                    notes: "",
                    type: "SALARY"
                });
            }
        }
    }, [employee, payment, paidAmount, isOpen, defaultMonth, defaultYear]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    const handlePaySalary = async () => {
        if (!employee) return;
        setLoading(true);
        try {
            const baseAmount = Number(payForm.amount);
            if (!baseAmount && baseAmount !== 0) throw new Error("Base Amount is required");

            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/payroll/process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    paymentId: payment?.id,
                    personId: employee.id,
                    personType: employee.personType,
                    ...payForm,
                    amount: baseAmount,
                    deductions: Number(payForm.deductions) || 0,
                    bonuses: Number(payForm.bonuses) || 0,
                    leavesCount
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to process payment");

            alert(payment ? "Payment Updated Successfully!" : "Payment Recorded Successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!payment?.id || !confirm("Are you sure you want to delete this payment record?")) return;
        setDeleting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/payroll/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ paymentId: payment.id })
            });

            if (!res.ok) throw new Error("Failed to delete payment");

            alert("Payment Record Deleted");
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDeleting(false);
        }
    };

    if (!employee) return null;

    const baseAmount = Number(payForm.amount) || 0;
    const deductions = Number(payForm.deductions) || 0;
    const bonuses = Number(payForm.bonuses) || 0;
    const netPay = baseAmount - deductions + bonuses;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader className="pb-2 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <div>{payment ? "Edit Payment" : "Add Payment"}</div>
                            <div className="text-xs text-muted-foreground font-normal">{employee.name}</div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    <div className="grid gap-4 py-4">
                        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 items-center gap-1">
                            {["SALARY", "BONUS", "ADVANCE", "ADJUSTMENT"].map((t) => (
                                <Button
                                    key={t}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPayForm({ ...payForm, type: t })}
                                    className={`flex-1 text-[10px] h-7 px-1 ${payForm.type === t ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:bg-white/5"}`}
                                >
                                    {t}
                                </Button>
                            ))}
                        </div>

                        {!payment && (
                            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-4 rounded-xl border border-white/10 shadow-inner">
                                <div className="grid grid-cols-2 gap-y-2 text-xs">
                                    <span className="text-muted-foreground">Base Salary</span>
                                    <span className="text-right font-mono">₹{Number(employee.baseSalary || 0).toLocaleString()}</span>

                                    <span className="text-muted-foreground">Already Paid</span>
                                    <span className="text-right font-mono text-emerald-400">- ₹{paidAmount.toLocaleString()}</span>

                                    <div className="col-span-2 pt-2 mt-1 border-t border-white/10 flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</span>
                                            <span className="text-lg font-bold text-orange-400 leading-tight">₹{Math.max(0, (employee.baseSalary || 0) - paidAmount).toLocaleString()}</span>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Leaves ({payForm.month})</span>
                                            <span className={`text-sm font-bold ${leavesCount > 0 ? "text-red-400" : "text-emerald-400"}`}>{leavesCount} Days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select
                                    value={payForm.month}
                                    onValueChange={(v) => setPayForm({ ...payForm, month: v })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input
                                    value={payForm.year}
                                    onChange={(e) => setPayForm({ ...payForm, year: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Base Salary Amount (₹)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                    className="pl-9 bg-white/5 border-white/10"
                                    placeholder={employee.baseSalary ? employee.baseSalary.toString() : "0"}
                                />
                            </div>
                            {employee.baseSalary ? (
                                <p className="text-xs text-muted-foreground">Default Base: ₹{employee.baseSalary.toLocaleString()}</p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-red-400">Deductions (₹)</Label>
                                <Input
                                    type="number"
                                    value={payForm.deductions}
                                    onChange={(e) => setPayForm({ ...payForm, deductions: e.target.value })}
                                    className="bg-white/5 border-white/10 text-red-400"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-emerald-400">Bonuses / Adds (₹)</Label>
                                <Input
                                    type="number"
                                    value={payForm.bonuses}
                                    onChange={(e) => setPayForm({ ...payForm, bonuses: e.target.value })}
                                    className="bg-white/5 border-white/10 text-emerald-400"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 bg-slate-900 border border-slate-800 p-3 rounded">
                            <div className="flex justify-between items-center">
                                <span className="text-xs uppercase text-slate-400">Net Pay</span>
                                <span className="text-xl font-bold font-mono">₹{netPay.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select
                                value={payForm.method}
                                onValueChange={(v) => setPayForm({ ...payForm, method: v })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI / Online</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Notes (Reason for adjustments)</Label>
                            <Textarea
                                value={payForm.notes}
                                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                                className="bg-white/5 border-white/10 h-16 text-sm"
                                placeholder="e.g. Overtime adjustment, Leave deduction..."
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-white/5 flex flex-row items-center justify-between gap-2">
                    {payment ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={deleting || loading}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-red-500/20"
                        >
                            {deleting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Delete
                        </Button>
                    ) : <div />}

                    <div className="flex gap-2">
                        <Button onClick={onClose} variant="ghost" className="text-muted-foreground hover:text-white">
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePaySalary}
                            disabled={loading || deleting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {payment ? "Update Payment" : "Confirm Payment"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
