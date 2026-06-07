"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LayoutDashboard, Clock, BookOpen, Bell, Calendar, Wallet, User, LogOut, Lock, Users, Menu, X, MessageSquare, GraduationCap, ChevronLeft, ChevronRight, FileText } from "lucide-react";
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
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

const TEACHER_NAV = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/teacher", exact: true },
    { label: "Students", icon: GraduationCap, href: "/teacher/students" },
    { label: "Attendance", icon: CheckCircle, href: "/teacher/attendance" },
    { label: "My Schedule", icon: Clock, href: "/teacher/timetable" },
    { label: "Homework", icon: BookOpen, href: "/teacher/homework" },
    { label: "Exams", icon: FileText, href: "/teacher/exams" },
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

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const sidebarCollapsed = false;
    const { branding } = useMasterData();
    const [imageError, setImageError] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

    const navItems = [
        { label: "Home", icon: LayoutDashboard, href: "/teacher", isActive: pathname === "/teacher" },
        { label: "Students", icon: GraduationCap, href: "/teacher/students", isActive: pathname.startsWith("/teacher/students") },
        { label: "Schedule", icon: Clock, href: "/teacher/timetable", isActive: pathname.startsWith("/teacher/timetable") },
        { label: "Attendance", icon: CheckCircle, href: "/teacher/attendance", isActive: pathname.startsWith("/teacher/attendance") },
        { label: "More", icon: Menu, onClick: () => setMobileMoreOpen(true), isActive: false }
    ];

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
    if (!loading && (!user || !userData || !userData.role)) {
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


    const userRole = userData?.role || "Teacher";

    // If on Change Password page, show simplified layout
    if (pathname === "/teacher/change-password") {
        return <div className="min-h-screen bg-[#0A192F] text-white">{children}</div>;
    }



    return (
        <div className="flex h-screen bg-gradient-to-br from-[#0B132B] via-[#0D1630] to-[#060A14] text-[#E6F1FF] font-sans overflow-hidden">
            {/* Sidebar (Desktop & Laptop) */}
            <aside className={cn(
                "hidden lg:flex fixed lg:static inset-y-0 left-0 border-r border-white/5 bg-[#070F1E]/80 backdrop-blur-xl flex-col h-full z-50 transition-all duration-300 shrink-0",
                "lg:w-64"
            )}>
                {/* Brand Header */}
                <div className="h-20 flex items-center justify-between px-4 border-b border-[#10B981]/10 select-none">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-transparent flex items-center justify-center border border-white/20 shadow-md shrink-0 overflow-hidden">
                            {!imageError ? (
                                <img
                                    src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                                    alt="Logo"
                                    className="w-full h-full object-contain filter drop-shadow-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] font-bold font-mono text-sm">T</div>
                            )}
                        </div>
                        
                        {/* Hide text completely on collapsed tablet/desktop sidebars */}
                        <h1 className="font-display font-bold text-xl text-white tracking-tight truncate transition-all duration-200 block">
                            <span className="text-[#10B981] text-xs font-black uppercase tracking-widest font-mono">Teacher Panel</span>
                        </h1>
                    </div>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {TEACHER_NAV.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        const isCollapsed = sidebarCollapsed;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 text-sm font-medium border border-transparent group relative",
                                    isActive
                                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 shadow-[0_0_15px_-5px_#10B981]"
                                        : "text-[#8892B0] hover:text-[#E6F1FF] hover:bg-white/5",
                                    "justify-start"
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
                <div className="p-4 border-t border-[#10B981]/10">
                    <button 
                        onClick={signOut} 
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 text-sm font-medium text-[#8892B0] hover:text-[#FF5555] hover:bg-[#FF5555]/10 w-full rounded-md transition-colors relative group",
                            "justify-start"
                        )}
                    >
                        <LogOut size={18} className="shrink-0" />
                        <span>Sign Out</span>
                    </button>

                    <div className="mt-2 text-center text-[#8892B0]/50 font-mono text-[10px] block">
                        v1.2.0
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                {/* Mobile Header (Only visible below 1024px) */}
                <MobileHeader role="TEACHER" portalTitle="Teacher Portal" profileHref="/teacher/profile" />

                {/* Tablet & Desktop Header (Visible 1024px and above) */}
                <header className="hidden lg:flex h-16 border-b border-[#10B981]/10 items-center justify-between px-8 bg-[#0A192F]/50 backdrop-blur sticky top-0 z-40 shrink-0">
                    <div className="flex items-center gap-8 flex-1">
                        <h2 className="font-semibold text-lg capitalize text-[#E6F1FF] tracking-wide shrink-0">
                            {pathname.split('/').pop()?.replace('-', ' ') || "Dashboard"}
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
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pb-24 lg:pb-0">
                    {children}
                </div>

                {/* Mobile Bottom Navigation Bar (Visible only on Mobile/Tablet below lg) */}
                <MobileBottomNav items={navItems} />

                {/* Mobile "More" sliding action drawer overlay */}
                {mobileMoreOpen && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] lg:hidden animate-in fade-in duration-200">
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
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <BookOpen size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Homework</span>
                                </Link>

                                <Link 
                                    href="/teacher/exams" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Exams</span>
                                </Link>

                                <Link 
                                    href="/teacher/notices" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Bell size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Notices</span>
                                </Link>

                                <Link 
                                    href="/teacher/groups" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Users size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Groups</span>
                                </Link>

                                <Link 
                                    href="/teacher/leaves" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <MessageSquare size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Leaves</span>
                                </Link>

                                <Link 
                                    href="/teacher/holidays" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform mb-1.5">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80">Holidays</span>
                                </Link>

                                <Link 
                                    href="/teacher/profile" 
                                    onClick={() => setMobileMoreOpen(false)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#10B981]/25 transition-all text-center group"
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
