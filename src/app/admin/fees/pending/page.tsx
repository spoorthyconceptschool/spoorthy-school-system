"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Download, Printer, Search, FileText, Bell, User, MapPin, ShieldAlert, ArrowLeft, AlertCircle, IndianRupee, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/context/MasterDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { FeeSlipGenerator } from "@/components/admin/fee-slip-generator";
import Link from "next/link";

const DEFAULT_PENDING_LEDGERS = [
    {
        id: "ledger_default_1",
        studentId: "SHS1001",
        studentName: "Aarav Sharma",
        parentName: "Vikram Sharma",
        parentMobile: "9876543210",
        className: "Class 1",
        sectionName: "A",
        villageName: "Miyapur",
        villageId: "VIL_001",
        totalFee: 45000,
        totalPaid: 15000,
        pendingAmount: 30000,
        status: "PENDING",
        studentStatus: "ACTIVE",
        academicYearId: "2025-2026",
        items: [
            { id: "t1", name: "I Term Fee", amount: 15000, paidAmount: 15000, type: "TERM", status: "PAID", dueDate: "2025-06-01" },
            { id: "t2", name: "II Term Fee", amount: 15000, paidAmount: 0, type: "TERM", status: "PENDING", dueDate: "2025-10-01" },
            { id: "t3", name: "III Term Fee", amount: 15000, paidAmount: 0, type: "TERM", status: "PENDING", dueDate: "2026-02-01" },
            { id: "c1", name: "Hostel Fee", amount: 5000, paidAmount: 0, type: "CUSTOM", status: "PENDING", dueDate: "2025-08-01" }
        ],
        transportFee: 0,
        customFee: 0
    },
    {
        id: "ledger_default_2",
        studentId: "SHS1002",
        studentName: "Aadhya Reddy",
        parentName: "Somesh Reddy",
        parentMobile: "9100060001",
        className: "Class 2",
        sectionName: "B",
        villageName: "Bachupally",
        villageId: "VIL_002",
        totalFee: 51000,
        totalPaid: 34000,
        pendingAmount: 17000,
        status: "PENDING",
        studentStatus: "ACTIVE",
        academicYearId: "2025-2026",
        items: [
            { id: "t4", name: "I Term Fee", amount: 17000, paidAmount: 17000, type: "TERM", status: "PAID", dueDate: "2025-06-01" },
            { id: "t5", name: "II Term Fee", amount: 17000, paidAmount: 17000, type: "TERM", status: "PAID", dueDate: "2025-10-01" },
            { id: "t6", name: "III Term Fee", amount: 17000, paidAmount: 0, type: "TERM", status: "PENDING", dueDate: "2026-02-01" }
        ],
        transportFee: 0,
        customFee: 0
    }
];

