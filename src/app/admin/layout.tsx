"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/admin/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/lib/sidebar-store";
import { useMasterData } from "@/context/MasterDataContext";

import { AuthenticatedProvider } from "@/components/providers/AuthenticatedProvider";

function AdminContent({ children }: { children: React.ReactNode }) {
    const { user, userData, loading } = useAuth();
    const { branding } = useMasterData();
    const router = useRouter();
    const { isOpen } = useSidebarStore();



    useEffect(() => {
        // Block all routing decisions until the loading state is fully resolved
        if (loading) return;

        // If data is fully loaded but no user exists, kick to login
        if (!user) {
            return;
        }

        // Verify Role
        if (userData && userData.role) {
            const r = String(userData.role).toUpperCase();
            if (["SUPER_ADMIN", "SUPERADMIN"].includes(r)) {
                router.replace("/super-admin");
            } else if (r === "TEACHER") {
                router.replace("/teacher");
            } else if (r === "STUDENT") {
                router.replace("/student");
            }
        }
    }, [user, userData, loading, router]);

    // Hard fallback UI if user slips through somehow without data to stop loops dead in their tracks
    if (!loading && (!userData || !userData.role)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0A192F] text-white">
                <p className="text-red-400 mb-4 text-xl font-bold uppercase tracking-widest">Session Invalid</p>
                <p className="text-white/50 mb-8 max-w-sm text-center">Your authentication context is missing or invalid. Please sign in again.</p>
                <a href="/login" className="bg-[#64FFDA] text-[#0A192F] px-6 py-2 rounded-lg font-bold hover:bg-[#64FFDA]/80 transition-colors">
                    Return to Login
                </a>
            </div>
        );
    }

    // Brief loading state while auth resolves
    const isAuthenticating = loading && !userData;

    return (
        <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-foreground font-sans overflow-hidden">
            {/* Full-width Top Header */}
            <TopBar />

            {/* Mobile Branch Name Indicator */}
            {branding?.schoolId && (
                <div className="md:hidden w-full bg-[#112240] border-b border-[#64FFDA]/10 px-4 py-2 flex items-center justify-between text-[11px] font-mono shrink-0">
                    <span className="text-white/60">Active Branch:</span>
                    {branding.schoolName === "" ? (
                        <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                    ) : (
                        <span className="text-[#64FFDA] font-bold">{branding.schoolName} ({branding.schoolId})</span>
                    )}
                </div>
            )}
            
            {/* Content Area below header */}
            <div className="flex-1 flex relative min-w-0 overflow-hidden">
                <main className={cn(
                    "flex-1 py-4 md:py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-20 md:pb-6 transition-all duration-300",
                    isOpen && "md:pl-[190px]"
                )}>
                    <div className="w-full space-y-4 md:space-y-6">
                        {children}
                    </div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedProvider>
            <AdminContent>{children}</AdminContent>
        </AuthenticatedProvider>
    );
}
