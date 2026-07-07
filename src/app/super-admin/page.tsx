"use client";

import { useBranch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { Building2, Users, Receipt, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SuperAdminDashboard() {
    const { selectedBranchId } = useBranch();
    const { user, callApi } = useAuth();
    
    const [stats, setStats] = useState({
        totalSchools: 0,
        totalStudents: 0,
        revenueCollected: 0,
        pendingFees: 0
    });
    const [branchData, setBranchData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const fetchDashboardData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                let url = '/api/admin/dashboard/stats';
                if (selectedBranchId) {
                    url += `?branchId=${selectedBranchId}`;
                }

                // Use the resilient callApi helper provided by AuthContext
                const res = await callApi(url, {
                    signal: controller.signal
                });
                const data = await res.json();
                
                if (data && data.success) {
                    const dashboardData = data.data;
                    setStats({
                        totalSchools: dashboardData.totalSchools || (selectedBranchId ? 1 : 0),
                        totalStudents: dashboardData.totalStudents || 0,
                        revenueCollected: (dashboardData.finance?.totalPaid || dashboardData.finance?.schoolPaid || dashboardData.todayCollection || 0), 
                        pendingFees: Math.max(0, (dashboardData.finance?.totalFee || 0) - (dashboardData.finance?.totalPaid || 0))
                    });
                    setBranchData(dashboardData.branchWiseStats || []);
                }
            } catch (error: any) {
                if (error.name === 'AbortError') return;
                console.error("Failed to fetch super admin dashboard stats:", error);
            } finally {
                // Ensure we don't update state on an unmounted component
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchDashboardData();

        return () => {
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, selectedBranchId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                            Global Headquarters
                        </h1>
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-emerald-500/50" />}
                    </div>
                    <p className="text-[#8892B0] mt-1">
                        {selectedBranchId 
                            ? `Viewing data for school: ${branchData.find(b => b.branchName === selectedBranchId || b.branchId === selectedBranchId)?.branchName || selectedBranchId}` 
                            : "Viewing combined data across all schools"}
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#8892B0]">Total Schools</p>
                                <p className="text-2xl font-bold text-white transition-opacity duration-300" style={{ opacity: loading ? 0.5 : 1 }}>
                                    {stats.totalSchools}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#8892B0]">Total Students</p>
                                <p className="text-2xl font-bold text-white transition-opacity duration-300" style={{ opacity: loading ? 0.5 : 1 }}>
                                    {stats.totalStudents}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#8892B0]">Revenue Collected</p>
                                <p className="text-2xl font-bold text-white transition-opacity duration-300" style={{ opacity: loading ? 0.5 : 1 }}>
                                    ₹{stats.revenueCollected.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#8892B0]">Total Pending Fees</p>
                                <p className="text-2xl font-bold text-white transition-opacity duration-300" style={{ opacity: loading ? 0.5 : 1 }}>
                                    ₹{stats.pendingFees.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl h-[400px] flex flex-col">
                    <div className="p-6 pb-0">
                        <h3 className="font-semibold text-white">School-wise Revenue Comparison</h3>
                        <p className="text-sm text-[#8892B0]">Total collected revenue per branch</p>
                    </div>
                    <CardContent className="p-6 flex-1 min-h-0">
                        {branchData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="branchName" stroke="#8892B0" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#8892B0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} width={60} />
                                    <Tooltip 
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#112240', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                                        formatter={(val: any, name: any) => [`₹${Number(val || 0).toLocaleString()}`, name === 'revenue' ? 'Collected Revenue' : 'Pending Fees']}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#8892B0' }} />
                                    <Bar dataKey="revenue" name="Collected Revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="pendingFees" name="Pending Fees" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[#8892B0]">No data available</div>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl h-[400px] flex flex-col">
                    <div className="p-6 pb-0">
                        <h3 className="font-semibold text-white">School-wise Enrollment</h3>
                        <p className="text-sm text-[#8892B0]">Active student count per branch</p>
                    </div>
                    <CardContent className="p-6 flex-1 min-h-0">
                        {branchData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="branchName" stroke="#8892B0" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#8892B0" fontSize={12} tickLine={false} axisLine={false} width={40} />
                                    <Tooltip 
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#112240', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                                        formatter={(val: any) => [val, 'Students']}
                                    />
                                    <Bar dataKey="totalStudents" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[#8892B0]">No data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