export default function FeePendingsPage() {
    const { classes: classesData, villages: villagesData, branding, selectedYear, setSelectedYear, academicYears, feeConfig, customFees } = useMasterData();
    const { user, userData, branchId: userBranchId, role } = useAuth();
    const { selectedBranchId } = useBranch();
    const activeBranchId = selectedBranchId || (role === "SUPER_ADMIN" ? "global" : (userBranchId || userData?.schoolId));

    const PENDING_CACHE_KEY = activeBranchId ? `spoorthy_pending_ledgers_${activeBranchId}` : null;
    const [ledgers, setLedgers] = useState<any[]>(DEFAULT_PENDING_LEDGERS);

    useEffect(() => {
        if (typeof window !== 'undefined' && PENDING_CACHE_KEY) {
            const cached = localStorage.getItem(PENDING_CACHE_KEY);
            if (cached) {
                try {
                    setLedgers(JSON.parse(cached));
                    return;
                } catch (e) {}
            }
        }
        setLedgers([]);
    }, [PENDING_CACHE_KEY]);

    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [villageFilter, setVillageFilter] = useState("all");
    const [feeTypeFilter, setFeeTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all_pending");
    const router = useRouter();
    const pathname = usePathname();
    const backUrl = pathname.includes("/super-admin") ? "/super-admin/reports" : "/admin/fees";

    // Report Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardType, setWizardType] = useState<'csv' | 'table' | 'notify'>('table');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    // Inline Fee Collection State
    const [selectedLedger, setSelectedLedger] = useState<any>(null);
    const [feeForm, setFeeForm] = useState<{ amount: string; method: string; remarks: string; selectedItems: string[] }>({ amount: "", method: "cash", remarks: "", selectedItems: [] });
    const [collectingFee, setCollectingFee] = useState(false);
    const [showFeeSelector, setShowFeeSelector] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    const previewAllocations = useMemo(() => {
        if (!selectedLedger) return [];
        const amt = Number(feeForm.amount || 0);
        if (amt <= 0) return [];
        
        let remaining = amt;
        const todayStr = new Date().toISOString().split('T')[0];
        const items = (selectedLedger.items || []).map((i: any) => ({ ...i }));
        const allocations: any[] = [];
        
        const allocate = (filterFn: (i: any) => boolean) => {
            const group = items.filter(filterFn).sort((a: any, b: any) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"));
            for (const item of group) {
                if (remaining <= 0) break;
                const due = Number(item.amount || 0) - Number(item.paidAmount || 0);
                if (due > 0) {
                    const pay = Math.min(due, remaining);
                    remaining -= pay;
                    item.paidAmount = Number(item.paidAmount || 0) + pay;
                    allocations.push({ name: item.name, allocated: pay });
                }
            }
        };

        if (feeForm.selectedItems.length > 0) {
            allocate(i => feeForm.selectedItems.includes(i.id));
        } else {
            allocate(i => i.type === "TERM" && (i.dueDate || "9999-99-99") <= todayStr);
            allocate(i => i.type === "CUSTOM");
            allocate(i => i.type === "TERM" && (i.dueDate || "9999-99-99") > todayStr);
            allocate(i => i.type === "TRANSPORT");
            allocate(i => true);
        }
        return allocations;
    }, [feeForm.amount, feeForm.selectedItems, selectedLedger]);

    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name, order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const fetchPendings = async () => {
        if (!activeBranchId) {
            console.log("[FeePendingsPage] activeBranchId is not yet resolved, skipping fetch.");
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch ledgers with pending status for the current year, isolated by branchId
            const baseConstraints: any[] = [
                where("academicYearId", "==", selectedYear || "2025-2026")
            ];
            if (activeBranchId && activeBranchId !== "global") {
                baseConstraints.push(where("branchId", "==", activeBranchId));
            }

            const q = query(
                collection(db, "student_fee_ledgers"),
                ...baseConstraints
            );
            const snap = await getDocs(q);

            let rawLedgers: any[] = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    pendingAmount: (data.totalFee || 0) - (data.totalPaid || 0)
                };
            });

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
            }).sort((a: any, b: any) => b.pendingAmount - a.pendingAmount);

            setLedgers(joined);
            if (typeof window !== 'undefined' && PENDING_CACHE_KEY) {
                localStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(joined));
            }
        } catch (e) {
            console.error("Fetch Pendings Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendings();
    }, [selectedYear, activeBranchId, PENDING_CACHE_KEY]);

    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLedger || !user) return;
        setCollectingFee(true);

        try {
            const amount = Number(feeForm.amount);
            if (amount <= 0) throw new Error("Invalid Amount");

            const now = new Date();
            const timestampStr = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString()}`;
            const isManager = role === "MANAGER";
            const managerRemark = isManager ? ` [Collected by Manager: ${userData?.schoolId || user?.email}]` : "";

            const newPayment = {
                studentId: selectedLedger.studentId,
                studentName: selectedLedger.studentName,
                amount,
                method: feeForm.method,
                date: now,
                status: "success",
                remarks: feeForm.remarks ? `${feeForm.remarks}${managerRemark}` : (managerRemark ? managerRemark.trim() : ""),
                academicYear: selectedYear || "2025-2026",
                createdAt: now,
                verifiedBy: isManager ? `manager:${userData?.schoolId || user?.email}` : `admin:${user?.displayName || 'Admin'}`
            };

            const { writeBatch, doc, Timestamp, addDoc } = await import("firebase/firestore");
            const batch = writeBatch(db);
            const paymentRef = doc(collection(db, "payments"));
            
            const paymentDoc = {
                ...newPayment,
                date: Timestamp.fromDate(now),
                createdAt: Timestamp.fromDate(now)
            };
            batch.set(paymentRef, paymentDoc);

            const newTotalPaid = (selectedLedger.totalPaid || 0) + amount;
            const ledgerRef = doc(db, "student_fee_ledgers", selectedLedger.id);

            let remainingAmount = amount;
            const todayStr = new Date().toISOString().split('T')[0];
            const updatedItems = (selectedLedger.items || []).map((i: any) => ({ ...i }));

            const allocateToItems = (filterFn: (i: any) => boolean) => {
                const group = updatedItems.filter(filterFn).sort((a: any, b: any) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"));
                for (const item of group) {
                    if (remainingAmount <= 0) break;
                    const itemDue = Number(item.amount || 0) - Number(item.paidAmount || 0);
                    if (itemDue > 0) {
                        const payAmount = Math.min(itemDue, remainingAmount);
                        remainingAmount -= payAmount;
                        item.paidAmount = Number(item.paidAmount || 0) + payAmount;
                    }
                }
            };

            if (feeForm.selectedItems.length > 0) {
                 allocateToItems(i => feeForm.selectedItems.includes(i.id));
            } else {
                 allocateToItems(i => i.type === "TERM" && (i.dueDate || "9999-99-99") <= todayStr);
                 allocateToItems(i => i.type === "CUSTOM");
                 allocateToItems(i => i.type === "TERM" && (i.dueDate || "9999-99-99") > todayStr);
                 allocateToItems(i => i.type === "TRANSPORT");
                 allocateToItems(i => true);
            }

            batch.set(ledgerRef, {
                totalPaid: newTotalPaid,
                items: updatedItems,
                status: newTotalPaid >= selectedLedger.totalFee ? "PAID" : "PENDING",
                updatedAt: new Date().toISOString()
            }, { merge: true });

            await batch.commit();

            try {
                await addDoc(collection(db, "notifications"), {
                    target: "ALL_ADMINS",
                    title: "Fee Collected",
                    message: `Collected ₹${amount.toLocaleString()} from ${selectedLedger.studentName} via ${feeForm.method}.`,
                    type: "FEE",
                    status: "UNREAD",
                    createdAt: Timestamp.now()
                });
            } catch (e) {}

            const updatedLedgers = ledgers.map(l => {
                if (l.id === selectedLedger.id) {
                    const pend = (l.totalFee || 0) - newTotalPaid;
                    return { ...l, totalPaid: newTotalPaid, pendingAmount: pend, items: updatedItems };
                }
                return l;
            });

            setLedgers(updatedLedgers);
            setSelectedLedger(null);
            setFeeForm({ amount: "", method: "cash", remarks: "", selectedItems: [] });
            setReceiptData({ id: paymentRef.id, ...paymentDoc });
            toast({ title: "Success", description: "Fee collected successfully.", type: "success" });
            
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: e.message, type: "error" });
        } finally {
            setCollectingFee(false);
        }
    };

    const activeFeeTypesMap = new Map<string, string>();
    ledgers.forEach(l => {
        (l.items || []).forEach((item: any) => {
            if (!activeFeeTypesMap.has(item.id)) {
                activeFeeTypesMap.set(item.id, item.name);
            }
        });
    });
    const activeFeeTypes = Array.from(activeFeeTypesMap.entries()).map(([id, name]) => ({ id, name }));
    const selectedFeeTypeName = feeTypeFilter !== "all" ? activeFeeTypesMap.get(feeTypeFilter) || "Pending" : "Pending";

    const mappedLedgers = ledgers.map(l => {
        let displayTotalFee = l.totalFee || 0;
        let displayPaid = l.totalPaid || 0;
        let displayPendingAmount = l.pendingAmount || 0;

        if (feeTypeFilter !== "all") {
            const specificItem = l.items?.find((i:any) => i.id === feeTypeFilter);
            displayTotalFee = specificItem ? Number(specificItem.amount || 0) : 0;
            displayPaid = specificItem ? Number(specificItem.paidAmount || 0) : 0;
            displayPendingAmount = displayTotalFee - displayPaid;
        }

        return { ...l, displayTotalFee, displayPaid, displayPendingAmount };
    });

    const baseKPIFiltered = mappedLedgers.filter(l => {
        const matchesClass = classFilter === "all" || l.classId === classFilter || l.className === classFilter;
        const matchesVillage = villageFilter === "all" || l.villageId === villageFilter || l.villageName === villageFilter;
        // The cleanup script didn't add studentStatus to ledgers initially, so default to active if missing
        const isActive = l.studentStatus !== "INACTIVE";

        if (feeTypeFilter !== "all" && l.displayTotalFee === 0) return false;

        return matchesClass && matchesVillage && isActive;
    });

    const filteredForKPIs = baseKPIFiltered.filter(l => {
        let matchesStatus = true;
        if (statusFilter === "all_pending") matchesStatus = l.displayPendingAmount > 0;
        else if (statusFilter === "total_pending") matchesStatus = l.displayPaid === 0 && l.displayTotalFee > 0;
        else if (statusFilter === "partially_pending") matchesStatus = l.displayPaid > 0 && l.displayPendingAmount > 0;
        else if (statusFilter === "total_paid") matchesStatus = l.displayPaid >= l.displayTotalFee && l.displayTotalFee > 0;

        return matchesStatus;
    });

    const filtered = filteredForKPIs.filter(l => {
        const matchesSearch = !search ||
            String(l.studentId || "").toLowerCase().includes(search.toLowerCase()) ||
            String(l.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
            String(l.parentName || "").toLowerCase().includes(search.toLowerCase()) ||
            String(l.parentMobile || "").toLowerCase().includes(search.toLowerCase()) ||
            String(l.villageName || "").toLowerCase().includes(search.toLowerCase()) ||
            String(l.className || "").toLowerCase().includes(search.toLowerCase());

        return matchesSearch;
    }).sort((a, b) => {
        if (classFilter !== "all") {
            const rollA = a.rollNumber ? Number(a.rollNumber) : (a.rollNo ? Number(a.rollNo) : 9999);
            const rollB = b.rollNumber ? Number(b.rollNumber) : (b.rollNo ? Number(b.rollNo) : 9999);
            if (rollA !== rollB && !isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
            return (a.studentName || "").localeCompare(b.studentName || "");
        }
        return b.displayPendingAmount - a.displayPendingAmount;
    }).map((l, idx) => ({ ...l, serialNumber: idx + 1 }));

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
        setIsWizardOpen(false);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ title: "Popup Blocked", description: "Please allow popups for this site to print reports.", type: "error" });
            return;
        }

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

    const kpiTotalFee = baseKPIFiltered.reduce((sum, l) => sum + (l.displayTotalFee || 0), 0);
    const kpiPaidFee = baseKPIFiltered.reduce((sum, l) => sum + (l.displayPaid || 0), 0);
    const kpiPendingFee = baseKPIFiltered.reduce((sum, l) => sum + (l.displayPendingAmount || 0), 0);
    const pendingAccountsCount = baseKPIFiltered.filter(l => l.displayPendingAmount > 0).length;
    return (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-none p-0 pb-20">
            {/* Header & Actions */}
            <div className="flex justify-between items-center px-2 md:px-0">
                <Link 
                    href={backUrl} 
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    Back
                </Link>
                
                <div className="flex items-center gap-1.5 md:gap-3">
                    <Button variant="destructive" className="h-7 md:h-10 gap-1 md:gap-2 bg-red-600/10 border-red-500/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all text-[9px] md:text-[13px] font-bold px-2 md:px-4 uppercase tracking-wider" onClick={() => { setWizardType('notify'); setIsWizardOpen(true); }}>
                        <Bell className="w-3 h-3 md:w-4 md:h-4" /> Notify
                    </Button>
                    <FeeSlipGenerator
                        students={ledgers.map(l => ({
                            schoolId: l.studentId,
                            studentName: l.studentName,
                            className: l.className,
                            sectionName: l.sectionName || ""
                        }))}
                        buttonClassName="h-7 md:h-10 px-2 md:px-4 gap-1 md:gap-2 border-[rgba(255,255,255,0.06)] bg-[#0B2247] text-[#9AA7C7] hover:bg-white/5 rounded-lg transition-all text-[9px] md:text-[13px] font-bold uppercase tracking-wider"
                    />
                    <Button variant="outline" onClick={() => { setWizardType('table'); setIsWizardOpen(true); }} className="h-7 md:h-10 px-2 md:px-4 gap-1 md:gap-2 border-[rgba(255,255,255,0.06)] bg-[#0B2247] text-[#9AA7C7] rounded-lg text-[9px] md:text-[13px] font-bold hover:bg-white/5 uppercase tracking-wider">
                        <Printer className="w-3 h-3 md:w-4 md:h-4" /> Print
                    </Button>
                    <Button variant="outline" onClick={() => { setWizardType('csv'); setIsWizardOpen(true); }} className="h-7 md:h-10 px-2 md:px-4 gap-1 md:gap-2 border-[rgba(255,255,255,0.06)] bg-[#0B2247] text-[#9AA7C7] rounded-lg text-[9px] md:text-[13px] font-bold hover:bg-white/5 uppercase tracking-wider">
                        <Download className="w-3 h-3 md:w-4 md:h-4" /> CSV
                    </Button>
                </div>
            </div>

            <div className="relative flex justify-between items-center px-2 md:px-0 mt-2 mb-4">
                <h1 key={feeTypeFilter} className="text-2xl font-display font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent italic leading-tight animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {feeTypeFilter === "all" ? "Pending Dues" : `${selectedFeeTypeName} Dues`}
                </h1>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2 md:px-0">
                {/* Outstanding Fee Box */}
                <div className="bg-red-500/5 border border-red-500/10 p-2 md:p-3 rounded-lg backdrop-blur-sm flex flex-col justify-between h-full">
                    <div className="flex items-center gap-1.5 mb-2">
                        <ShieldAlert size={12} className="text-red-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 italic">Outstanding Fee</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto bg-black/20 p-2 rounded border border-white/5">
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Total</span>
                            <span className="text-sm font-mono font-black text-white">₹{kpiTotalFee.toLocaleString()}</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] uppercase tracking-wider text-emerald-400/50 font-bold mb-0.5">Paid</span>
                            <span className="text-sm font-mono font-black text-emerald-400">₹{kpiPaidFee.toLocaleString()}</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] uppercase tracking-wider text-red-400/50 font-bold mb-0.5">Pending</span>
                            <span className="text-sm font-mono font-black text-red-400">₹{kpiPendingFee.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {/* Total Accounts Box */}
                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg backdrop-blur-sm flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 mb-1">
                            <User size={12} className="text-blue-400" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Total Accounts</p>
                        </div>
                        <div className="text-xl md:text-2xl font-mono font-black text-white leading-none">{baseKPIFiltered.length} <span className="text-[10px] font-sans text-blue-400/50">Students</span></div>
                    </div>

                    {/* Pending Accounts Box */}
                    <div className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-lg backdrop-blur-sm flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 mb-1">
                            <User size={12} className="text-orange-400" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 italic">Pending Accounts</p>
                        </div>
                        <div className="text-xl md:text-2xl font-mono font-black text-white leading-none">{pendingAccountsCount} <span className="text-[10px] font-sans text-orange-400/50">Students</span></div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 mx-2 md:mx-0 mt-0">
                <div className="relative w-full flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9AA7C7]" />
                        <Input
                            placeholder="Search student..."
                            className="pl-8 h-8 bg-[#0B2247] border-[rgba(255,255,255,0.06)] rounded-lg focus:ring-accent/30 text-xs text-white"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {(classFilter !== "all" || villageFilter !== "all" || feeTypeFilter !== "all" || search) && (
                        <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setClassFilter("all"); setVillageFilter("all"); setFeeTypeFilter("all"); }} className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-lg border border-dashed border-white/10 shrink-0">
                            Clear
                        </Button>
                    )}
                </div>
                
                <div className="flex gap-1.5 flex-wrap md:flex-nowrap">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="flex-1 min-w-[90px] h-7 bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-red-400 rounded-lg text-[9px] font-bold px-2 truncate">
                            <SelectValue placeholder="Session" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                            {Object.keys(academicYears || {}).map(year => (
                                <SelectItem key={year} value={year} className="text-[9px]">
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="flex-1 min-w-[90px] h-7 bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[9px] font-medium px-2 truncate">
                            <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                            <SelectItem value="all" className="text-[9px]">All Classes</SelectItem>
                            {classes.map(c => <SelectItem key={c.id} value={c.id} className="text-[9px]">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={villageFilter} onValueChange={setVillageFilter}>
                        <SelectTrigger className="flex-1 min-w-[90px] h-7 bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[9px] font-medium px-2 truncate">
                            <SelectValue placeholder="All Villages" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                            <SelectItem value="all" className="text-[9px]">All Villages</SelectItem>
                            {villages.map(v => <SelectItem key={v.id} value={v.id} className="text-[9px]">{v.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
                        <SelectTrigger className="flex-1 min-w-[90px] h-7 bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[9px] font-medium px-2 truncate">
                            <SelectValue placeholder="All Fee Types" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg max-h-60 overflow-y-auto">
                            <SelectItem value="all" className="text-[9px]">All Fee Types</SelectItem>
                            {activeFeeTypes.map(f => (
                                <SelectItem key={f.id} value={f.id} className="text-[9px]">{f.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="flex-1 min-w-[90px] h-7 bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg text-[9px] font-medium px-2 truncate">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B2247] border-[rgba(255,255,255,0.06)] text-white rounded-lg">
                            <SelectItem value="all" className="text-[9px]">All Statuses</SelectItem>
                            <SelectItem value="all_pending" className="text-[9px]">All Pending</SelectItem>
                            <SelectItem value="total_pending" className="text-[9px]">Total Pending</SelectItem>
                            <SelectItem value="partially_pending" className="text-[9px]">Partially Pending</SelectItem>
                            <SelectItem value="total_paid" className="text-[9px]">Total Paid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Mobile Content View */}
            <div className="md:hidden bg-[#0B2247] border border-[rgba(255,255,255,0.06)] rounded-lg flex-1 flex flex-col overflow-hidden shadow mx-2 mt-2 relative">
                {/* Header */}
                <div className="flex items-center px-1 h-8 border-b border-[rgba(255,255,255,0.06)] text-[8px] font-bold text-[#9AA7C7] uppercase tracking-wider bg-[#0B2247] shrink-0 divide-x divide-[rgba(255,255,255,0.06)]">
                    <div className="w-[65px] shrink-0 px-1 text-center"># / ID</div>
                    <div className="flex-1 min-w-0 px-1">Name / Class</div>
                    <div className="w-[70px] shrink-0 text-right px-1">Total/Paid</div>
                    <div className="w-[70px] shrink-0 text-right px-1">Pending</div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
                    {loading ? (
                        <div className="p-4 text-center text-[#9AA7C7] flex items-center justify-center gap-2 text-xs">
                            <Loader2 className="animate-spin w-4 h-4 text-red-500" />
                            Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-[#9AA7C7] text-xs">No pending dues found.</div>
                    ) : (
                        filtered.map((l, idx) => {
                            const formattedNum = (idx + 1).toString().padStart(2, '0');
                            return (
                                <div key={l.id} onClick={() => router.push(`/admin/students/${l.studentDocId || l.id}`)} className="flex items-center h-[54px] px-1 w-full border-b border-[rgba(255,255,255,0.04)] last:border-0 relative divide-x divide-[rgba(255,255,255,0.06)] hover:bg-white/[0.02] cursor-pointer">
                                    {/* ID & Num */}
                                    <div className="flex flex-col w-[65px] shrink-0 justify-center px-1 items-center">
                                        <span className="text-[10px] text-[#9AA7C7] font-mono font-bold leading-none mb-0.5">{String(l.serialNumber).padStart(2, '0')}.</span>
                                        <span className="text-[8px] text-white/60 bg-white/5 px-1 py-0.5 rounded font-bold uppercase text-center mt-0.5 w-full max-w-[50px] truncate">{l.className}</span>
                                    </div>
                                    
                                    {/* Name & ID */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center px-1.5">
                                        <span className="text-xs font-extrabold text-white truncate leading-tight mb-0.5">{l.studentName}</span>
                                        <span className="text-[9px] text-[#9AA7C7] font-mono leading-none">{l.studentId}</span>
                                    </div>
                                    
                                    {/* Total & Paid */}
                                    <div className="w-[70px] shrink-0 flex flex-col items-end justify-center px-1">
                                        <span className="text-[10px] font-bold text-white/80 font-mono leading-none mb-1">₹{l.displayTotalFee?.toLocaleString()}</span>
                                        <span className="text-[10px] font-black text-emerald-400 font-mono leading-none">₹{l.displayPaid?.toLocaleString()}</span>
                                    </div>
                                    
                                    {/* Pending Actions */}
                                    <div className="w-[70px] shrink-0 flex flex-col items-center justify-center px-0.5 gap-1">
                                        {l.displayPaid >= l.displayTotalFee && l.displayTotalFee > 0 ? (
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                </div>
                                                <span className="text-[9px] font-black text-emerald-500 uppercase">Cleared</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={`flex items-center gap-0.5 ${l.displayPaid > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    <AlertCircle className="w-[10px] h-[10px] shrink-0" />
                                                    <span className="text-[11px] font-black font-mono leading-none">₹{l.displayPendingAmount?.toLocaleString()}</span>
                                                </div>
                                                <Button size="sm" onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    const items = [...(l.items || [])];
                                                    if (!items.some((i:any) => i.type === "CUSTOM")) {
                                                        items.push({ id: `c1_${l.id}`, name: "Hostel Fee", amount: 5000, paidAmount: 0, type: "CUSTOM", status: "PENDING", dueDate: "2025-08-01" });
                                                    }
                                                    if (!items.some((i:any) => i.type === "TRANSPORT")) {
                                                        items.push({ id: `t1_${l.id}`, name: "Transport Fee", amount: 3000, paidAmount: 0, type: "TRANSPORT", status: "PENDING", dueDate: "2025-09-01" });
                                                    }
                                                    setSelectedLedger({ ...l, items }); 
                                                }} className={`h-5 text-[8px] px-1 rounded uppercase font-bold tracking-widest w-[60px] ${
                                                    l.displayPaid > 0 
                                                    ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black' 
                                                    : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                                                }`}>
                                                    Collect
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Desktop Content View */}
            <div className="hidden md:block">
                <DataTable
                    data={filtered}
                    isLoading={loading}
                    onRowClick={(l) => router.push(`/admin/students/${l.studentDocId || l.id}`)}
                    columns={[
                        {
                            key: "studentName",
                            header: "# / Student Info",
                            render: (l: any) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-xs font-bold text-[#9AA7C7] font-mono">
                                        {String(l.serialNumber).padStart(2, '0')}.
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
                            render: (l: any) => <span className="font-mono font-bold text-sm text-white/40 italic">₹{l.displayTotalFee?.toLocaleString()}</span>
                        },
                        {
                            key: "totalPaid",
                            header: "Paid",
                            headerClassName: "text-right",
                            cellClassName: "text-right",
                            render: (l: any) => <span className="font-mono font-black text-sm text-emerald-400/60">₹{l.displayPaid?.toLocaleString()}</span>
                        },
                        {
                            key: "pendingAmount",
                            header: "Balance Due",
                            headerClassName: "text-right",
                            cellClassName: "text-right",
                            render: (l: any) => (
                                <div className="flex flex-col items-end">
                                    {l.displayPaid >= l.displayTotalFee && l.displayTotalFee > 0 ? (
                                        <span className="font-mono font-black text-lg text-emerald-500">₹0</span>
                                    ) : (
                                        <span className={`font-mono font-black text-lg ${l.displayPaid > 0 ? 'text-yellow-500' : 'text-red-500'}`}>₹{l.displayPendingAmount?.toLocaleString()}</span>
                                    )}
                                    {l.displayPaid > 0 && l.displayPendingAmount > 0 && <span className="text-[8px] font-black text-yellow-500/50 uppercase tracking-tighter">Partially Paid</span>}
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
                        },
                        {
                            key: "action",
                            header: "Action",
                            headerClassName: "text-right",
                            cellClassName: "text-right",
                            render: (l: any) => {
                                if (l.displayPaid >= l.displayTotalFee && l.displayTotalFee > 0) {
                                    return (
                                        <div className="flex items-center justify-end gap-1.5 text-emerald-500">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Cleared</span>
                                        </div>
                                    );
                                }
                                const isPartial = l.displayPaid > 0;
                                return (
                                    <Button 
                                        size="sm"
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const items = [...(l.items || [])];
                                            if (!items.some((i:any) => i.type === "CUSTOM")) {
                                                items.push({ id: `c1_${l.id}`, name: "Hostel Fee", amount: 5000, paidAmount: 0, type: "CUSTOM", status: "PENDING", dueDate: "2025-08-01" });
                                            }
                                            if (!items.some((i:any) => i.type === "TRANSPORT")) {
                                                items.push({ id: `t1_${l.id}`, name: "Transport Fee", amount: 3000, paidAmount: 0, type: "TRANSPORT", status: "PENDING", dueDate: "2025-09-01" });
                                            }
                                            setSelectedLedger({ ...l, items }); 
                                        }}
                                        className={`h-7 rounded uppercase font-bold tracking-widest text-[10px] ${
                                            isPartial
                                            ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black'
                                            : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                                        }`}
                                    >
                                        Collect Fee
                                    </Button>
                                );
                            }
                        }
                    ]}
                />
            </div>

            <Dialog open={!!selectedLedger} onOpenChange={(open) => {
                if (!open) {
                    setSelectedLedger(null);
                    setFeeForm({ amount: "", method: "cash", remarks: "", selectedItems: [] });
                    setShowFeeSelector(false);
                }
            }}>
                <DialogContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white w-[90vw] sm:max-w-sm rounded-2xl border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-bold text-emerald-400">Collect Payment</DialogTitle>
                        <div className="text-sm text-white/60 font-medium">Student: <span className="text-white">{selectedLedger?.studentName}</span></div>
                    </DialogHeader>
                    {selectedLedger && (
                        <form onSubmit={handleCollectFee} className="space-y-4 pt-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between shadow-inner">
                                <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Total Due</span>
                                <span className="text-emerald-400 font-black text-lg font-mono">₹{selectedLedger.pendingAmount.toLocaleString()}</span>
                            </div>

                            <div className="space-y-1 relative">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-white/70 ml-1">Target Fees (Optional)</Label>
                                <DropdownMenu open={showFeeSelector} onOpenChange={setShowFeeSelector}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 text-xs font-bold bg-white/5 border-white/10 hover:bg-white/10 text-white flex justify-between items-center outline-none ring-0">
                                            {feeForm.selectedItems.length > 0 ? `${feeForm.selectedItems.length} Fee(s) Selected` : "Select Specific Fee Types"}
                                            <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded ml-2">▼</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-[#0F223B] border-white/20 text-white shadow-2xl p-1" align="center" sideOffset={8}>
                                        <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-white/10">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Select Fees</span>
                                            <Button variant="ghost" size="sm" onClick={() => setShowFeeSelector(false)} className="h-6 px-2 text-[9px] uppercase hover:bg-red-500/20 hover:text-red-400 text-white/50">Close</Button>
                                        </div>
                                        <div className="max-h-[120px] overflow-y-auto custom-scrollbar">
                                            {selectedLedger.items?.filter((i:any) => (Number(i.amount || 0) - Number(i.paidAmount || 0)) > 0).map((item: any) => {
                                                const due = Number(item.amount || 0) - Number(item.paidAmount || 0);
                                                return (
                                                    <DropdownMenuCheckboxItem 
                                                        key={item.id} 
                                                        checked={feeForm.selectedItems.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                            const sel = feeForm.selectedItems;
                                                            setFeeForm({ ...feeForm, selectedItems: checked ? [...sel, item.id] : sel.filter(id => id !== item.id) });
                                                        }}
                                                        onSelect={(e) => e.preventDefault()}
                                                        className="flex items-center gap-2 py-2 px-1 cursor-pointer focus:bg-white/10 data-[highlighted]:bg-white/10 border-none"
                                                    >
                                                        <div className="flex-1 flex justify-between items-center text-[11px] font-medium pl-1">
                                                            <span className={feeForm.selectedItems.includes(item.id) ? "text-emerald-400" : "text-white/90"}>{item.name}</span>
                                                            <span className="font-mono text-white/60">₹{due.toLocaleString()}</span>
                                                        </div>
                                                    </DropdownMenuCheckboxItem>
                                                );
                                            })}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-white/90 font-bold">Amount Received (₹) <span className="font-black text-red-500">*</span></Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <IndianRupee className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <Input
                                        required
                                        min="1"
                                        max={selectedLedger.pendingAmount}
                                        type="number"
                                        placeholder="0"
                                        className="bg-white/5 border-emerald-500/30 h-10 pl-9 text-lg font-mono font-bold focus:border-emerald-500 focus:ring-emerald-500/20"
                                        value={feeForm.amount}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            if (val > selectedLedger.pendingAmount) {
                                                setFeeForm({ ...feeForm, amount: selectedLedger.pendingAmount.toString() });
                                            } else {
                                                setFeeForm({ ...feeForm, amount: e.target.value });
                                            }
                                        }}
                                    />
                                </div>
                                {previewAllocations.length > 0 && (
                                    <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="text-[9px] uppercase font-bold text-white/50 tracking-wider">Allocating to:</div>
                                        {previewAllocations.map((alloc, idx) => (
                                            <div key={idx} className="flex justify-between text-[11px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded">
                                                <span>{alloc.name}</span>
                                                <span>-₹{alloc.allocated.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-white/70 uppercase">Mode</Label>
                                    <Select value={feeForm.method} onValueChange={v => setFeeForm({ ...feeForm, method: v })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs focus:ring-emerald-500/20"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white border-white/10">
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="upi">UPI / GPay</SelectItem>
                                            <SelectItem value="cheque">Cheque</SelectItem>
                                            <SelectItem value="bank_transfer">Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-white/70 uppercase">Remarks</Label>
                                    <Input placeholder="Note..." className="bg-white/5 border-white/10 h-9 text-xs focus:ring-emerald-500/20" value={feeForm.remarks} onChange={e => setFeeForm({ ...feeForm, remarks: e.target.value })} />
                                </div>
                            </div>
                            <DialogFooter className="pt-2">
                                <Button type="submit" disabled={collectingFee} className="w-full h-12 text-sm font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all">
                                    {collectingFee ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
                <DialogContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white sm:max-w-md print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full border-white/10">
                    <DialogHeader className="print:hidden">
                        <DialogTitle className="text-emerald-400 flex items-center gap-2">Payment Successful</DialogTitle>
                    </DialogHeader>
                    {receiptData && (
                        <div className="space-y-6 pt-4 print:p-0">
                            <div className="text-center space-y-2 border-b border-white/10 pb-6 print:border-black/10">
                                {branding.schoolLogo && <img src={branding.schoolLogo} alt="School Logo" className="w-16 h-16 mx-auto object-contain hidden print:block mb-4" />}
                                <h2 className="text-2xl font-bold font-display uppercase tracking-widest print:text-black">{branding.schoolName || "SPOORTHY HIGH SCHOOL"}</h2>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold print:text-black/60">Fee Receipt</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm print:text-black">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Receipt No</p>
                                    <p className="font-mono font-bold text-accent print:text-black">{receiptData.id?.slice(-8).toUpperCase() || "N/A"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Date</p>
                                    <p className="font-mono font-bold print:text-black">
                                        {(() => {
                                            const d = new Date(receiptData.createdAt?.seconds * 1000 || Date.now());
                                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                                        })()}
                                    </p>
                                </div>
                                <div className="col-span-2 bg-white/5 p-4 rounded-xl print:bg-black/5">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black mb-1 print:text-black/60">Received From</p>
                                    <p className="font-bold text-lg print:text-black">{receiptData.studentName}</p>
                                    <p className="text-xs font-mono text-muted-foreground print:text-black/60">ID: {receiptData.studentId}</p>
                                </div>
                                <div className="col-span-2 flex justify-between items-center border-y border-white/10 py-4 print:border-black/10">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Amount Received</p>
                                    <p className="text-2xl font-black text-emerald-400 print:text-black">₹{Number(receiptData.amount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Payment Mode</p>
                                    <p className="font-bold uppercase print:text-black">{receiptData.method}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Cashier</p>
                                    <p className="font-bold print:text-black text-xs">{receiptData.verifiedBy?.replace('manager:', '')?.replace('admin:', '') || "Admin"}</p>
                                </div>
                                {receiptData.remarks && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black print:text-black/60">Remarks</p>
                                        <p className="text-xs italic text-white/70 print:text-black/80">{receiptData.remarks}</p>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="print:hidden sm:justify-between pt-4 border-t border-white/10">
                                <Button variant="outline" onClick={() => setReceiptData(null)} className="bg-white/5 border-white/10 hover:bg-white/10">
                                    Done
                                </Button>
                                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                    <Printer className="w-4 h-4" /> Print Receipt
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                <DialogContent className="max-w-2xl bg-[#0B1120]/95 backdrop-blur-2xl text-white backdrop-blur-3xl rounded-3xl shadow-2xl border-white/10">
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
                        <Button type="button" variant="ghost" onClick={() => setIsWizardOpen(false)} className="rounded-xl hover:bg-white/5">Cancel</Button>
                        <Button
                            type="button"
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
