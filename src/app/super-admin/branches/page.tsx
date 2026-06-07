"use client";

import { useEffect, useState } from "react";
import { branchService, Branch } from "@/lib/services/branchService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Building2 } from "lucide-react";
import Link from "next/link";

export default function BranchManagementPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await branchService.getAllBranches();
                setBranches(data);
            } catch (error) {
                console.error("Failed to fetch branches", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBranches();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white">Branch Management</h1>
                    <p className="text-[#8892B0] mt-1">Manage organization branches and admins</p>
                </div>
                <Link href="/super-admin/branches/create">
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/20">
                        <Plus className="w-5 h-5 mr-2" /> Add Branch
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-[200px] bg-white/5 rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map(branch => (
                        <Link key={branch.id} href={`/super-admin/branches/${branch.id}`} className="block">
                            <Card className="bg-[#0f172a] border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group h-full cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{branch.branchName}</h3>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-[#8892B0]">
                                                CODE: {branch.branchCode}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                                                branch.status === 'ACTIVE' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            }`}>
                                                {branch.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-white/5">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#8892B0]">Principal</span>
                                            <span className="font-medium text-white">{branch.principalName}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#8892B0]">Location</span>
                                            <span className="font-medium text-white">{branch.city}, {branch.state}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    
                    {branches.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                            <h3 className="text-xl font-bold text-white mb-2">No Branches Found</h3>
                            <p className="text-[#8892B0] mb-6">Create your first branch to get started.</p>
                            <Link href="/super-admin/branches/create">
                                <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-10 px-6 rounded-xl">
                                    Create Default Branch
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
