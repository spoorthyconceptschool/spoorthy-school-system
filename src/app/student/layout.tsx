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
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

const STUDENT_NAV = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/student", exact: true },
    { label: "Fee Payment", icon: Wallet, href: "/student/fees" },
    { label: "Homework", icon: BookOpen, href: "/student/homework" },
    { label: "Notices", icon: Bell, href: "/student/notices" },
    { label: "Attendance", icon: CalendarCheck, href: "/student/attendance" },
    { label: "Timetable", icon: Calendar, href: "/student/timetable" },
    { label: "Leave", icon: FileText, href: "/student/leaves" },
    { label: "Examinations", icon: Ticket, href: "/student/exams" },
    { label: "Holidays", icon: Calendar, href: "/student/holidays" },
    { label: "Profile", icon: User, href: "/student/profile" },
];

import { AuthenticatedProvider } from "@/components/providers/AuthenticatedProvider";

function StudentContent({ children }: { children: React.ReactNode }) {
    const { user, userData, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { branding } = useMasterData();
    const [imageError, setImageError] = useState(false);

    const navItems = [
        { label: "Home", icon: LayoutDashboard, href: "/student", isActive: pathname === "/student" },
        { label: "Fees", icon: Wallet, href: "/student/fees", isActive: pathname.startsWith("/student/fees") },
        { label: "Schedule", icon: Calendar, href: "/student/timetable", isActive: pathname.startsWith("/student/timetable") },
        { label: "Attendance", icon: CalendarCheck, href: "/student/attendance", isActive: pathname.startsWith("/student/attendance") },
        { label: "More", icon: Menu, onClick: () => setMobileMoreOpen(true), isActive: false }
    ];

    useEffect(() => {
        setImageError(false);
    }, [branding?.schoolLogo]);

    // 1. Fetch User Status ONCE when user logs in (Optimistic rendering)
    useEffect(() => {
        if (loading) return;
        if (!user) return;

        // Verify Role
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
            } finally {
                setChecking(false);
            }
        };

        fetchUserStatus();
    }, [user, userData, loading, router]);

    // 2. Enforce Password Change on Navigation
    useEffect(() => {
        if (mustChangePassword && pathname !== "/student/change-password") {
            router.push("/student/change-password");
        }
    }, [pathname, mustChangePassword, router]);

    if (!loading && (!user || !userData || !userData.role)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#030712] text-white">
                <p className="text-red-400 mb-4 text-xl font-bold uppercase tracking-widest font-mono">Session Invalid</p>
                <p className="text-white/50 mb-8 max-w-sm text-center text-sm">Your authentication context is missing or invalid. Please sign in again.</p>
                <a href="/login" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    Return to Login
                </a>
            </div>
        );
    }

    const isAuthenticating = loading;
    if (isAuthenticating) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#030712] text-blue-500 gap-3">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-xs font-mono tracking-widest uppercase text-white/40">Loading Student Portal...</span>
            </div>
        );
    }

    if (pathname === "/student/change-password") {
        return <div className="min-h-screen bg-[#030712] text-white">{children}</div>;
    }

    return (
        <div className="flex h-screen h-[100dvh] bg-gradient-to-br from-[#030712] via-[#09152b] to-[#030712] text-[#f3f4f6] font-sans overflow-hidden">
            {/* Sidebar (Desktop & Laptop) */}
            <aside className={cn(
                "hidden lg:flex fixed lg:static inset-y-0 left-0 border-r border-white/[0.04] bg-[#030712]/50 backdrop-blur-2xl flex-col h-full z-50 transition-all duration-300 ease-in-out shrink-0",
                sidebarCollapsed ? "lg:w-20" : "lg:w-64"
            )}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-white/[0.04]">
                    <div className={cn("flex items-center gap-3 w-full", sidebarCollapsed ? "justify-center" : "")}>
                        <div className="w-9 h-9 rounded-xl bg-white/[0.02] flex items-center justify-center border border-white/10 shadow-sm shrink-0 overflow-hidden transition-all duration-300 hover:border-white/20">
                            {!imageError ? (
                                <img
                                    src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                    alt="Logo"
                                    className="w-full h-full object-contain filter drop-shadow-sm p-1"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold font-mono text-sm">S</div>
                            )}
                        </div>
                        {!sidebarCollapsed && (
                            <h1 className="font-bold text-base text-white tracking-tight truncate max-w-[150px] transition-opacity duration-300">
                                {branding?.schoolName ? (
                                    <span className="text-white text-sm font-semibold">{branding.schoolName}</span>
                                ) : (
                                    <>Student<span className="text-blue-500">.Panel</span></>
                                )}
                            </h1>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto scrollbar-none">
                    {STUDENT_NAV.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl transition-all duration-300 text-sm font-medium border border-transparent",
                                    isActive
                                        ? "bg-white/[0.04] text-white border-white/[0.05] shadow-lg shadow-black/20"
                                        : "text-white/60 hover:text-white hover:bg-white/[0.02]",
                                    sidebarCollapsed ? "justify-center p-2.5 w-10 h-10 mx-auto" : "px-4 py-3"
                                )}
                                title={sidebarCollapsed ? item.label : ""}
                            >
                                <item.icon size={18} className={cn("shrink-0 transition-transform duration-300", isActive ? "text-blue-400" : "text-white/60")} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/[0.04] space-y-1.5">
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.02] w-full rounded-xl transition-all duration-300"
                    >
                        <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
                        {!sidebarCollapsed && <span>Collapse</span>}
                    </button>

                    <button 
                        onClick={signOut} 
                        className={cn(
                            "flex items-center gap-3 text-sm font-medium text-white/50 hover:text-[#ff4d4d] hover:bg-[#ff4d4d]/10 w-full rounded-xl transition-colors",
                            sidebarCollapsed ? "justify-center p-2.5 w-10 h-10 mx-auto" : "px-4 py-3"
                        )}
                        title={sidebarCollapsed ? "Sign Out" : ""}
                    >
                        <LogOut size={18} className="shrink-0" />
                        {!sidebarCollapsed && <span>Sign Out</span>}
                    </button>
                    {!sidebarCollapsed && <div className="mt-2 text-[10px] text-center text-white/20 font-mono">v1.3.0</div>}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                {/* Mobile Header (Only visible below lg) */}
                <MobileHeader role="STUDENT" portalTitle="Student Portal" profileHref="/student/profile" />

                {/* Desktop Header */}
                <header className="hidden lg:flex h-16 w-full items-center justify-end px-8 border-b border-white/[0.04] bg-[#030712]/30 backdrop-blur-md shrink-0 relative z-40 gap-4">
                    <NotificationCenter role="STUDENT" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm hover:bg-blue-500/20 transition-colors">
                                {user?.email?.substring(0, 2).toUpperCase()}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#030712] border-white/10 text-[#f3f4f6] backdrop-blur-2xl rounded-2xl">
                            <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest font-black py-2 px-3">My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem asChild className="focus:bg-white/[0.04] focus:text-white rounded-lg cursor-pointer py-2">
                                <Link href="/student/profile" className="flex items-center">
                                    <User className="mr-2 h-4 w-4 text-white/60" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={signOut} className="text-[#ff4d4d] focus:bg-[#ff4d4d]/10 focus:text-[#ff4d4d] rounded-lg cursor-pointer py-2">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-none pb-6 lg:pb-8">
                    {children}
                </div>

                {/* Mobile Bottom Navigation Bar (Visible only on Mobile/Tablet below lg) */}
                <MobileBottomNav items={navItems} />

                {/* Mobile "More" sliding action drawer overlay */}
                {mobileMoreOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-200">
                        <div className="absolute inset-0" onClick={() => setMobileMoreOpen(false)} />
                        <div className="absolute bottom-0 left-0 right-0 bg-[#070e1b] border-t border-white/[0.06] rounded-t-[2rem] p-6 pb-8 space-y-6 z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-sm">S</div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">More Actions</h3>
                                </div>
                                <button 
                                    onClick={() => setMobileMoreOpen(false)} 
                                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <Link 
                                    href="/student/homework" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <BookOpen size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Homework</span>
                                </Link>

                                <Link 
                                    href="/student/notices" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Bell size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Notices</span>
                                </Link>

                                <Link 
                                    href="/student/leaves" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Leaves</span>
                                </Link>

                                <Link 
                                    href="/student/exams" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Ticket size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Exams</span>
                                </Link>

                                <Link 
                                    href="/student/holidays" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Calendar size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Holidays</span>
                                </Link>

                                <Link 
                                    href="/student/profile" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <User size={16} />
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
                                    className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-[#ff4d4d] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-500/25 transition-all"
                                >
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

import { StudentDataProvider } from "@/context/StudentDataContext";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthenticatedProvider>
            <StudentDataProvider>
                <StudentContent>{children}</StudentContent>
            </StudentDataProvider>
        </AuthenticatedProvider>
    );
}
