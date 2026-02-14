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
            await update(ref(rtdb, `master/villages/${v.id}`), {
                active: !v.active
            });
        } catch (e) { console.error(e); }
    };

    const columns = [
        { key: "name", header: "Village Name", render: (v: any) => <span className="font-bold">{v.name}</span> },
        { key: "code", header: "Code", render: (v: any) => <span className="font-mono text-xs">{v.code}</span> },
        {
            key: "active", header: "Status", render: (v: any) => (
                <span className={`px-2 py-0.5 rounded text-xs ${v.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {v.active ? 'Active' : 'Inactive'}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <h1 className="text-3xl font-display font-bold">Villages</h1>
                <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); setFormData({ name: "", code: "" }); } }}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-accent text-accent-foreground"><Plus size={16} className="mr-2" /> Add Village</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingId ? "Edit Village" : "Add Village"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label>Name</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                            <div><label>Code (Short)</label><Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} maxLength={4} /></div>
                            <Button type="submit" disabled={submitting} className="w-full">{submitting ? <Loader2 className="animate-spin" /> : "Save"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <DataTable
                data={villageList}
                columns={columns}
                isLoading={loading}
                actions={(v) => (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(v)}><Edit2 size={14} className="mr-2" /> Rename</Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => toggleStatus(v)}><Archive size={14} className="mr-2" /> {v.active ? "Deactivate" : "Activate"}</Button>
                    </>
                )}
            />
        </div>
    );
}
