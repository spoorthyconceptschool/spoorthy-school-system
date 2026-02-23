"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Download, Search, CheckCircle2 } from "lucide-react";
import { PaySalaryModal } from "@/components/admin/pay-salary-modal";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useMasterData } from "@/context/MasterDataContext";
import { cn } from "@/lib/utils";

export default function SalaryPage() {
    const { branding } = useMasterData();
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
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
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Teachers
            const tSnap = await getDocs(query(collection(db, "teachers"), where("status", "==", "ACTIVE")));
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
            const sSnap = await getDocs(collection(db, "staff"));
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

            const allEmployees = [...teachers, ...staff].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
            setEmployees(allEmployees);

            // 3. Fetch Payments
            const pQuery = query(
                collection(db, "salary_payments"),
                where("month", "==", month),
                where("year", "==", year)
            );
            const pSnap = await getDocs(pQuery);
            const paymentData = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPayments(paymentData);

            // 4. Fetch Teacher Attendance for Leaves
            const monthIndex = new Date(`${month} 1, 2000`).getMonth() + 1;
            const monthStr = String(monthIndex).padStart(2, '0');
            const startDate = `${year}-${monthStr}-01`;
            const endDate = `${year}-${monthStr}-31`;

            const attQuery = query(
                collection(db, "attendance"),
                where(documentId(), ">=", `TEACHERS_${startDate}`),
                where(documentId(), "<=", `TEACHERS_${endDate}`)
            );
            const attSnap = await getDocs(attQuery);
            const counts: Record<string, number> = {};

            attSnap.forEach(doc => {
                const data = doc.data();
                if (data.records) {
                    Object.entries(data.records).forEach(([schoolId, status]) => {
                        if (status === 'A') {
                            counts[schoolId] = (counts[schoolId] || 0) + 1;
                        }
                    });
                }
            });

            // 5. Fetch Staff Attendance for Leaves
            const staffAttQuery = query(
                collection(db, "attendance"),
                where(documentId(), ">=", `STAFF_${startDate}`),
                where(documentId(), "<=", `STAFF_${endDate}`)
            );
            const staffAttSnap = await getDocs(staffAttQuery);
            staffAttSnap.forEach(doc => {
                const data = doc.data();
                if (data.records) {
                    Object.entries(data.records).forEach(([schoolId, status]) => {
                        if (status === 'A') {
                            counts[schoolId] = (counts[schoolId] || 0) + 1;
                        }
                    });
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
                                        <td>${emp.schoolId}</td>
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

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-none p-0 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pt-2 md:pt-4 gap-4 md:gap-6 px-1 md:px-0">
                <div>
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Payroll Center
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-lg tracking-tight">Managing staff disbursements for <span className="text-white font-bold">{month} {year}</span></p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[120px] md:w-[140px] bg-black/40 border-white/10 rounded-xl h-9 md:h-11 text-xs md:text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="w-[80px] md:w-[100px] bg-black/40 border-white/10 text-center rounded-xl h-9 md:h-11 font-mono font-bold text-xs md:text-sm"
                    />

                    <Button variant="outline" className="h-9 md:h-11 gap-2 border-white/10 bg-white/5 rounded-xl hover:bg-white/10 px-3 md:px-4 text-xs md:text-sm" onClick={handlePrint}>
                        <Download size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Print Report</span><span className="sm:hidden">Print</span>
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 md:p-5 rounded-2xl backdrop-blur-sm shadow-xl flex sm:flex-col justify-between items-center sm:items-start">
                    <p className="text-xs md:text-[10px] font-black uppercase tracking-widest text-emerald-400 italic">Total Disbursed</p>
                    <div className="text-2xl md:text-3xl font-mono font-black text-white">₹{totalPayroll.toLocaleString()}</div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-4 md:p-5 rounded-2xl backdrop-blur-sm shadow-xl flex sm:flex-col justify-between items-center sm:items-start">
                    <p className="text-xs md:text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Accounts Paid</p>
                    <div className="text-2xl md:text-3xl font-mono font-black text-white">{paidCount} <span className="text-xs md:text-xs text-blue-400/50">Staff</span></div>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 p-4 md:p-5 rounded-2xl backdrop-blur-sm shadow-xl flex sm:flex-col justify-between items-center sm:items-start">
                    <p className="text-xs md:text-[10px] font-black uppercase tracking-widest text-orange-400 italic">Outstanding</p>
                    <div className="text-2xl md:text-3xl font-mono font-black text-white">{unpaidCount} <span className="text-xs md:text-xs text-orange-400/50">Pending</span></div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-black/20 p-3 md:p-5 rounded-2xl border border-white/10 backdrop-blur-md space-y-3 md:space-y-4 shadow-2xl mx-2 md:mx-0">
                <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Find by name or staff ID..."
                            className="pl-10 md:pl-11 h-10 md:h-12 bg-white/5 border-white/10 rounded-xl focus:ring-accent/30 text-xs md:text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 lg:flex gap-2">
                        <Select value={filterRole} onValueChange={setFilterRole}>
                            <SelectTrigger className="w-full md:w-[150px] h-10 md:h-12 bg-white/5 border-white/10 rounded-xl text-xs md:text-sm">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="ALL">All Roles</SelectItem>
                                <SelectItem value="TEACHER">Teachers</SelectItem>
                                <SelectItem value="STAFF">Helpers</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full md:w-[150px] h-10 md:h-12 bg-white/5 border-white/10 rounded-xl text-xs md:text-sm">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="PAID">Disbursed</SelectItem>
                                <SelectItem value="UNPAID">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20 animate-pulse"><Loader2 className="w-12 h-12 animate-spin text-accent" /></div>
            ) : (
                <div className="space-y-4">
                    <DataTable
                        data={filteredEmployees}
                        isLoading={loading}
                        columns={[
                            {
                                key: "employeeInfo",
                                header: "Employee Info",
                                render: (emp) => (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] md:text-sm text-white group-hover:text-accent transition-colors leading-tight">{emp.name}</span>
                                        <span className="text-[9px] md:text-[10px] font-mono text-white/60 tracking-tighter uppercase">{emp.schoolId}</span>
                                        <span className="text-[7px] md:text-[8px] text-white/50 mt-0.5 md:mt-1 uppercase font-black">Base: ₹{Number(emp.baseSalary || 0).toLocaleString()}</span>
                                    </div>
                                )
                            },
                            {
                                key: "role",
                                header: "Role",
                                render: (emp) => (
                                    <span className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5">{emp.roleDisplay}</span>
                                )
                            },
                            {
                                key: "absents",
                                header: "Absents",
                                cellClassName: "text-center",
                                render: (emp) => {
                                    const leaves = leavesMap[emp.schoolId] || 0;
                                    return (
                                        <span className={cn(
                                            "font-black text-xs md:text-sm",
                                            leaves > 0 ? "text-orange-400" : "text-emerald-400/30"
                                        )}>
                                            {leaves}
                                        </span>
                                    );
                                }
                            },
                            {
                                key: "payments",
                                header: "Month Payments",
                                render: (emp) => {
                                    const empPayments = getEmployeePayments(emp.id);
                                    const totalPaid = empPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
                                    const totalDeductions = empPayments.reduce((s: number, p: any) => s + (Number(p.deductions) || 0), 0);
                                    const isFullyPaid = (emp.baseSalary || 0) > 0 && (totalPaid + totalDeductions) >= (emp.baseSalary || 0);

                                    return (
                                        <div className="flex flex-wrap gap-1 md:gap-1.5 min-w-[120px] md:min-w-[140px]">
                                            {empPayments.map(p => (
                                                <Badge
                                                    key={p.id}
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-white/10 transition-colors gap-1 px-1.5 md:px-2 border-white/10 bg-white/5 py-0 md:py-0.5"
                                                    onClick={() => handlePayClick(emp, p)}
                                                >
                                                    <span className="text-[8px] md:text-[9px] font-bold text-emerald-400">₹{p.amount}</span>
                                                    <span className="text-[6px] md:text-[7px] opacity-40 uppercase font-black">{p.type || 'S'}</span>
                                                </Badge>
                                            ))}
                                            {!isFullyPaid && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 md:h-6 px-2 md:px-3 text-[8px] md:text-[9px] rounded-lg bg-[#64FFDA]/10 text-[#64FFDA] hover:bg-[#64FFDA] hover:text-[#0A192F] font-black uppercase tracking-tighter transition-all"
                                                    onClick={() => handlePayClick(emp, undefined, totalPaid)}
                                                >
                                                    Pay Now
                                                </Button>
                                            )}
                                        </div>
                                    );
                                }
                            },
                            {
                                key: "disbursement",
                                header: "Net Disbursement",
                                cellClassName: "text-right",
                                render: (emp) => {
                                    const empPayments = getEmployeePayments(emp.id);
                                    const totalPaid = empPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
                                    const totalDeductions = empPayments.reduce((s: number, p: any) => s + (Number(p.deductions) || 0), 0);
                                    const isFullyPaid = (emp.baseSalary || 0) > 0 && (totalPaid + totalDeductions) >= (emp.baseSalary || 0);

                                    return (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <span className={cn(
                                                    "font-mono font-black text-base md:text-lg transition-colors",
                                                    isFullyPaid ? "text-emerald-400" : (totalPaid > 0 ? "text-blue-400 font-bold" : "text-white/20")
                                                )}>
                                                    ₹{Number(totalPaid).toLocaleString()}
                                                </span>
                                                {isFullyPaid && <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-500" strokeWidth={3} />}
                                            </div>
                                            {!isFullyPaid && emp.baseSalary && (totalPaid > 0 || totalDeductions > 0) && (
                                                <span className="text-[8px] md:text-[9px] font-black text-orange-500 uppercase italic">Due: ₹{Number(Math.max(0, emp.baseSalary - totalPaid - totalDeductions)).toLocaleString()}</span>
                                            )}
                                        </div>
                                    );
                                }
                            }
                        ]}
                    />
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
