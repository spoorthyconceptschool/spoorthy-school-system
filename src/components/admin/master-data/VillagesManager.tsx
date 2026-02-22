"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit2, Archive, Loader2 } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { rtdb } from "@/lib/firebase";
import { ref, set, update, remove, push } from "firebase/database";

export function VillagesManager() {
    const { villages, loading: contextLoading } = useMasterData();
    const villageList = Object.values(villages || {});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!contextLoading) {
            setLoading(false);
        } else {
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
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Database operation timed out.")), 5000)
            );

            if (editingId) {
                const villageRef = ref(rtdb, `master/villages/${editingId}`);
                await Promise.race([
                    update(villageRef, {
                        name: formData.name,
                        code: formData.code.toUpperCase(),
                    }),
                    timeoutPromise
                ]);
            } else {
                const newRef = push(ref(rtdb, 'master/villages'));
                await Promise.race([
                    set(newRef, {
                        id: newRef.key,
                        name: formData.name,
                        code: formData.code.toUpperCase(),
                        active: true,
                        studentCount: 0
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
                <p className="text-muted-foreground text-[10px] md:text-sm tracking-tight uppercase font-black opacity-50">
                    Manage Transport Locations
                </p>
                <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); setFormData({ name: "", code: "" }); } }}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-accent text-accent-foreground"><Plus size={16} className="mr-2" /> Add Village</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black/95 border-white/10 text-white">
                        <DialogHeader><DialogTitle>{editingId ? "Edit Village" : "Add Village"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Village Name</label>
                                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Code (Short)</label>
                                <Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} maxLength={4} className="bg-white/5 border-white/10" />
                            </div>
                            <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:opacity-90 transition-opacity">
                                {submitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <DataTable
                data={villageList}
                columns={columns}
                isLoading={loading}
                actions={(v) => (
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(v)} className="hover:bg-white/5"><Edit2 size={14} className="mr-2" /> Rename</Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => toggleStatus(v)}><Archive size={14} className="mr-2" /> {v.active ? "Deactivate" : "Activate"}</Button>
                    </div>
                )}
            />
        </div>
    );
}
