"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { ArrowRight, Play, ChevronDown } from "lucide-react";
import Link from "next/link";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export function Hero() {
    const [content, setContent] = useState<any>({
        title: "Learn Today Lead Tommorrow",
        subtitle: "Innovation meets tradition.",
        videoUrl: "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/51d8a5ee-ebad-48e0-9617-b96d7911ac8b.mp4",
        mobileVideoUrl: null,
        posterUrl: "https://firebasestorage.googleapis.com/v0/b/spoorthy-school-live-55917.firebasestorage.app/o/demo%2Fhero-poster.jpg?alt=media"
    });

    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);



    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'siteContent/home/hero'), (snap) => {
            if (snap.exists()) {
                setContent(snap.val());
            }
            setLoading(false);
        }, (error: any) => {
            console.warn("RTDB Permission (hero):", error.message);
            setLoading(false);
        });

        // Detect mobile for video optimization
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            unsub();
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const activeVideoUrl = (isMobile && content.mobileVideoUrl) ? content.mobileVideoUrl : content.videoUrl;

    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();

    // Parallax & Fade for Background
    const yVideo = useTransform(scrollY, [0, 1000], [0, 400]);
    const opacityVideo = useTransform(scrollY, [0, 800], [1, 0.2]);

    // Text Parallax - Moves slightly faster than scroll
    const yText = useTransform(scrollY, [0, 500], [0, 100]);
    const opacityText = useTransform(scrollY, [0, 400], [1, 0]);

    // Text Reveal Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 40, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 70,
                damping: 20,
                mass: 1
            } as any
        }
    };

    return (
        <section ref={containerRef} className="relative h-screen w-full overflow-hidden bg-[#0A192F] flex items-center justify-center">

            {/* Cinematic Background Layer */}
            <motion.div
                style={{
                    opacity: opacityVideo,
                    y: yVideo,
                    backgroundImage: content.posterUrl ? `url(${content.posterUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
                className="absolute inset-0 z-0 bg-[#0A192F]"
            >
                {/* 
                  Video Layer - High priority rendering.
                */}
                {activeVideoUrl && (
                    <video
                        key={activeVideoUrl}
                        src={activeVideoUrl}
                        className="absolute inset-0 w-full h-full object-cover select-none"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                    />
                )}

                <div className="absolute inset-0 bg-[#0A192F]/40 z-10 mix-blend-multiply pointer-events-none" /> {/* Darken video */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-transparent to-transparent z-10 opacity-90 pointer-events-none" /> {/* Bottom fade */}
            </motion.div>

            {/* Content Layer - Centered & Bold */}
            <motion.div
                style={{ y: yText, opacity: opacityText }}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-20 container mx-auto px-6 flex flex-col items-center text-center max-w-5xl"
            >
                {/* Badge */}
                <motion.div variants={itemVariants} className="mb-8">
                    <span className="px-4 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.2em] uppercase text-accent">
                        Admissions Open 2026-27
                    </span>
                </motion.div>

                {/* Main Headline - Massive but Fluid */}
                <motion.h1
                    variants={itemVariants}
                    className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-sans font-black tracking-tighter text-white mb-6 md:mb-8 leading-[1.0] md:leading-[0.9] text-balance"
                >
                    {content.title}
                </motion.h1>

                {/* Subtitle - Clean */}
                <motion.p
                    variants={itemVariants}
                    className="text-sm sm:text-base md:text-xl lg:text-2xl text-white/80 font-medium max-w-2xl mb-8 md:mb-12 leading-relaxed px-2"
                >
                    {content.subtitle}
                </motion.p>

                {/* CTAs - Responsive Sizing */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center w-full sm:w-auto">
                    <Link
                        href="/login"
                        className="group relative w-full sm:w-auto px-12 py-4 md:px-14 md:py-5 rounded-full bg-[#64FFDA] text-[#0A192F] font-bold text-base md:text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_-5px_#64FFDA] flex items-center justify-center gap-2"
                    >
                        Student Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <a
                        href={content.tourVideoUrl || "https://www.youtube.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex w-full sm:w-auto items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 rounded-full bg-white/5 backdrop-blur-xl border border-white/20 text-white font-bold text-base md:text-lg hover:bg-white/10 transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#64FFDA] text-[#0A192F] flex items-center justify-center shrink-0">
                            <Play size={12} fill="currentColor" className="ml-0.5" />
                        </div>
                        Watch Campus Tour
                    </a>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator - Bottom Center */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/40"
            >
                <span className="text-[10px] uppercase tracking-widest font-bold">Scroll</span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <ChevronDown size={20} />
                </motion.div>
            </motion.div>
        </section>
    );
}
