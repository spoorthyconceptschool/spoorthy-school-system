"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where, onSnapshot, addDoc, setDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Users, MapPin, Calendar, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/context/MasterDataContext";
import { Trash2, Edit } from "lucide-react";

export default function CustomFeesPage() {
    const [fees, setFees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        amount: "",
        dueDate: "",
        targetType: "CLASS", // CLASS | VILLAGE
        targetIds: [] as string[]
    });
    const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Use Real-Time Master Data from Context
    const { classes: masterClasses, villages: masterVillages } = useMasterData();
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchFees = async () => {
        try {
            const q = query(collection(db, "custom_fees"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setFees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const snap = await getDocs(query(collection(db, "students"), where("status", "==", "ACTIVE")));
            setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        // Real-time listener for Custom Fees
        const q = query(collection(db, "custom_fees"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setFees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Custom Fees Listener Error:", err);
            setLoading(false);
        });

        fetchStudents();

        return () => unsubscribe();
    }, []);

    // Convert Record to List for the UI
    const classes = Object.entries(masterClasses || {})
        .map(([id, data]: any) => ({ id, ...data }))
        .filter((c: any) => c.isActive !== false)
        .sort((a: any, b: any) => (a.order || 99) - (b.order || 99));

    const villages = Object.entries(masterVillages || {})
        .map(([id, data]: any) => ({ id, ...data }))
        .filter((v: any) => v.isActive !== false)
        .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

    const handleSave = async () => {
        if (!formData.name || !formData.amount || !formData.dueDate || formData.targetIds.length === 0) return;
        setSubmitting(true);

        try {

            if (editingFeeId) {
                // Update
                await setDoc(doc(db, "custom_fees", editingFeeId), {
                    ...formData,
                    updatedAt: serverTimestamp(),
                    status: "ACTIVE"
                }, { merge: true });
            } else {
                // Create
                await addDoc(collection(db, "custom_fees"), {
                    ...formData,
                    createdAt: serverTimestamp(),
                    status: "ACTIVE"
                });
            }

            // Auto-Sync
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            await syncAllStudentLedgers(db);

            alert(editingFeeId ? "Fee Updated & Synced" : "Fee Assigned & Synced Successfully");
            setIsWizardOpen(false);
            setFormData({ name: "", amount: "", dueDate: "", targetType: "CLASS", targetIds: [] });
            setStep(1);
            setEditingFeeId(null);
            fetchFees();
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (fee: any) => {
        setFormData({
            name: fee.name,
            amount: fee.amount.toString(),
            dueDate: fee.dueDate,
            targetType: fee.targetType,
            targetIds: fee.targetIds || []
        });
        setEditingFeeId(fee.id);
        setIsWizardOpen(true);
        setStep(1);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this custom fee payment? It will be removed from all student ledgers where it is currently unpaid.")) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, "custom_fees", id));

            // Auto-Sync to remove from ledgers
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            await syncAllStudentLedgers(db);

            alert("Fee Deleted & Synced");
            fetchFees();
        } catch (e: any) {
            console.error(e);
            alert("Delete failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Selection
    const toggleTarget = (id: string) => {
        const current = formData.targetIds;
        if (current.includes(id)) {
            setFormData({ ...formData, targetIds: current.filter(x => x !== id) });
        } else {
            setFormData({ ...formData, targetIds: [...current, id] });
        }
    };

    // Select All Helper
    const selectAll = () => {
        const source = formData.targetType === "CLASS" ? classes : villages;
        setFormData({ ...formData, targetIds: source.map(s => s.id) });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold">Custom Fee Payment</h1>
                    <p className="text-muted-foreground">Create and assign special fees to specific groups.</p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Create New Fee
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fees.map(fee => (
                        <Card key={fee.id} className="bg-black/20 border-white/10 hover:bg-black/30 transition-all">
                            <CardHeader className="flex flex-row justify-between items-start pb-2">
                                <CardTitle className="text-lg font-bold">{fee.name}</CardTitle>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(fee)} className="h-8 w-8 text-blue-400">
                                        <Edit size={14} />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)} className="h-8 w-8 text-red-500">
                                        <Trash2 size={14} />
                                    </Button>
                                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                                        ₹{fee.amount}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm text-muted-foreground space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>Due: {fee.dueDate}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {fee.targetType === "CLASS" ? <Users className="w-4 h-4 text-blue-400" /> : fee.targetType === "VILLAGE" ? <MapPin className="w-4 h-4 text-orange-400" /> : <Users className="w-4 h-4 text-purple-400" />}
                                        <span>Target: {fee.targetType} ({fee.targetIds?.length || 0})</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Creation Wizard */}
            <Dialog open={isWizardOpen} onOpenChange={(open) => {
                setIsWizardOpen(open);
                if (!open) {
                    setEditingFeeId(null);
                    setFormData({ name: "", amount: "", dueDate: "", targetType: "CLASS", targetIds: [] });
                    setStep(1);
                }
            }}>
                <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingFeeId ? "Edit Custom Fee Payment" : "Assign New Fee Payment"} (Step {step}/2)</DialogTitle>
                    </DialogHeader>

                    {step === 1 ? (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Fee Name</Label>
                                <Input
                                    className="bg-white/5 border-white/10"
                                    placeholder="e.g. Annual Day Contribution"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount (₹)</Label>
                                    <Input
                                        type="number"
                                        className="bg-white/5 border-white/10"
                                        placeholder="500"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        className="bg-white/5 border-white/10"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Group</Label>
                                <Select
                                    value={formData.targetType}
                                    onValueChange={v => setFormData({ ...formData, targetType: v, targetIds: [] })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CLASS">Specific Classes</SelectItem>
                                        <SelectItem value="VILLAGE">Specific Villages</SelectItem>
                                        <SelectItem value="STUDENT">Specific Students</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="text-lg text-emerald-400">
                                    Select Target {formData.targetType === "CLASS" ? "Classes" : "Villages"}
                                </Label>
                                <div className="flex gap-3">
                                    <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, targetIds: [] })} className="text-xs text-white/40 hover:text-white">Clear All</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-2 border border-white/10 rounded-lg">
                                {formData.targetType === "CLASS" ? (
                                    classes.map(c => (
                                        <div key={c.id} className="flex items-center space-x-2 bg-white/5 p-2 rounded">
                                            <Checkbox
                                                id={c.id}
                                                checked={formData.targetIds.includes(c.id)}
                                                onCheckedChange={() => toggleTarget(c.id)}
                                            />
                                            <label htmlFor={c.id} className="text-sm cursor-pointer">{c.name}</label>
                                        </div>
                                    ))
                                ) : formData.targetType === "VILLAGE" ? (
                                    villages.map(v => (
                                        <div key={v.id} className="flex items-center space-x-2 bg-white/5 p-2 rounded">
                                            <Checkbox
                                                id={v.id}
                                                checked={formData.targetIds.includes(v.id)}
                                                onCheckedChange={() => toggleTarget(v.id)}
                                            />
                                            <label htmlFor={v.id} className="text-sm cursor-pointer truncate" title={v.name}>{v.name}</label>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full space-y-4">
                                        <Input
                                            placeholder="Search by name or ID..."
                                            className="bg-white/5 border-white/10"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[200px] overflow-y-auto pr-2">
                                            {allStudents
                                                .filter(s =>
                                                    s.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    s.schoolId?.toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .slice(0, 50)
                                                .map(s => (
                                                    <div key={s.schoolId} className="flex items-center space-x-2 bg-white/5 p-2 rounded group hover:bg-white/10 transition-colors">
                                                        <Checkbox
                                                            id={s.schoolId}
                                                            checked={formData.targetIds.includes(s.schoolId)}
                                                            onCheckedChange={() => toggleTarget(s.schoolId)}
                                                        />
                                                        <label htmlFor={s.schoolId} className="text-sm cursor-pointer block flex-1">
                                                            <p className="font-bold">{s.studentName}</p>
                                                            <p className="text-[10px] text-muted-foreground">{s.schoolId} • {s.className}</p>
                                                        </label>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground text-center">
                                Selected: {formData.targetIds.length} items
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        {step === 2 && (
                            <Button variant="ghost" onClick={() => setStep(1)} className="mr-auto">Back</Button>
                        )}
                        {step === 1 ? (
                            <Button onClick={() => setStep(2)} disabled={!formData.name || !formData.amount}>Next: Select Targets</Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                disabled={submitting || formData.targetIds.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : (editingFeeId ? "Update & Sync" : "Confirm & Assign")}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
