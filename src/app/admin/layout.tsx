"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { TopBar } from "@/components/admin/topbar";

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

    // Show shell immediately if possibly logged in
    const isAuthenticating = loading || (user && !userData);

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-foreground font-sans overflow-hidden">
            {/* Desktop Sidebar - Hidden on mobile/tablet */}
            <div className="hidden lg:flex h-full shrink-0">
                <Sidebar />
            </div>

            {/* Main Application Shell */}
            <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                <TopBar />
                <main className="flex-1 p-1 md:p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                    <div className="max-w-none space-y-4 md:space-y-6 px-1 md:px-2">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
