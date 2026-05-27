"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LayoutDashboard, Wallet, BookOpen, Bell, Calendar, User, LogOut, Menu, X, FileText, Ticket, CalendarCheck, ChevronLeft } from "lucide-react";
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
import { NotificationCenter } from "@/components/NotificationCenter";
import { AuthenticatedProvider } from "@/components/providers/AuthenticatedProvider";
import { StudentDataProvider } from "@/context/StudentDataContext";

const STUDENT_NAV = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/student", exact: true },
    { label: "Fee Payment", icon: Wallet, href: "/student/fees" },
    { label: "Homework", icon: BookOpen, href: "/student/homework" },
    { label: "Notices", icon: Bell, href: "/student/notices" },

    { label: "Attendance", icon: CalendarCheck, href: "/student/attendance" },
    { label: "Time Table", icon: Calendar, href: "/student/timetable" },
    { label: "Leave", icon: FileText, href: "/student/leaves" },
    { label: "Examinations", icon: Ticket, href: "/student/exams" },
    { label: "Holidays", icon: Calendar, href: "/student/holidays" },
    { label: "Profile", icon: User, href: "/student/profile" },
];

function StudentContent({ children }: { children: React.ReactNode }) {
    const { user, userData, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { branding } = useMasterData();
    const [imageError, setImageError] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

    const currentPath = pathname;
    const isMainRouteActive = currentPath === "/student" || currentPath.startsWith("/student/fees") || currentPath.startsWith("/student/homework") || currentPath.startsWith("/student/exams");
    const isMoreActive = !isMainRouteActive;

    useEffect(() => {
        setImageError(false);
    }, [branding?.schoolLogo]);

    // 1. Fetch User Status ONCE when user logs in (Optimistic rendering)
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
            if (actualRole === "TEACHER") {
                router.replace("/teacher");
                return;
            }
        }

        const fetchUserStatus = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.mustChangePassword) {
                        setMustChangePassword(true);
                    }
                }
            } catch (e) {
                console.error("Security check failed", e);
            }
        };

        fetchUserStatus();
    }, [user, userData, loading, router]); // Dependency on router for login redirect is fine

    // 2. Enforce Password Change on Navigation (Synchronous & Fast)
    useEffect(() => {
        if (mustChangePassword && pathname !== "/student/change-password") {
            router.push("/student/change-password");
        }
    }, [pathname, mustChangePassword, router]);

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

    // Only block the UI completely if we have NO cached data and are waiting for the network
    const isAuthenticating = loading && !userData;
    if (isAuthenticating) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0A192F] text-[#64FFDA]"><Loader2 className="animate-spin" /></div>;
    }

    if (pathname === "/student/change-password" || pathname.includes("/hall-ticket") || pathname.includes("/results")) {
        return <div className="min-h-screen bg-[#0A192F] text-white">{children}</div>;
    }

    return (
        <div className="flex h-screen h-dvh bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-[#E6F1FF] font-sans overflow-hidden">
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Drawer */}
            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 border-r border-[#64FFDA]/10 bg-[#0A192F]/80 backdrop-blur-xl flex-col h-full z-50 transition-all duration-300 ease-in-out",
                sidebarCollapsed ? "lg:w-20" : "lg:w-64",
                mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
                "flex"
            )}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-[#64FFDA]/10">
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className={cn("flex items-center gap-3 w-full", sidebarCollapsed ? "justify-center" : "")}>
                        <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-amber-500/40 shadow-md shrink-0 overflow-hidden">
                            {!imageError ? (
                                <img
                                    src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                    alt="Logo"
                                    className="w-full h-full object-contain filter drop-shadow-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] font-bold font-mono text-sm">S</div>
                            )}
                        </div>
                        {!sidebarCollapsed && (
                            <h1 className="font-display font-bold text-xl text-white tracking-tight truncate max-w-[150px] transition-opacity duration-300">
                                {branding?.schoolName ? (
                                    <span className="text-white text-base md:text-lg">{branding.schoolName}</span>
                                ) : (
                                    <>Student<span className="text-[#3B82F6]">.Panel</span></>
                                )}
                            </h1>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {STUDENT_NAV.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-md transition-all duration-200 text-sm font-medium border border-transparent",
                                    isActive
                                        ? "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20 shadow-[0_0_15px_-5px_#3B82F6]"
                                        : "text-[#8892B0] hover:text-[#E6F1FF] hover:bg-white/5",
                                    sidebarCollapsed ? "justify-center p-2.5 w-10 h-10 mx-auto" : "px-3 py-3"
                                )}
                                title={sidebarCollapsed ? item.label : ""}
                            >
                                <item.icon size={18} className="shrink-0" />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#64FFDA]/10 space-y-1.5">
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex items-center gap-3 px-3 py-3 text-sm font-medium text-[#8892B0] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 w-full rounded-md transition-all duration-300"
                    >
                        <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
                        {!sidebarCollapsed && <span>Collapse</span>}
                    </button>

                    <button 
                        onClick={signOut} 
                        className={cn(
                            "flex items-center gap-3 text-sm font-medium text-[#8892B0] hover:text-[#FF5555] hover:bg-[#FF5555]/10 w-full rounded-md transition-colors",
                            sidebarCollapsed ? "justify-center p-2.5 w-10 h-10 mx-auto" : "px-3 py-3"
                        )}
                        title={sidebarCollapsed ? "Sign Out" : ""}
                    >
                        <LogOut size={18} className="shrink-0" />
                        {!sidebarCollapsed && <span>Sign Out</span>}
                    </button>
                    {!sidebarCollapsed && <div className="mt-2 text-xs text-center text-[#8892B0]/50 font-mono">v1.2.0</div>}
                </div>
            </aside>


            {/* Main Content */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                 <header className="h-16 lg:hidden px-4 border-b border-[#3B82F6]/10 flex items-center justify-between bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40 shrink-0 shadow-md shadow-black/10">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-amber-500/40 shadow-md shrink-0 overflow-hidden">
                            {!imageError ? (
                                <img
                                    src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                    alt="Logo"
                                    className="w-full h-full object-contain filter drop-shadow-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] font-bold font-mono text-xs">S</div>
                            )}
                        </div>
                        <h2 className="font-bold text-sm text-[#E6F1FF] tracking-tight truncate">
                            {pathname === '/student/timetable' ? 'Time Table' : (pathname === '/student' ? (branding?.schoolName || "Spoorthy Concept School") : pathname.split('/').pop()?.replace('-', ' ') || "Dashboard")}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4 ml-auto shrink-0">
                        <NotificationCenter role="STUDENT" />
                        {/* Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-9 h-9 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 flex items-center justify-center font-bold text-sm hover:bg-[#3B82F6]/30 transition-colors">
                                    {user?.email?.substring(0, 2).toUpperCase()}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0A192F] border-[#64FFDA]/20 text-[#E6F1FF] backdrop-blur-xl">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#64FFDA]/10" />
                                <DropdownMenuItem asChild className="focus:bg-[#64FFDA]/10 focus:text-[#64FFDA] cursor-pointer">
                                    <Link href="/student/profile" className="flex items-center">
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#64FFDA]/10" />
                                <DropdownMenuItem onClick={signOut} className="text-[#FF5555] focus:bg-[#FF5555]/10 focus:text-[#FF5555] cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Desktop Header */}
                <header className="hidden lg:flex h-16 w-full items-center justify-between px-8 border-b border-[#64FFDA]/10 bg-[#0A192F]/50 backdrop-blur sticky top-0 z-40 gap-4">
                    <div className="flex items-center gap-3 mr-auto">
                        {pathname === '/student' && (
                            <span className="font-display font-black text-sm uppercase tracking-widest text-[#E6F1FF] truncate max-w-[300px]">
                                {branding?.schoolName || "Spoorthy Concept School"}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <NotificationCenter role="STUDENT" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-9 h-9 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 flex items-center justify-center font-bold text-sm hover:bg-[#3B82F6]/30 transition-colors">
                                {user?.email?.substring(0, 2).toUpperCase()}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#0A192F] border-[#64FFDA]/20 text-[#E6F1FF] backdrop-blur-xl">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[#64FFDA]/10" />
                            <DropdownMenuItem asChild className="focus:bg-[#64FFDA]/10 focus:text-[#64FFDA] cursor-pointer">
                                <Link href="/student/profile" className="flex items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#64FFDA]/10" />
                            <DropdownMenuItem onClick={signOut} className="text-[#FF5555] focus:bg-[#FF5555]/10 focus:text-[#FF5555] cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-16 lg:pb-0">
                    {children}
                </div>

                {/* Mobile Bottom Navigation Bar (Visible only on Mobile/Tablet) */}
                <nav className="fixed bottom-[-4px] pb-[4px] left-0 right-0 h-[68px] bg-[#040A15]/95 backdrop-blur-xl border-t border-[#3B82F6]/20 flex items-center justify-around px-2 z-50 lg:hidden shadow-[0_-8px_30px_rgba(59,130,246,0.08)]">
                    <Link href="/student" prefetch={true} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        pathname === "/student" 
                            ? "text-[#3B82F6] scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <LayoutDashboard size={20} className={cn(pathname === "/student" && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Home</span>
                    </Link>

                    <Link href="/student/fees" prefetch={true} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        pathname.startsWith("/student/fees") 
                            ? "text-[#3B82F6] scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <Wallet size={20} className={cn(pathname.startsWith("/student/fees") && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Fees</span>
                    </Link>

                    <Link href="/student/homework" prefetch={true} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        pathname.startsWith("/student/homework") 
                            ? "text-[#3B82F6] scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <BookOpen size={20} className={cn(pathname.startsWith("/student/homework") && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Homework</span>
                    </Link>

                    <Link href="/student/exams" prefetch={true} className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                        pathname.startsWith("/student/exams") 
                            ? "text-[#3B82F6] scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] font-bold" 
                            : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                    )}>
                        <Ticket size={20} className={cn(pathname.startsWith("/student/exams") && "stroke-[2.5]")} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">Exams</span>
                    </Link>

                    <button 
                        onClick={() => setMobileMoreOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-in-out",
                            isMoreActive
                                ? "text-[#3B82F6] scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] font-bold" 
                                : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                        )}
                    >
                        <Menu size={20} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide">More</span>
                    </button>
                </nav>

                {/* Mobile "More" sliding action drawer overlay */}
                {mobileMoreOpen && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] lg:hidden animate-in fade-in duration-200">
                        <div className="absolute inset-0" onClick={() => setMobileMoreOpen(false)} />
                        <div className="absolute bottom-0 left-0 right-0 bg-[#0B1524] border-t border-[#3B82F6]/30 rounded-t-[2.5rem] p-6 pb-10 space-y-6 z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] font-black text-sm">S</div>
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
                                    href="/student/notices" 
                                    prefetch={true}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#3B82F6]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Bell size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Notices</span>
                                </Link>

                                <Link 
                                    href="/student/attendance" 
                                    prefetch={true}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#3B82F6]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <CalendarCheck size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Attendance</span>
                                </Link>

                                <Link 
                                    href="/student/timetable" 
                                    prefetch={true}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#3B82F6]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Time Table</span>
                                </Link>

                                <Link 
                                    href="/student/leaves" 
                                    prefetch={true}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#3B82F6]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Leaves</span>
                                </Link>

                                <Link 
                                    href="/student/holidays" 
                                    prefetch={true}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#3B82F6]/20 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Holidays</span>
                                </Link>

                                <Link 
                                    href="/student/profile" 
                                    prefetch={true}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#3B82F6]/20 transition-all text-center group"
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

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedProvider>
            <StudentDataProvider>
                <StudentContent>{children}</StudentContent>
            </StudentDataProvider>
        </AuthenticatedProvider>
    );
}
