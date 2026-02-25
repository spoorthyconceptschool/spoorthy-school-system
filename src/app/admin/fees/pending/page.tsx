"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Download, Printer, Search, FileText, Bell, User, MapPin, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/context/MasterDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FeeSlipGenerator } from "@/components/admin/fee-slip-generator";

export default function FeePendingsPage() {
    const [ledgers, setLedgers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [villageFilter, setVillageFilter] = useState("all");
    const router = useRouter();

    const { user } = useAuth();

    // Report Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<'csv' | 'table' | 'notify'>('table');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    const { classes: classesData, villages: villagesData, branding } = useMasterData();
    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

    const fetchPendings = async () => {
        try {
            // 1. Fetch ledgers with pending status
            const q = query(collection(db, "student_fee_ledgers"), where("status", "==", "PENDING"));
            const snap = await getDocs(q);

            const rawLedgers: any[] = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    pendingAmount: (data.totalFee || 0) - (data.totalPaid || 0)
                };
            }).filter(l => l.pendingAmount > 0);

            // 2. Perform Join & Enrichment using denormalized data in ledgers
            const joined = rawLedgers.map(l => {
                // Denormalized fields check
                const transportItem = l.items?.find((i: any) => i.type === "TRANSPORT");
                const transportFee = transportItem?.amount || 0;

                const customItems = l.items?.filter((i: any) => i.type === "CUSTOM");
                const customFee = customItems?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;

                return {
                    ...l,
                    studentDocId: l.studentId, // We use schoolId as key usually, or document link
                    parentName: l.parentName || "N/A",
                    parentMobile: l.parentMobile || "N/A",
                    villageId: l.villageId || "",
                    villageName: l.villageName || "N/A",
                    sectionName: l.sectionName || "",
                    transportFee,
                    customFee
                };
            }).sort((a, b) => b.pendingAmount - a.pendingAmount);

            setLedgers(joined);
        } catch (e) {
            console.error("Fetch Pendings Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendings();
    }, []);

    const filtered = ledgers.filter(l => {
        const matchesSearch = !search ||
            l.studentId?.toLowerCase().includes(search.toLowerCase()) ||
            l.studentName?.toLowerCase().includes(search.toLowerCase()) ||
            l.parentName?.toLowerCase().includes(search.toLowerCase()) ||
            l.parentMobile?.toLowerCase().includes(search.toLowerCase()) ||
            l.villageName?.toLowerCase().includes(search.toLowerCase()) ||
            l.className?.toLowerCase().includes(search.toLowerCase());

        const matchesClass = classFilter === "all" || l.classId === classFilter || l.className === classFilter;
        const matchesVillage = villageFilter === "all" || l.villageId === villageFilter || l.villageName === villageFilter;

        return matchesSearch && matchesClass && matchesVillage;
    });

    const exportToCSV = (targetData: any[]) => {
        const headers = ["School ID", "Student Name", "Parent Name", "Mobile", "Village", "Class", "Standard Fee Payment", "Transport Fee", "Custom Fee", "Total Fee", "Paid", "Pending Balance"];
        const rows = targetData.map(l => [
            l.studentId,
            l.studentName,
            l.parentName,
            l.parentMobile || "",
            l.villageName,
            l.className,
            (l.totalFee || 0) - (l.transportFee || 0) - (l.customFee || 0),
            l.transportFee || 0,
            l.customFee || 0,
            l.totalFee,
            l.totalPaid,
            l.pendingAmount
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pending_dues_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsWizardOpen(false);
    };

    const handlePrint = (targetData: any[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const timestamp = new Date().toLocaleString();
        const subsetTotalDues = targetData.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);

        const content = `
                <html>
                <head>
                    <title>Dues Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                        th { background-color: #f2f2f2; }
                        h1 { text-align: center; color: #cc0000; margin-bottom: 5px; }
                        .header-meta { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
                        .summary { margin: 20px 0; font-weight: bold; border: 1px solid #ffcccc; padding: 10px; background: #fff5f5; border-radius: 5px; }
                        .branding { display: flex; align-items: center; justify-content: center; gap: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                        .school-info h1 { margin: 0; font-size: 24px; text-align: left; }
                        .school-info p { margin: 2px 0; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="branding">
                        ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" style="height: 60px;" />` : ''}
                        <div class="school-info">
                            <h1>${branding?.schoolName}</h1>
                            <p>${branding?.address || ""}</p>
                            <p><strong>Pending Dues Report</strong> | ${timestamp}</p>
                        </div>
                    </div>
                    <div class="summary">
                        Total Outstanding: ₹${subsetTotalDues.toLocaleString()} | Total Pending Accounts: ${targetData.length}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Class & Sec</th>
                                <th>Village</th>
                                <th>Parent Name</th>
                                <th>Parent Mobile</th>
                                <th>Transport Fee</th>
                                <th>Custom Fees</th>
                                <th>Total Fee</th>
                                <th>Paid</th>
                                <th style="background: #ffe6e6;">Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${targetData.map(l => `
                                <tr>
                                    <td style="font-weight:bold;">${l.studentName}</td>
                                    <td>${l.className} - ${l.sectionName || ''}</td>
                                    <td>${l.villageName}</td>
                                    <td>${l.parentName}</td>
                                    <td style="font-weight:bold; color: #1a56db;">${l.parentMobile || ""}</td>
                                    <td>₹${(l.transportFee || 0).toLocaleString()}</td>
                                    <td>₹${(l.customFee || 0).toLocaleString()}</td>
                                    <td>₹${l.totalFee?.toLocaleString()}</td>
                                    <td>₹${l.totalPaid?.toLocaleString()}</td>
                                    <td style="color:red; font-weight:black; font-size: 13px;">₹${l.pendingAmount?.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>
                        window.onload = () => { window.print(); window.close(); };
                    </script>
                </body>
                </html>
            `;

        printWindow.document.write(content);
        printWindow.document.close();
        setIsWizardOpen(false);
    };

    const handleGenerateReport = async () => {
        if (wizardType === 'notify') {
            setSending(true);
            try {
                const token = await user?.getIdToken();
                const res = await fetch("/api/admin/fees/notify", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ selectedClasses, selectedVillages })
                });
                const data = await res.json();
                if (data.success) {
                    toast({ title: "Notifications Sent", description: data.message, type: "success" });
                    setIsWizardOpen(false);
                } else {
                    throw new Error(data.error || "Failed to send notifications");
                }
            } catch (e: any) {
                toast({ title: "Error", description: e.message, type: "error" });
            } finally {
                setSending(false);
            }
            return;
        }

        const targetData = ledgers.filter(l => {
            const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(l.classId) || selectedClasses.includes(l.className);
            const matchesVillage = selectedVillages.length === 0 || selectedVillages.includes(l.villageId) || selectedVillages.includes(l.villageName);
            return matchesClass && matchesVillage;
        });

        if (wizardType === 'csv') exportToCSV(targetData);
        else handlePrint(targetData);
    };

    const totalDuesAmount = filtered.reduce((sum, l) => sum + (l.pendingAmount || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-none p-0 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pt-4 gap-6 px-2 md:px-0">
                <div>
                    <h1 className="text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent italic leading-tight">
                        Pending Dues
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-lg tracking-tight">Recovering <span className="text-white font-bold">outstanding school fee payment</span></p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <Button
                        variant="destructive"
                        className="h-11 gap-2 bg-red-600/10 border-red-500/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10"
                        onClick={() => { setWizardType('notify'); setIsWizardOpen(true); }}
                    >
                        <Bell size={16} /> <span className="hidden sm:inline">Bulk Notify</span><span className="sm:hidden">Notify</span>
                    </Button>
                    <FeeSlipGenerator
                        students={ledgers.map(l => ({
                            schoolId: l.studentId,
                            studentName: l.studentName,
                            className: l.className,
                            sectionName: l.sectionName || ""
                        }))}
                    />
                    <Button variant="outline" onClick={() => { setWizardType('table'); setIsWizardOpen(true); }} className="h-11 gap-2 border-white/10 bg-white/5 rounded-xl hover:bg-white/10">
                        <Printer size={16} /> <span className="hidden sm:inline">Print Dues List</span><span className="sm:hidden">Print</span>
                    </Button>
                    <Button variant="outline" onClick={() => { setWizardType('csv'); setIsWizardOpen(true); }} className="h-11 gap-2 border-white/10 bg-white/5 rounded-xl hover:bg-white/10">
                        <Download size={16} /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">CSV</span>
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2 md:px-0">
                <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                        <ShieldAlert size={24} className="text-red-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-0.5 italic">Total Outstanding</p>
                        <div className="text-3xl font-mono font-black text-white">₹{totalDuesAmount.toLocaleString()}</div>
                    </div>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                        <User size={24} className="text-orange-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5 italic">Pending Accounts</p>
                        <div className="text-3xl font-mono font-black text-white">{filtered.length} <span className="text-xs text-orange-400/50">Students</span></div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/10 backdrop-blur-md space-y-4 shadow-2xl mx-2 md:mx-0">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by student name, parent, or mobile..."
                        className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-accent/30"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2">
                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-full lg:w-[180px] h-12 bg-white/5 border-white/10 rounded-xl">
                            <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">All Classes</SelectItem>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={villageFilter} onValueChange={setVillageFilter}>
                        <SelectTrigger className="w-full lg:w-[180px] h-12 bg-white/5 border-white/10 rounded-xl">
                            <SelectValue placeholder="All Villages" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">All Villages</SelectItem>
                            {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {(classFilter !== "all" || villageFilter !== "all" || search) && (
                        <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setClassFilter("all"); setVillageFilter("all"); }} className="h-12 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-xl border border-dashed border-white/10 transition-all">
                            Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Content View */}
            <DataTable
                data={filtered}
                isLoading={loading}
                onRowClick={(l) => router.push(`/admin/students/${l.studentDocId || l.id}`)}
                columns={[
                    {
                        key: "studentName",
                        header: "Student Info",
                        render: (l: any) => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                    <User size={14} className="text-white/40" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-white leading-tight group-hover:text-red-400 transition-colors uppercase">{l.studentName}</span>
                                    <span className="text-[10px] font-mono text-white/40 tracking-tighter uppercase">{l.studentId}</span>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: "className",
                        header: "Class & Village",
                        render: (l: any) => (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">{l.className}</span>
                                <div className="flex items-center gap-1 text-[10px] text-white/30">
                                    <MapPin size={10} />
                                    <span className="truncate max-w-[120px]">{l.villageName}</span>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: "totalFee",
                        header: "Total Fee",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => <span className="font-mono font-bold text-sm text-white/40 italic">₹{l.totalFee?.toLocaleString()}</span>
                    },
                    {
                        key: "totalPaid",
                        header: "Paid",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => <span className="font-mono font-black text-sm text-emerald-400/60">₹{l.totalPaid?.toLocaleString()}</span>
                    },
                    {
                        key: "pendingAmount",
                        header: "Balance Due",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => (
                            <div className="flex flex-col items-end">
                                <span className="font-mono font-black text-lg text-red-500">₹{l.pendingAmount?.toLocaleString()}</span>
                                {l.totalPaid > 0 && <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-tighter">Partially Paid</span>}
                            </div>
                        )
                    },
                    {
                        key: "parentName",
                        header: "Parent Info",
                        render: (l: any) => (
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white/90">{l.parentName || "N/A"}</span>
                                <span className="text-[10px] font-mono text-emerald-400">{l.parentMobile || "N/A"}</span>
                            </div>
                        )
                    },
                    {
                        key: "breakdown",
                        header: "Breakdown",
                        render: (l: any) => (
                            <div className="flex flex-col gap-0.5 text-[10px]">
                                <span className="text-white/40 italic">Transport: ₹{l.transportFee || 0}</span>
                                <span className="text-white/40 italic">Custom: ₹{l.customFee || 0}</span>
                            </div>
                        )
                    },
                    {
                        key: "status",
                        header: "Status",
                        headerClassName: "text-center",
                        cellClassName: "text-center",
                        render: (l: any) => (
                            <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                {l.status}
                            </Badge>
                        )
                    }
                ]}
                actions={(l) => (
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/students/${l.studentDocId || l.id}`);
                            }}
                            className="w-full justify-start gap-2 h-9 text-xs font-bold uppercase tracking-tighter text-red-400 hover:text-white hover:bg-red-500/20"
                        >
                            Collect Fee Payment
                        </Button>
                    </div>
                )}
            />

            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                <DialogContent className="max-w-2xl bg-[#0A192F] border-white/10 text-white shadow-2xl backdrop-blur-3xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display font-bold italic bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                            {wizardType === 'notify' ? 'Fee Notification Wizard' : 'Report Configuration'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {wizardType === 'notify' && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-200/80 leading-relaxed italic">
                                <strong className="text-red-400 block mb-1">Warning:</strong>
                                Bulk notifications will be sent to parents of students with outstanding dues in the selected categories. This action is tracked in the system audit logs.
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Classes Section */}
                            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Target Classes</Label>
                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                        <Checkbox
                                            id="all-classes"
                                            className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            checked={selectedClasses.length === 0}
                                            onCheckedChange={(checked) => checked ? setSelectedClasses([]) : null}
                                        />
                                        <Label htmlFor="all-classes" className="text-sm font-bold opacity-80 cursor-pointer">All Classes</Label>
                                    </div>
                                    {classes.map(c => (
                                        <div key={c.id} className="flex items-center gap-3 py-1">
                                            <Checkbox
                                                id={`class-${c.id}`}
                                                className="border-white/10 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                checked={selectedClasses.includes(c.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedClasses([...selectedClasses, c.id]);
                                                    else setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                                                }}
                                            />
                                            <Label htmlFor={`class-${c.id}`} className="text-xs font-medium opacity-60 cursor-pointer hover:opacity-100 transition-opacity">{c.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Villages Section */}
                            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Target Villages</Label>
                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                        <Checkbox
                                            id="all-villages"
                                            className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                            checked={selectedVillages.length === 0}
                                            onCheckedChange={(checked) => checked ? setSelectedVillages([]) : null}
                                        />
                                        <Label htmlFor="all-villages" className="text-sm font-bold opacity-80 cursor-pointer">All Villages</Label>
                                    </div>
                                    {villages.map(v => (
                                        <div key={v.id} className="flex items-center gap-3 py-1">
                                            <Checkbox
                                                id={`village-${v.id}`}
                                                className="border-white/10 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                                checked={selectedVillages.includes(v.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedVillages([...selectedVillages, v.id]);
                                                    else setSelectedVillages(selectedVillages.filter(id => id !== v.id));
                                                }}
                                            />
                                            <Label htmlFor={`village-${v.id}`} className="text-xs font-medium opacity-60 cursor-pointer hover:opacity-100 transition-opacity">{v.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsWizardOpen(false)} className="rounded-xl hover:bg-white/5">Cancel</Button>
                        <Button
                            className={cn(
                                "text-white font-black uppercase tracking-tighter gap-2 rounded-xl border-none shadow-lg transition-all",
                                wizardType === 'notify' ? "bg-red-600 hover:bg-red-500 shadow-red-500/20" : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-500/20"
                            )}
                            onClick={handleGenerateReport}
                            disabled={sending}
                        >
                            {sending ? <Loader2 className="animate-spin" size={16} /> : (
                                wizardType === 'csv' ? <Download size={16} /> :
                                    wizardType === 'notify' ? <Bell size={16} /> : <Printer size={16} />
                            )}
                            {wizardType === 'notify' ? 'Dispatch Notifications' : 'Generate Dataset'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
