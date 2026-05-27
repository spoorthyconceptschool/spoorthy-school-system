"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LayoutDashboard, Clock, BookOpen, Bell, Calendar, Wallet, User, LogOut, Lock, Users, Menu, X, MessageSquare, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useMasterData } from "@/context/MasterDataContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UniversalSearch } from "@/components/admin/UniversalSearch";

const TEACHER_NAV = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/teacher", exact: true },
    { label: "Students", icon: GraduationCap, href: "/teacher/students" },
    { label: "Attendance", icon: CheckCircle, href: "/teacher/attendance" },
    { label: "Time Table", icon: Clock, href: "/teacher/timetable" },
    { label: "Homework", icon: BookOpen, href: "/teacher/homework" },
    { label: "Notices", icon: Bell, href: "/teacher/notices" },
    { label: "Groups", icon: Users, href: "/teacher/groups" },
    { label: "Leave", icon: MessageSquare, href: "/teacher/leaves" },
    { label: "Holidays", icon: Calendar, href: "/teacher/holidays" },
    { label: "Profile", icon: User, href: "/teacher/profile" },
];

import { AuthenticatedProvider } from "@/components/providers/AuthenticatedProvider";

function TeacherContent({ children }: { children: React.ReactNode }) {
    const { user, userData, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

    useEffect(() => {
        setOptimisticPath(null);
    }, [pathname]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { branding } = useMasterData();
    const [imageError, setImageError] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

    const currentPath = optimisticPath || pathname;
    const isMainRouteActive = currentPath === "/teacher" || currentPath.startsWith("/teacher/students") || currentPath.startsWith("/teacher/timetable") || currentPath.startsWith("/teacher/attendance");
    const isMoreActive = !isMainRouteActive;

    useEffect(() => {
        setImageError(false);
    }, [branding?.schoolLogo]);

    // Persist sidebar collapsed setting in localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("teacher_sidebar_collapsed");
            if (saved === "true") setSidebarCollapsed(true);
        }
    }, []);

    const toggleSidebar = () => {
        const nextState = !sidebarCollapsed;
        setSidebarCollapsed(nextState);
        if (typeof window !== "undefined") {
            localStorage.setItem("teacher_sidebar_collapsed", String(nextState));
        }
    };

    useEffect(() => {
        // Block all routing decisions until the loading state is fully resolved
        if (loading) return;

        // If data is fully loaded but no user exists, do nothing and let the fallback UI handle it
        if (!user) return;

        // Verify Rule: Must Change Password and Role
        if (userData && userData.role) {
            const actualRole = userData.role || "";

            if (["ADMIN", "SUPER_ADMIN", "MANAGER", "DEVELOPER", "OWNER"].includes(actualRole)) {
                router.replace("/admin");
                return;
            }
            if (actualRole === "STUDENT") {
                router.replace("/student");
                return;
            }

            if (userData.mustChangePassword && pathname !== "/teacher/change-password") {
                router.push("/teacher/change-password");
                return;
            }
        }

    }, [user, userData, loading, pathname, router]);

    // Hard fallback UI if user slips through somehow without data to stop loops dead in their tracks
    if (!loading && (!userData || !userData.role)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0A192F] text-white">
                <p className="text-red-400 mb-4 text-xl font-bold uppercase tracking-widest">Session Invalid</p>
                <p className="text-white/50 mb-8 max-w-sm text-center">Your authentication context is missing or invalid. Please sign in again.</p>
                <a href="/login" className="bg-[#64FFDA] text-[#0A192F] px-6 py-2 rounded-lg font-bold hover:bg-[#64FFDA]/80 transition-colors">
                    Return to Login
                </a>
            </div>
        );
    }

    const isAuthenticating = loading && !userData;
    if (isAuthenticating) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0A192F] text-[#10B981]"><Loader2 className="animate-spin" /></div>;
    }

    const userRole = userData?.role || "Teacher";

    // If on Change Password page, show simplified layout
    if (pathname === "/teacher/change-password") {
        return <div className="min-h-screen bg-[#0A192F] text-white">{children}</div>;
    }



    return (
        <div className="flex h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-[#E6F1FF] font-sans overflow-hidden">
            {/* Sidebar (Desktop & Tablet) */}
            <aside className={cn(
                "hidden md:flex border-r border-[#10B981]/10 bg-[#0A192F]/80 backdrop-blur-xl flex-col h-full z-50 transition-all duration-300 shrink-0",
                sidebarCollapsed ? "w-0 border-none overflow-hidden" : "w-64"
            )}>
                {/* Brand Header */}
                <div className="h-20 flex items-center justify-between px-4 border-b border-[#10B981]/10 select-none shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center bg-transparent">
                            {!imageError ? (
                                <img
                                    src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                    alt="Logo"
                                    className="w-full h-full object-contain filter drop-shadow-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold font-mono text-sm">T</div>
                            )}
                        </div>
                        <h1 className="font-display font-bold text-xl text-white tracking-tight truncate">
                            {branding?.schoolName ? (
                                <span className="text-white text-sm font-black leading-tight">{branding.schoolName}</span>
                            ) : (
                                <>Teacher<span className="text-[#10B981]">.Panel</span></>
                            )}
                        </h1>
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="Collapse Menu"
                    >
                        <Menu className="w-5 h-5 text-[#10B981]" />
                    </button>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {TEACHER_NAV.map((item) => {
                        const activePath = optimisticPath || pathname;
                        const isActive = item.exact ? activePath === item.href : activePath.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                onClick={() => setOptimisticPath(item.href)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 text-sm font-medium border border-transparent group relative justify-start",
                                    isActive
                                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 shadow-[0_0_15px_-5px_#10B981]"
                                        : "text-[#8892B0] hover:text-[#E6F1FF] hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} className="shrink-0" />
                                
                                <span className="transition-all duration-200 inline">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Profile / Action Bar */}
                <div className="p-4 border-t border-[#10B981]/10 shrink-0">
                    <button 
                        onClick={signOut} 
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-[#8892B0] hover:text-[#FF5555] hover:bg-[#FF5555]/10 w-full rounded-md transition-colors relative group cursor-pointer justify-start"
                    >
                        <LogOut size={18} className="shrink-0" />
                        <span className="inline">Sign Out</span>
                    </button>
                    
                    <div className="mt-2 text-center text-[#8892B0]/50 font-mono text-[10px] transition-all block">
                        v1.2.0
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                {/* Mobile Header (Only visible below 768px) */}
                <header className={cn(
                    "h-16 md:hidden border-b border-[#10B981]/10 flex items-center justify-between px-4 bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40 shrink-0",
                    (pathname === "/teacher/students" || pathname === "/teacher/attendance" || pathname === "/teacher/timetable") && "hidden"
                )}>
                    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden pr-2">
                        <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center bg-transparent">
                            {!imageError ? (
                                <img
                                    src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                    alt="Logo"
                                    className="w-full h-full object-contain filter drop-shadow-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold font-mono text-xs">T</div>
                            )}
                        </div>
                        <h2 className="font-bold text-sm md:text-base capitalize text-[#E6F1FF] tracking-tight truncate">
                            {pathname === '/teacher/timetable' ? 'Time Table' : (pathname === '/teacher' ? (branding?.schoolName || "Spoorthy Concept School") : pathname.split('/').pop()?.replace('-', ' ') || "Dashboard")}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <NotificationCenter role="TEACHER" />
                        <div className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-xs border border-[#10B981]/30">
                            {user?.email?.substring(0, 1).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Tablet & Desktop Header (Visible 768px and above) */}
                <header className="hidden md:flex h-16 border-b border-[#10B981]/10 items-center justify-between px-4 bg-[#0A192F]/50 backdrop-blur sticky top-0 z-40 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Hamburger menu to toggle sidebar on desktop/tablet (Only shown when sidebar is closed) */}
                        <button
                            onClick={toggleSidebar}
                            className={cn(
                                "p-2 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all duration-300 cursor-pointer mr-2 shrink-0",
                                sidebarCollapsed ? "opacity-100 block" : "opacity-0 hidden pointer-events-none"
                            )}
                            title="Toggle Menu"
                        >
                            <Menu className="w-5 h-5 text-[#10B981]" />
                        </button>

                        {/* Brand Logo and Name (Only shown when sidebar is closed) */}
                        <div className={cn(
                            "flex items-center gap-3 overflow-hidden transition-all duration-300",
                            sidebarCollapsed ? "opacity-100 max-w-[300px]" : "opacity-0 max-w-0 pointer-events-none"
                        )}>
                            <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center bg-transparent">
                                {!imageError ? (
                                    <img
                                        src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                        alt="Logo"
                                        className="w-full h-full object-contain filter drop-shadow-sm"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold font-mono text-sm">T</div>
                                )}
                            </div>
                            <span className="font-display font-black text-sm text-white tracking-tight truncate">
                                {branding?.schoolName || "Spoorthy School"}
                            </span>
                        </div>

                        {/* Page Title (Only visible when sidebar is open to avoid branding duplication) */}
                        <h2 className={cn(
                            "font-semibold text-lg capitalize text-[#E6F1FF] tracking-wide shrink-0 transition-all duration-300 truncate",
                            sidebarCollapsed ? "opacity-0 max-w-0 overflow-hidden" : "opacity-100 max-w-[260px]"
                        )}>
                            {pathname === '/teacher/timetable' ? 'Time Table' : (pathname === '/teacher' ? (branding?.schoolName || "Spoorthy Concept School") : pathname.split('/').pop()?.replace('-', ' ') || "Dashboard")}
                        </h2>

                        <div className="max-w-md w-full">
                            <UniversalSearch />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationCenter role="TEACHER" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 pl-4 border-l border-[#10B981]/10 hover:bg-white/5 transition-colors p-2 rounded-lg outline-none">
                                    <div className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-sm border border-[#10B981]/30">
                                        {user?.email?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium leading-none text-[#E6F1FF]">{user?.email?.split('@')[0].toUpperCase()}</div>
                                        <div className="text-xs text-[#8892B0]">{userRole}</div>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0A192F] border-[#10B981]/20 text-[#E6F1FF] backdrop-blur-xl">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#10B981]/10" />
                                <DropdownMenuItem asChild className="focus:bg-[#10B981]/10 focus:text-[#10B981] cursor-pointer">
                                    <Link href="/teacher/profile" className="flex items-center gap-2">
                                        <User className="w-4 h-4" /> Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#10B981]/10" />
                                <DropdownMenuItem onClick={signOut} className="text-[#FF5555] focus:text-[#FF5555] focus:bg-[#FF5555]/10 cursor-pointer flex items-center gap-2">
                                    <LogOut className="w-4 h-4" /> Log Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Scrollable View */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-24 md:pb-0">
                    {children}
                </div>

                {/* Mobile Bottom Navigation Bar (Visible only on Mobile) */}
                <nav className="fixed bottom-[-4px] pb-[4px] left-0 right-0 h-[68px] bg-[#040A15]/95 backdrop-blur-xl border-t border-[#22c55e]/20 flex items-center justify-around px-2 z-50 md:hidden shadow-[0_-8px_30px_rgba(34,197,94,0.08)]">
                    <Link href="/teacher" prefetch={true} onClick={() => setOptimisticPath("/teacher")} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        currentPath === "/teacher" 
                            ? "text-[#22c55e] scale-105 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <LayoutDashboard size={20} className={cn(currentPath === "/teacher" && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Home</span>
                    </Link>

                    <Link href="/teacher/students" prefetch={true} onClick={() => setOptimisticPath("/teacher/students")} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        currentPath.startsWith("/teacher/students") 
                            ? "text-[#22c55e] scale-105 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <GraduationCap size={20} className={cn(currentPath.startsWith("/teacher/students") && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Students</span>
                    </Link>

                    <Link href="/teacher/timetable" prefetch={true} onClick={() => setOptimisticPath("/teacher/timetable")} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        currentPath.startsWith("/teacher/timetable") 
                            ? "text-[#22c55e] scale-105 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <Clock size={20} className={cn(currentPath.startsWith("/teacher/timetable") && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Time Table</span>
                    </Link>

                    <Link href="/teacher/attendance" prefetch={true} onClick={() => setOptimisticPath("/teacher/attendance")} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        currentPath.startsWith("/teacher/attendance") 
                            ? "text-[#22c55e] scale-105 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <CheckCircle size={20} className={cn(currentPath.startsWith("/teacher/attendance") && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Attendance</span>
                    </Link>

                    <button 
                        onClick={() => setMobileMoreOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                            isMoreActive
                                ? "text-[#22c55e] scale-105 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] font-bold" 
                                : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                        )}
                    >
                        <Menu size={20} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">More</span>
                    </button>
                </nav>

                {/* Mobile "More" sliding action drawer overlay */}
                {mobileMoreOpen && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] md:hidden animate-in fade-in duration-200">
                        <div className="absolute inset-0" onClick={() => setMobileMoreOpen(false)} />
                        <div className="absolute bottom-0 left-0 right-0 bg-[#0B1524] border-t border-[#10B981]/30 rounded-t-[2.5rem] p-6 pb-10 space-y-6 z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 flex items-center justify-center text-[#10B981] font-black text-sm">S</div>
                                    <h3 className="text-lg font-display font-black text-white uppercase tracking-wider">More Actions</h3>
                                </div>
                                <button 
                                    onClick={() => setMobileMoreOpen(false)} 
                                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <Link 
                                    href="/teacher/homework" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/teacher/homework"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <BookOpen size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Homework</span>
                                </Link>

                                <Link 
                                    href="/teacher/notices" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/teacher/notices"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Bell size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Notices</span>
                                </Link>

                                <Link 
                                    href="/teacher/groups" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/teacher/groups"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Users size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Groups</span>
                                </Link>

                                <Link 
                                    href="/teacher/leaves" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/teacher/leaves"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <MessageSquare size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Leaves</span>
                                </Link>

                                <Link 
                                    href="/teacher/holidays" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/teacher/holidays"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Holidays</span>
                                </Link>

                                <Link 
                                    href="/teacher/profile" 
                                    prefetch={true}
                                    onClick={() => { setMobileMoreOpen(false); setOptimisticPath("/teacher/profile"); }}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <User size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Profile</span>
                                </Link>
                            </div>

                            <div className="border-t border-white/5 pt-4">
                                <button
                                    onClick={() => {
                                        setMobileMoreOpen(false);
                                        signOut();
                                    }}
                                    className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-[#FF5555] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-500/25 transition-all"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedProvider>
            <TeacherContent>{children}</TeacherContent>
        </AuthenticatedProvider>
    );
}
