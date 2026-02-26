"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LayoutDashboard, Wallet, BookOpen, Bell, Calendar, User, LogOut, Menu, X, FileText, Ticket, CalendarCheck } from "lucide-react";
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

const STUDENT_NAV = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/student", exact: true },
    { label: "Fee Payment", icon: Wallet, href: "/student/fees" },
    { label: "Homework", icon: BookOpen, href: "/student/homework" },
    { label: "Notices", icon: Bell, href: "/student/notices" },
    { label: "Leaves", icon: FileText, href: "/student/leaves" },
    { label: "Attendance", icon: CalendarCheck, href: "/student/attendance" },
    { label: "Timetable", icon: Calendar, href: "/student/timetable" },
    { label: "Hall Tickets", icon: Ticket, href: "/student/exams" },
    { label: "Holidays", icon: Calendar, href: "/student/holidays" },
    { label: "Profile", icon: User, href: "/student/profile" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { branding } = useMasterData();
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [branding?.schoolLogo]);

    // 1. Fetch User Status ONCE when user logs in
    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const fetchUserStatus = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.mustChangePassword) {
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
    }, [user, loading, router]); // Dependency on router for login redirect is fine

    // 2. Enforce Password Change on Navigation (Synchronous & Fast)
    useEffect(() => {
        if (mustChangePassword && pathname !== "/student/change-password") {
            router.push("/student/change-password");
        }
    }, [pathname, mustChangePassword, router]);

    if (loading || checking) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0A192F] text-[#64FFDA]"><Loader2 className="animate-spin" /></div>;
    }

    if (pathname === "/student/change-password") {
        return <div className="min-h-screen bg-[#0A192F] text-white">{children}</div>;
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-[#E6F1FF] font-sans overflow-hidden">
            {/* Mobile Sidebar Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Drawer */}
            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 w-64 border-r border-[#64FFDA]/10 bg-[#0A192F]/80 backdrop-blur-xl flex-col h-full z-50 transition-transform duration-300",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                "flex"
            )}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-[#64FFDA]/10">
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-transparent flex items-center justify-center border border-white/20 shadow-md shrink-0 overflow-hidden">
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
                        <h1 className="font-display font-bold text-xl text-white tracking-tight truncate max-w-[150px]">
                            {branding?.schoolName ? (
                                <span className="text-white text-base md:text-lg">{branding.schoolName}</span>
                            ) : (
                                <>Student<span className="text-[#3B82F6]">.Panel</span></>
                            )}
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {STUDENT_NAV.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 text-sm font-medium border border-transparent",
                                    isActive
                                        ? "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20 shadow-[0_0_15px_-5px_#3B82F6]"
                                        : "text-[#8892B0] hover:text-[#E6F1FF] hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#64FFDA]/10">
                    <button onClick={signOut} className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-[#8892B0] hover:text-[#FF5555] hover:bg-[#FF5555]/10 w-full rounded-md transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                    <div className="mt-2 text-xs text-center text-[#8892B0]/50 font-mono">v1.2.0</div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="h-16 lg:hidden px-4 border-b border-[#64FFDA]/10 flex items-center justify-between bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 hover:bg-white/5 rounded-lg text-white transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 overflow-hidden mx-2">
                        <div className="w-7 h-7 rounded bg-transparent flex items-center justify-center border border-white/20 shadow-md shrink-0 overflow-hidden">
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
                        <div className="font-bold text-sm md:text-base text-white truncate max-w-[120px] xs:max-w-[160px]">
                            {branding?.schoolName || "Student Portal"}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
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
                <header className="hidden lg:flex h-16 w-full items-center justify-end px-8 border-b border-[#64FFDA]/10 bg-[#0A192F]/50 backdrop-blur sticky top-0 z-40 gap-4">
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
                </header>

                <div className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                    {children}
                </div>
            </main>
        </div>
    );
}
