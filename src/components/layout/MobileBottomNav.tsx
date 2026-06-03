"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
}

interface MobileBottomNavProps {
    items: NavItem[];
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-[#030712]/90 backdrop-blur-lg flex items-center px-1 z-45 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom)] shrink-0 lg:hidden">
            {/* Glowing Top Border */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#00b4ec] via-[#6366f1] to-[#a855f7]" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00b4ec] via-[#6366f1] to-[#a855f7] opacity-40 blur-[2px]" />

            {items.map((item, index) => {
                const Icon = item.icon;
                const isItemActive = item.isActive;

                // Render as button or link depending on if href exists
                const Content = (
                    <div className="flex flex-col items-center justify-center w-full h-full relative py-1">
                        <Icon
                            size={18}
                            className={cn(
                                "transition-transform duration-200",
                                isItemActive ? "text-[#00b4ec] scale-105 stroke-[2.5px]" : "text-white/60"
                            )}
                        />
                        <span
                            className={cn(
                                "text-[9px] font-black uppercase tracking-wider mt-0.5 select-none",
                                isItemActive ? "text-[#00b4ec]" : "text-white/60"
                            )}
                        >
                            {item.label}
                        </span>

                        {/* Active bar or Inactive dot */}
                        {isItemActive ? (
                            <div className="absolute bottom-[3px] w-5 h-[3px] bg-[#00b4ec] rounded-full shadow-[0_0_8px_#00b4ec]" />
                        ) : (
                            <div className="absolute bottom-[4px] w-[3px] h-[3px] bg-white/20 rounded-full" />
                        )}
                    </div>
                );

                const element = item.href ? (
                    <Link
                        key={index}
                        href={item.href}
                        className="flex-1 h-full flex items-center justify-center active:scale-95 transition-transform duration-150"
                    >
                        {Content}
                    </Link>
                ) : (
                    <button
                        key={index}
                        onClick={item.onClick}
                        className="flex-1 h-full flex items-center justify-center active:scale-95 transition-transform duration-150 focus:outline-none"
                    >
                        {Content}
                    </button>
                );

                // Add dividers between tabs
                const isLast = index === items.length - 1;
                return (
                    <React.Fragment key={index}>
                        {element}
                        {!isLast && <div className="h-6 w-[1px] bg-white/10 shrink-0" />}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
