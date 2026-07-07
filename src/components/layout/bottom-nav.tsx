"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    Banknote,
    CreditCard,
    Wallet,
    Calendar,
    FileText,
    Bell,
    BookOpen,
    Clock,
    Settings,
    Database,
    LogOut,
    Menu,
    UserCheck,
    ClipboardCheck,
    Trash2,
    CalendarOff,
    X
} from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
    { label: "Home", icon: LayoutDashboard, href: "/admin" },
    { label: "Students", icon: GraduationCap, href: "/admin/students" },
    { label: "Exams", icon: ClipboardCheck, href: "/admin/exams" },
    { label: "Fees", icon: CreditCard, href: "/admin/fees" },
];

const ADMIN_GRID_ITEMS = [
    { label: "Students", icon: GraduationCap, href: "/admin/students" },
    { label: "Staff Members", icon: Users, href: "/admin/faculty" },
    { label: "Groups", icon: Users, href: "/admin/groups" },
    { label: "Attendance", icon: UserCheck, href: "/admin/attendance" },
    { label: "Fee Payment", icon: Banknote, href: "/admin/fees" },
    { label: "Payroll", icon: Wallet, href: "/admin/salary" },
    { label: "Leave Center", icon: Calendar, href: "/admin/leaves" },
    { label: "Schedules", icon: Clock, href: "/admin/timetable/manage" },
    { label: "Academics", icon: BookOpen, href: "/admin/homework" },
    { label: "Exams", icon: ClipboardCheck, href: "/admin/exams" },
    { label: "Master Data", icon: Database, href: "/admin/master-data" },
    { label: "System Settings", icon: Settings, href: "/admin/settings" },
    { label: "Notices", icon: Bell, href: "/admin/notices" },
    { label: "Holidays", icon: CalendarOff, href: "/admin/holidays" },
    { label: "Purge Data", icon: Trash2, href: "/admin/purge-data" },
];

export function BottomNav() {
    const pathname = usePathname();
    const [mounted, setMounted] = React.useState(false);
    const [moreOpen, setMoreOpen] = React.useState(false);
    const { role, signOut } = useAuth();

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const filteredGridItems = React.useMemo(() => {
        return ADMIN_GRID_ITEMS.filter(item => {
            const allowedPaths = (role === "MANAGER")
                ? ["/admin/students", "/admin/attendance", "/admin/fees", "/admin/exams", "/admin/faculty", "/admin/master-data", "/admin/timetable/manage", "/admin/leaves", "/admin/holidays", "/admin/settings", "/admin/notices"]
                : (role === "TIMETABLE_EDITOR")
                    ? ["/admin/timetable/manage", "/admin/faculty", "/admin/master-data/subjects", "/admin/master-data/classes-sections"]
                    : null;

            if (allowedPaths) {
                return allowedPaths.some(prefix => item.href === prefix || item.href.startsWith(prefix));
            }
            return true;
        });
    }, [role]);

    if (!mounted) return null;

    const navItems = [
        ...NAV_ITEMS.map((item) => ({
            label: item.label,
            icon: item.icon,
            href: item.href,
            isActive: item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
        })),
        { label: "More", icon: Menu, onClick: () => setMoreOpen(true), isActive: false }
    ];

    return (
        <>
            <MobileBottomNav items={navItems} />
            
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent 
                    side="bottom" 
                    className="p-0 bg-transparent border-none rounded-t-[2rem] overflow-hidden"
                    hideCloseButton={true}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
                    <SheetDescription className="sr-only">Access school management modules and settings</SheetDescription>
                    <div className="max-h-[80vh] overflow-y-auto w-full bg-[#0A192F]/95 backdrop-blur-3xl border-t border-[#64FFDA]/30 rounded-t-[2rem] p-6 pb-10 space-y-6 shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#64FFDA]/20 flex items-center justify-center text-[#64FFDA] font-black text-sm">A</div>
                                <h3 className="text-lg font-display font-black text-white uppercase tracking-wider">More Actions</h3>
                            </div>
                            <button 
                                onClick={() => setMoreOpen(false)} 
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-3 gap-3 overflow-y-auto py-2">
                            {filteredGridItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <Link 
                                        key={index}
                                        href={item.href} 
                                        onClick={() => setMoreOpen(false)}
                                        className="flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] active:bg-white/10 transition-all text-center group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-[#64FFDA]/10 flex items-center justify-center text-[#64FFDA] group-hover:scale-105 transition-transform mb-1.5">
                                            <Icon size={18} />
                                        </div>
                                        <span className="text-[10px] font-bold text-white/80 leading-tight">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Footer Sign Out */}
                        <div className="border-t border-white/5 pt-4 shrink-0">
                            <button
                                onClick={() => {
                                    setMoreOpen(false);
                                    signOut();
                                }}
                                className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-[#ff4d4d] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-500/25 transition-all cursor-pointer"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
