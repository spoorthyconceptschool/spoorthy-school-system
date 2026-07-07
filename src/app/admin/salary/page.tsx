"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Download, Search, CheckCircle2, ArrowLeft, IndianRupee, Users, Clock } from "lucide-react";
import { PaySalaryModal } from "@/components/admin/pay-salary-modal";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/context/MasterDataContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function SalaryPage() {
    const router = useRouter();
    const { role } = useAuth();

    if (role === "MANAGER") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center p-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
                    <IndianRupee className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Access Denied</h1>
                <p className="text-muted-foreground text-sm max-w-md">
                    Managers do not have permission to view staff salaries or manage payroll options.
                </p>
                <Button 
                    onClick={() => router.push("/admin")}
                    className="h-10 px-6 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold uppercase tracking-tighter text-sm"
                >
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    if (!role) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
    }

    return <SalaryAdminPanel />;
}

function SalaryAdminPanel() {
    const router = useRouter();
    const { role, branchId: activeBranchId } = useAuth();
    const { branding, teachers: masterTeachers, staff: masterStaff } = useMasterData();
    const EMPLOYEES_CACHE_KEY = activeBranchId ? `spoorthy_salary_employees_cache_${activeBranchId}` : null;
    const PAYMENTS_CACHE_KEY = activeBranchId ? `spoorthy_salary_payments_cache_${activeBranchId}` : null;

    const [employees, setEmployees] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined' && EMPLOYEES_CACHE_KEY && PAYMENTS_CACHE_KEY) {
            const cachedEmp = localStorage.getItem(EMPLOYEES_CACHE_KEY);
            const cachedPay = localStorage.getItem(PAYMENTS_CACHE_KEY);
            if (cachedEmp) {
                try { setEmployees(JSON.parse(cachedEmp)); } catch(e) {}
            } else {
                setEmployees([]);
            }
            if (cachedPay) {
                try { setPayments(JSON.parse(cachedPay)); } catch(e) {}
            } else {
                setPayments([]);
            }
        } else {
            setEmployees([]);
            setPayments([]);
        }
    }, [EMPLOYEES_CACHE_KEY, PAYMENTS_CACHE_KEY]);

    const [loading, setLoading] = useState(false);
    const [leavesMap, setLeavesMap] = useState<Record<string, number>>({});

    // Filters
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("ALL"); // ALL, TEACHER, STAFF
    const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, PAID, UNPAID

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [selectedPaidAmount, setSelectedPaidAmount] = useState(0);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [month, year, activeBranchId]);

    const fetchData = async () => {
        if (!activeBranchId) return;
        setLoading(true);
        try {
            // 1. Fetch Teachers
            const tSnap = await getDocs(query(
                collection(db, "teachers"), 
                where("status", "==", "ACTIVE"),
                where("branchId", "==", activeBranchId)
            ));
            const teachers = tSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    personType: "TEACHER",
                    roleDisplay: "Teacher",
                    baseSalary: data.baseSalary || data.salary
                };
            });

            // 2. Fetch Staff
            const sSnap = await getDocs(query(
                collection(db, "staff"),
                where("branchId", "==", activeBranchId)
            ));
            const staff = sSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    personType: "STAFF",
                    roleDisplay: data.roleName || "Staff",
                    baseSalary: data.baseSalary || data.salary
                };
            });

            const allEmployees = [...teachers, ...staff].sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
            setEmployees(allEmployees);

            // 3. Fetch Payments
            const pQuery = query(
                collection(db, "salary_payments"),
                where("month", "==", month),
                where("year", "==", year),
                where("branchId", "==", activeBranchId)
            );
            const pSnap = await getDocs(pQuery);
            const paymentData = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPayments(paymentData);

            if (typeof window !== 'undefined' && EMPLOYEES_CACHE_KEY && PAYMENTS_CACHE_KEY) {
                localStorage.setItem(EMPLOYEES_CACHE_KEY, JSON.stringify(allEmployees));
                localStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(paymentData));
            }

            // 4. Fetch Teacher & Staff Attendance for Leaves from attendance_daily
            const monthIndex = new Date(`${month} 1, 2000`).getMonth() + 1;
            const monthStr = String(monthIndex).padStart(2, '0');
            const startDate = `${year}-${monthStr}-01`;
            const endDate = `${year}-${monthStr}-31`;

            const attQuery = query(
                collection(db, "attendance_daily"),
                where("schoolId", "==", activeBranchId)
            );
            const attSnap = await getDocs(attQuery);
            const counts: Record<string, number> = {};

            attSnap.forEach(doc => {
                const data = doc.data();
                if (data.date >= startDate && data.date <= endDate) {
                    if (data.type === "TEACHERS" || data.type === "STAFF") {
                        if (data.records) {
                            Object.entries(data.records).forEach(([schoolId, status]) => {
                                if (status === 'A') {
                                    counts[schoolId] = (counts[schoolId] || 0) + 1;
                                }
                            });
                        }
                    }
                }
            });

            setLeavesMap(counts);

        } catch (error) {
            console.error("Error fetching payroll data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getEmployeePayments = (empId: string) => {
        return payments.filter(p => p.personId === empId);
    };

    const handlePayClick = (emp: any, payment?: any, paidSoFar: number = 0) => {
        setSelectedEmployee(emp);
        setSelectedPayment(payment || null);
        setSelectedPaidAmount(paidSoFar);
        setIsPayModalOpen(true);
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.schoolId && (emp.schoolId || "").toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = filterRole === "ALL" || emp.personType === filterRole;

        const empPayments = getEmployeePayments(emp.id);
        const totalPaid = empPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalDeductions = empPayments.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
        const isFullyPaid = (emp.baseSalary || 0) > 0 && (totalPaid + totalDeductions) >= (emp.baseSalary || 0);

        const matchesStatus = filterStatus === "ALL" ||
            (filterStatus === "PAID" && isFullyPaid) ||
            (filterStatus === "UNPAID" && !isFullyPaid);

        return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPayroll = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let paidCount = 0;
    employees.forEach(emp => {
        const empPayments = getEmployeePayments(emp.id);
        const totalPaid = empPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalDeductions = empPayments.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
        if ((emp.baseSalary || 0) > 0 && (totalPaid + totalDeductions) >= (emp.baseSalary || 0)) paidCount++;
    });

    const unpaidCount = employees.length - paidCount;

    const handlePrint = () => {
        const printContent = `
            <html>
                <head>
                    <title>Payroll Report - ${month} ${year}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .status-paid { color: green; font-weight: bold; }
                        .status-unpaid { color: orange; font-weight: bold; }
                        .header-row { border: none !important; background: white !important; }
                        .header-cell { border: none !important; padding: 20px 0; text-align: center; }
                        .print-header { display: flex; align-items: center; justify-content: center; gap: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; }
                        .school-logo { height: 80px; width: auto; object-fit: contain; }
                        .school-details { text-align: left; }
                        @media print {
                            thead { display: table-header-group; }
                            tr { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <table>
                        <thead>
                            <tr class="header-row">
                                <th colspan="9" class="header-cell">
                                    <div class="print-header">
                                        ${branding?.schoolLogo ? `<img src="${branding.schoolLogo}" class="school-logo" onload="window.print();" onerror="window.print();" />` : ''}
                                        <div class="school-details">
                                            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">${branding?.schoolName || 'Payroll Report'}</h1>
                                            ${branding?.address ? `<div style="font-size: 14px; color: #666; margin-top: 5px;">${branding.address}</div>` : ''}
                                            <h2 style="margin: 10px 0 0 0; font-size: 18px; color: #444;">Monthly Payroll - ${month} ${year}</h2>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                            <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Role</th>
                                <th>Leaves</th>
                                <th>Base Salary</th>
                                <th>Deductions</th>
                                <th>Bonuses</th>
                                <th>Paid Amount (Net)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredEmployees.map(emp => {
            const empPayments = getEmployeePayments(emp.id);
            const totalPaid = empPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const totalDeductions = empPayments.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
            const isFullyPaid = (emp.baseSalary || 0) > 0 && (totalPaid + totalDeductions) >= (emp.baseSalary || 0);
            const leaves = leavesMap[emp.schoolId] || 0;
            return `
                                    <tr>
                                        <td>${emp.name}</td>
                                        <td>${emp.teacherId || emp.staffId || emp.id}</td>
                                        <td>${emp.roleDisplay}</td>
                                        <td>${leaves}</td>
                                        <td>${emp.baseSalary || '-'}</td>
                                        <td>${empPayments.reduce((s, p) => s + (p.deductions || 0), 0) || '-'}</td>
                                        <td>${empPayments.reduce((s, p) => s + (p.bonuses || 0), 0) || '-'}</td>
                                        <td style="font-weight: bold;">${totalPaid ? '₹' + Number(totalPaid).toLocaleString() : '-'}</td>
                                        <td class="${isFullyPaid ? 'status-paid' : 'status-unpaid'}">${isFullyPaid ? 'PAID' : 'PENDING'}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                    <script>
                        // Fallback in case image onload doesn't fire or no image
                        if (!document.querySelector('img')) {
                            window.print();
                        } else {
                            setTimeout(() => {
                                // If print hasn't happened yet (e.g. image stuck)
                                // We can't easily detect if print dialog opened, but this is a safety net
                                // Actually, simpler to just rely on onload/onerror for image
                            }, 2000);
                        }
                    </script>
                </body>
            </html>
        `;
        const win = window.open('', '', 'width=900,height=700');
        if (win) {
            win.document.write(printContent);
            win.document.close();
            // Note: window.print() is called by the image onload/onerror handlers or the script
        }
    };
    const pageSize = 8;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredEmployees.length / pageSize);
    const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, filterStatus]);

    return (
        <div className="space-y-4 md:space-y-6 w-full pb-20 px-4 md:px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-0">
                <div className="space-y-0.5 md:space-y-1 w-full">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.back()} 
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0C2148]/60 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white transition-all shadow-md active:scale-95 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent leading-tight flex items-center gap-3">
                                Payroll Center
                            </h1>
                            <p className="text-white/50 text-[10px] md:text-xs mt-1">
                                Managing staff disbursements for <span className="text-white font-bold">{month} {year}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Month / Year / Print Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[100px] md:w-[125px] bg-[#0B1524]/60 border-white/5 rounded-lg h-9 text-xs text-white focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs border-white/10">
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                <SelectItem key={m} value={m} className="focus:bg-white/10 focus:text-white cursor-pointer">{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="w-[60px] md:w-[75px] bg-[#0B1524]/60 border-white/5 text-center rounded-lg h-9 font-mono font-bold text-xs text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                    />

                    <Button 
                        variant="outline" 
                        className="h-9 gap-1.5 border-white/20 bg-transparent text-white/80 hover:bg-white/5 hover:text-white rounded-lg text-xs transition-all font-medium px-3" 
                        onClick={handlePrint}
                    >
                        <Download size={13} className="shrink-0 text-white/70" />
                        <span>Print</span>
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Disbursed */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Disbursed</span>
                        <span className="text-xl md:text-2xl font-mono font-black text-white leading-none">₹{totalPayroll.toLocaleString()}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] shrink-0 transition-transform group-hover:scale-110">
                        <IndianRupee size={18} />
                    </div>
                </div>

                {/* Accounts Paid */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Accounts Paid</span>
                        <span className="text-xl md:text-2xl font-mono font-black text-white leading-none">{paidCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] shrink-0 transition-transform group-hover:scale-110">
                        <CheckCircle2 size={18} />
                    </div>
                </div>

                {/* Outstanding */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Outstanding</span>
                        <span className="text-xl md:text-2xl font-mono font-black text-white leading-none">{unpaidCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] shrink-0 transition-transform group-hover:scale-110">
                        <Clock size={18} />
                    </div>
                </div>
            </div>

            {/* Search & Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search name, ID, or base salary..."
                        className="pl-8 h-8 bg-[#0B1524]/60 border-white/5 rounded-lg focus:ring-cyan-500/30 text-[10px] text-white placeholder-white/30 w-full"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    {/* Role Filter */}
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-fit h-8 bg-[#0B1524]/60 border border-white/5 rounded-lg text-[10px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5">
                                <Users size={12} className="text-cyan-400" />
                                <SelectValue>{filterRole === "ALL" ? "All Roles" : (filterRole === "TEACHER" ? "Teachers" : "Staff")}</SelectValue>
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs border-white/10">
                            <SelectItem value="ALL">All Roles</SelectItem>
                            <SelectItem value="TEACHER">Teachers</SelectItem>
                            <SelectItem value="STAFF">Helpers</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-fit h-8 bg-[#0B1524]/60 border border-white/5 rounded-lg text-[10px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-[#64FFDA]" />
                                <SelectValue>{filterStatus === "ALL" ? "All Status" : (filterStatus === "PAID" ? "Paid" : "Outstanding")}</SelectValue>
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white text-xs border-white/10">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="UNPAID">Outstanding</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Reset Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSearchTerm("");
                            setFilterRole("ALL");
                            setFilterStatus("ALL");
                        }}
                        className="h-8 bg-[#0B1524]/60 border border-white/5 hover:bg-white/10 rounded-lg text-[10px] px-2.5 font-bold uppercase tracking-wider text-white/60 focus:ring-0"
                    >
                        Reset
                    </Button>
                </div>
            </div>

            {/* List View Container */}
            <div className="relative min-h-[300px] mt-4">
                {loading ? (
                    <div className="h-48 w-full flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#64FFDA] animate-spin mb-4" />
                        <p className="text-xs text-white/30 uppercase tracking-widest animate-pulse font-mono">Loading payroll...</p>
                    </div>
                ) : paginatedEmployees.length === 0 ? (
                    <div className="h-48 w-full flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                        <Users className="w-8 h-8 text-white/20 mb-2" />
                        <p className="text-xs text-white/40 uppercase tracking-widest font-mono">No employees found</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/[0.06] bg-[#050D1A]/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                        {/* Table Header Row (Desktop Only) */}
                        <div className="hidden md:flex items-stretch bg-black/40 border-b border-white/[0.06] text-[10px] font-black text-cyan-400 uppercase tracking-widest gap-0 rounded-t-2xl">
                            <div className="w-[20%] pl-4 pr-2 py-3 flex items-center border-r border-white/[0.06]">Employee</div>
                            <div className="w-[12%] px-3 py-3 flex items-center border-r border-white/[0.06]">ID</div>
                            <div className="w-[11%] px-3 py-3 flex items-center border-r border-white/[0.06]">Role</div>
                            <div className="w-[9%] px-3 py-3 flex items-center border-r border-white/[0.06] justify-center">Absents</div>
                            <div className="w-[12%] px-3 py-3 flex items-center border-r border-white/[0.06]">Base Salary</div>
                            <div className="w-[21%] px-3 py-3 flex items-center border-r border-white/[0.06]">Month Payments</div>
                            <div className="w-[15%] pr-4 py-3 flex items-center justify-end">Net Disbursement</div>
                        </div>
                        
                        <div className="flex flex-col gap-2.5 md:gap-0 md:divide-y md:divide-white/[0.04] p-2 md:p-0">
                            {paginatedEmployees.map((emp, idx) => {
                                const empPayments = getEmployeePayments(emp.id);
                                const totalPaid = empPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                                const totalDeductions = empPayments.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
                                const isFullyPaid = (emp.baseSalary || 0) > 0 && (totalPaid + totalDeductions) >= (emp.baseSalary || 0);
                                const leaves = leavesMap[emp.schoolId] || 0;

                                const colors = [
                                    { border: "border-cyan-500", text: "text-cyan-400" },
                                    { border: "border-purple-500", text: "text-purple-400" },
                                    { border: "border-emerald-500", text: "text-emerald-400" },
                                    { border: "border-amber-500", text: "text-amber-400" },
                                    { border: "border-rose-500", text: "text-rose-400" },
                                    { border: "border-blue-500", text: "border-blue-400" }
                                ];
                                const color = colors[idx % colors.length];
                                const serialNum = (currentPage - 1) * pageSize + idx + 1;
                                const formattedNum = serialNum < 10 ? `0${serialNum}` : `${serialNum}`;

                                return (
                                    <div 
                                        key={emp.id} 
                                        className="flex flex-col md:flex-row md:items-stretch justify-between py-3 md:py-0 px-3 sm:px-4 md:px-0 bg-[#0B1524]/60 md:bg-white/[0.01] hover:bg-white/[0.04] transition-all gap-3 md:gap-0 relative group rounded-xl md:rounded-none border border-white/[0.04] md:border-none overflow-hidden"
                                    >
                                        {/* Colored Border for mobile */}
                                        <div className={cn("md:hidden absolute left-0 top-0 bottom-0 w-1", color.border, "border-l-2")} />

                                        {/* MOBILE VIEW */}
                                        <div className="flex md:hidden flex-col w-full gap-2 pl-2">
                                            <div className="flex items-start justify-between w-full">
                                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                                    <span className={cn("text-sm font-mono font-black", color.text)}>
                                                        {formattedNum}
                                                    </span>
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-white leading-tight truncate uppercase tracking-wide">
                                                                {emp.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] text-white/40 tracking-wider font-mono">
                                                                ID: {emp.teacherId || emp.staffId || emp.id}
                                                            </span>
                                                            <span className="text-[10px] text-white/40 font-mono">
                                                                Base: ₹{Number(emp.baseSalary || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    <span className="inline-flex items-center justify-center h-5 px-2 rounded-full text-[8px] font-bold tracking-wide bg-white/5 border border-white/5 text-white/60">
                                                        {emp.roleDisplay?.toUpperCase()}
                                                    </span>
                                                    <span className="text-[10px] text-white/50">
                                                        Absents: <strong className="text-[#00E5FF] font-bold">{leaves}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-white/[0.04] pt-2.5 mt-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {empPayments.map(p => (
                                                        <Badge
                                                            key={p.id}
                                                            variant="outline"
                                                            className="cursor-pointer hover:bg-white/10 transition-colors gap-1 px-2 border-white/10 bg-white/5 py-0.5 h-6 text-[9px] text-[#00D98B] font-bold"
                                                            onClick={() => handlePayClick(emp, p)}
                                                        >
                                                            ₹{p.amount}
                                                            <span className="text-[7px] opacity-40 uppercase font-black">{p.type || 'S'}</span>
                                                        </Badge>
                                                    ))}
                                                    {!isFullyPaid ? (
                                                        <button
                                                            className="h-[28px] px-3 text-[9px] rounded bg-[#00D98B] active:bg-[#00D98B]/90 text-[#071A3A] font-black uppercase tracking-wide transition-all shadow-[0_0_8px_rgba(0,217,139,0.15)] border-none"
                                                            onClick={() => handlePayClick(emp, undefined, totalPaid)}
                                                        >
                                                            PAY NOW
                                                        </button>
                                                    ) : (
                                                        <span className="text-[8px] font-black text-[#00D98B] uppercase tracking-wider flex items-center gap-1">
                                                            ✔ PAID
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "font-mono font-black text-sm",
                                                        isFullyPaid ? "text-[#00D98B]" : (totalPaid > 0 ? "text-[#3B82F6]" : "text-white/20")
                                                    )}>
                                                        ₹{Number(totalPaid).toLocaleString()}
                                                    </span>
                                                    {!isFullyPaid && (totalPaid > 0 || totalDeductions > 0) && (
                                                        <span className="text-[8px] font-bold text-[#FF9F1A] uppercase">
                                                            Due: ₹{Number(Math.max(0, emp.baseSalary - totalPaid - totalDeductions)).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* DESKTOP VIEW */}
                                        {/* Col 1: Employee Name & Serial Number */}
                                        <div className="hidden md:flex items-center gap-3 w-[20%] min-w-0 pl-4 pr-2 py-3.5 border-r border-white/[0.06]">
                                            <span className="text-xs font-mono font-black text-cyan-400 shrink-0 w-6">
                                                {formattedNum}
                                            </span>
                                            <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">
                                                {emp.name}
                                            </span>
                                        </div>

                                        {/* Col 2: ID */}
                                        <div className="hidden md:flex items-center w-[12%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                            <span className="text-xs text-zinc-200 tracking-wider font-mono truncate">
                                                {emp.teacherId || emp.staffId || emp.id}
                                            </span>
                                        </div>

                                        {/* Col 3: Role */}
                                        <div className="hidden md:flex items-center w-[11%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                            <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-[9px] font-black tracking-wider bg-white/5 border border-white/10 text-zinc-300">
                                                {emp.roleDisplay?.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Col 4: Absents */}
                                        <div className="hidden md:flex items-center justify-center w-[9%] min-w-0 px-3 py-3.5 border-r border-white/[0.06] text-center">
                                            <span className="text-sm font-black text-[#00E5FF]">
                                                {leaves}
                                            </span>
                                        </div>

                                        {/* Col 5: Base Salary */}
                                        <div className="hidden md:flex items-center w-[12%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                            <span className="text-xs font-mono text-zinc-200 font-semibold truncate">
                                                ₹{Number(emp.baseSalary || 0).toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Col 6: Month Payments */}
                                        <div className="hidden md:flex items-center w-[21%] min-w-0 px-3 py-3.5 border-r border-white/[0.06]">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {empPayments.map(p => (
                                                    <Badge
                                                        key={p.id}
                                                        variant="outline"
                                                        className="cursor-pointer hover:bg-white/10 transition-colors gap-1 px-2 border-white/10 bg-white/5 py-0.5 h-6 text-[9px] text-[#00D98B] font-bold"
                                                        onClick={() => handlePayClick(emp, p)}
                                                    >
                                                        ₹{p.amount}
                                                        <span className="text-[7px] opacity-40 uppercase font-black">{p.type || 'S'}</span>
                                                    </Badge>
                                                ))}
                                                {!isFullyPaid && (
                                                    <Button
                                                        size="sm"
                                                        className="h-[28px] px-2.5 text-[9px] rounded-lg bg-[#00D98B] hover:bg-[#00D98B]/80 text-[#071A3A] font-black uppercase tracking-tight shadow-[0_0_10px_rgba(0,217,139,0.2)] transition-all border-none"
                                                        onClick={() => handlePayClick(emp, undefined, totalPaid)}
                                                    >
                                                        PAY NOW
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Col 7: Net Disbursement */}
                                        <div className="hidden md:flex items-center justify-end w-[15%] min-w-0 pr-4 py-3.5 text-right">
                                            <div className="flex flex-col items-end justify-center min-w-0">
                                                <span className={cn(
                                                    "font-mono font-black text-sm transition-colors truncate",
                                                    isFullyPaid ? "text-[#00D98B]" : (totalPaid > 0 ? "text-[#3B82F6]" : "text-white/30")
                                                )}>
                                                    ₹{Number(totalPaid).toLocaleString()}
                                                </span>
                                                {isFullyPaid ? (
                                                    <span className="text-[8px] font-bold text-[#00D98B] uppercase tracking-wider mt-0.5 leading-none">Fully Paid</span>
                                                ) : (
                                                    (totalPaid > 0 || totalDeductions > 0) && (
                                                        <span className="text-[8px] font-bold text-[#FF9F1A] uppercase tracking-wider mt-0.5 leading-none truncate">
                                                            Due: ₹{Number(Math.max(0, emp.baseSalary - totalPaid - totalDeductions)).toLocaleString()}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between py-2.5 px-4 bg-[#050D1A]/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl mt-4 shrink-0 shadow-2xl">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        Showing {Math.min((currentPage - 1) * pageSize + 1, filteredEmployees.length)} - {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(curr => Math.max(1, curr - 1))}
                            className="h-8 px-3 rounded-lg bg-[#0B1524]/60 hover:bg-white/10 border border-white/5 text-[9px] font-bold uppercase tracking-wider text-white disabled:opacity-30 transition-all cursor-pointer"
                        >
                            Prev
                        </button>
                        <button
                            disabled={currentPage >= totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(curr => Math.min(totalPages, curr + 1))}
                            className="h-8 px-3 rounded-lg bg-[#0B1524]/60 hover:bg-white/10 border border-white/5 text-[9px] font-bold uppercase tracking-wider text-white disabled:opacity-30 transition-all cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <PaySalaryModal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                employee={selectedEmployee}
                payment={selectedPayment}
                paidAmount={selectedPaidAmount}
                leavesCount={selectedEmployee ? (leavesMap[selectedEmployee.schoolId] || 0) : 0}
                defaultMonth={month}
                defaultYear={year}
                onSuccess={() => fetchData()}
            />
        </div>
    );
}
