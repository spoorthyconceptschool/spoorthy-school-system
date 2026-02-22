
"use client";

import { AcademicYearManager } from "@/components/admin/academic-year-manager";
import { BrandingSettings } from "@/components/admin/branding-settings";
import { SystemUsersManager } from "@/components/admin/system-users-manager";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [loadingRole, setLoadingRole] = useState(true);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (!user) return;

        const unsub = onSnapshot(doc(db, "users", user.uid),
            (d) => {
                if (!isMounted) return;
                setRole(d.exists() ? d.data().role : null);
                setLoadingRole(false);
            },
            (err) => {
                console.error("Settings role verification error:", err);
                if (!isMounted) return;
                setError("Failed to verify access level.");
                setLoadingRole(false);
            }
        );
        return () => {
            isMounted = false;
            unsub();
        };
    }, [user]);

    if (loadingRole) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-muted-foreground animate-pulse">Verifying credentials...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
            <p className="text-rose-500 font-bold">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Retry</Button>
        </div>
    );

    const activeRole = role?.toString().toUpperCase() || "";

    if (!["ADMIN", "SUPER_ADMIN", "OWNER", "DEVELOPER", "MANAGER"].includes(activeRole)) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-500/20">
                <ShieldAlert className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold text-white">Restricted Access</h1>
                <p className="text-muted-foreground max-w-md mx-auto">This terminal is restricted to Level 1 Administrators. Your current clearance does not permit modification of system-wide settings.</p>
            </div>
            <Button asChild variant="outline" className="border-white/10 hover:bg-white/5">
                <Link href="/admin">Return to Dashboard</Link>
            </Button>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 md:gap-8 p-3 md:p-8 max-w-7xl mx-auto pb-20">
            <div className="flex-none">
                <h1 className="text-xl md:text-3xl font-display font-bold text-white italic tracking-tight">System <span className="text-accent underline decoration-accent/20">Settings</span></h1>
                <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest font-bold opacity-100">L1 Administrative Control Panel</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
                {/* Left Panel: Branding */}
                <div className="w-full space-y-4 md:space-y-8">
                    <BrandingSettings />
                    <SystemUsersManager />
                </div>

                {/* Right Panel: Academic Years */}
                <div className="w-full">
                    <AcademicYearManager />
                </div>
            </div>
        </div>
    );
}

