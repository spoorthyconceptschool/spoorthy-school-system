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
        if (!loading && !user) {
            router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
            return;
        }

        if (loading || !userData) return;

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
        // Fallback: If still loading after 8s, stop showing the loader
        // to prevent users from being stuck on a blank screen.
        const timer = setTimeout(() => setShowLoader(false), 8000);
        return () => clearTimeout(timer);
    }, []);

    // Show shell immediately if possibly logged in
    const isAuthenticating = (loading || (user && !userData)) && showLoader;

    if (isAuthenticating) {
        return (
            <div className="h-[100dvh] w-full flex items-center justify-center bg-[#0A192F]">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-foreground font-sans overflow-hidden">
            {/* Desktop Sidebar - Hidden on mobile/tablet */}
            <div className="hidden lg:flex h-full shrink-0">
                <Sidebar />
            </div>

            {/* Main Application Shell */}
            <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                <TopBar />
                <main className="flex-1 px-4 md:px-5 lg:px-8 py-4 md:py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-20 lg:pb-6">
                    <div className="w-full space-y-4 md:space-y-6">
                        {children}
                    </div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
