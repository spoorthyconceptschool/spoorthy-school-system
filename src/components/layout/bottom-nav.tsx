"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    GraduationCap,
    ClipboardCheck,
    User,
    CreditCard
} from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

const NAV_ITEMS = [
    { label: "Home", icon: LayoutDashboard, href: "/admin" },
    { label: "Students", icon: GraduationCap, href: "/admin/students" },
    { label: "Exams", icon: ClipboardCheck, href: "/admin/exams" },
    { label: "Fees", icon: CreditCard, href: "/admin/fees" },
    { label: "Profile", icon: User, href: "/admin/settings" },
];

export function BottomNav() {
    const pathname = usePathname();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const navItems = NAV_ITEMS.map((item) => ({
        label: item.label,
        icon: item.icon,
        href: item.href,
        isActive: item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    }));

    return <MobileBottomNav items={navItems} />;
}
