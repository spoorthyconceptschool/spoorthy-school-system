"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardRouter() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If entirely blank state, wait for network
        if (loading && !userData) return;
        
        // If entirely rejected state, boot to login
        if (!loading && !user && !userData) {
            router.replace("/login");
            return;
        }

        if (!userData) return;

        const role = String(userData.role || "").toUpperCase();
        if (["ADMIN", "SUPER_ADMIN", "MANAGER", "OWNER", "DEVELOPER", "TIMETABLE_EDITOR"].includes(role)) {
            router.replace("/admin");
        } else if (role === "TEACHER") {
            router.replace("/teacher");
        } else if (role === "STUDENT" || role === "student") {
            router.replace("/student");
        } else {
            const email = user?.email || "";
            if (email.includes("admin")) router.replace("/admin");
            else router.replace("/student");
        }

    }, [user, userData, loading, router]);

    // If we have userData, we shouldn't show the authenticating shell for long, but Dashboard route is transient anyway
    if (userData) return null;

    return (
        <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center p-20 space-y-6">
            <Loader2 className="w-10 h-10 text-accent animate-spin opacity-50" />
            <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/40 animate-pulse italic">Authenticating...</p>
        </div>
    );
}
