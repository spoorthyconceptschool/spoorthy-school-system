"use client";

import { useEffect, useState } from "react";
import { 
    doc, getDoc, setDoc, query, collection, where, getDocs, orderBy, 
    onSnapshot, addDoc, serverTimestamp, deleteDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, Trash2, RefreshCw, Bus, Users, MapPin, Calendar, IndianRupee, Edit, Settings2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// --- Types ---
interface FeeTerm {
    id: string;
    name: string;
    dueDate: string;
    isActive: boolean;
    amounts: { [grade: string]: number };
}

// --- Main Page Component ---
export default function ManageFeesPage() {
    return (
        <div className="space-y-6 md:space-y-10 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-24">
            <div className="space-y-1">
                <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight text-white italic">Fee Management</h1>
                <p className="text-muted-foreground text-xs md:text-lg">Configure standard class fees and assign specialized custom payments.</p>
            </div>

            <Tabs defaultValue="standard" className="w-full">
                <TabsList className="bg-black/40 border border-white/5 p-1 rounded-xl w-full sm:w-auto">
                    <TabsTrigger value="standard" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold uppercase tracking-tighter text-[10px] md:text-xs py-2 px-4 rounded-lg transition-all">
                        <Settings2 className="w-4 h-4" />
                        Standard Fees
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold uppercase tracking-tighter text-[10px] md:text-xs py-2 px-4 rounded-lg transition-all">
                        <Layers className="w-4 h-4" />
                        Custom Fees
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="standard" className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    <StandardFeesTab />
                </TabsContent>

                <TabsContent value="custom" className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    <CustomFeesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- Standard Fees Tab ---
function StandardFeesTab() {
    const { classes: classesData, selectedYear } = useMasterData();
    const [terms, setTerms] = useState<FeeTerm[]>([]);
    const [transportFees, setTransportFees] = useState<{ [villageId: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const classes = Object.values(classesData || {}).map((c: any) => ({ 
        id: c.id, 
        name: c.name || "Unknown Class", 
        order: c.order || 99 
    })).sort((a: any, b: any) => a.order - b.order);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docRef = doc(db, "config", "fees");
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    if (data.terms) setTerms(data.terms);
                    if (data.transportFees) setTransportFees(data.transportFees);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, "config", "fees");
            await setDoc(docRef, { terms, transportFees }, { merge: true });
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            const updatedCount = await syncAllStudentLedgers(db, selectedYear);
            toast({ title: "Configuration Saved", description: `Student fee settings updated for ${updatedCount} students.`, type: "success" });
        } catch (error: any) {
            console.error("Error saving fees:", error);
            toast({ title: "Save Failed", description: error.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleSyncAll = async () => {
        if (!confirm("This will synchronize fee structures for ALL students. Continue?")) return;
        setSyncing(true);
        try {
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            const updatedCount = await syncAllStudentLedgers(db, selectedYear);
            alert(`Synced successfully for ${updatedCount} students.`);
        } catch (error: any) {
            console.error("Sync failed:", error);
            alert("Sync Failed: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const addTerm = () => {
        setTerms([...terms, {
            id: Date.now().toString(),
            name: `New Term`,
            dueDate: new Date().toISOString().split('T')[0],
            isActive: true,
            amounts: {}
        }]);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div>
                    <h2 className="text-xl font-bold">Standard Fee Config</h2>
                    <p className="text-sm text-muted-foreground font-medium">Define recurring classes fees and installments.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSyncAll} disabled={syncing || saving} variant="outline" className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync Students"}
                    </Button>
                    <Button onClick={addTerm} variant="outline" className="gap-2 border-white/10 bg-white/5">
                        <Plus className="w-4 h-4" /> Add Term
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2 bg-accent text-accent-foreground font-bold">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {terms.map((term, index) => (
                    <Card key={term.id} className="p-4 md:p-6 bg-black/20 border-white/10 overflow-hidden group/term relative">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
                            <div className="flex items-center gap-3 flex-1">
                                <Switch
                                    checked={term.isActive}
                                    onCheckedChange={() => {
                                        const newTerms = [...terms];
                                        newTerms[index].isActive = !newTerms[index].isActive;
                                        setTerms(newTerms);
                                    }}
                                />
                                <Input
                                    value={term.name}
                                    onChange={(e) => {
                                        const newTerms = [...terms];
                                        newTerms[index].name = e.target.value;
                                        setTerms(newTerms);
                                    }}
                                    className="font-black text-xl md:text-2xl h-auto py-1 px-2 bg-transparent border-transparent focus:border-white/10 transition-all uppercase tracking-tighter w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={term.dueDate}
                                    onChange={(e) => {
                                        const newTerms = [...terms];
                                        newTerms[index].dueDate = e.target.value;
                                        setTerms(newTerms);
                                    }}
                                    className="w-40 bg-white/5 border-white/10 h-10"
                                />
                                <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => {
                                    const newTerms = [...terms];
                                    newTerms.splice(index, 1);
                                    setTerms(newTerms);
                                }}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 relative z-10">
                            {classes.map(cls => (
                                <div key={cls.id} className="space-y-1 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-accent/40 transition-all group/item">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest truncate block group-hover/item:text-accent">{cls.name}</Label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-black group-hover/item:text-accent">₹</span>
                                        <Input
                                            type="number"
                                            value={term.amounts?.[cls.name] || ""}
                                            onChange={(e) => {
                                                const newTerms = [...terms];
                                                newTerms[index].amounts = { ...newTerms[index].amounts, [cls.name]: parseInt(e.target.value) || 0 };
                                                setTerms(newTerms);
                                            }}
                                            className="bg-black/60 border-white/10 h-9 text-xs pl-6 rounded-lg focus:ring-accent/50 focus:border-accent transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>

            <TransportFeeConfig transportFees={transportFees} setTransportFees={setTransportFees} />
        </div>
    );
}

// --- Custom Fees Tab ---
function CustomFeesTab() {
    const [fees, setFees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "", amount: "", dueDate: "", targetType: "CLASS", targetIds: [] as string[]
    });
    const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { classes: masterClasses, villages: masterVillages, selectedYear } = useMasterData();
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const q = query(collection(db, "custom_fees"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setFees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        const fetchStudents = async () => {
            const snap = await getDocs(query(collection(db, "students"), where("status", "==", "ACTIVE")));
            setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchStudents();

        return () => unsubscribe();
    }, []);

    const classes = Object.entries(masterClasses || {}).map(([id, data]: any) => ({ id, ...data })).filter((c: any) => c.isActive !== false).sort((a: any, b: any) => (a.order || 99) - (b.order || 99));
    const villages = Object.entries(masterVillages || {}).map(([id, data]: any) => ({ id, ...data })).filter((v: any) => v.isActive !== false).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

    const handleSave = async () => {
        if (!formData.name || !formData.amount || !formData.dueDate || formData.targetIds.length === 0) return;
        setSubmitting(true);
        try {
            if (editingFeeId) {
                await setDoc(doc(db, "custom_fees", editingFeeId), { ...formData, updatedAt: serverTimestamp() }, { merge: true });
            } else {
                await addDoc(collection(db, "custom_fees"), { ...formData, academicYearId: selectedYear, createdAt: serverTimestamp(), status: "ACTIVE" });
            }
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            await syncAllStudentLedgers(db, selectedYear);
            toast({ title: editingFeeId ? "Fee Updated" : "Fee Assigned", description: "All student ledgers have been synchronized.", type: "success" });
            setIsWizardOpen(false);
        } catch (err: any) {
            console.error(err);
            toast({ title: "Failed", description: err.message, type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will remove the fee from all unpaid student ledgers.")) return;
        try {
            await deleteDoc(doc(db, "custom_fees", id));
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            await syncAllStudentLedgers(db, selectedYear);
            toast({ title: "Deleted", description: "Fee removed and ledgers synced.", type: "success" });
        } catch (e: any) {
            toast({ title: "Failed", description: e.message, type: "error" });
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div>
                    <h2 className="text-xl font-bold">Special Assignments</h2>
                    <p className="text-sm text-muted-foreground font-medium">Assign one-time or special fees to groups.</p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 shadow-lg shadow-emerald-900/20">
                    <Plus className="w-5 h-5 mr-2" /> Create New Fee
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fees.map(fee => (
                    <Card key={fee.id} className="bg-black/20 border-white/10 hover:border-emerald-500/30 transition-all group hover:bg-black/30">
                        <CardHeader className="flex flex-row justify-between items-start pb-2">
                            <CardTitle className="text-lg font-bold">{fee.name}</CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setFormData({ name: fee.name, amount: fee.amount.toString(), dueDate: fee.dueDate, targetType: fee.targetType, targetIds: fee.targetIds || [] });
                                    setEditingFeeId(fee.id);
                                    setIsWizardOpen(true);
                                    setStep(1);
                                }} className="h-8 w-8 text-blue-400"><Edit size={14} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)} className="h-8 w-8 text-red-500"><Trash2 size={14} /></Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-lg px-3 py-1 font-bold">₹{fee.amount}</Badge>
                                <div className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded uppercase tracking-wider">Due: {fee.dueDate}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-black/40 border border-white/5">
                                {fee.targetType === "CLASS" ? <Users className="w-4 h-4 text-blue-400" /> : <MapPin className="w-4 h-4 text-orange-400" />}
                                <span className="font-bold uppercase tracking-tighter">{fee.targetType}:</span>
                                <span>{fee.targetIds?.length || 0} Targets</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Wizard Dialog Component shared between local state */}
            <WizardDialog 
                isOpen={isWizardOpen} 
                onClose={() => setIsWizardOpen(false)} 
                step={step} 
                setStep={setStep}
                formData={formData}
                setFormData={setFormData}
                handleSave={handleSave}
                submitting={submitting}
                classes={classes}
                villages={villages}
                allStudents={allStudents}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                editingFeeId={editingFeeId}
            />
        </div>
    );
}

// --- Helper Components ---
function TransportFeeConfig({ transportFees, setTransportFees }: any) {
    const { villages } = useMasterData();
    const sortedVillages = Object.values(villages || {}).sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

    return (
        <Card className="p-4 md:p-6 bg-black/20 border-white/10 mt-6 relative overflow-hidden group/bus">
            <div className="absolute top-[-20px] right-[-20px] opacity-5 pointer-events-none group-hover/bus:scale-110 transition-transform duration-700">
                <Bus size={180} />
            </div>
            <div className="mb-6 relative z-10">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic">
                    <Bus className="w-5 h-5 text-yellow-500" /> Transport Fees
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">Annual transport pricing by route</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 relative z-10">
                {sortedVillages.map((v: any) => (
                    <div key={v.id} className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/40 transition-all group/v">
                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest truncate block group-hover/v:text-yellow-500">{v.name}</Label>
                        <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-black group-hover/v:text-yellow-500">₹</span>
                            <Input
                                type="number"
                                value={transportFees[v.id] || ""}
                                onChange={(e) => setTransportFees({ ...transportFees, [v.id]: parseInt(e.target.value) || 0 })}
                                className="bg-black/40 border-white/10 h-9 text-xs pl-6 rounded-xl focus:ring-yellow-500/50 focus:border-yellow-500"
                                placeholder="0"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function WizardDialog({ isOpen, onClose, step, setStep, formData, setFormData, handleSave, submitting, classes, villages, allStudents, searchQuery, setSearchQuery, editingFeeId }: any) {
    const toggleTarget = (id: string) => {
        const current = formData.targetIds;
        setFormData({ ...formData, targetIds: current.includes(id) ? current.filter((x:any) => x !== id) : [...current, id] });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-[650px] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-50" />
                <DialogHeader className="pt-2">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs ring-1 ring-emerald-500/30">{step}</div>
                        <DialogTitle className="text-xl font-bold uppercase tracking-tight italic">
                            {editingFeeId ? "Edit Custom Fee" : "Assign New Fee"} <span className="text-white/40 not-italic font-normal lowercase tracking-normal ml-2">(Step {step}/2)</span>
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-5 py-4">
                        <div className="space-y-2 group">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fee Nomenclature</Label>
                            <Input
                                className="bg-white/5 border-white/10 text-lg h-12 focus:border-emerald-500/50 transition-all rounded-xl shadow-inner shadow-black/40"
                                placeholder="e.g. Annual Day Contribution"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Amount (₹)</Label>
                                <Input
                                    type="number"
                                    className="bg-white/5 border-white/10 h-11 focus:border-emerald-500/50 rounded-xl"
                                    placeholder="500"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Due Date</Label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 h-11 focus:border-emerald-500/50 rounded-xl"
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Target Group Logic</Label>
                            <Select
                                value={formData.targetType}
                                onValueChange={v => setFormData({ ...formData, targetType: v, targetIds: [] })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl focus:border-emerald-500/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-white/10 rounded-xl">
                                    <SelectItem value="CLASS" className="focus:bg-emerald-500/10 focus:text-emerald-400">Specific Classes</SelectItem>
                                    <SelectItem value="VILLAGE" className="focus:bg-emerald-500/10 focus:text-emerald-400">Specific Villages</SelectItem>
                                    <SelectItem value="STUDENT" className="focus:bg-emerald-500/10 focus:text-emerald-400">Specific Students</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 py-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 italic">
                                SELECT TARGET {formData.targetType}S
                            </Label>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, targetIds: (formData.targetType === "CLASS" ? classes : villages).map((s:any) => s.id) })} className="text-[10px] font-black h-7 hover:bg-emerald-500/10 hover:text-emerald-400">SELECT ALL</Button>
                                <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, targetIds: [] })} className="text-[10px] font-black h-7 text-white/40 hover:bg-red-500/10 hover:text-red-500">CLEAR</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto p-1 custom-scrollbar">
                            {formData.targetType !== "STUDENT" ? (
                                (formData.targetType === "CLASS" ? classes : villages).map((c: any) => (
                                    <div key={c.id} 
                                        onClick={() => toggleTarget(c.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                                            formData.targetIds.includes(c.id) 
                                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                                            : "bg-white/5 border-white/5 text-white/60 hover:border-white/20"
                                        }`}
                                    >
                                        <Checkbox 
                                            checked={formData.targetIds.includes(c.id)} 
                                            className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-none"
                                        />
                                        <span className="text-xs font-bold uppercase truncate">{c.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full space-y-4">
                                     <Input
                                        placeholder="Search by name or ID..."
                                        className="bg-white/5 border-white/10 h-10 italic rounded-lg"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {allStudents
                                            .filter((s:any) => s.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.schoolId?.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .slice(0, 50)
                                            .map((s:any) => (
                                                <div key={s.schoolId} 
                                                    onClick={() => toggleTarget(s.schoolId)}
                                                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                        formData.targetIds.includes(s.schoolId) 
                                                        ? "bg-emerald-500/20 border-emerald-500/40" 
                                                        : "bg-white/5 border-white/5 hover:bg-white/10"
                                                    }`}
                                                >
                                                    <Checkbox checked={formData.targetIds.includes(s.schoolId)} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold truncate">{s.studentName}</p>
                                                        <p className="text-[9px] text-muted-foreground uppercase">{s.schoolId} • {s.className}</p>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="text-center font-mono text-[10px] text-emerald-500 font-bold uppercase tracking-widest py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 shadow-lg shadow-black/20">
                            Assignment Payload: {formData.targetIds.length} Entities Selected
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t border-white/5 pt-4 gap-2">
                    {step === 2 && (
                        <Button variant="ghost" onClick={() => setStep(1)} className="mr-auto font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-white">Back: Edit Metadata</Button>
                    )}
                    {step === 1 ? (
                        <Button onClick={() => setStep(2)} disabled={!formData.name || !formData.amount} className="bg-white/10 hover:bg-white/20 text-white border-white/10 font-bold px-8 h-12 rounded-xl">Next: Target Segments</Button>
                    ) : (
                        <Button
                            onClick={handleSave}
                            disabled={submitting || formData.targetIds.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest h-12 px-10 rounded-xl shadow-xl shadow-emerald-950/40"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : (editingFeeId ? "Commit Changes" : "Assign & Finalize")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

