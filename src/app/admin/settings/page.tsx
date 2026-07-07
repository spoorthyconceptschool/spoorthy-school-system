"use client";

import { AcademicYearManager } from "@/components/admin/academic-year-manager";
import { BrandingSettingsV2 as BrandingSettings } from "@/components/admin/branding-settings";
import { SystemUsersManager } from "@/components/admin/system-users-manager";
import { InactiveUsersManager } from "@/components/admin/inactive-users-manager";
import { SystemToggles } from "@/components/admin/system-toggles";
import { WebsiteIdentitySettings } from "@/components/admin/website-identity-settings";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { branchService, Branch } from "@/lib/services/branchService";
import { ShieldAlert, Loader2, Globe, Building, Settings as SettingsIcon, Users2, Shield, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function AdminSettingsPage() {
    const { user, userData, loading, role } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"website" | "branch-mgmt" | "branch-id" | "system">("branch-id");
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [loadingBranches, setLoadingBranches] = useState(false);

    const activeRole = userData?.role?.toString().toUpperCase() || role?.toString().toUpperCase() || "";
    const isSuperAdmin = activeRole === "SUPER_ADMIN";
    const isBranchAdmin = activeRole === "ADMIN" || activeRole === "MANAGER";

    // Initialize default tab based on role
    useEffect(() => {
        if (isSuperAdmin) {
            setActiveTab("website");
        } else {
            setActiveTab("branch-id");
        }
    }, [isSuperAdmin]);

    // Load branches for Super Admin
    useEffect(() => {
        if (isSuperAdmin && activeTab === "branch-mgmt") {
            setLoadingBranches(true);
            branchService.getAllBranches()
                .then(list => {
                    setBranches(list);
                    if (list.length > 0 && !selectedBranchId) {
                        setSelectedBranchId(list[0].id || "");
                    }
                })
                .catch(err => {
                    console.error("Failed to load branches in settings page", err);
                })
                .finally(() => setLoadingBranches(false));
        }
    }, [isSuperAdmin, activeTab]);

    if (loading && !userData) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-muted-foreground animate-pulse">Checking permissions...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
            <p className="text-rose-500 font-bold">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Retry</Button>
        </div>
    );

    if (!["ADMIN", "OWNER", "DEVELOPER", "MANAGER"].includes(activeRole) || isSuperAdmin) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-500/20">
                <ShieldAlert className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold text-white">Restricted Access</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    {isSuperAdmin
                        ? "This settings page is restricted to Branch Administrators. Website Branding is managed under Website CMS, and branches are managed inside the Branch Management dashboard."
                        : "This section is restricted to School Administrators. You do not have the necessary permissions to modify system settings."}
                </p>
            </div>
            <Button asChild variant="outline" className="border-white/10 hover:bg-white/5">
                <Link href={isSuperAdmin ? "/super-admin" : "/admin"}>Return to Dashboard</Link>
            </Button>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 md:gap-8 p-3 md:p-8 max-w-7xl mx-auto pb-20">
            <div className="flex-none">
                <h1 className="text-xl md:text-3xl font-display font-bold text-white italic tracking-tight">System <span className="text-accent underline decoration-accent/20">Settings</span></h1>
                <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest font-bold opacity-100">
                    {isSuperAdmin ? "HQ & Global Controls" : `Branch Administration (${userData?.schoolName || "Campus"})`}
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
                {/* Left Tabs Sidebar for Super Admin & Branch Admin */}
                <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0 bg-[#112240]/40 p-3 rounded-2xl border border-white/5 backdrop-blur-xl">
                    {isSuperAdmin ? (
                        <>
                            <button
                                onClick={() => setActiveTab("website")}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === "website"
                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                        : "text-[#8892B0] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Globe className="w-4 h-4" /> Website Identity
                            </button>
                            <button
                                onClick={() => setActiveTab("branch-mgmt")}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === "branch-mgmt"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                        : "text-[#8892B0] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Building className="w-4 h-4" /> Branch Management
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setActiveTab("branch-id")}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === "branch-id"
                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                                        : "text-[#8892B0] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Building2 className="w-4 h-4" /> Branch Identity
                            </button>
                            <button
                                onClick={() => setActiveTab("system")}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === "system"
                                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                                        : "text-[#8892B0] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <SettingsIcon className="w-4 h-4" /> System Administration
                            </button>
                        </>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full space-y-6">
                    {/* WEBSITE IDENTITY TAB (Super Admin Only) */}
                    {activeTab === "website" && isSuperAdmin && (
                        <WebsiteIdentitySettings />
                    )}

                    {/* BRANCH MANAGEMENT TAB (Super Admin Only) */}
                    {activeTab === "branch-mgmt" && isSuperAdmin && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Building className="w-5 h-5 text-indigo-400" /> Branch Registry
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1">Manage active operational school campuses.</p>
                                </div>
                                <Link href="/super-admin/branches/create">
                                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Add Branch
                                    </Button>
                                </Link>
                            </div>

                            {loadingBranches ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                                    {[1, 2].map(i => <div key={i} className="h-40 bg-white/5 rounded-xl" />)}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {branches.map(b => (
                                        <Link key={b.id} href={`/super-admin/branches/${b.id}`}>
                                            <Card className="bg-zinc-900/40 border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer group">
                                                <CardContent className="p-5 flex flex-col justify-between h-full">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors text-base">{b.branchName}</h3>
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest border uppercase ${
                                                                b.status === 'ACTIVE'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                            }`}>
                                                                {b.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-[#8892B0] font-mono mb-4">ID: {b.schoolId || b.id} | Code: {b.branchCode}</p>
                                                    </div>
                                                    <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs text-zinc-400">
                                                        <span>Principal: <strong className="text-white font-medium">{b.principalName || "Not Assigned"}</strong></span>
                                                        <span>{b.city}, {b.state}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BRANCH IDENTITY TAB (Branch Admin Only) */}
                    {activeTab === "branch-id" && isBranchAdmin && (
                        <div className="space-y-6">
                            <BrandingSettings branchAdminMode={isBranchAdmin} />
                        </div>
                    )}

                    {/* SYSTEM ADMINISTRATION TAB (Branch Admin Only) */}
                    {activeTab === "system" && isBranchAdmin && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            <div className="space-y-6">
                                <SystemUsersManager />
                                <InactiveUsersManager />
                            </div>
                            <div className="space-y-6">
                                <SystemToggles />
                                <AcademicYearManager />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

