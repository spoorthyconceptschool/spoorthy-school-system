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
    const { academicYears, selectedYear, setSelectedYear, branding } = useMasterData();
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
            <div className="flex items-center gap-2">
                <MobileSidebar />
                <div className="lg:hidden flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-md">
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
                    <span className="font-display font-black text-white text-sm tracking-tight truncate max-w-[120px] xs:max-w-[150px]">
                        {branding?.schoolName || "Spoorthy School"}
                    </span>
                </div>
            </div>

            {/* Search - Pill shaped, integrated */}
            <div className="flex-1 min-w-0 max-w-[140px] xs:max-w-[180px] sm:max-w-xl mx-2 md:mx-4 hidden sm:block">
                <UniversalSearch />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-4 shrink-0 px-1">

                {/* Global Add - Hidden on small mobile */}
                <div className="hidden sm:flex items-center gap-2 mr-2">
                    {/* Academic Year Switcher */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={cn(
                                "h-9 gap-2 rounded-full border-[#64FFDA]/20 px-4 bg-[#0A192F]/40 transition-all",
                                academicYears[selectedYear]?.active ? "text-[#64FFDA]/80 hover:bg-[#64FFDA]/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                            )}>
                                <CalendarClock size={16} />
                                <span className="text-xs font-bold font-mono">{selectedYear}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0A192F]/95 backdrop-blur-xl border border-[#64FFDA]/20 text-white min-w-[150px]">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-90">Academic Session</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {Object.values(academicYears).sort((a, b) => b.id.localeCompare(a.id)).map((y: any) => (
                                <DropdownMenuItem
                                    key={y.id}
                                    onClick={() => setSelectedYear(y.id)}
                                    className={cn(
                                        "cursor-pointer text-xs font-bold font-mono flex items-center justify-between",
                                        selectedYear === y.id ? "bg-[#64FFDA]/20 text-[#64FFDA]" : "hover:bg-white/5",
                                        !y.active && "text-zinc-400"
                                    )}
                                >
                                    {y.id}
                                    {y.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <SeedDataButton />
                    {/* Pill Action Button */}
                    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full border-[#64FFDA]/20 hover:bg-[#64FFDA]/10 hover:text-[#64FFDA] px-4 bg-[#0A192F]/40 text-[#64FFDA]/80">
                        <Plus size={16} />
                        <span className="text-xs font-bold">Action</span>
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
