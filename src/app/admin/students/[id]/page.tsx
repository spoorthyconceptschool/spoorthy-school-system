"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, addDoc, Timestamp, orderBy, setDoc, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Trash2, Save, X, Loader2, CreditCard, ShieldAlert, History, Settings2, Lock, RefreshCw, Download, Printer, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { AdjustFeesModal } from "@/components/admin/adjust-fees-modal";
import { Badge } from "@/components/ui/badge";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { exportSingleStudentFee, printStudentFeeStructure, printPaymentReceipt, printPendingFeeReport } from "@/lib/export-utils";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { notifyManagerAction } from "@/lib/notifications";

const safeDateParse = (d: any): number => {
    if (!d) return 0;
    if (d?.toDate) return d.toDate().getTime();
    if (typeof d === 'object' && d.seconds) return d.seconds * 1000;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
};

const safeDateString = (d: any): string => {
    try {
        const time = safeDateParse(d);
        if (time === 0) return "N/A";
        return new Date(time).toLocaleDateString();
    } catch {
        return "N/A";
    }
};

interface Student {
    id: string; // Document ID (usually same as schoolId)
    uid?: string; // Auth UID
    schoolId: string;
    studentName: string;
    parentName: string;
    parentMobile: string; // Used as password
    className: string;
    sectionName: string;
    villageName: string;
    villageId: string;
    classId: string;
    sectionId: string;
    status: string;
    createdAt: any;
}

interface Payment {
    id: string;
    amount: number;
    date: any;
    status: string;
    method: string;
    remarks?: string;
    termId?: string;
}

interface FeeLedgerItem {
    id: string;
    name: string;
    type: "TERM" | "CUSTOM";
    amount: number;
    paidAmount: number;
    dueDate: string;
    status: "PENDING" | "PAID" | "PARTIAL";
}

interface FeeLedger {
    totalFee: number;
    totalPaid: number; // Note: This might lag behind actual payments collection if not synced, usually we verify against 'payments' collection for truth.
    items: FeeLedgerItem[];
}

