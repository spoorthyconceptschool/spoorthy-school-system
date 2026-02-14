"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, query, collection, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, Trash2, RefreshCw, Bus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMasterData } from "@/context/MasterDataContext";

interface FeeTerm {
    id: string;
    name: string;
    dueDate: string;
    isActive: boolean;
    amounts: {
        [grade: string]: number;
    };
}

interface ClassItem {
    id: string;
    name: string;
    order: number;
}

export default function FeesPage() {
    const { classes: classesData } = useMasterData();
    const [terms, setTerms] = useState<FeeTerm[]>([]);
    const [transportFees, setTransportFees] = useState<{ [villageId: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Convert master data objects to arrays
    const classes = Object.values(classesData).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Config only (classes from context)
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
            // 1. Save Config
            const docRef = doc(db, "config", "fees");
            await setDoc(docRef, { terms, transportFees }, { merge: true });

            // 2. Auto-Sync (Immediate)
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            const updatedCount = await syncAllStudentLedgers(db);

            alert(`Fee structure saved and ${updatedCount} students synchronized successfully!`);
        } catch (error) {
            console.error("Error saving fees:", error);
            alert("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const addTerm = () => {
        const newId = Date.now().toString();
        setTerms([...terms, {
            id: newId,
            name: `New Term`,
            dueDate: new Date().toISOString().split('T')[0],
            isActive: true,
            amounts: {}
        }]);
    };

    const deleteTerm = (index: number) => {
        const newTerms = [...terms];
        newTerms.splice(index, 1);
        setTerms(newTerms);
    };

    const toggleTerm = (index: number) => {
        const newTerms = [...terms];
        newTerms[index].isActive = !newTerms[index].isActive;
        setTerms(newTerms);
    };

    const updateTermName = (index: number, val: string) => {
        const newTerms = [...terms];
        newTerms[index].name = val;
        setTerms(newTerms);
    };

    const updateAmount = (termIndex: number, className: string, amount: string) => {
        const newTerms = [...terms];
        newTerms[termIndex].amounts = {
            ...newTerms[termIndex].amounts,
            [className]: parseInt(amount) || 0
        };
        setTerms(newTerms);
    };

    const handleSyncAll = async () => {
        if (!confirm("This will synchronize fee structures for ALL students based on their class. This allows new fee terms to appear in their ledgers. Existing payments will remain safe. Continue?")) return;

        setSyncing(true);
        try {
            const { syncAllStudentLedgers } = await import("@/lib/services/fee-service");
            const updatedCount = await syncAllStudentLedgers(db);

            alert(`Synced successfully for ${updatedCount} students.`);

        } catch (error: any) {
            console.error("Sync failed:", error);
            alert("Sync Failed: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold">Fee Management</h1>
                    <p className="text-muted-foreground">Configure term fees for each class and transportation.</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="secondary" className="h-9 border-white/10 bg-white/10 hover:bg-white/20 text-white">
                        <Link href="/admin/fees/custom">
                            Custom Fees
                        </Link>
                    </Button>
                    <Button onClick={handleSyncAll} disabled={syncing || saving} variant="outline" className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing All..." : "Sync All Students"}
                    </Button>
                    <Button onClick={addTerm} variant="outline" className="gap-2 border-white/10 bg-white/5">
                        <Plus className="w-4 h-4" /> Add Term
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2 bg-accent text-accent-foreground">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {terms.map((term, index) => (
                    <Card key={term.id} className="p-6 bg-black/20 border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4 flex-1">
                                <Switch
                                    checked={term.isActive}
                                    onCheckedChange={() => toggleTerm(index)}
                                />
                                <div className="flex-1 max-w-sm gap-2 flex items-center">
                                    <Input
                                        value={term.name}
                                        onChange={(e) => updateTermName(index, e.target.value)}
                                        className="font-bold text-lg h-auto py-1 px-2 -ml-2 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 focus:bg-black/40 transition-all"
                                    />
                                </div>
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
                                    className="w-40 bg-white/5 border-white/10"
                                />
                                <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => deleteTerm(index)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Class Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {classes.map(cls => (
                                <div key={cls.id} className="space-y-1.5 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                    <Label className="text-xs text-muted-foreground uppercase">{cls.name}</Label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                                        <Input
                                            type="number"
                                            value={term.amounts?.[cls.name] || ""}
                                            onChange={(e) => updateAmount(index, cls.name, e.target.value)}
                                            className="bg-black/20 border-white/10 h-8 text-sm pl-5"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Transport Fee Configuration */}
            <TransportFeeConfig
                transportFees={transportFees}
                setTransportFees={setTransportFees}
                saving={saving}
            />

            {terms.length === 0 && (
                <div className="text-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-xl">
                    No terms configured. Click "Add Term" to start.
                </div>
            )}
        </div>
    );
}

function TransportFeeConfig({ transportFees, setTransportFees, saving }: {
    transportFees: { [villageId: string]: number },
    setTransportFees: (v: any) => void,
    saving: boolean
}) {
    const { villages } = useMasterData();
    const sortedVillages = Object.values(villages).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const updateFee = (villageId: string, amount: string) => {
        setTransportFees({
            ...transportFees,
            [villageId]: parseInt(amount) || 0
        });
    };

    return (
        <Card className="p-6 bg-black/20 border-white/10 mt-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Bus className="w-5 h-5 text-yellow-500" />
                        Transport Fees
                    </h2>
                    <p className="text-sm text-muted-foreground">Set annual transport fee based on village/route.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sortedVillages.map((v: any) => (
                    <div key={v.id} className="space-y-1.5 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                        <Label className="text-xs text-muted-foreground uppercase truncate block" title={v.name}>{v.name}</Label>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                            <Input
                                type="number"
                                value={transportFees[v.id] || ""}
                                onChange={(e) => updateFee(v.id, e.target.value)}
                                className="bg-black/20 border-white/10 h-8 text-sm pl-5"
                                placeholder="0"
                            />
                        </div>
                    </div>
                ))}
                {sortedVillages.length === 0 && <div className="col-span-full text-muted-foreground text-sm">No villages found. Add them in Master Data.</div>}
            </div>
        </Card>
    );
}
