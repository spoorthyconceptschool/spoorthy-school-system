"use client";

import { Bell, Plus, User, FileText, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToastStore } from "@/lib/toast-store";
import { SeedDataButton } from "@/components/admin/seed-data-button";
import { MobileSidebar } from "./MobileSidebar";
import { UniversalSearch } from "./UniversalSearch";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { cn } from "@/lib/utils";

export function TopBar() {
    const { user, signOut } = useAuth();
    const { academicYears, selectedYear, setSelectedYear, branding, systemConfig } = useMasterData();
    const { history, clearHistory, removeFromHistory } = useToastStore();
    const [scrolled, setScrolled] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { role } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset image error when branding changes
    useEffect(() => {
        setImageError(false);
    }, [branding?.schoolLogo]);

    // Add scroll listener to main content
    useEffect(() => {
        const main = document.querySelector('main');
        if (!main) return;

        const handleScroll = () => {
            setScrolled(main.scrollTop > 20);
        };

        main.addEventListener('scroll', handleScroll);
        return () => main.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`h-16 sticky top-0 z-40 transition-all duration-300 flex items-center justify-between px-2 md:px-4 ${scrolled
                ? "bg-[#0A192F]/80 backdrop-blur-md border-b border-[#64FFDA]/10 shadow-lg"
                : "bg-[#0A192F] md:bg-transparent"
                }`}
        >
            <div className="flex items-center gap-2 shrink-0">
                <MobileSidebar />
                <div className="lg:hidden flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center border border-white/20 overflow-hidden shrink-0 shadow-md">
                        {!imageError ? (
                            <img
                                src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                alt="Logo"
                                className="w-full h-full object-contain"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="w-full h-full bg-[#64FFDA]/10 flex items-center justify-center text-[#0A192F] font-bold font-display text-xs">S</div>
                        )}
                    </div>
                    {/* Hide name on tiny/medium screens to make room for Search and dev tools */}
                    <span className="font-display font-black text-white text-[10px] xs:text-sm tracking-tight truncate max-w-[80px] sm:max-w-[150px] hidden lg:block">
                        {branding?.schoolName || "Spoorthy School"}
                    </span>
                </div>
            </div>

            {/* Search - Pill shaped, integrated - Now visible on all screens */}
            <div className="flex-1 min-w-[40px] xs:min-w-[120px] md:min-w-[200px] max-w-xl mx-1 md:mx-4">
                <UniversalSearch />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                {/* Global Actions - Hidden on tiny mobile, shown as icon on sm */}
                <div className="flex items-center gap-1 md:gap-3">
                    {/* Academic Year Switcher - Compact on mobile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={cn(
                                "h-8 md:h-9 gap-1 rounded-full border-[#64FFDA]/20 px-2 md:px-4 bg-[#0A192F]/40 transition-all",
                                academicYears[selectedYear]?.active ? "text-[#64FFDA]/80 hover:bg-[#64FFDA]/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                            )}>
                                <CalendarClock size={14} className="shrink-0 md:size-4" />
                                <span className="text-[9px] md:text-xs font-bold font-mono whitespace-nowrap hidden xs:inline">{selectedYear}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0A192F]/95 backdrop-blur-xl border border-[#64FFDA]/20 text-white min-w-[150px]">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-90">Academic Session</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <div className="max-h-[300px] overflow-y-auto">
                                {Object.values(academicYears || {})
                                    .sort((a: any, b: any) => String(b.id || "").localeCompare(String(a.id || "")))
                                    .map((y: any) => (
                                        <DropdownMenuItem
                                            key={y.id}
                                            onClick={() => setSelectedYear(y.id)}
                                            className={cn(
                                                "cursor-pointer text-xs font-bold font-mono flex items-center justify-between py-2 px-3",
                                                selectedYear === y.id ? "bg-[#64FFDA]/20 text-[#64FFDA]" : "hover:bg-white/5",
                                                !y.active && "text-zinc-400 opacity-60"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span>{y.id}</span>
                                                <span className="text-[8px] uppercase tracking-tighter opacity-50 font-sans">
                                                    {y.active ? "Current Session" : "Planned/Archived"}
                                                </span>
                                            </div>
                                            {y.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />}
                                        </DropdownMenuItem>
                                    ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {systemConfig.testingMode && <SeedDataButton />}

                    {/* Pill Action Button - Optional Quick Action */}
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-[#64FFDA]/50 hover:text-[#64FFDA] hover:bg-[#64FFDA]/10 sm:hidden lg:flex">
                        <Plus size={18} />
                    </Button>
                </div>

                {/* Real-time Notifications */}
                <NotificationCenter role={role as any} />

                {/* Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-9 h-9 rounded-full bg-[#0A192F]/40 p-0.5 border border-[#64FFDA]/20 hover:scale-105 transition-transform overflow-hidden shadow-lg">
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#64FFDA] to-purple-600 flex items-center justify-center text-[10px] font-bold text-black">
                                {user?.email?.charAt(0).toUpperCase() || "U"}
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#0A192F]/90 backdrop-blur-xl border border-[#64FFDA]/20 text-white p-1 shadow-2xl rounded-xl mt-2">
                        <DropdownMenuLabel className="px-3 py-2 text-sm font-bold opacity-90 uppercase tracking-widest">Account</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10 mx-1" />
                        <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg px-3 py-2 text-sm font-medium">
                            <User className="mr-3 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer rounded-lg px-3 py-2 text-sm font-medium">
                            <FileText className="mr-3 h-4 w-4" />
                            <span>Billing</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10 mx-1" />
                        <DropdownMenuItem onClick={signOut} className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer rounded-lg px-3 py-2 text-sm font-medium">
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
