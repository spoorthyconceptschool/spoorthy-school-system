"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit2, Archive, Loader2 } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext"; // READ from RTDB
import { rtdb } from "@/lib/firebase"; // WRITE to RTDB
import { ref, set, update, remove, push } from "firebase/database";

export default function VillagesPage() {
    // Read from Context (Realtime)
    const { villages, loading: contextLoading } = useMasterData();
    // FALLBACK: If villages is undefined/null, use empty object.
    const villageList = Object.values(villages || {});

    // Fallback loading state - if context is loading but no data for > 5 seconds, show empty.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!contextLoading) {
            setLoading(false);
        } else {
            // Timeout to force stop loading if DB is stuck
            const timer = setTimeout(() => setLoading(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [contextLoading]);

    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", code: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Create a promise that rejects after 5 seconds to prevent indefinite hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Database operation timed out. Please check your internet connection or Firebase configuration.")), 5000)
            );

            if (editingId) {
                // Update
                const villageRef = ref(rtdb, `master/villages/${editingId}`);
                await Promise.race([
                    update(villageRef, {
                        name: formData.name,
                        code: formData.code.toUpperCase(),
                        // active: true 
                    }),
                    timeoutPromise
                ]);
            } else {
                // Create
                const newRef = push(ref(rtdb, 'master/villages'));
                await Promise.race([
                    set(newRef, {
                        id: newRef.key,
                        name: formData.name,
                        code: formData.code.toUpperCase(),
                        active: true,
                        studentCount: 0 // Initialize
                    }),
                    timeoutPromise
                ]);
            }
            setOpen(false);
            setFormData({ name: "", code: "" });
            setEditingId(null);
        } catch (error: any) {
            console.error(error);
            alert(`Failed to save village: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (v: any) => {
        setFormData({ name: v.name, code: v.code });
        setEditingId(v.id);
        setOpen(true);
    };

    const toggleStatus = async (v: any) => {
        try {
            // Optimistic update via RTDB
            const villageRef = ref(rtdb, `master/villages/${v.id}`);
            await update(villageRef, { active: !v.active });
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    };

    const columns = [
        { key: "name", header: "Village Name", render: (v: any) => <span className="font-bold">{v.name}</span> },
        { key: "code", header: "Code", render: (v: any) => <span className="font-mono text-xs opacity-50">{v.code}</span> },
        {
            key: "active", header: "Status", render: (v: any) => (
                <button
                    onClick={() => toggleStatus(v)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 ${v.active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                >
                    {v.active ? 'Active' : 'Inactive'}
                </button>
            )
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-display font-bold">Villages & Transport Points</h1>
                    <p className="text-sm text-muted-foreground">Manage service areas for student transport.</p>
                </div>

                <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); setFormData({ name: "", code: "" }); } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-accent text-accent-foreground font-bold"><Plus size={16} className="mr-2" /> Add Village</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border-white/10 text-white">
                        <DialogHeader><DialogTitle>{editingId ? "Edit Village" : "Add New Village"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2"><label className="text-xs uppercase font-bold text-muted-foreground">Village Name</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border-white/10" placeholder="e.g. Rampally" /></div>
                            <div className="space-y-2"><label className="text-xs uppercase font-bold text-muted-foreground">Short Code</label><Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} maxLength={4} className="bg-white/5 border-white/10" placeholder="RMPL" /></div>
                            <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground font-bold">{submitting ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <DataTable
                data={villageList}
                columns={columns}
                isLoading={loading}
                actions={(v) => (
                    <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => handleEdit(v)} title="Edit">
                            <Edit2 size={14} className="text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/10" onClick={() => toggleStatus(v)} title="Toggle Status">
                            <Archive size={14} className={v.active ? "text-red-400" : "text-emerald-400"} />
                        </Button>
                    </div>
                )}
            />
        </div>
    );
}
