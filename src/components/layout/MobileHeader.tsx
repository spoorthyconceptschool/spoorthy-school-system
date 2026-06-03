"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { NotificationCenter } from "@/components/NotificationCenter";

interface MobileHeaderProps {
    role: "STUDENT" | "TEACHER" | "ADMIN";
    portalTitle: string;
    profileHref: string;
    leftTrigger?: React.ReactNode;
}

export function MobileHeader({ role, portalTitle, profileHref, leftTrigger }: MobileHeaderProps) {
    const { user, userData } = useAuth();
    const { branding } = useMasterData();
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [branding?.schoolLogo]);

    // Extract first name and capitalize
    const name = userData?.name || user?.email?.split("@")[0] || "User";
    const firstName = name.split(" ")[0].replace(/^\w/, (c: string) => c.toUpperCase());

    return (
        <header className="h-[52px] lg:hidden px-3 flex items-center justify-between bg-[#030712]/80 backdrop-blur-md shrink-0 relative z-40 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            {/* Glowing Bottom Border */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#00b4ec] via-[#6366f1] to-[#a855f7]" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00b4ec] via-[#6366f1] to-[#a855f7] opacity-40 blur-[2px]" />

            {/* Left Section: Logo & Portal info */}
            <div className="flex items-center gap-1.5 overflow-hidden">
                {leftTrigger && <div className="shrink-0">{leftTrigger}</div>}
                
                {/* School Logo */}
                <div className="w-8 h-8 rounded-full border border-white/20 bg-[#030712]/50 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                    {!imageError && branding?.schoolLogo ? (
                        <img
                            src={branding.schoolLogo}
                            alt="Logo"
                            className="w-full h-full object-contain filter drop-shadow-sm"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold font-display text-[10px]">
                            {portalTitle.substring(0, 1)}
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="h-5 w-[1px] bg-white/10 shrink-0 mx-1" />

                {/* Portal Title */}
                <span className="font-display font-black text-white text-[11px] tracking-wider uppercase shrink-0">
                    {portalTitle}
                </span>

                {/* Vertical Divider */}
                <div className="h-5 w-[1px] bg-white/10 shrink-0 mx-1 hidden xs:block" />

                {/* Welcome Message */}
                <span className="text-[10px] text-slate-300 font-medium tracking-tight truncate max-w-[100px] sm:max-w-none hidden xs:block">
                    Welcome back, {firstName} 👋
                </span>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
                {/* Notification Bell */}
                <NotificationCenter role={role} />

                {/* Vertical Divider */}
                <div className="h-5 w-[1px] bg-white/10 shrink-0 mx-1" />

                {/* Avatar */}
                <Link href={profileHref} className="relative block group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] border border-blue-500/30 flex items-center justify-center font-bold text-xs text-white shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform duration-200">
                        {firstName.substring(0, 1)}
                    </div>
                    {/* Active indicator dot */}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22c55e] border-2 border-[#030712] rounded-full shadow-[0_0_4px_#22c55e]" />
                </Link>
            </div>
        </header>
    );
}
