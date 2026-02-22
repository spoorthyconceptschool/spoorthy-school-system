"use client";

import { cn } from "@/lib/utils";
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
    ChevronLeft,
    LogOut,
    Menu,
    ChevronRight,
    Search,
    Layers,
    MapPin,
    ShieldAlert,
    UserCheck,
    ClipboardCheck,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";

// High-Tech Grouping
const NAV_ITEMS = [
    { label: "Overview", icon: LayoutDashboard, href: "/admin", exact: true },
    { type: "separator", label: "Entities" },
    { label: "Students", icon: GraduationCap, href: "/admin/students" },
    { label: "Staff Members", icon: Users, href: "/admin/faculty" },
    { label: "Groups", icon: Users, href: "/admin/groups" },
    { label: "Attendance", icon: UserCheck, href: "/admin/attendance" },
    { type: "separator", label: "Financials" },
    { label: "Fees", icon: Banknote, href: "/admin/fees" },
    { label: "Payroll", icon: Wallet, href: "/admin/salary" },
    { type: "separator", label: "Operations" },
    { label: "Schedules", icon: Clock, href: "/admin/timetable/manage" },
    { label: "Academics", icon: BookOpen, href: "/admin/homework" },
    { label: "Exams & Halls", icon: ClipboardCheck, href: "/admin/exams" },
    { type: "separator", label: "Master Data" },
    { label: "Classes", icon: Layers, href: "/admin/master-data/classes-sections" },
    { label: "Subjects", icon: BookOpen, href: "/admin/master-data/subjects" },
    { label: "Villages", icon: MapPin, href: "/admin/master-data/villages" },
    { type: "separator", label: "System Control" },
    { label: "Settings", icon: Settings, href: "/admin/settings" },
    { label: "Notices", icon: Bell, href: "/admin/notices" },
    { label: "Content", icon: FileText, href: "/admin/cms" },
    { label: "Purge Data", icon: Trash2, href: "/admin/purge-data" },
];

interface SidebarProps {
    mobile?: boolean;
    onItemClick?: () => void;
}

