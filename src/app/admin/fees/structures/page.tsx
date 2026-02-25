"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Download, Printer, Search, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/context/MasterDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FeePaymentStructuresPage() {
    const [ledgers, setLedgers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [villageFilter, setVillageFilter] = useState("all");
    const router = useRouter();

    // Report Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<'csv' | 'print'>('csv');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedVillages, setSelectedVillages] = useState<string[]>([]);

    const { classes: classesData, villages: villagesData, branding } = useMasterData();
    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

    const fetchLedgers = async () => {
        try {
            const q = query(collection(db, "student_fee_ledgers"), orderBy("className", "asc"));
            const snap = await getDocs(q);
            setLedgers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedgers();
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
        const headers = ["School ID", "Student Name", "Parent Name", "Mobile", "Village", "Class", "Term Fee", "Transport Fee", "Total Fee", "Total Paid", "Status"];
        const rows = targetData.map(l => {
            const termTotal = l.items?.filter((i: any) => i.type === 'TERM').reduce((sum: number, i: any) => sum + i.amount, 0) || 0;
            const transportItem = l.items?.find((i: any) => i.name?.toLowerCase().includes('bus') || i.name?.toLowerCase().includes('transport'));
            const transportFee = transportItem ? transportItem.amount : 0;

            return [
                l.studentId,
                l.studentName,
                l.parentName,
                l.parentMobile || "",
                l.villageName,
                l.className,
                termTotal,
                transportFee,
                l.totalFee,
                l.totalPaid,
                l.status
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `fee_structures_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsWizardOpen(false);
    };

    const handlePrint = (targetData: any[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Fee Structures Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .header { display: flex; align-items: center; justify-content: center; gap: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 20px; }
                        .logo { height: 80px; width: auto; object-fit: contain; }
                        .header-text { text-align: left; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; }
                        h1 { margin: 0; font-size: 24px; }
                        .header-info { margin-top: 5px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="logo" />` : ''}
                        <div class="header-text">
                            <h1>${branding?.schoolName || 'Spoorthy Concept School'} - Fee Structures</h1>
                            <div class="header-info">
                                Selected Dataset Report | Generated on: ${new Date().toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>School ID</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Standard Fee Payment</th>
                                <th>Transport</th>
                                <th>Total Fee</th>
                                <th>Paid</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${targetData.map(l => {
            const termTotal = l.items?.filter((i: any) => i.type === 'TERM').reduce((sum: number, i: any) => sum + i.amount, 0) || 0;
            const transportItem = l.items?.find((i: any) => i.name?.toLowerCase().includes('bus') || i.name?.toLowerCase().includes('transport'));
            const transportFee = transportItem ? transportItem.amount : 0;
            return `
                                    <tr>
                                        <td>${l.studentId}</td>
                                        <td>${l.studentName}</td>
                                        <td>${l.className}</td>
                                        <td>₹${termTotal.toLocaleString()}</td>
                                        <td>₹${transportFee.toLocaleString()}</td>
                                        <td>₹${(l.totalFee || 0).toLocaleString()}</td>
                                        <td>₹${(l.totalPaid || 0).toLocaleString()}</td>
                                        <td>${l.status}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        setIsWizardOpen(false);
    };

    const handleGenerateReport = () => {
        const targetData = ledgers.filter(l => {
            const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(l.classId) || selectedClasses.includes(l.className);
            const matchesVillage = selectedVillages.length === 0 || selectedVillages.includes(l.villageId) || selectedVillages.includes(l.villageName);
            return matchesClass && matchesVillage;
        });

        if (wizardType === 'csv') exportToCSV(targetData);
        else handlePrint(targetData);
    };

    // Stats
    const totalExpected = filtered.reduce((s, l) => s + (l.totalFee || 0), 0);
    const totalCollected = filtered.reduce((s, l) => s + (l.totalPaid || 0), 0);
    const totalPending = totalExpected - totalCollected;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-none p-0 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pt-4 gap-6 px-2 md:px-0">
                <div>
                    <h1 className="text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Fee Payment Structures
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-lg tracking-tight">Master record of all <span className="text-white font-bold">student fee allocations</span></p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <Button variant="outline" onClick={() => { setWizardType('print'); setIsWizardOpen(true); }} className="h-11 gap-2 border-white/10 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10">
                        <Printer size={16} /> <span className="hidden sm:inline">Print Report</span><span className="sm:hidden">Print</span>
                    </Button>
                    <Button variant="outline" onClick={() => { setWizardType('csv'); setIsWizardOpen(true); }} className="h-11 gap-2 border-white/10 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10">
                        <Download size={16} /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">Export</span>
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2 md:px-0">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 italic">Total Allocation</p>
                    <div className="text-3xl font-mono font-black text-white">₹{totalExpected.toLocaleString()}</div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 italic">Collected Fee Payment</p>
                    <div className="text-3xl font-mono font-black text-white">₹{totalCollected.toLocaleString()}</div>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2 italic">Pending Dues</p>
                    <div className="text-3xl font-mono font-black text-white">₹{totalPending.toLocaleString()}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/10 backdrop-blur-md space-y-4 shadow-2xl mx-2 md:mx-0">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by student name, ID, or parent..."
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
                                    <span className="font-bold text-sm text-white leading-tight">{l.studentName}</span>
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
                        key: "standardFeePayment",
                        header: "Standard Fee Payment",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => {
                            const termTotal = l.items?.filter((i: any) => i.type === 'TERM').reduce((sum: number, i: any) => sum + i.amount, 0) || 0;
                            return <span className="font-mono font-bold text-sm text-white/80">₹{termTotal.toLocaleString()}</span>
                        }
                    },
                    {
                        key: "transport",
                        header: "Transport",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => {
                            const transportItem = l.items?.find((i: any) => i.name?.toLowerCase().includes('bus') || i.name?.toLowerCase().includes('transport'));
                            const transportFee = transportItem ? transportItem.amount : 0;
                            return (
                                <span className={cn(
                                    "font-mono font-bold text-sm",
                                    transportFee > 0 ? "text-cyan-400" : "text-white/10"
                                )}>
                                    ₹{transportFee.toLocaleString()}
                                </span>
                            );
                        }
                    },
                    {
                        key: "totalFee",
                        header: "Total Fee",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => <span className="font-mono font-black text-sm text-white">₹{l.totalFee?.toLocaleString()}</span>
                    },
                    {
                        key: "totalPaid",
                        header: "Total Paid",
                        headerClassName: "text-right",
                        cellClassName: "text-right",
                        render: (l: any) => <span className="font-mono font-black text-sm text-emerald-400">₹{l.totalPaid?.toLocaleString()}</span>
                    },
                    {
                        key: "status",
                        header: "Status",
                        headerClassName: "text-center",
                        cellClassName: "text-center",
                        render: (l: any) => (
                            <Badge variant={l.status === 'PAID' ? 'default' : 'destructive'}
                                className={cn(
                                    "text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none",
                                    l.status === 'PAID' ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                )}>
                                {l.status}
                            </Badge>
                        )
                    }
                ]}
                actions={(l) => (
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="ghost"
                            onClick={() => router.push(`/admin/students/${l.studentDocId || l.id}`)}
                            className="w-full justify-start gap-2 h-9 text-xs font-bold uppercase tracking-tighter"
                        >
                            Full Student Profile
                        </Button>
                    </div>
                )}
            />

            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                <DialogContent className="max-w-2xl bg-[#0A192F] border-white/10 text-white shadow-2xl backdrop-blur-3xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display font-bold italic bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Report Configuration
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-8">
                            {/* Classes Section */}
                            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Filter by Classes</Label>
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
                                <Label className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Filter by Villages</Label>
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
                            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black uppercase tracking-tighter gap-2 rounded-xl border-none shadow-lg shadow-emerald-500/20"
                            onClick={handleGenerateReport}
                        >
                            {wizardType === 'csv' ? <Download size={16} /> : <Printer size={16} />}
                            {wizardType === 'csv' ? 'Export CSV' : 'Print Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
