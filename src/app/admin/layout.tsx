"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { TopBar } from "@/components/admin/topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
        }
    }, [user, loading, router]);

    // Show shell immediately, only block the content if definitely not logged in
    // This makes the transition feel instant
    const showShell = true;

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
                        {(!user && loading) ? (
                            <div className="flex items-center justify-center h-[60vh]">
                                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                            </div>
                        ) : !user ? null : (
                            children
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