export function Sidebar({ mobile = false, onItemClick }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { user, signOut } = useAuth();
    const { branding } = useMasterData();
    const [role, setRole] = useState<string | null>(null);
    const [pendingLeaves, setPendingLeaves] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Listen for Pending Leaves
        const leavesQ = query(
            collection(db, "leave_requests"),
            where("status", "==", "PENDING")
        );

        const unsubLeaves = onSnapshot(leavesQ, (snap) => {
            setPendingLeaves(snap.size);
        });

        return () => unsubLeaves();
    }, [user]);

    useEffect(() => {
        if (!user) {
            setRole(null);
            return;
        }

        const cachedRole = sessionStorage.getItem(`role_${user.uid}`);
        if (cachedRole) setRole(cachedRole);

        const unsub = onSnapshot(doc(db, "users", user.uid), (d: any) => {
            if (d.exists()) {
                const newRole = d.data().role;
                setRole(newRole);
                sessionStorage.setItem(`role_${user.uid}`, newRole);
            }
        });

        return () => unsub();
    }, [user]);

    const filteredNav = NAV_ITEMS.filter(item => {
        const allowedPaths = (role === "MANAGER")
            ? ["/admin", "/admin/students", "/admin/attendance", "/admin/fees", "/admin/exams", "/admin/faculty", "/admin/master-data", "/admin/timetable/manage"]
            : (role === "TIMETABLE_EDITOR")
                ? ["/admin", "/admin/timetable/manage", "/admin/faculty", "/admin/master-data/subjects", "/admin/master-data/classes-sections"]
                : null;

        if (role === "MANAGER" && item.type === "separator") {
            const forbiddenSeparators = ["System Control"];
            if (forbiddenSeparators.includes(item.label || "")) return false;
        }

        if (item.type === "separator") return true;

        if (allowedPaths) {
            return allowedPaths.some(prefix => item.href === prefix || (prefix !== "/admin" && item.href?.startsWith(prefix)));
        }

        return true;
    });

    return (
        <motion.aside
            initial={false}
            animate={{ width: mobile ? "100%" : (collapsed ? "80px" : "260px") }}
            className={cn(
                "flex flex-col h-full bg-[#0A192F]/40 backdrop-blur-xl border-r border-[#64FFDA]/10 z-50 text-white transition-all duration-300 shadow-xl",
                !mobile && "sticky top-0"
            )}
        >
            {/* Header - Real-time Branding */}
            <div className="h-24 flex items-center justify-between px-4 pt-4 border-b border-[#64FFDA]/5">
                {(!collapsed || mobile) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 select-none overflow-hidden"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-white flex items-center justify-center p-1.5 border border-white/20 shadow-lg relative overflow-hidden">
                            {branding.schoolLogo ? (
                                <img
                                    src={branding.schoolLogo}
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).parentElement?.classList.add('broken-image');
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : null}
                            {(!branding.schoolLogo || typeof window !== 'undefined' && document.querySelector('.broken-image')) && (
                                <div className="absolute inset-0 w-full h-full bg-[#64FFDA]/10 flex items-center justify-center text-[#64FFDA] font-bold font-mono text-xl">S</div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-black text-[10px] tracking-[0.2em] text-[#64FFDA] uppercase truncate leading-none mb-1">
                                Control Center
                            </span>
                            <span className="font-bold text-sm tracking-tight text-white md:truncate md:max-w-[140px]">
                                {branding.schoolName || "Spoorthy School"}
                            </span>
                        </div>
                    </motion.div>
                )}
                {!mobile && (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 hover:bg-[#64FFDA]/10 rounded text-[#64FFDA]/50 hover:text-[#64FFDA] transition-colors ml-auto"
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-[#64FFDA]/10 hover:scrollbar-thumb-[#64FFDA]/30">
                {filteredNav.map((item, idx) => {
                    if (item.type === "separator") {
                        if (collapsed && !mobile) return <div key={idx} className="h-4" />;
                        return (
                            <div key={idx} className="px-3 pt-6 pb-2 text-[10px] font-bold text-[#A8B2D1] uppercase tracking-widest font-mono whitespace-nowrap overflow-hidden">
                                {item.label}
                            </div>
                        );
                    }

                    const isActive = item.exact
                        ? pathname === item.href
                        : (item.href && pathname.startsWith(item.href));

                    return (
                        <Link key={item.href} href={item.href!} onClick={() => onItemClick?.()}>
                            <div className={cn(
                                "flex items-center gap-4 px-3 py-3 rounded-md transition-all duration-200 group relative font-medium text-sm border border-transparent",
                                isActive
                                    ? "bg-[#64FFDA]/10 text-[#64FFDA] border-[#64FFDA]/20 shadow-[0_0_15px_-5px_#64FFDA]"
                                    : "text-[#A8B2D1] hover:text-[#E6F1FF] hover:bg-white/5"
                            )}>
                                {item.icon && (
                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 3 : 2}
                                        className={cn(
                                            "shrink-0 transition-colors",
                                            isActive ? "text-[#64FFDA]" : "text-[#A8B2D1] group-hover:text-[#E6F1FF]"
                                        )}
                                    />
                                )}

                                {(!collapsed || mobile) && (
                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                        <span className={cn("truncate font-mono text-xs", isActive ? "font-bold" : "")}>
                                            {item.label}
                                        </span>
                                        {item.label === "Staff Members" && pendingLeaves > 0 && (
                                            <motion.span
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                            >
                                                {pendingLeaves}
                                                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
                                            </motion.span>
                                        )}
                                    </div>
                                )}

                                {collapsed && !mobile && item.label === "Staff Members" && pendingLeaves > 0 && (
                                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0A192F] shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                                        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#64FFDA]/10 bg-transparent">
                <button
                    onClick={signOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-md transition-colors w-full text-left text-[#A8B2D1] hover:text-[#FF5555] hover:bg-[#FF5555]/10",
                        (collapsed && !mobile) ? "justify-center px-0" : ""
                    )}
                >
                    <LogOut size={18} className="shrink-0" />
                    {(!collapsed || mobile) && <span className="text-xs font-bold font-mono uppercase">Log Out</span>}
                </button>
            </div>
        </motion.aside>
    );
}
