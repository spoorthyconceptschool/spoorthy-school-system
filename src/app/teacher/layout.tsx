"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LayoutDashboard, Clock, BookOpen, Bell, Calendar, Wallet, User, LogOut, Lock, Users, Menu, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
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

const TEACHER_NAV = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/teacher", exact: true },
    { label: "Attendance", icon: CheckCircle, href: "/teacher/attendance" },
    { label: "My Schedule", icon: Clock, href: "/teacher/timetable" },
    { label: "Homework", icon: BookOpen, href: "/teacher/homework" },
    { label: "Notices", icon: Bell, href: "/teacher/notices" },
    { label: "Leave Requests", icon: Calendar, href: "/teacher/leaves" },
    { label: "Groups", icon: Users, href: "/teacher/groups" },
    { label: "Holidays", icon: Calendar, href: "/teacher/holidays" },
    { label: "Profile", icon: User, href: "/teacher/profile" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState("Loading...");

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        // Verify Rule: Must Change Password and Role
        const checkSecurity = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const actualRole = userData.role || "";
                    setUserRole(actualRole);

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
                        setChecking(false);
                        return;
                    }
                } else {
                    setUserRole("Teacher");
                }
            } catch (e) {
                console.error("Security check failed", e);
                setUserRole("Teacher");
            }
            setChecking(false);
        };

        checkSecurity();

    }, [user, loading, pathname, router]);

    if (loading || checking) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#0A192F] text-[#10B981]"><Loader2 className="animate-spin" /></div>;
    }

    // If on Change Password page, show simplified layout
    if (pathname === "/teacher/change-password") {
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

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 w-64 border-r border-[#10B981]/10 bg-[#0A192F]/80 backdrop-blur-xl flex flex-col h-full z-50 transition-transform duration-300",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                "flex"
            )}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-[#10B981]/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-bold font-mono text-lg">T</div>
                        <h1 className="font-display font-bold text-xl text-white tracking-tight">Teacher<span className="text-[#10B981]">.Panel</span></h1>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {TEACHER_NAV.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 text-sm font-medium border border-transparent",
                                    isActive
                                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 shadow-[0_0_15px_-5px_#10B981]"
                                        : "text-[#8892B0] hover:text-[#E6F1FF] hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#10B981]/10">
                    <button onClick={signOut} className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-[#8892B0] hover:text-[#FF5555] hover:bg-[#FF5555]/10 w-full rounded-md transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                    <div className="mt-2 text-xs text-center text-[#8892B0]/50 font-mono">v1.2.0</div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
                {/* Mobile Header Toggle */}
                <header className="h-16 lg:hidden border-b border-[#10B981]/10 flex items-center justify-between px-4 bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 hover:bg-white/5 rounded-lg text-white transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <h2 className="font-bold text-base capitalize text-[#E6F1FF] tracking-tight truncate px-2">
                        {pathname.split('/').pop()?.replace('-', ' ') || "Dashboard"}
                    </h2>
                    <div className="flex items-center gap-3">
                        <NotificationCenter role="TEACHER" />
                        <div className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-xs border border-[#10B981]/30">
                            {user?.email?.substring(0, 1).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Desktop Header */}
                <header className="hidden lg:flex h-16 border-b border-[#10B981]/10 items-center justify-between px-8 bg-[#0A192F]/50 backdrop-blur sticky top-0 z-40">
                    <h2 className="font-semibold text-lg capitalize text-[#E6F1FF] tracking-wide">{pathname.split('/').pop()?.replace('-', ' ') || "Dashboard"}</h2>
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

                <div className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
