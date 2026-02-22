"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, doc, getDocs, updateDoc, deleteDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Users, Crown, Shield, Plus, Trash2, Pencil, Loader2, Printer, Search, X, Image as ImageIcon } from "lucide-react";
import { useMasterData } from "@/context/MasterDataContext";

interface Group {
    id: string;
    name: string;
    code: string; // e.g., RED, BLUE
    color: string; // Hex Code
    symbolUrl?: string; // House Symbol URL
    captainId?: string;
    captainName?: string;
    viceCaptainId?: string;
    viceCaptainName?: string;
    incharges?: { id: string, name: string }[];
    memberCount?: number;
}

const PRESET_COLORS = [
    { name: "Red", value: "#ff4d4d", code: "RED" },
    { name: "Blue", value: "#4d79ff", code: "BLUE" },
    { name: "Green", value: "#00cc66", code: "GREEN" },
    { name: "Yellow", value: "#ffcc00", code: "YELLOW" },
    { name: "Purple", value: "#bf40bf", code: "PURPLE" },
    { name: "Orange", value: "#ff9933", code: "ORANGE" },
];

function SelectionDialog({
    open,
    onOpenChange,
    title,
    options,
    onSelect,
    multiSelect = false,
    initialSelectedIds = [],
    searchPlaceholder = "Search..."
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    options: { id: string; label: string; subtext?: string }[];
    onSelect: (ids: string | string[]) => void;
    multiSelect?: boolean;
    initialSelectedIds?: string[];
    searchPlaceholder?: string;
}) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string[]>(initialSelectedIds);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.subtext?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (id: string) => {
        if (multiSelect) {
            setSelected(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
            );
        } else {
            onSelect(id);
            onOpenChange(false);
        }
    };

    const handleConfirm = () => {
        onSelect(selected);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-[400px] flex flex-col max-h-[80vh] p-0 gap-0">
                <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
                    <DialogTitle>{title}</DialogTitle>
                    {multiSelect && (
                        <Button size="sm" onClick={handleConfirm} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                            Done ({selected.length})
                        </Button>
                    )}
                </DialogHeader>
                <div className="p-2 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-900 border-slate-800 pl-9 focus-visible:ring-slate-700"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
                    <div className="space-y-1">
                        {!multiSelect && (
                            <button
                                onClick={() => { onSelect("none"); onOpenChange(false); }}
                                className="w-full text-left px-3 py-2 rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                            >
                                No assignment (Clear)
                            </button>
                        )}
                        {filteredOptions.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">No results found</div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = selected.includes(opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelect(opt.id)}
                                        className={`w-full text-left px-3 py-2 rounded transition-colors group flex justify-between items-center ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-slate-800'}`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className={`font-medium text-sm ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>{opt.label}</div>
                                            {opt.subtext && <div className="text-xs text-slate-500 truncate">{opt.subtext}</div>}
                                        </div>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function GroupsManager() {
    const { user } = useAuth();
    const { branding } = useMasterData();
    // Data State
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [teachersLoading, setTeachersLoading] = useState(false);

    // Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [selectionType, setSelectionType] = useState<"captain" | "viceCaptain" | "incharge" | null>(null);

    // Form State
    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState("");
    const [formSymbol, setFormSymbol] = useState("");
    const [formCaptain, setFormCaptain] = useState("");
    const [formViceCaptain, setFormViceCaptain] = useState("");
    const [formIncharges, setFormIncharges] = useState<string[]>([]); // Array of IDs
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // View Members State
    const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            fetchGroups();
            fetchStudentsLite();
            fetchTeachers();
        }
    }, [user]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        // Validation: Check size (max 2MB) and type
        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be less than 2MB");
            return;
        }
        if (!file.type.startsWith("image/")) {
            alert("Only image files are allowed");
            return;
        }

        setUploading(true);
        try {
            const token = await user?.getIdToken();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "house_symbol");

            const res = await fetch("/api/admin/media/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Upload failed");
            }
            setFormSymbol(data.url);
        } catch (error: any) {
            console.error("Upload failed", error);
            alert("Failed to upload image: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const fetchTeachers = async () => {
        setTeachersLoading(true);
        try {
            const snap = await getDocs(collection(db, "teachers"));
            const list: any[] = [];
            snap.forEach(d => {
                const data = d.data();
                if (data.status === 'active') {
                    list.push({ id: d.id, name: data.name, email: data.email });
                }
            });
            list.sort((a, b) => a.name.localeCompare(b.name));
            setTeachers(list);
        } catch (e) {
            console.error(e);
        } finally {
            setTeachersLoading(false);
        }
    };

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "groups"));
            const list: Group[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as Group));
            setGroups(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async (groupId: string) => {
        setMembersLoading(true);
        try {
            const q = query(collection(db, "students"), where("groupId", "==", groupId));
            const snap = await getDocs(q);
            const list: any[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            setMembers(list);
        } catch (e) {
            console.error(e);
        } finally {
            setMembersLoading(false);
        }
    };

    const openViewMembers = (g: Group) => {
        setViewingGroup(g);
        setSelectedClasses([]); // Reset filter
        fetchMembers(g.id);
    };

    const fetchStudentsLite = async () => {
        setStudentsLoading(true);
        try {
            const snap = await getDocs(collection(db, "students"));
            const list: any[] = [];
            snap.forEach(d => {
                const data = d.data();
                list.push({ id: d.id, name: data.studentName, class: data.className, section: data.sectionName });
            });
            list.sort((a, b) => a.name.localeCompare(b.name));
            setStudents(list);
        } catch (e) {
            console.error(e);
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formName || !formColor) return;
        setSaving(true);
        try {
            await addDoc(collection(db, "groups"), {
                name: formName,
                color: formColor,
                symbolUrl: formSymbol || null,
                createdAt: new Date()
            });
            setIsCreateOpen(false);
            fetchGroups();
            resetForm();
        } catch (e) {
            alert("Error creating group");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingGroup) return;
        setSaving(true);
        try {
            const updates: any = {
                name: formName,
                color: formColor,
                symbolUrl: formSymbol || null
            };

            // Handle Captain
            if (formCaptain && formCaptain !== "none") {
                const s = students.find(st => st.id === formCaptain);
                if (s) {
                    updates.captainId = s.id;
                    updates.captainName = s.name;
                }
            } else if (formCaptain === "none") {
                updates.captainId = null;
                updates.captainName = null;
            }

            // Handle Vice Captain
            if (formViceCaptain && formViceCaptain !== "none") {
                const s = students.find(st => st.id === formViceCaptain);
                if (s) {
                    updates.viceCaptainId = s.id;
                    updates.viceCaptainName = s.name;
                }
            } else if (formViceCaptain === "none") {
                updates.viceCaptainId = null;
                updates.viceCaptainName = null;
            }

            // Handle Teacher Incharges (Multiple)
            if (formIncharges && formIncharges.length > 0) {
                const selectedTeachers = teachers.filter(t => formIncharges.includes(t.id));
                updates.incharges = selectedTeachers.map(t => ({ id: t.id, name: t.name }));
            } else {
                updates.incharges = [];
            }

            await updateDoc(doc(db, "groups", editingGroup.id), updates);
            setIsEditOpen(false);
            fetchGroups();
            resetForm();
        } catch (e) {
            console.error(e);
            alert("Error updating group");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will remove the group but students will remain assigned to the deleted group ID until updated.")) return;
        try {
            await deleteDoc(doc(db, "groups", id));
            fetchGroups();
        } catch (e) {
            alert("Error deleting group");
        }
    };

    const openEdit = (g: Group) => {
        setEditingGroup(g);
        setFormName(g.name);
        setFormColor(g.color);
        setFormSymbol(g.symbolUrl || "");
        setFormCaptain(g.captainId || "");
        setFormViceCaptain(g.viceCaptainId || "");

        // Populate incharges form state
        if (g.incharges && Array.isArray(g.incharges)) {
            setFormIncharges(g.incharges.map(i => i.id));
        } else if ((g as any).inchargeId) {
            // Backward compatibility
            setFormIncharges([(g as any).inchargeId]);
        } else {
            setFormIncharges([]);
        }

        setIsEditOpen(true);
    };

    const resetForm = () => {
        setFormName("");
        setFormColor("");
        setFormSymbol("");
        setFormCaptain("");
        setFormViceCaptain("");
        setFormIncharges([]);
        setEditingGroup(null);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !viewingGroup) return;

        // Filter members based on selection
        const filteredMembers = selectedClasses.length > 0
            ? members.filter(m => selectedClasses.includes(m.className))
            : members;

        // Group by Class
        const groupedMembers: Record<string, any[]> = {};
        const sortedClasses = Array.from(new Set(filteredMembers.map(m => m.className))).sort();

        sortedClasses.forEach(cls => {
            groupedMembers[cls] = filteredMembers
                .filter(m => m.className === cls)
                .sort((a, b) => a.studentName.localeCompare(b.studentName));
        });

        const inchargesList = viewingGroup.incharges
            ? viewingGroup.incharges.map(i => i.name).join(", ")
            : (viewingGroup as any).inchargeName || "Not Assigned";

        const html = `
            <html>
            <head>
                <title>${viewingGroup.name} - Student List</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
                    .header { text-align: center; border-bottom: 2px solid ${viewingGroup.color}; padding-bottom: 20px; margin-bottom: 20px; position: relative; }
                    .header-content { display: flex; align-items: center; justify-content: center; gap: 40px; }
                    .logo-container { display: flex; flex-direction: column; align-items: center; gap: 5px; }
                    .school-logo { height: 70px; width: auto; }
                    .house-logo { height: 70px; width: auto; object-fit: contain; }
                    h1 { color: #333; margin: 0; font-size: 28px; }
                    h2 { color: ${viewingGroup.color}; margin: 5px 0 0 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                    .meta { text-align: center; margin-bottom: 20px; color: #666; font-size: 14px; }
                    .leadership { display: flex; gap: 20px; justify-content: space-around; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; }
                    .role { text-align: center; }
                    .role strong { display: block; font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
                    .role span { font-size: 14px; font-weight: 600; color: #333; }
                    
                    .class-section { margin-bottom: 40px; page-break-inside: avoid; }
                    .class-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #444; border-left: 4px solid ${viewingGroup.color}; padding-left: 10px; }
                    
                    table { w-full; border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                    th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 11px; color: #555; }
                    tr:nth-child(even) { background-color: #fcfcfc; }
                    
                    .total { margin-top: 20px; font-weight: bold; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
                    
                    @media print {
                        .class-section { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-content">
                        <div class="logo-container">
                            ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="school-logo" />` : ''}
                        </div>
                        <div style="text-align: center;">
                            <h1 style="margin: 0;">${branding?.schoolName}</h1>
                            <h2>${viewingGroup.name} House</h2>
                        </div>
                        <div class="logo-container">
                            ${viewingGroup.symbolUrl ? `<img src="${viewingGroup.symbolUrl}" class="house-logo" />` : ''}
                        </div>
                    </div>
                </div>
                <div class="meta">
                    Generated on ${new Date().toLocaleDateString()} &bull; ${selectedClasses.length > 0 ? 'Fitered List' : 'Full House List'}
                </div>
                
                <div class="leadership">
                    <div class="role">
                        <strong>Teachers Incharge</strong>
                        <span>${inchargesList}</span>
                    </div>
                    <div class="role">
                        <strong>Captain</strong>
                        <span>${viewingGroup.captainName || 'Not Assigned'}</span>
                    </div>
                    <div class="role">
                        <strong>Vice Captain</strong>
                        <span>${viewingGroup.viceCaptainName || 'Not Assigned'}</span>
                    </div>
                </div>

                ${sortedClasses.map(cls => `
                    <div class="class-section">
                        <div class="class-header">${cls}</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40px">No.</th>
                                    <th>Student Name</th>
                                    <th>Section</th>
                                    <th>School ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groupedMembers[cls].map((m, i) => `
                                    <tr>
                                        <td style="text-align: center">${i + 1}</td>
                                        <td style="font-weight: bold">${m.studentName}</td>
                                        <td>${m.sectionName}</td>
                                        <td>${m.schoolId || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}

                <div class="total">Total Listed Students: ${filteredMembers.length}</div>
                <script>
                    window.onload = () => { window.print(); window.close(); };
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const toggleClassSelection = (cls: string) => {
        setSelectedClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        );
    };

    const availableClasses = Array.from(new Set(members.map(m => m.className))).sort();

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-white" /></div>;

    const studentOptions = students.map(s => ({
        id: s.id,
        label: s.name,
        subtext: `${s.class}-${s.section}`
    }));

    const teacherOptions = teachers.map(t => ({
        id: t.id,
        label: t.name,
        subtext: t.email
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="flex gap-2">
                    {/* Filter or Search Could Go Here */}
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" /> New Group
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groups.map(group => (
                    <Card key={group.id} className="bg-slate-900/50 border-slate-800 flex flex-col hover:border-slate-700 transition-colors group">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-slate-800 overflow-hidden relative" style={{ borderColor: group.color, borderWidth: 2 }}>
                                    {group.symbolUrl ? (
                                        <img src={group.symbolUrl} alt={group.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Shield className="w-6 h-6 text-white mix-blend-overlay" style={{ color: group.color }} />
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800" onClick={() => openViewMembers(group)} title="View Members">
                                        <Users className="w-4 h-4 text-emerald-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800" onClick={() => openEdit(group)} title="Edit Group">
                                        <Pencil className="w-4 h-4 text-blue-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800" onClick={() => handleDelete(group.id)}>
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="text-xl mt-4 text-white">{group.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1">
                            {/* Leadership */}
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50 border border-slate-800">
                                    <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Captain</p>
                                        <p className="text-sm font-medium text-slate-200 truncate">{group.captainName || "Not Assigned"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50 border border-slate-800">
                                    <Crown className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Vice Captain</p>
                                        <p className="text-sm font-medium text-slate-200 truncate">{group.viceCaptainName || "Not Assigned"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-2 rounded bg-slate-800/50 border border-slate-800">
                                    <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Teachers Incharge</p>
                                        {group.incharges && group.incharges.length > 0 ? (
                                            <div className="text-sm font-medium text-slate-200 flex flex-col">
                                                {group.incharges.map(inc => (
                                                    <span key={inc.id} className="truncate">{inc.name}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-slate-200 truncate">
                                                {(group as any).inchargeName || "Not Assigned"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {groups.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-lg text-slate-500">
                        No groups defined. Create grouped houses or teams to get started.
                    </div>
                )}
            </div>

            {/* View Members Modal */}
            <Dialog open={!!viewingGroup} onOpenChange={(open) => !open && setViewingGroup(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            {viewingGroup?.symbolUrl && (
                                <img src={viewingGroup.symbolUrl} className="w-8 h-8 object-contain" />
                            )}
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: viewingGroup?.color }} />
                            Members: {viewingGroup?.name}
                        </DialogTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mr-8 gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                            onClick={handlePrint}
                        >
                            <Printer className="w-4 h-4" /> Print List
                        </Button>
                    </DialogHeader>

                    <div className="px-6 py-2 border-b border-slate-800">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {availableClasses.map(cls => (
                                <Badge
                                    key={cls}
                                    variant={selectedClasses.includes(cls) ? "default" : "outline"}
                                    className={`cursor-pointer select-none ${selectedClasses.includes(cls) ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-400 hover:text-white border-slate-700'}`}
                                    onClick={() => toggleClassSelection(cls)}
                                >
                                    {cls}
                                </Badge>
                            ))}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-slate-500 hover:text-white px-2"
                                onClick={() => setSelectedClasses([])}
                            >
                                Clear Filter
                            </Button>
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Select specific classes to filter the print list. Leave empty to print all.
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 px-6">
                        {membersLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : members.length === 0 ? (
                            <div className="text-center p-8 text-slate-500 border border-dashed border-slate-800 rounded">
                                No students assigned to this group yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(selectedClasses.length > 0 ? members.filter(m => selectedClasses.includes(m.className)) : members).map((m) => (
                                    <div key={m.id} className="p-3 bg-slate-900/50 border border-slate-800 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-sm text-slate-200">{m.studentName}</div>
                                            <div className="text-xs text-slate-500">{m.className} - {m.sectionName} ({m.rollNo})</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                        <div>
                            {selectedClasses.length > 0 && (
                                <span className="text-emerald-500">Filtered: {selectedClasses.join(", ")}</span>
                            )}
                        </div>
                        <div>Total Members: {members.length}</div>
                    </div>
                </DialogContent >
            </Dialog >

            {/* Create Modal */}
            < Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} >
                <DialogContent className="bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Group Name</Label>
                            <Input
                                placeholder="e.g. Red Dragons"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className="bg-slate-900 border-slate-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Theme Color</Label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setFormColor(c.value)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${formColor === c.value ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={formColor}
                                    onChange={e => setFormColor(e.target.value)}
                                    className="w-8 h-8 rounded-full overflow-hidden border-0 p-0 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Group Symbol</Label>
                            <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 rounded border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden">
                                    {formSymbol ? (
                                        <img src={formSymbol} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-slate-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="bg-slate-900 border-slate-800 text-xs"
                                    />
                                    {uploading && <p className="text-[10px] text-emerald-500 mt-1">Uploading...</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving || !formName || !formColor || uploading} className="bg-emerald-600 hover:bg-emerald-700">
                            {saving ? <Loader2 className="animate-spin" /> : "Create Group"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Selection Dialog */}
            {selectionType && (
                <SelectionDialog
                    open={!!selectionType}
                    onOpenChange={(open) => !open && setSelectionType(null)}
                    title={
                        selectionType === 'captain' ? "Select Captain" :
                            selectionType === 'viceCaptain' ? "Select Vice Captain" :
                                "Select Teacher Incharges"
                    }
                    multiSelect={selectionType === 'incharge'}
                    initialSelectedIds={
                        selectionType === 'incharge' ? formIncharges :
                            selectionType === 'captain' ? (formCaptain ? [formCaptain] : []) :
                                selectionType === 'viceCaptain' ? (formViceCaptain ? [formViceCaptain] : []) : []
                    }
                    options={selectionType === 'incharge' ? teacherOptions : studentOptions}
                    onSelect={(val) => {
                        if (selectionType === 'captain') setFormCaptain(val as string);
                        if (selectionType === 'viceCaptain') setFormViceCaptain(val as string);
                        if (selectionType === 'incharge') setFormIncharges(val as string[]);
                    }}
                />
            )}

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Management: {editingGroup?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Basic Info (Name/Color) not editable here for simplicity, or add them? 
                           Wait, original code had them. I should keep them. */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Group Name</Label>
                                <Input
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="bg-slate-900 border-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Theme Color</Label>
                                <div className="flex gap-2 items-center h-10 px-2 rounded bg-slate-900 border border-slate-800">
                                    <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: formColor }} />
                                    <input
                                        type="color"
                                        value={formColor}
                                        onChange={e => setFormColor(e.target.value)}
                                        className="w-full bg-transparent border-0 opacity-0 absolute inset-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono text-slate-400 ml-auto">{formColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Group Symbol</Label>
                            <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 rounded border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden">
                                    {formSymbol ? (
                                        <img src={formSymbol} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-slate-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="bg-slate-900 border-slate-800 text-xs"
                                    />
                                    {uploading && <p className="text-[10px] text-emerald-500 mt-1">Uploading...</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-800">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Leadership</h4>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Crown className="w-3 h-3 text-yellow-500" /> Captain
                                </Label>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white"
                                    onClick={() => setSelectionType('captain')}
                                >
                                    <span className={formCaptain && formCaptain !== "none" ? "text-slate-200" : "text-slate-400"}>
                                        {formCaptain && formCaptain !== "none"
                                            ? students.find(s => s.id === formCaptain)?.name || "Unknown Student"
                                            : "Select Captain"}
                                    </span>
                                    <Search className="h-4 w-4 opacity-90" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Crown className="w-3 h-3 text-slate-400" /> Vice Captain
                                </Label>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white"
                                    onClick={() => setSelectionType('viceCaptain')}
                                >
                                    <span className={formViceCaptain && formViceCaptain !== "none" ? "text-slate-200" : "text-slate-400"}>
                                        {formViceCaptain && formViceCaptain !== "none"
                                            ? students.find(s => s.id === formViceCaptain)?.name || "Unknown Student"
                                            : "Select Vice Captain"}
                                    </span>
                                    <Search className="h-4 w-4 opacity-90" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-emerald-500" /> Teachers Incharge
                                </Label>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white min-h-[44px] h-auto py-2"
                                    onClick={() => setSelectionType('incharge')}
                                >
                                    <span className={`text-left ${formIncharges && formIncharges.length > 0 ? "text-slate-200" : "text-slate-400"}`}>
                                        {formIncharges && formIncharges.length > 0
                                            ? `${formIncharges.length} Selected`
                                            : "Select Teachers Incharge"}
                                    </span>
                                    <Search className="h-4 w-4 opacity-90 ml-2" />
                                </Button>
                                {/* Display selected incharges below */}
                                {formIncharges.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {formIncharges.map(id => {
                                            const teacher = teachers.find(t => t.id === id);
                                            return teacher ? (
                                                <Badge key={id} variant="outline" className="text-xs border-slate-700 bg-slate-800/50">
                                                    {teacher.name}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFormIncharges(prev => prev.filter(pid => pid !== id));
                                                        }}
                                                        className="ml-2 hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
