"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, addDoc, Timestamp, orderBy, setDoc, onSnapshot, limit, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Trash2, Save, X, Loader2, CreditCard, ShieldAlert, History, Settings2, Lock, RefreshCw, Download, Printer, FileText, CheckCircle2, Calendar, GraduationCap, ClipboardCheck, User, MapPin, Phone, MoreHorizontal, File, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DeleteUserModal } from "@/components/admin/delete-user-modal";
import { AdjustFeesModal } from "@/components/admin/adjust-fees-modal";
import { Badge } from "@/components/ui/badge";
import { AdminChangePasswordModal } from "@/components/admin/admin-change-password-modal";
import { exportSingleStudentFee, printStudentFeeStructure, printPaymentReceipt, printPendingFeeReport } from "@/lib/export-utils";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { notifyManagerAction } from "@/lib/notifications";
import { SingleReportCardButton } from "@/components/admin/SingleReportCardButton";

import { ProfileTab } from "@/components/admin/student-profile/ProfileTab";
import { FeesTab } from "@/components/admin/student-profile/FeesTab";
import { AttendanceTab } from "@/components/admin/student-profile/AttendanceTab";
import { AcademicsTab } from "@/components/admin/student-profile/AcademicsTab";
import { HistoryTab } from "@/components/admin/student-profile/HistoryTab";
import { DocumentsTab } from "@/components/admin/student-profile/DocumentsTab";

/**
 * Safely parses a Date object or Firestore Timestamp into a number (milliseconds).
 * @param {any} d - The date to parse.
 * @returns {number} The parsed time in milliseconds, or 0 if invalid.
 */
const safeDateParse = (d: any): number => {
    if (!d) return 0;
    if (d?.toDate) return d.toDate().getTime();
    if (typeof d === 'object' && d.seconds) return d.seconds * 1000;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
};

/**
 * Safely converts a Date object or Firestore Timestamp to a localized date string.
 * @param {any} d - The date to parse.
 * @returns {string} The localized date string, or "N/A" if invalid.
 */
