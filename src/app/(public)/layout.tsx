"use client";

import { ReactLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useMasterData } from '@/context/MasterDataContext';

interface NavbarProps { }

function Navbar() {
    const { branding } = useMasterData();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 50);
    });

    const pathname = usePathname();
    const isHome = pathname === "/";

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex items-center w-full",
                    scrolled || !isHome
                        ? "bg-[#0A192F]/95 backdrop-blur-xl border-b border-[#64FFDA]/10 h-16 md:h-20 shadow-2xl"
                        : "bg-transparent h-20 md:h-24"
                )}
            >
                <div className="container mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between w-full h-full gap-4">

                    <div className="flex items-center gap-4 shrink-0 max-w-[70%] md:max-w-none">
                        {/* Back Button (Only on non-home pages) */}
                        {!isHome && (
                            <Link href=".." className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors mr-2 hidden md:flex items-center justify-center">
                                <ArrowRight className="w-5 h-5 rotate-180" />
                            </Link>
                        )}

                        {/* Brand Identity */}
                        <Link href="/" className="flex items-center gap-3 md:gap-4 group z-50 relative shrink-0">
                            {branding.schoolLogo ? (
                                <div className="relative w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 overflow-hidden rounded-xl bg-white/5 p-1 group-hover:scale-105 transition-transform duration-500 border border-white/10 shadow-lg shrink-0">
                                    <img
                                        src={branding.schoolLogo}
                                        alt={branding.schoolName}
                                        className="w-full h-full object-contain filter drop-shadow-md"
                                    />
                                </div>
                            ) : null}
                            <div className="flex flex-col justify-center overflow-hidden">
                                <span className="font-premium text-lg md:text-2xl lg:text-3xl tracking-tight text-white group-hover:text-accent transition-colors leading-tight truncate">
                                    {branding.schoolName || "Spoorthy Concept School"}
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden xl:flex items-center gap-6 2xl:gap-10 shrink-0">
                        {["Philosophy", "Academics", "Campus", "Contact"].map((item) => (
                            <Link
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="font-sans font-medium text-sm text-white/70 hover:text-white hover:text-accent transition-colors tracking-wide uppercase"
                            >
                                {item}
                            </Link>
                        ))}
                    </div>

                    {/* Actions - Hidden on tablet/laptop to prevent collision */}
                    <div className="hidden xl:flex items-center gap-3 pl-6 border-l border-white/10 ml-6 shrink-0">
                        <Link href="/login" className="px-4 py-2 text-white/70 font-medium hover:text-white transition-colors text-xs uppercase tracking-wider hover:underline underline-offset-4 decoration-accent/50">
                            Portal
                        </Link>
                        <Link href="/admissions/apply">
                            <button className="px-6 py-2.5 rounded-full bg-white text-[#0A192F] font-bold text-xs md:text-sm hover:bg-accent transition-all shadow-lg hover:shadow-accent/20 active:scale-95 tracking-wide uppercase">
                                Admissions
                            </button>
                        </Link>
                    </div>

                    {/* Mobile Toggle - Visible up to lg screens */}
                    <button className="xl:hidden text-white p-2 -mr-2 z-50 relative hover:text-accent transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
                        {mobileOpen ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay - Premium Full Screen */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center p-6"
                    >
                        <div className="space-y-6 text-center">
                            {["Philosophy", "Academics", "Campus", "Contact"].map((item, i) => (
                                <motion.div
                                    key={item}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: "circOut" }}
                                >
                                    <Link
                                        href={`#${item.toLowerCase()}`}
                                        onClick={() => setMobileOpen(false)}
                                        className="font-sans text-3xl md:text-6xl font-bold text-white hover:text-accent transition-colors block tracking-tight leading-tight uppercase"
                                    >
                                        {item}
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                            className="mt-12 md:mt-20 flex flex-col gap-4 md:gap-6 w-full max-w-sm px-6"
                        >
                            <Link href="/admissions/apply" onClick={() => setMobileOpen(false)}>
                                <button className="w-full py-4 md:py-5 rounded-full bg-white text-[#0A192F] font-bold text-lg md:text-xl hover:scale-105 transition-transform shadow-xl">
                                    Apply Now
                                </button>
                            </Link>
                            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-white/50 font-medium text-center uppercase tracking-widest text-xs md:text-sm hover:text-white transition-colors">
                                Student Portal
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <ReactLenis root options={{ lerp: 0.1, duration: 1.0, smoothWheel: true, wheelMultiplier: 4, touchMultiplier: 3 }}>
            <div className="min-h-screen bg-[#0A192F] text-white font-sans selection:bg-accent selection:text-black">
                <Navbar />
                <main className="relative z-10">
                    {children}
                </main>
            </div>
        </ReactLenis>
    );
}
