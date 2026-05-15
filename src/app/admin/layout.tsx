"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { TopBar } from "@/components/admin/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

import { AuthenticatedProvider } from "@/components/providers/AuthenticatedProvider";

function AdminContent({ children }: { children: React.ReactNode }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        // Block all routing decisions until the loading state is fully resolved
        if (loading) return;

        // If data is fully loaded but no user exists, kick to login
        if (!user) {
            return;
        }

        // Verify Role
        if (userData && userData.role) {
            const r = userData.role;
            if (r === "TEACHER") {
                router.replace("/teacher");
            } else if (r === "STUDENT") {
                router.replace("/student");
            }
        }
    }, [user, userData, loading, router]);

    // Hard fallback UI if user slips through somehow without data to stop loops dead in their tracks
    if (!loading && (!user || !userData || !userData.role)) {
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

    useEffect(() => {
        const timer = setTimeout(() => setShowLoader(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Explicit loading state block
    const isAuthenticating = loading || (!userData && user && showLoader);

    return (
        <div className="flex h-[100dvh] bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-foreground font-sans overflow-hidden">
            {/* Desktop Sidebar - Persistent shell */}
            <div className="hidden lg:flex h-full shrink-0">
                <Sidebar />
            </div>

            {/* Main Application Shell - Always stable */}
            <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                <TopBar />
                <main className="flex-1 py-4 md:py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-20 lg:pb-6">
                    <div className="w-full space-y-4 md:space-y-6">
                        {isAuthenticating ? (
                            <div className="h-full w-full flex flex-col items-center justify-center p-20">
                                <Loader2 className="w-8 h-8 text-accent animate-spin mb-4 opacity-20" />
                                <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/10 animate-pulse italic">Synchronizing...</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                {children}
                            </div>
                        )}
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