const safeDateString = (d: any): string => {
    try {
        const time = safeDateParse(d);
        if (time === 0) return "N/A";
        return new Date(time).toLocaleDateString('en-GB');
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
    dateOfBirth?: string;
    gender?: string;
    transportRequired?: boolean;
    admissionNumber?: string;
    academicYear?: string;
    address?: string;
    firstName?: string;
    lastName?: string;
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

/**
 * Main component for the Student Details page.
 * Displays student profile, payment history, and fee ledger.
 * Allows admins and managers to update details and collect fees.
 * @returns {JSX.Element} The rendered component.
 */
export default function StudentDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = params.id as string;

    // Core Data
    const [student, setStudent] = useState<Student | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [ledger, setLedger] = useState<FeeLedger | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string>("");
    const { user, userData, role: authRole } = useAuth();

    const normalizedRole = role?.toUpperCase();
    const isManager = normalizedRole === "MANAGER";
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'DEVELOPER'].includes(normalizedRole);
    const canEdit = isAdmin || isManager;

    useEffect(() => {
        if (authRole) {
            setRole(authRole);
            return;
        }
        if (!user) return;
        user.getIdTokenResult().then(tokenResult => {
            if (tokenResult.claims.role) {
                setRole(tokenResult.claims.role as string);
            } else {
                setRole("ADMIN"); // Fallback
            }
        });
    }, [user, authRole]);

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Student>>({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { villages: villagesData, classes: classesData, sections: sectionsData, classSections, branding, selectedYear, academicYears, feeConfig, customFees } = useMasterData();

    // Academic Year Toggle & Read-Only Checks
    const [viewingYear, setViewingYear] = useState(selectedYear || "2025-2026");
    const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'attendance'>('profile');

    useEffect(() => {
        if (selectedYear) {
            setViewingYear(selectedYear);
        }
    }, [selectedYear]);

    const isHistoricalMode = student ? (viewingYear !== (student.academicYear || "2025-2026")) : false;

    // Academic Performance State
    const [exams, setExams] = useState<any[]>([]);
    const [examResults, setExamResults] = useState<Record<string, any>>({});
    const [loadingExams, setLoadingExams] = useState(false);

    useEffect(() => {
        const fetchExamsAndResults = async () => {
            if (!student?.schoolId) return;
            setLoadingExams(true);
            try {
                // Fetch exams ordered by startDate descending
                const examsQ = query(collection(db, "exams"), orderBy("startDate", "desc"));
                const snap = await getDocs(examsQ);
                const allExams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Filter by viewingYear, defaulting to 2025-2026
                const matchedExams = allExams.filter((e: any) => (e.academicYear || "2025-2026") === viewingYear);
                setExams(matchedExams);

                // Fetch results for each matched exam
                const resultsMap: Record<string, any> = {};
                await Promise.all(
                    matchedExams.map(async (exam) => {
                        const resultRef = doc(db, "exam_results", `${exam.id}_${student.schoolId}`);
                        const resultSnap = await getDoc(resultRef);
                        if (resultSnap.exists()) {
                            resultsMap[exam.id] = resultSnap.data();
                        }
                    })
                );
                setExamResults(resultsMap);
            } catch (err) {
                console.error("Error fetching exams and results:", err);
            } finally {
                setLoadingExams(false);
            }
        };
        fetchExamsAndResults();
    }, [student?.schoolId, viewingYear]);

    // Attendance State
    const [attendanceMap, setAttendanceMap] = useState<Record<string, 'P' | 'A'>>({});
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });

    const [viewingMonth, setViewingMonth] = useState<number>(new Date().getMonth());
    const [viewingMonthYear, setViewingMonthYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        const [startYear] = viewingYear.split("-");
        setViewingMonth(5); // June is the standard starting month of our academic year
        setViewingMonthYear(Number(startYear));
    }, [viewingYear]);

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!student?.schoolId) return;
            setLoadingAttendance(true);
            try {
                const q = query(
                    collection(db, "attendance_daily"),
                    where(`records.${student.schoolId}`, "in", ["P", "A"])
                );
                const snap = await getDocs(q);

                const [startYear, endYear] = viewingYear.split("-");
                const startDate = `${startYear}-06-01`;
                const endDate = `${endYear}-05-31`;

                const map: Record<string, 'P' | 'A'> = {};
                let present = 0;
                let absent = 0;
                let total = 0;

                snap.forEach(doc => {
                    const data = doc.data();
                    const date = data.date;
                    if (date >= startDate && date <= endDate) {
                        const status = data.records?.[student.schoolId];
                        if (status) {
                            map[date] = status;
                            total++;
                            if (status === 'P') present++;
                            else if (status === 'A') absent++;
                        }
                    }
                });

                setAttendanceMap(map);
                setAttendanceStats({
                    total,
                    present,
                    absent,
                    percentage: total > 0 ? Math.round((present / total) * 100) : 0
                });
            } catch (err) {
                console.error("Error fetching attendance:", err);
            } finally {
                setLoadingAttendance(false);
            }
        };
        fetchAttendance();
    }, [student?.schoolId, viewingYear]);

    // Derived Master Data
    const villages = Object.values(villagesData || {}).map((v: any) => ({ id: v.id, name: v.name || "Unknown Village" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const classes = Object.values(classesData || {}).map((c: any) => ({ id: c.id, name: c.name || "Unknown Class", order: c.order || 99 })).sort((a: any, b: any) => a.order - b.order);
    const sections = Object.values(sectionsData || {}).map((s: any) => ({ id: s.id, name: s.name || "Unknown Section" })).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    // Fee Collection State
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(() => searchParams.get('action') === 'collect_fee');
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    useEffect(() => {
        if (searchParams.get('action') === 'collect_fee') {
            setIsFeeModalOpen(true);
        }
    }, [searchParams]);

    const [feeForm, setFeeForm] = useState({
        amount: "",
        method: "cash",
        date: "",
        remarks: "",
        termId: "" // Which specific fee term this is for, if any
    });
    const [collectingFee, setCollectingFee] = useState(false);

    useEffect(() => {
        setFeeForm(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }, []);

    // Initial Fetch
    useEffect(() => {
        /**
         * Fetches all necessary student profile information, payment history, 
         * and the active fee ledger snapshot from Firestore.
         */
        const fetchAll = async () => {
            if (!studentId) return;
            setLoading(true);

            try {
                // 2. Parallel Fetch: Student Profile & Payments
                const studentRef = doc(db, "students", studentId);
                const pQ = query(collection(db, "payments"), where("studentId", "==", studentId)); // Note: Usually schoolId is studentId docId

                const [studentSnap, pSnap] = await Promise.all([
                    getDoc(studentRef),
                    getDocs(pQ)
                ]);

                if (!studentSnap.exists()) {
                    alert("Student Not Found");
                    router.push("/admin/students");
                    return;
                }

                const sData = { id: studentSnap.id, ...studentSnap.data() } as Student;
                const loadedPayments = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

                setStudent(sData);
                setEditForm(sData);
                
                // Filter payments specifically for the viewing academic year
                const currentYearId = viewingYear || "2025-2026";
                const filteredPayments = loadedPayments.filter(p => (p.academicYear || "2025-2026") === currentYearId);
                setPayments(filteredPayments.sort((a, b) => {
                    const dateDiff = safeDateParse(b.date) - safeDateParse(a.date);
                    if (dateDiff !== 0) return dateDiff;
                    return safeDateParse((b as any).createdAt) - safeDateParse((a as any).createdAt);
                }));

                // 3. Auto-Sync Fee Ledger (Uses Centralized Config)
                const ledgerRef = doc(db, "student_fee_ledgers", `${sData.schoolId}_${currentYearId}`);
                const ledgerSnap = await getDoc(ledgerRef);

                try {
                    const feeTerms = (feeConfig.terms || []).filter((t: any) => t.isActive);
                    const targetClassName = sData.className || "Class 1";
                    const newItems: FeeLedgerItem[] = [];

                    feeTerms.forEach((term: any) => {
                        const amount = term.amounts?.[targetClassName] || 0;
                        if (amount > 0) newItems.push({ id: `TERM_${term.id}`, type: "TERM", name: term.name, dueDate: term.dueDate, amount: Number(amount), paidAmount: 0, status: "PENDING" });
                    });

                    customFees.forEach(cf => {
                        if (cf.targetType === "CLASS" && cf.targetIds?.includes(sData.classId)) {
                            newItems.push({ id: `CUSTOM_${cf.id}`, type: "CUSTOM", name: cf.name, dueDate: cf.dueDate, amount: Number(cf.amount), paidAmount: 0, status: "PENDING" });
                        }
                    });

                    let existingItems: FeeLedgerItem[] = [];
                    if (ledgerSnap.exists()) existingItems = (ledgerSnap.data().items as FeeLedgerItem[]) || [];

                    const mergedItems = [...existingItems];
                    let hasChanges = !ledgerSnap.exists();

                    newItems.forEach(newItem => {
                        const existingIndex = mergedItems.findIndex(i => i.id === newItem.id);
                        if (existingIndex === -1) {
                            mergedItems.push(newItem);
                            hasChanges = true;
                        } else {
                            const ex = mergedItems[existingIndex];
                            if (ex.paidAmount === 0 && ex.amount !== newItem.amount) {
                                mergedItems[existingIndex] = { ...ex, amount: newItem.amount, dueDate: newItem.dueDate, name: newItem.name };
                                hasChanges = true;
                            } else if (ex.dueDate !== newItem.dueDate || ex.name !== newItem.name) {
                                mergedItems[existingIndex] = { ...ex, dueDate: newItem.dueDate, name: newItem.name };
                                hasChanges = true;
                            }
                        }
                    });

                    const calculatedTotalPaid = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    const calculatedTotalFee = mergedItems.reduce((sum, i) => sum + i.amount, 0);
                    const ledData = ledgerSnap.data();

                    // Read-only safeguards: freeze ledger updates if in historical mode
                    if (!isHistoricalMode && (hasChanges || ledData?.totalFee !== calculatedTotalFee || ledData?.totalPaid !== calculatedTotalPaid)) {
                        const newLedgerData = {
                            studentId: sData.schoolId,
                            academicYearId: currentYearId,
                            classId: sData.classId,
                            className: sData.className,
                            totalFee: calculatedTotalFee,
                            totalPaid: calculatedTotalPaid,
                            status: calculatedTotalPaid >= calculatedTotalFee && calculatedTotalFee > 0 ? "PAID" : "PENDING",
                            items: mergedItems,
                            updatedAt: new Date().toISOString()
                        };
                        await setDoc(ledgerRef, newLedgerData, { merge: true });
                        setLedger(newLedgerData as FeeLedger);
                    } else {
                        setLedger(ledData as FeeLedger || { totalFee: calculatedTotalFee, totalPaid: calculatedTotalPaid, items: mergedItems });
                    }
                } catch (autoSyncErr) {
                    console.error("Auto Sync Failed:", autoSyncErr);
                    // Fallback to strict DB snapshot if auto-sync fails
                    setLedger(ledgerSnap.exists() ? (ledgerSnap.data() as FeeLedger) : null);
                }

                // Master data now handled by context

            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [studentId, router, viewingYear]);

    /**
     * Updates the student's profile information in Firestore and logs the action.
     * Removes undefined fields before saving.
     */
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
            Object.keys(updates).forEach(key => {
                if (updates[key] === undefined) {
                    delete updates[key];
                }
            });

            await updateDoc(doc(db, "students", student.id), updates);
            setStudent({ ...student, ...updates } as Student);
            setIsEditing(false);

            // Log Update
            const safeUpdates = { ...updates };
            delete safeUpdates.parentMobile;

            await addDoc(collection(db, "audit_logs"), {
                action: "UPDATE_STUDENT_PROFILE",
                targetId: student.id,
                details: safeUpdates,
                timestamp: Timestamp.now()
            });

            // Notification for Manager Action
            if (isManager) {
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

    /**
     * Handles the collection of a fee payment.
     * Records the payment in the 'payments' collection and updates the student's ledger sequentially via transaction/batch.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;
        setCollectingFee(true);

        try {
            const amount = Number(feeForm.amount);
            if (amount <= 0) throw new Error("Invalid Amount");

            const now = new Date();
            const managerRemark = isManager ? ` [Collected by Manager: ${userData?.schoolId || user?.email}]` : "";

            const newPayment = {
                studentId: student.schoolId,
                studentName: student.studentName,
                amount,
                method: feeForm.method,
                date: Timestamp.fromDate(new Date(feeForm.date)),
                status: "success",
                remarks: feeForm.remarks ? `${feeForm.remarks}${managerRemark}` : (managerRemark ? managerRemark.trim() : ""),
                academicYear: selectedYear || "2025-2026",
                createdAt: Timestamp.now(),
                verifiedBy: isManager ? `manager:${userData?.schoolId || user?.email}` : "admin"
            };

            const batch = writeBatch(db);
            const paymentRef = doc(collection(db, "payments"));
            batch.set(paymentRef, newPayment);

            // === Critical Update: Update Student Ledger & Distribute Across Items ===
            const newTotalPaid = totalPaid + amount;
            const currentYearId = selectedYear || "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${student.schoolId}_${currentYearId}`);

            let remainingAmount = amount;
            const updatedItems = (ledger?.items || []).map((item: any) => {
                if (remainingAmount <= 0) return item;
                
                // Calculate due for this specific item. If it's a "distributedDue" item we use its raw amounts.
                const itemTotal = Number(item.amount || 0);
                const itemPaid = Number(item.paidAmount || 0);
                const itemDue = itemTotal - itemPaid;
                
                if (itemDue > 0) {
                    const payAmount = Math.min(itemDue, remainingAmount);
                    remainingAmount -= payAmount;
                    return { ...item, paidAmount: itemPaid + payAmount };
                }
                return item;
            });

            batch.set(ledgerRef, {
                totalPaid: newTotalPaid,
                items: updatedItems,
                status: newTotalPaid >= totalFee ? "PAID" : "PENDING",
                updatedAt: new Date().toISOString()
            }, { merge: true });

            await batch.commit();
            const ref = paymentRef;

            setPayments([{ id: ref.id, ...newPayment } as unknown as Payment, ...payments]);
            setLedger(prev => prev ? { ...prev, totalPaid: newTotalPaid, items: updatedItems, status: newTotalPaid >= totalFee ? "PAID" : "PENDING" } : null);

            // Store receipt data to trigger print flow
            setReceiptData({ id: ref.id, ...newPayment });

            // === Notifications ===
            // 2. Notify Admins & Effective User (if Manager)
            if (isManager) {
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
            setFeeForm({ amount: "", method: "cash", date: new Date().toISOString().split('T')[0], remarks: "", termId: "" });
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

    /**
     * Calculates the breakdown of due and paid amounts across term and custom fees.
     * Distributes total payments across fee items using a FIFO strategy based on due dates.
     * @returns {Object} An object containing the processed items and summarized totals.
     */
    const getBreakdown = () => {
        if (!ledger) return { items: [], termsPaid: 0, termsTotal: 0, customPaid: 0, customTotal: 0, pending: [], termsPending: 0, customPending: 0 };

        const safeItems = Array.isArray(ledger.items) ? ledger.items : Object.values(ledger.items || {});
        // Use FIFO distribution for display: payments cover oldest items first
        const sortedItems = [...safeItems].sort((a: any, b: any) => {
            const dateA = a.dueDate ? safeDateParse(a.dueDate) : 0;
            const dateB = b.dueDate ? safeDateParse(b.dueDate) : 0;
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
                due: i.distributedDue,
                id: i.id, // Add id for selection
                type: i.type, // Add type for filtering
                dueDate: i.dueDate // Add dueDate for sorting
            }))
        };
    };

    const breakdown = getBreakdown();

    /**
     * Refreshes the page data by simply reloading the window.
     */
    const refreshData = () => {
        // Cheap refresh: strict reload or just re-fetch function? 
        // For now, full reload is safer for sync issues. 
        window.location.reload();
    };

    // Reset Password State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const academicMonths = [
        { name: "June", month: 5, yearOffset: 0 },
        { name: "July", month: 6, yearOffset: 0 },
        { name: "August", month: 7, yearOffset: 0 },
        { name: "September", month: 8, yearOffset: 0 },
        { name: "October", month: 9, yearOffset: 0 },
        { name: "November", month: 10, yearOffset: 0 },
        { name: "December", month: 11, yearOffset: 0 },
        { name: "January", month: 0, yearOffset: 1 },
        { name: "February", month: 1, yearOffset: 1 },
        { name: "March", month: 2, yearOffset: 1 },
        { name: "April", month: 3, yearOffset: 1 },
        { name: "May", month: 4, yearOffset: 1 }
    ];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };



    return (
        <div className="min-h-[calc(100vh-88px)] bg-[#0A192F] text-white pb-24 md:pb-8 animate-in fade-in duration-300">
            {/* Modal Components */}
            <AdminChangePasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                user={{ uid: student?.uid || "", schoolId: student?.schoolId || "", name: student?.studentName || "", role: "STUDENT" }}
            />
            {student && (
                <DeleteUserModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    user={{ id: student.schoolId, schoolId: student.schoolId, name: student.studentName, role: "student" }}
                    checkEligibility={async () => { return { canDelete: true }; }}
                    onDeactivate={async () => {}}
                    onDelete={async () => {}}
                />
            )}
            {student && ledger && (
                <AdjustFeesModal
                    isOpen={isAdjustModalOpen}
                    onClose={() => setIsAdjustModalOpen(false)}
                    studentId={student.schoolId}
                    academicYearId={selectedYear}
                    ledgerItems={ledger.items || []}
                    onSuccess={() => window.location.reload()}
                />
            )}

            {/* Mobile-First Header / Hero Section */}
            <div className="sticky top-0 z-40 bg-[#0A192F]/90 backdrop-blur-xl border-b border-white/5 py-2 px-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/students')} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 shrink-0 text-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        {loading ? (
                            <div className="h-5 w-24 bg-white/10 animate-pulse rounded" />
                        ) : student ? (
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                <h1 className="text-[15px] font-bold tracking-tight text-white line-clamp-1">{student.studentName}</h1>
                                <Badge variant={student.status === 'ACTIVE' ? 'default' : 'destructive'} className="uppercase text-[8px] h-3 px-1.5 shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/20">
                                    {student.status}
                                </Badge>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {!loading && student && canEdit && !isHistoricalMode && (
                            <Dialog open={isFeeModalOpen} onOpenChange={setIsFeeModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-7 bg-[#00E676] hover:bg-[#00C853] text-black font-bold text-[10px] px-3 rounded-lg shadow-[0_0_15px_-3px_rgba(0,230,118,0.4)]">
                                        Collect Fee
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#0A192F] text-white border-white/10 sm:max-w-md w-[95vw] rounded-2xl">
                                    <DialogHeader><DialogTitle className="text-xl">Collect Fee</DialogTitle></DialogHeader>
                                    <form onSubmit={handleCollectFee}>
                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label className="text-white/70">Amount Received (₹)</Label>
                                                <Input required min="1" type="number" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} className="bg-white/5 border-white/10 h-12 text-lg" placeholder="0" />
                                            </div>
                                            <Button type="submit" disabled={collectingFee} className="w-full h-12 bg-[#00E676] text-black font-bold text-lg rounded-xl">Confirm Payment</Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}

                        {!loading && student && canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 text-white hover:bg-white/10 rounded-lg">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-white rounded-xl min-w-[160px]">
                                    <DropdownMenuItem onClick={() => { setActiveTab('profile'); setIsEditing(true); }} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                                        <Edit className="w-4 h-4 text-indigo-400" />
                                        <span>Edit Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsResetModalOpen(true)} className="gap-2 cursor-pointer focus:bg-rose-500/20 focus:text-rose-400 text-rose-400">
                                        <ShieldAlert className="w-4 h-4" />
                                        <span>Reset Password</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {!loading && student && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-[#8892B0] font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5 truncate max-w-[180px]">
                            {student.schoolId} • {(classesData || {})[student.classId]?.name || student.className || "Class"}-{(sectionsData || {})[student.sectionId]?.name || student.sectionName || "Section"}
                        </span>
                        
                        <Select value={viewingYear} onValueChange={setViewingYear}>
                            <SelectTrigger className="h-5 py-0 border-white/10 bg-white/5 text-[9px] font-bold w-auto min-w-[80px] focus:ring-0 rounded-md text-white ml-auto">
                                <SelectValue placeholder="Session" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A192F] border-white/10 text-white font-semibold">
                                {Object.keys(academicYears || {}).map(year => (
                                    <SelectItem key={year} value={year} className="text-[11px]">
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Compact Segmented Control Tabs */}
            <div className="bg-[#0A192F] border-b border-white/5">
                <div className="flex overflow-x-auto px-2 py-1.5 custom-scrollbar snap-x gap-1">
                    {[
                        { id: 'profile', label: 'Profile' },
                        { id: 'academic', label: 'Academics' },
                        { id: 'attendance', label: 'Attendance' },
                        { id: 'fees', label: 'Fees' },
                        { id: 'documents', label: 'Documents' },
                        { id: 'history', label: 'History' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-none h-7 px-3.5 rounded-md flex items-center justify-center transition-all duration-300 border snap-center ${
                                activeTab === tab.id 
                                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' 
                                : 'bg-transparent border-transparent hover:bg-white/5 text-[#8892B0]'
                            }`}
                        >
                            <span className={`text-[11px] font-bold tracking-wide`}>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Container */}
            <div className="p-3 mx-auto max-w-5xl">
                {activeTab === 'profile' && (
                    <ProfileTab 
                        student={student} 
                        editForm={editForm} 
                        setEditForm={setEditForm} 
                        isEditing={isEditing} 
                        setIsEditing={setIsEditing} 
                        handleUpdate={handleUpdate} 
                        canEdit={canEdit} 
                        villages={villages} 
                        classes={classes} 
                        sections={sections} 
                        loading={loading}
                        setIsResetModalOpen={setIsResetModalOpen}
                    />
                )}
                {activeTab === 'fees' && (
                    <FeesTab 
                        student={student}
                        ledger={ledger}
                        totalFee={totalFee}
                        totalPaid={totalPaid}
                        dueAmount={dueAmount}
                        breakdown={breakdown}
                        canEdit={canEdit && role !== "MANAGER"}
                        isHistoricalMode={isHistoricalMode}
                        setIsAdjustModalOpen={setIsAdjustModalOpen}
                        printStudentFeeStructure={printStudentFeeStructure}
                        branding={branding}
                        loading={loading}
                    />
                )}
                {activeTab === 'attendance' && (
                    <AttendanceTab 
                        attendanceMap={attendanceMap}
                        attendanceStats={attendanceStats}
                        viewingYear={viewingYear}
                        loading={loadingAttendance || loading}
                    />
                )}
                {activeTab === 'academic' && (
                    <AcademicsTab 
                        student={student}
                        exams={exams}
                        examResults={examResults}
                        loading={loadingExams || loading}
                    />
                )}
                {activeTab === 'history' && (
                    <HistoryTab 
                        payments={payments}
                        loading={loading}
                    />
                )}
                {activeTab === 'documents' && (
                    <DocumentsTab 
                        student={student}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
}
