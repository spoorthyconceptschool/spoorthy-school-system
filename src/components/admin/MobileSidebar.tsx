"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function MobileSidebar() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden mr-2 text-white/70 hover:text-white hover:bg-white/10">
                    <Menu className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-transparent border-none w-72">
                <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Access school management modules and settings</SheetDescription>
                <div className="h-full w-full bg-[#0A192F]/95 backdrop-blur-3xl border-r border-[#64FFDA]/10 shadow-2xl">
                    <Sidebar mobile={true} onItemClick={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