export default function StudentDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = params.id as string;

    // Core Data
    const [student, setStudent] = useState<Student | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [ledger, setLedger] = useState<FeeLedger | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string>("");
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) setRole(d.data().role);
        });
        return () => unsub();
    }, [user]);

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Student>>({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { villages: villagesData, classes: classesData, sections: sectionsData, classSections, branding, selectedYear } = useMasterData();

    // Derived Master Data
    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name || "Unknown Class", order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const sections = Object.values(sectionsData || {}).map((s: any) => ({ id: s.id, name: s.name || "Unknown Section" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    // Fee Collection State
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

    const [feeForm, setFeeForm] = useState({
        amount: "",
        method: "cash",
        date: "",
        remarks: ""
    });
    const [collectingFee, setCollectingFee] = useState(false);

    useEffect(() => {
        setFeeForm(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }, []);

    // Initial Fetch
    useEffect(() => {
        const fetchAll = async () => {
            if (!studentId) return;
            setLoading(true);

            try {
                // 1. Fetch Student Profile
                const studentRef = doc(db, "students", studentId);
                const studentSnap = await getDoc(studentRef);

                if (!studentSnap.exists()) {
                    alert("Student Not Found");
                    router.push("/admin/students");
                    return;
                }

                const sData = { id: studentSnap.id, ...studentSnap.data() } as Student;

                // 1.1 Fetch Linked UID (Critical for Password Reset)
                if (!sData.uid) {
                    try {
                        const mappingRef = doc(db, "usersBySchoolId", sData.schoolId);
                        const mappingSnap = await getDoc(mappingRef);
                        if (mappingSnap.exists()) {
                            sData.uid = mappingSnap.data().uid;
                        }
                    } catch (e) {
                        console.warn("UID Lookup Failed", e);
                    }
                }

                setStudent(sData);
                setEditForm(sData);

                // 2. Fetch Payments
                const pQ = query(collection(db, "payments"), where("studentId", "==", sData.schoolId));
                const pSnap = await getDocs(pQ);
                const loadedPayments = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
                // Client-side sort
                setPayments(loadedPayments.sort((a, b) => {
                    return safeDateParse(b.date) - safeDateParse(a.date);
                }));

                // 3. Fetch Fee Ledger (New)
                // Assuming current academic year is hardcoded "2025-2026" for MVP or fetched from config.
                // We use the ID convention: {schoolId}_2025-2026
                const currentYearId = selectedYear || "2025-2026";
                const ledgerRef = doc(db, "student_fee_ledgers", `${sData.schoolId}_${currentYearId}`);
                const ledgerSnap = await getDoc(ledgerRef);

                if (ledgerSnap.exists()) {
                    setLedger(ledgerSnap.data() as FeeLedger);
                } else {
                    // Fallback: If no ledger exists (old student), we might need to rely on the old calculation or show empty.
                    // For now, let's treat as empty to encourage "Recalculate" or "Generate" if we were to add that button.
                    setLedger(null);
                }

                // Master data now handled by context

            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [studentId, router, selectedYear]);

    // Update Profile
    const handleUpdate = async () => {
        if (!student) return;
        try {
            // resolve names based on IDs
            const vName = villages.find(v => v.id === editForm.villageId)?.name || editForm.villageName;
            const cName = classes.find(c => c.id === editForm.classId)?.name || editForm.className;
            const sName = sections.find(s => s.id === editForm.sectionId)?.name || editForm.sectionName;

            const updates: any = {
                ...editForm,
                villageName: vName || null,
                className: cName || null,
                sectionName: sName || null
            };

            // Remove undefined fields to prevent Firestore crash
            Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

            await updateDoc(doc(db, "students", student.id), updates);
            setStudent({ ...student, ...updates } as Student);
            setIsEditing(false);

            // Log Update
            await addDoc(collection(db, "audit_logs"), {
                action: "UPDATE_STUDENT_PROFILE",
                targetId: student.id,
                details: updates,
                timestamp: Timestamp.now()
            });

            // Notification for Manager Action
            if (role === "MANAGER") {
                await notifyManagerAction({
                    userId: student.uid || student.id,
                    title: "Profile Updated",
                    message: `Student profile ${student.studentName} has been updated by Manager ${user?.displayName || 'System'}.`,
                    type: "INFO",
                    actionBy: user?.uid,
                    actionByName: user?.displayName || "Manager"
                });
            }

            alert("Profile Updated Successfully");
        } catch (e: any) {
            console.error(e);
            alert("Update Failed: " + e.message);
        }
    };

    // Collect Fee
    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;
        setCollectingFee(true);

        try {
            const amount = Number(feeForm.amount);
            if (amount <= 0) throw new Error("Invalid Amount");

            const now = new Date();
            const timestampStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
            const managerRemark = role === "MANAGER" ? ` | Collected by manager: ${user?.displayName || "Manager"} at ${timestampStr}` : "";

            const newPayment = {
                studentId: student.schoolId,
                studentName: student.studentName,
                amount,
                method: feeForm.method,
                date: Timestamp.fromDate(new Date(feeForm.date)),
                status: "success",
                remarks: (feeForm.remarks || "") + managerRemark,
                createdAt: Timestamp.now(),
                verifiedBy: role === "MANAGER" ? `manager:${user?.displayName || 'Manager'}` : "admin"
            };

            const ref = await addDoc(collection(db, "payments"), newPayment);

            // === Critical Update: Update Student Ledger ===
            const newTotalPaid = totalPaid + amount;
            const currentYearId = selectedYear || "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${student.schoolId}_${currentYearId}`);

            await updateDoc(ledgerRef, {
                totalPaid: newTotalPaid,
                status: newTotalPaid >= totalFee ? "PAID" : "PENDING",
                updatedAt: new Date().toISOString()
            });

            setPayments([{ id: ref.id, ...newPayment } as unknown as Payment, ...payments]);
            setLedger(prev => prev ? { ...prev, totalPaid: newTotalPaid, status: newTotalPaid >= totalFee ? "PAID" : "PENDING" } : null);

            // === Notifications ===
            // 2. Notify Admins & Effective User (if Manager)
            if (role === "MANAGER") {
                await notifyManagerAction({
                    userId: student.uid || student.id,
                    title: "Fee Payment Received",
                    message: `Payment of ₹${amount.toLocaleString()} received via ${feeForm.method}. ${feeForm.remarks ? `(${feeForm.remarks})` : ''}`,
                    type: "FEE",
                    actionBy: user?.uid,
                    actionByName: user?.displayName || "Manager"
                });
            } else {
                // Regular Admin notification (already partly handled in original code, but let's unify)
                try {
                    await addDoc(collection(db, "notifications"), {
                        target: "ALL_ADMINS",
                        title: "Fee Collected",
                        message: `Collected ₹${amount.toLocaleString()} from ${student.studentName} (${student.schoolId}) via ${feeForm.method}.`,
                        type: "FEE",
                        status: "UNREAD",
                        createdAt: Timestamp.now()
                    });

                    if (student.uid) {
                        await addDoc(collection(db, "notifications"), {
                            userId: student.uid,
                            title: "Fee Payment Received",
                            message: `Payment of ₹${amount.toLocaleString()} received via ${feeForm.method}.`,
                            type: "FEE",
                            status: "UNREAD",
                            createdAt: Timestamp.now()
                        });
                    }
                } catch (e) {
                    console.error("Failed to notify admins", e);
                }
            }

            setIsFeeModalOpen(false);
            setFeeForm({ amount: "", method: "cash", date: new Date().toISOString().split('T')[0], remarks: "" });
            alert("Payment Recorded & Ledger Updated");

        } catch (e: any) {
            alert(e.message);
        } finally {
            setCollectingFee(false);
        }
    };

    // Calculations
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalFee = ledger ? (ledger.items || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0) : 0;
    const dueAmount = totalFee - totalPaid;
    const paymentProgress = totalFee > 0 ? Math.min((totalPaid / totalFee) * 100, 100) : 0;

    // Financial Breakdown logic for Fee Table and Overview
    const getBreakdown = () => {
        if (!ledger) return { items: [], termsPaid: 0, termsTotal: 0, customPaid: 0, customTotal: 0, pending: [], termsPending: 0, customPending: 0 };

        const safeItems = ledger.items || [];
        // Use FIFO distribution for display: payments cover oldest items first
        const sortedItems = [...safeItems].sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateA - dateB;
        });

        let remainingToDistribute = totalPaid;
        const processed = sortedItems.map((item: any) => {
            const amt = Number(item.amount) || 0;
            const paid = Math.min(remainingToDistribute, amt);
            remainingToDistribute -= paid;
            const due = amt - paid;
            let status: "PAID" | "PENDING" | "PARTIAL" = "PENDING";
            if (paid >= amt) status = "PAID";
            else if (paid > 0) status = "PARTIAL";

            return {
                ...item,
                amount: amt,
                distributedPaid: paid,
                distributedDue: due,
                distributedStatus: status
            };
        });

        return {
            items: processed,
            termsPaid: processed.filter(i => i.type === "TERM").reduce((s, i) => s + i.distributedPaid, 0),
            termsTotal: processed.filter(i => i.type === "TERM").reduce((s, i) => s + i.amount, 0),
            customPaid: processed.filter(i => i.type !== "TERM").reduce((s, i) => s + i.distributedPaid, 0),
            customTotal: processed.filter(i => i.type !== "TERM").reduce((s, i) => s + i.amount, 0),
            termsPending: processed.filter(i => i.type === "TERM").reduce((s, i) => s + i.distributedDue, 0),
            customPending: processed.filter(i => i.type !== "TERM").reduce((s, i) => s + i.distributedDue, 0),
            pending: processed.filter(i => i.distributedDue > 0).map(i => ({
                name: i.name,
                due: i.distributedDue
            }))
        };
    };

    const breakdown = getBreakdown();

    const refreshData = () => {
        // Cheap refresh: strict reload or just re-fetch function? 
        // For now, full reload is safer for sync issues. 
        window.location.reload();
    };

    // Reset Password State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Recalculate Fees (Sync with Global)
    const [recalculating, setRecalculating] = useState(false);
    const handleRecalculateFees = async () => {
        if (!student) return;
        setRecalculating(true);
        try {
            // 1. Fetch Global Fee Config
            const feeConfigSnap = await getDoc(doc(db, "config", "fees"));
            const feeConfig = feeConfigSnap.data();
            const feeTerms = (feeConfig?.terms || []).filter((t: any) => t.isActive);

            // 1.5 Fetch Custom Fees (Targeted)
            const customFeesQ = query(collection(db, "custom_fees"), where("status", "==", "ACTIVE"));
            const customFeesSnap = await getDocs(customFeesQ);

            // 2. Identify Target Class
            const targetClassId = student.classId; // Ideally we use ID
            const targetClassName = student.className || "Class 1";
            // Note: Custom Fees page uses IDs for targetIds? Let's check. 
            // Yes, Custom Fees page uses `formData.targetIds.includes(c.id)` where c.id is firestore doc id of master_class.
            // Student has `classId` (hopefully matching master_class ID).

            // 3. Build Expected Items
            const newItems: FeeLedgerItem[] = [];

            // A. Add Standard Term Flags
            feeTerms.forEach((term: any) => {
                const amount = term.amounts?.[targetClassName] || 0; // Config uses Name
                if (amount > 0) {
                    newItems.push({
                        id: `TERM_${term.id}`,
                        type: "TERM",
                        name: term.name,
                        dueDate: term.dueDate,
                        amount: Number(amount),
                        paidAmount: 0,
                        status: "PENDING"
                    });
                }
            });

            // B. Add Custom Fees
            customFeesSnap.docs.forEach(doc => {
                const cf = doc.data();
                let isApplicable = false;

                if (cf.targetType === "CLASS" && cf.targetIds?.includes(targetClassId)) {
                    isApplicable = true;
                }
                // Optional: Village check if we had student.villageId
                // if (cf.targetType === "VILLAGE" && cf.targetIds?.includes(student.villageId)) isApplicable = true;

                if (isApplicable) {
                    newItems.push({
                        id: `CUSTOM_${doc.id}`,
                        type: "CUSTOM",
                        name: cf.name,
                        dueDate: cf.dueDate,
                        amount: Number(cf.amount),
                        paidAmount: 0,
                        status: "PENDING"
                    });
                }
            });

            // 4. Fetch Existing Ledger
            const currentYearId = selectedYear || "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${student.schoolId}_${currentYearId}`);
            const ledgerSnap = await getDoc(ledgerRef);

            let existingItems: FeeLedgerItem[] = [];
            if (ledgerSnap.exists()) {
                existingItems = (ledgerSnap.data().items as FeeLedgerItem[]) || [];
            }

            // 5. Merge Strategy:
            // - Keep existing items (preserve payments)
            // - Add new items if ID missing
            // - OPTIONAL: Update amount of existing items? 
            //   For "New Fee Type", strictly adding is safer. 
            //   If user updated Amount of existing term, we MIGHT want to update it if paid=0.
            //   Let's do a smart merge: Update amount ONLY if paidAmount is 0.

            const mergedItems = [...existingItems];

            newItems.forEach(newItem => {
                const existingIndex = mergedItems.findIndex(i => i.id === newItem.id);
                if (existingIndex === -1) {
                    // Start fresh
                    mergedItems.push(newItem);
                } else {
                    // Update metadata (due date, name) always
                    // Update amount ONLY if no payment made yet (to avoid messing up partials)
                    const ex = mergedItems[existingIndex];
                    if (ex.paidAmount === 0) {
                        mergedItems[existingIndex] = { ...ex, amount: newItem.amount, dueDate: newItem.dueDate, name: newItem.name };
                    } else {
                        // Just update metadata, keep old amount? Or force new amount?
                        // If paid partial, total fee might increase.
                        // Let's safe update:
                        mergedItems[existingIndex] = { ...ex, dueDate: newItem.dueDate, name: newItem.name };
                    }
                }
            });

            // 6. Recalculate Totals
            const totalFee = mergedItems.reduce((sum, i) => sum + i.amount, 0);

            // 7. Save
            const newLedgerData = {
                studentId: student.schoolId,
                academicYearId: currentYearId,
                classId: student.classId,
                className: student.className,
                totalFee,
                totalPaid: ledger?.totalPaid || 0, // Persist or re-sum?
                // Better re-sum from payments? No, payments collection is truth.
                // Assuming ledger.totalPaid is synced.
                status: (ledger?.totalPaid || 0) >= totalFee ? "PAID" : "PENDING",
                items: mergedItems,
                updatedAt: new Date().toISOString() // serverTimestamp ideally
            };

            await setDoc(ledgerRef, newLedgerData, { merge: true });

            // 8. Update Local State
            setLedger({ ...newLedgerData, items: mergedItems } as FeeLedger);

            // 9. Notification for Manager Action
            if (role === "MANAGER") {
                await notifyManagerAction({
                    userId: student.uid || student.schoolId,
                    title: "Fee Structure Synced",
                    message: `Fee structure for ${student.studentName} has been recalculated & synced with global config by Manager ${user?.displayName || 'Manager'}.`,
                    type: "INFO",
                    actionBy: user?.uid,
                    actionByName: user?.displayName || "Manager"
                });
            }

            alert("Fees Recalculated Successfully");

        } catch (e: any) {
            console.error(e);
            alert("Recalculate Failed: " + e.message);
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <div className="space-y-3 md:space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200 p-1 md:p-0">
            {/* Password Reset Modal */}
            <AdminChangePasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                user={{
                    uid: student?.uid || "",
                    schoolId: student?.schoolId || "",
                    name: student?.studentName || "",
                    role: "STUDENT"
                }}
            />

            {/* Header - Partial shell visible during loading */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 md:pt-4">
                <div className="flex items-center gap-2 md:gap-4">
                    <Link href="/admin/students">
                        <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9 border-white/10 hover:bg-white/10">
                            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                        </Button>
                    </Link>
                    <div>
                        {loading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-48 bg-white/5 animate-pulse rounded-lg" />
                                <div className="h-4 w-32 bg-white/5 animate-pulse rounded-md" />
                            </div>
                        ) : student ? (
                            <>
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <h1 className="text-lg md:text-3xl font-display font-bold text-white leading-tight">{student.studentName}</h1>
                                    <Badge variant={student.status === 'ACTIVE' ? 'default' : 'destructive'} className="uppercase text-[7px] md:text-[10px] h-4 md:h-5 px-1 py-0">
                                        {student.status}
                                    </Badge>
                                </div>
                                <p className="text-[9px] md:text-sm text-muted-foreground font-mono flex items-center gap-1.5 md:gap-2">
                                    <span className="text-accent font-bold">{student.schoolId}</span>
                                    <span>•</span>
                                    <span className="truncate max-w-[100px] md:max-w-none">
                                        {classesData[student.classId]?.name || student.className || "Class"}
                                    </span>
                                </p>
                            </>
                        ) : null}
                    </div>
                </div>

                {!loading && student && (
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        {(role === "ADMIN" || role === "MANAGER") && (
                            <Dialog open={isFeeModalOpen} onOpenChange={setIsFeeModalOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-8 md:h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg text-[10px] md:text-sm font-bold flex-1 md:flex-none">
                                        <CreditCard className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" /> Collect Fee
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-black/95 border-white/10 text-white sm:max-w-md">
                                    <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
                                    <form onSubmit={handleCollectFee} className="space-y-4 py-4">
                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex justify-between">
                                            <span>Current Due:</span>
                                            <span className="font-bold font-mono">₹{dueAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Amount Received (₹) <span className="text-red-500">*</span></Label>
                                            <Input
                                                required
                                                type="number"
                                                min="1"
                                                placeholder="Enter amount..."
                                                className="bg-white/5 border-white/10 font-mono text-lg"
                                                value={feeForm.amount}
                                                onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Mode</Label>
                                                <Select value={feeForm.method} onValueChange={v => setFeeForm({ ...feeForm, method: v })}>
                                                    <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-[#0A192F] border-white/10 text-white">
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="upi">UPI / GPay</SelectItem>
                                                        <SelectItem value="cheque">Cheque</SelectItem>
                                                        <SelectItem value="bank_transfer">Transfer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date</Label>
                                                <Input type="date" required className="bg-white/5 border-white/10 h-10" value={feeForm.date} onChange={e => setFeeForm({ ...feeForm, date: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Remarks</Label>
                                            <Input placeholder="Note..." className="bg-white/5 border-white/10 h-10" value={feeForm.remarks} onChange={e => setFeeForm({ ...feeForm, remarks: e.target.value })} />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={collectingFee} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                                {collectingFee ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}

                        {isEditing ? (
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8 text-[10px] md:text-xs">Cancel</Button>
                                <Button size="sm" onClick={handleUpdate} className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs px-3">Save</Button>
                            </div>
                        ) : (
                            (role === "ADMIN" || role === "MANAGER") && (
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(true)} className="h-8 md:h-9 border-white/10 bg-white/5 text-[9px] md:text-sm px-1.5 md:px-4">
                                        <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> <span className="hidden sm:inline">Reset</span>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 md:h-9 border-white/10 bg-white/5 text-[9px] md:text-sm px-1.5 md:px-4">
                                        <Edit className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> Edit
                                    </Button>
                                    {role === "ADMIN" && (
                                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="h-8 md:h-9 bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 px-1.5 md:px-3">
                                            <ShieldAlert className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-3 md:space-y-4">
                    <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
                        <CardHeader className="py-2 md:py-3 px-1.5 md:px-6">
                            <CardTitle className="text-xs md:text-xl font-bold text-accent italic">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-2 md:gap-x-3 gap-y-2 md:gap-y-3 px-1.5 md:px-6 pb-3 md:pb-6">
                            {loading ? (
                                <div className="col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
                                        <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
                                    </div>
                                    <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-0.5 md:space-y-1 col-span-2 md:col-span-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Student Name</Label>
                                        <Input disabled={!isEditing} className="bg-white/5 border-white/10 h-8 md:h-10 text-[12px] md:text-sm font-bold disabled:opacity-100" value={editForm.studentName} onChange={e => setEditForm({ ...editForm, studentName: e.target.value })} />
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1 col-span-2 md:col-span-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Parent Name</Label>
                                        <Input disabled={!isEditing} className="bg-white/5 border-white/10 h-8 md:h-10 text-[12px] md:text-sm disabled:opacity-100" value={editForm.parentName} onChange={e => setEditForm({ ...editForm, parentName: e.target.value })} />
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1 col-span-2 md:col-span-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Mobile / Password</Label>
                                        <Input disabled={!isEditing} className="bg-white/5 border-white/10 font-mono h-8 md:h-10 text-[12px] md:text-sm disabled:opacity-100" value={editForm.parentMobile} onChange={e => setEditForm({ ...editForm, parentMobile: e.target.value })} />
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Village</Label>
                                        <Select disabled={!isEditing} value={editForm.villageId} onValueChange={v => setEditForm({ ...editForm, villageId: v })}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-8 md:h-10 text-[12px] md:text-sm px-2 disabled:opacity-100"><SelectValue placeholder="Village" /></SelectTrigger>
                                            <SelectContent className="bg-[#0A192F] border-white/10">{villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Class</Label>
                                        <Select disabled={!isEditing} value={editForm.classId} onValueChange={v => setEditForm({ ...editForm, classId: v })}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-8 md:h-10 text-[12px] md:text-sm px-2 disabled:opacity-100"><SelectValue placeholder="Class" /></SelectTrigger>
                                            <SelectContent className="bg-[#0A192F] border-white/10">{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Section</Label>
                                        <Select disabled={!isEditing} value={editForm.sectionId} onValueChange={v => setEditForm({ ...editForm, sectionId: v })}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-8 md:h-10 text-[12px] md:text-sm px-2 disabled:opacity-100"><SelectValue placeholder="Section" /></SelectTrigger>
                                            <SelectContent className="bg-[#0A192F] border-white/10">{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1">
                                        <Label className="text-[8px] md:text-xs text-muted-foreground uppercase font-black tracking-tighter">Status</Label>
                                        <Select disabled={!isEditing} value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-8 md:h-10 text-[12px] md:text-sm px-2 disabled:opacity-100"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#0A192F] border-white/10">
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="PROMOTED">Promoted</SelectItem>
                                                <SelectItem value="DETAINED">Detained</SelectItem>
                                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                <SelectItem value="ALUMNI">Alumni</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-black/20 border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between py-2 md:py-3 px-1.5 md:px-6">
                            <CardTitle className="text-xs md:text-xl font-bold text-accent italic">Fee Structure</CardTitle>
                            {!loading && (
                                <div className="flex gap-1">
                                    {(role === "ADMIN" || role === "MANAGER") && (
                                        <Button variant="outline" size="sm" onClick={handleRecalculateFees} disabled={recalculating} className="h-6 px-1.5 md:h-7 md:px-2 border-white/10 bg-white/5 text-[8px] md:text-[9px] font-bold">
                                            <RefreshCw className={`w-2.5 h-2.5 md:w-3 md:h-3 mr-1 ${recalculating ? "animate-spin" : ""}`} /> Sync
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" className="h-6 px-1.5 md:h-7 md:px-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[8px] md:text-[9px] font-bold" onClick={() => ledger && student && printStudentFeeStructure({ studentName: student.studentName, schoolId: student.schoolId, className: student.className, items: ledger.items || [], totalPaid: ledger.totalPaid || 0, schoolLogo: branding?.schoolLogo, schoolName: branding?.schoolName })}>
                                        <Printer className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                                    </Button>
                                    {(role === "ADMIN" || role === "MANAGER") && (
                                        <Button variant="outline" size="sm" className="h-6 px-1.5 md:h-7 md:px-2 border-white/10 bg-white/5 text-[8px] md:text-[9px] font-bold" onClick={() => setIsAdjustModalOpen(true)}>
                                            <Settings2 className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" /> Adjust
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="px-1.5 md:px-6 pb-3">
                            {loading ? (
                                <div className="space-y-2 py-4">
                                    <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
                                    <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
                                    <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
                                </div>
                            ) : !ledger || !ledger.items || ledger.items.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground border border-dashed border-white/10 rounded-lg text-xs bg-white/5">
                                    No fee structure assigned. Update details or click Sync.
                                </div>
                            ) : (
                                <div className="w-full overflow-x-auto custom-scrollbar">
                                    <table className="w-full border-collapse min-w-[600px]">
                                        <thead>
                                            <tr className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-black border-b border-white/10 italic">
                                                <th className="px-1 md:px-3 py-2 text-left">Fee Item</th>
                                                <th className="px-1 md:px-2 py-2 text-right">Total</th>
                                                <th className="px-1 md:px-2 py-2 text-right">Paid</th>
                                                <th className="px-1 md:px-2 py-2 text-right">Due</th>
                                                <th className="px-1 md:px-3 py-2 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {breakdown.items.map((item) => (
                                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="px-1 md:px-3 py-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] md:text-sm font-bold text-white group-hover:text-accent transition-colors leading-tight">{item.name}</span>
                                                            <span className="text-[7px] md:text-[9px] text-white/30 uppercase font-black tracking-tighter">{item.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-1 md:px-2 py-2 text-right font-mono text-[9px] md:text-xs text-white/70">₹{item.amount.toLocaleString()}</td>
                                                    <td className="px-1 md:px-2 py-2 text-right font-mono text-[9px] md:text-xs text-emerald-400">₹{item.distributedPaid.toLocaleString()}</td>
                                                    <td className="px-1 md:px-2 py-2 text-right font-mono text-[10px] md:text-xs text-red-400 font-bold">₹{item.distributedDue.toLocaleString()}</td>
                                                    <td className="px-1 md:px-3 py-2 text-right">
                                                        <span className={cn(
                                                            "inline-flex px-1 py-0.5 md:px-1.5 rounded-[4px] text-[7px] md:text-[9px] font-black uppercase tracking-tighter",
                                                            item.distributedStatus === "PAID" ? "bg-emerald-500/10 text-emerald-400" :
                                                                item.distributedStatus === "PARTIAL" ? "bg-amber-500/10 text-amber-500" :
                                                                    "bg-red-500/10 text-red-500"
                                                        )}>
                                                            {item.distributedStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-black/20 border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between py-2 md:py-3 px-1.5 md:px-6">
                            <CardTitle className="text-xs md:text-xl font-bold text-accent italic">History</CardTitle>
                            <History className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="px-1.5 md:px-6 pb-3">
                            {loading ? (
                                <div className="space-y-2 py-2">
                                    <div className="h-8 bg-white/5 animate-pulse rounded-lg" />
                                    <div className="h-8 bg-white/5 animate-pulse rounded-lg" />
                                </div>
                            ) : payments.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground border border-dashed border-white/10 rounded-lg text-[10px]">No payments.</div>
                            ) : (
                                <div className="space-y-1">
                                    {payments.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-accent/10 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] md:text-sm font-bold text-emerald-400">₹{p.amount?.toLocaleString()}</span>
                                                <span className="text-[8px] md:text-[10px] text-white/40 uppercase font-black">{p.method} • {safeDateString(p.date)}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-emerald-500/10 text-emerald-400/60" onClick={() => student && printPaymentReceipt({ payment: p, student: student, ledger: ledger, schoolLogo: branding?.schoolLogo, schoolName: branding?.schoolName })}>
                                                <Printer className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-3 md:space-y-4">
                    <Card className="bg-black/20 border-white/10 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-1000" />
                        <CardHeader className="py-2 md:py-3 px-1.5 md:px-6 pb-0">
                            <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-widest text-[#8892B0]">Collection Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="px-1.5 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 relative z-10">
                            {loading ? (
                                <div className="space-y-6">
                                    <div className="h-16 bg-white/5 animate-pulse rounded-2xl" />
                                    <div className="h-8 bg-white/5 animate-pulse rounded-xl" />
                                </div>
                            ) : (
                                <>
                                    <div className="text-center space-y-1 md:space-y-2">
                                        <div className="text-3xl md:text-6xl font-display font-black text-white leading-none italic">
                                            {Math.round(paymentProgress)}%
                                        </div>
                                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-accent/60">Cleared Pipeline</p>
                                    </div>

                                    <div className="w-full h-1.5 md:h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${paymentProgress}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={cn(
                                                "h-full relative",
                                                paymentProgress >= 100 ? "bg-emerald-500" :
                                                    paymentProgress >= 50 ? "bg-blue-500" :
                                                        "bg-amber-500"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                                        <div className="p-3 md:p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                                            <div className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase mb-1">Total Fee</div>
                                            <div className="text-sm md:text-xl font-mono font-bold text-white">₹{totalFee.toLocaleString()}</div>
                                        </div>
                                        <div className="p-3 md:p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-md">
                                            <div className="text-[8px] md:text-[10px] font-black text-emerald-500/60 uppercase mb-1">Total Paid</div>
                                            <div className="text-sm md:text-xl font-mono font-bold text-emerald-400">₹{totalPaid.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="p-3 md:p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 backdrop-blur-md flex items-center justify-between">
                                        <div>
                                            <div className="text-[8px] md:text-[10px] font-black text-rose-500/60 uppercase mb-1">Due Balance</div>
                                            <div className="text-sm md:text-2xl font-mono font-bold text-red-500">₹{dueAmount.toLocaleString()}</div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-500/10" onClick={() => printPendingFeeReport({ studentName: student?.studentName || 'Student', schoolId: student?.schoolId || '', className: student?.className || '', items: breakdown.items, totalPaid: totalPaid, schoolLogo: branding?.schoolLogo, schoolName: branding?.schoolName })}>
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {!loading && student && (
                        <div className="p-4 md:p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                                <FileText size={14} /> Documentation
                            </h3>
                            <div className="grid gap-2">
                                <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 font-bold gap-3 text-xs" onClick={() => ledger && student && exportSingleStudentFee({ studentName: student.studentName, schoolId: student.schoolId, className: student.className, items: breakdown.items, totalPaid })}>
                                    <Download size={14} className="text-blue-400" /> Export Excel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {student && (
                <DeleteUserModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    user={{
                        id: student.schoolId,
                        schoolId: student.schoolId,
                        name: student.studentName,
                        role: "student"
                    }}
                    checkEligibility={async () => {
                        const pQ = query(collection(db, "payments"), where("studentId", "==", student.schoolId), limit(1));
                        const caps = await getDocs(pQ);
                        if (!caps.empty) return { canDelete: false, reason: "Payments exist. Use Deactivate instead." };
                        return { canDelete: true };
                    }}
                    onDeactivate={async (reason) => {
                        await updateDoc(doc(db, "students", student.id), {
                            status: "INACTIVE",
                            deactivationReason: reason,
                            updatedAt: new Date().toISOString()
                        });
                        setStudent({ ...student, status: "INACTIVE" });
                    }}
                    onDelete={async (reason) => {
                        if (!user) { alert("You are not authenticated"); return; }
                        const token = await user.getIdToken();
                        const res = await fetch("/api/admin/users/delete", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                targetUid: student.uid,
                                schoolId: student.schoolId,
                                role: "STUDENT",
                                collectionName: "students"
                            })
                        });

                        const data = await res.json();
                        if (data.success) {
                            router.push("/admin/students");
                        } else {
                            throw new Error(data.error || "Delete failed");
                        }
                    }}
                />
            )}

            {student && ledger && (
                <AdjustFeesModal
                    isOpen={isAdjustModalOpen}
                    onClose={() => setIsAdjustModalOpen(false)}
                    studentId={student.schoolId}
                    academicYearId={selectedYear}
                    currentLedger={ledger}
                    onSuccess={() => {
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
