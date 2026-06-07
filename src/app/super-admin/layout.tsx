"use client";

import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Users, FileText, Settings, LayoutDashboard, LogOut } from "lucide-react";
import { branchService, Branch } from "@/lib/services/branchService";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { isSuperAdmin, loading, signOut } = useAuth();
    const { selectedBranchId, setSelectedBranchId } = useBranch();
    const router = useRouter();
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        if (!loading && !isSuperAdmin) {
            router.replace("/");
        }
    }, [isSuperAdmin, loading, router]);

    useEffect(() => {
        if (isSuperAdmin) {
            branchService.getAllBranches().then(setBranches).catch(console.error);
        }
    }, [isSuperAdmin]);

    if (loading || !isSuperAdmin) {
        return <div className="min-h-screen bg-[#0A192F] flex items-center justify-center text-white">Loading Super Admin...</div>;
    }

    return (
        <div className="flex h-screen bg-[#0A192F] text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-[#112240] border-r border-white/5 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-white/5">
                    <Building2 className="w-6 h-6 text-emerald-400 mr-2" />
                    <span className="font-bold text-lg">HQ Dashboard</span>
                </div>
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        <li>
                            <Link href="/super-admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-[#8892B0] hover:text-white transition-colors">
                                <LayoutDashboard className="w-5 h-5" /> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link href="/super-admin/branches" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-[#8892B0] hover:text-white transition-colors">
                                <Building2 className="w-5 h-5" /> Branch Management
                            </Link>
                        </li>
                        <div className="pt-4 pb-2 px-3 text-xs font-black uppercase tracking-widest text-[#8892B0]/50">Global Analytics</div>
                        <li>
                            <Link href="/super-admin/students" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-[#8892B0] hover:text-white transition-colors">
                                <Users className="w-5 h-5" /> Students
                            </Link>
                        </li>
                        <li>
                            <Link href="/super-admin/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-[#8892B0] hover:text-white transition-colors">
                                <FileText className="w-5 h-5" /> Combined Reports
                            </Link>
                        </li>
                        <div className="pt-4 pb-2 px-3 text-xs font-black uppercase tracking-widest text-[#8892B0]/50">System Administration</div>
                        <li>
                            <Link href="/super-admin/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-[#8892B0] hover:text-white transition-colors">
                                <Settings className="w-5 h-5" /> Settings
                            </Link>
                        </li>
                        <li>
                            <Link href="/super-admin/cms" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-[#8892B0] hover:text-white transition-colors">
                                <FileText className="w-5 h-5" /> Website CMS
                            </Link>
                        </li>
                    </ul>
                </nav>
                <div className="p-4 border-t border-white/5">
                    <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-500/10 text-rose-400 w-full transition-colors">
                        <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Nav (Branch Switcher) */}
                <header className="h-16 flex items-center justify-between px-8 bg-[#112240]/50 border-b border-white/5 backdrop-blur-md">
                    <h2 className="font-bold text-xl">Super Admin Platform</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-[#8892B0]">Active Branch:</span>
                        <select 
                            className="bg-[#0f172a] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium text-white outline-none focus:border-indigo-500/50"
                            value={selectedBranchId || ""}
                            onChange={(e) => setSelectedBranchId(e.target.value || null)}
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.branchName}</option>
                            ))}
                        </select>
                    </div>
                </header>
                
                {/* Page Content */}
                <div className="flex-1 overflow-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
