"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function UniversalNotificationsRedirect() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace("/login");
            } else if (role === "ADMIN" || role === "MANAGER") {
                router.replace("/admin/notices");
            } else if (role === "TEACHER") {
                router.replace("/teacher/notices");
            } else if (role === "STUDENT") {
                router.replace("/student/notices");
            } else {
                router.replace("/");
            }
        }
    }, [user, role, loading, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0A192F]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-[#64FFDA] animate-spin" />
                <p className="text-[#8892B0] font-mono text-sm animate-pulse">Routing to Notice Board...</p>
            </div>
        </div>
    );
}
