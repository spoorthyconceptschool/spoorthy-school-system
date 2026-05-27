"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function StudentDashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/student");
    }, [router]);

    return (
        <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-[#64FFDA]">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                Redirecting to dashboard...
            </p>
        </div>
    );
}
