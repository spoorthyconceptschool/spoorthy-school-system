"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    GraduationCap,
    ClipboardCheck,
    User,
    CreditCard
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Home', icon: LayoutDashboard, href: '/admin' },
    { label: 'Students', icon: GraduationCap, href: '/admin/students' },
    { label: 'Exams', icon: ClipboardCheck, href: '/admin/exams' },
    { label: 'Fees', icon: CreditCard, href: '/admin/fees' },
    { label: 'Profile', icon: User, href: '/admin/settings' },
];

export function BottomNav() {
    const [mounted, setMounted] = React.useState(false);
    const pathname = usePathname();

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 relative",
                                isActive ? "text-accent" : "text-muted-foreground/60 active:scale-90"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-xl transition-all duration-300",
                                isActive && "bg-accent/10 shadow-[0_0_15px_rgba(100,255,218,0.1)] scale-110"
                            )}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest leading-none",
                                isActive ? "opacity-100" : "opacity-40"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_var(--color-accent)]" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
