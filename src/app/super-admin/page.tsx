"use client";

import { useBranch } from "@/context/BranchContext";
import { Building2, Users, Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SuperAdminDashboard() {
    const { selectedBranchId } = useBranch();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                        Global Headquarters
                    </h1>
                    <p className="text-[#8892B0] mt-1">
                        {selectedBranchId ? `Viewing data for branch: ${selectedBranchId}` : "Viewing combined data across all branches"}
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
                                <p className="text-sm font-medium text-[#8892B0]">Total Branches</p>
                                <p className="text-2xl font-bold text-white">4</p>
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
                                <p className="text-2xl font-bold text-white">4,250</p>
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
                                <p className="text-2xl font-bold text-white">₹1.2Cr</p>
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
                                <p className="text-sm font-medium text-[#8892B0]">New Admissions</p>
                                <p className="text-2xl font-bold text-white">340</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl h-[400px]">
                    <CardContent className="p-6 flex items-center justify-center h-full text-[#8892B0]">
                        Branch-wise Revenue Comparison Chart (Coming Soon)
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-white/5 rounded-2xl h-[400px]">
                    <CardContent className="p-6 flex items-center justify-center h-full text-[#8892B0]">
                        Branch Growth Trends (Coming Soon)
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
