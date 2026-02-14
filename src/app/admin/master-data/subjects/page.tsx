"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";
import { rtdb } from "@/lib/firebase";
import { ref, update, push, set, remove } from "firebase/database";

export default function SubjectsPage() {
    const { subjects, loading } = useMasterData();
    const subjectList = Object.values(subjects || {});

    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", code: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Create a promise that rejects after 5 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Database operation timed out.")), 5000)
            );

            if (editingId) {
                await Promise.race([
                    update(ref(rtdb, `master/subjects/${editingId}`), {
                        name: formData.name,
                        code: formData.code.toUpperCase()
                    }),
                    timeoutPromise
                ]);
            } else {
                const newRef = push(ref(rtdb, 'master/subjects'));
                await Promise.race([
                    set(newRef, {
                        id: newRef.key,
                        name: formData.name,
                        code: formData.code.toUpperCase()
                    }),
                    timeoutPromise
                ]);
            }
            setOpen(false); setFormData({ name: "", code: "" }); setEditingId(null);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to save subject: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (s: any) => {
        setFormData({ name: s.name, code: s.code || "" });
        setEditingId(s.id);
        setOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this subject?")) await remove(ref(rtdb, `master/subjects/${id}`));
    };

    const columns = [
        { key: "name", header: "Subject Name", render: (s: any) => <span className="font-bold">{s.name}</span> },
        { key: "code", header: "Subject Code", render: (s: any) => <span className="font-mono text-xs font-bold bg-accent/50 px-2 py-1 rounded">{s.code}</span> },
    ];

    return (
        <div className="space-y-6 max-w-none p-0 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <h1 className="text-3xl font-display font-bold">Subjects</h1>
                <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); setFormData({ name: "", code: "" }); } }}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-accent text-accent-foreground"><Plus size={16} className="mr-2" /> Add Subject</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingId ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label>Subject Name</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                            <div><label>Short Code</label><Input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} maxLength={4} placeholder="e.g. MATH" /></div>
                            <Button type="submit" disabled={submitting} className="w-full">{submitting ? <Loader2 className="animate-spin" /> : "Save"}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <DataTable
                data={subjectList}
                columns={columns}
                isLoading={loading}
                actions={(s) => (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}><Edit2 size={14} className="mr-2" /> Rename</Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></Button>
                    </>
                )}
            />
        </div>
    );
}
