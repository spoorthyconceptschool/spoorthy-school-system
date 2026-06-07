"use client";


import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

import { useSidebarStore } from "@/lib/sidebar-store";
import { cn } from "@/lib/utils";

export function HeaderSidebar() {
    const { isOpen, setOpen } = useSidebarStore();
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const media = window.matchMedia("(min-width: 768px)");
        setIsDesktop(media.matches);
        if (media.matches) {
            setOpen(true);
        }
        const listener = (e: MediaQueryListEvent) => {
            setIsDesktop(e.matches);
            if (e.matches) {
                setOpen(true);
            }
        };
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [setOpen]);

    return (
        <Sheet 
            open={isOpen} 
            onOpenChange={(open) => {
                if (isDesktop && !open) return;
                setOpen(open);
            }} 
            modal={!isDesktop}
        >
            <SheetTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "hidden md:inline-flex mr-2 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200",
                        isOpen && "opacity-0 pointer-events-none w-0 mr-0 overflow-hidden"
                    )}
                >
                    <Menu className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent 
                side="left" 
                className={cn(
                    "p-0 bg-transparent border-none w-[190px] transition-all duration-300",
                    isDesktop ? "top-16 h-[calc(100vh-4rem)]" : "top-0 h-full"
                )}
                hideCloseButton={true}
                hideOverlay={isDesktop}
                onPointerDownOutside={(e) => isDesktop && e.preventDefault()}
                onInteractOutside={(e) => isDesktop && e.preventDefault()}
                onEscapeKeyDown={(e) => isDesktop && e.preventDefault()}
            >
                <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Access school management modules and settings</SheetDescription>
                <div className="h-full w-full bg-[#0A192F]/95 backdrop-blur-3xl border-r border-[#64FFDA]/10 shadow-2xl">
                    <Sidebar mobile={!isDesktop} onItemClick={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
