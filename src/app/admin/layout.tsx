"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { TopBar } from "@/components/admin/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading && !userData) return;
        
        if (!loading && !user && !userData) {
            router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
            return;
        }

        if (!userData) return;

        // Verify Role - Instant check from context
        const r = userData.role;
        if (r === "TEACHER") {
            router.replace("/teacher");
        } else if (r === "STUDENT") {
            router.replace("/student");
        }
    }, [user, userData, loading, router]);

    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowLoader(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Rocket Speed Logic: Show shell and children immediately if cached data exists
    // We only show a loading state if we are truly unknown (no session at all)
    const isAuthenticating = loading && !userData && showLoader;

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
