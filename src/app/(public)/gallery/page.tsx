"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { ArrowLeft, Loader2, ZoomIn, X, Download, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// --- SEED DATA: 20 HIGH QUALITY IMAGES ---
const DEMO_IMAGES = [
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    "https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&q=80",
    "https://images.unsplash.com/photo-1596496053493-27f272c72b9a?w=800&q=80",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    "https://images.unsplash.com/photo-1560785496-3c9d27877182?w=800&q=80",
    "https://images.unsplash.com/photo-1510531704581-5b2870972060?w=800&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80",
    "https://images.unsplash.com/photo-1511629091441-ee46146481b6?w=800&q=80",
    "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80",
    "https://images.unsplash.com/photo-1571260899304-42d98b60d713?w=800&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
    "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80",
    "https://images.unsplash.com/photo-1491841573634-28140fc95912?w=800&q=80",
    "https://images.unsplash.com/photo-1629904853716-6b03d2e1f771?w=800&q=80",
    "https://images.unsplash.com/photo-1524311583145-d51d9d4d5a7d?w=800&q=80",
    "https://images.unsplash.com/photo-1577896338042-327704b77134?w=800&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"
];

export default function SmoothParallaxGallery() {
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState<string | null>(null);

    // Initial Data Load
    useEffect(() => {
        const unsub = onValue(ref(rtdb, "siteContent/home/gallery"), (snap) => {
            const realImages = snap.exists() && Array.isArray(snap.val()) ? snap.val().filter(Boolean) : [];
            // Ensure we represent 20 images total for the demo feel
            const mixed = [...realImages, ...DEMO_IMAGES].slice(0, 20);
            setImages(mixed);
            setLoading(false);
        }, (error) => {
            console.error("RTDB Error (gallery page):", error);
            setImages(DEMO_IMAGES.slice(0, 20)); // Fallback to demo images
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // --- PARALLAX ENGINE ---
    // Switched to global window scroll to avoid Ref hydration issues in Next.js 13+
    const { scrollY } = useScroll();

    // We split images into 3 columns for parallax differentiation
    // This is much more performant than per-image 3D transforms
    const col1 = images.filter((_, i) => i % 3 === 0);
    const col2 = images.filter((_, i) => i % 3 === 1);
    const col3 = images.filter((_, i) => i % 3 === 2);

    // Different movement speeds for columns to create depth
    // Mapping scroll pixels directly to offset pixels for consistent feel
    const y1 = useTransform(scrollY, [0, 2000], [0, -200]);
    const y2 = useTransform(scrollY, [0, 2000], [0, -400]); // Moves faster (appears closer/further)
    const y3 = useTransform(scrollY, [0, 2000], [0, -100]);

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-[#050b14]">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <main className="bg-[#050b14] min-h-screen overflow-x-hidden selection:bg-indigo-500/30">

            {/* Header Removed - Managed by Layout */}

            {/* Content Container */}
            <div className="container mx-auto max-w-7xl px-4 pt-32 pb-32">

                {/* Intro Text */}
                <div className="mb-20 px-2 md:px-8">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/20 tracking-tighter mb-6"
                    >
                        Moments<br />In Motion.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-zinc-400 max-w-xl text-lg font-light leading-relaxed border-l-2 border-indigo-500 pl-6"
                    >
                        A cinematic journey through our campus life. Experience the atmosphere, the people, and the legacy.
                    </motion.p>
                </div>

                {/* Parallax Grid - Dense 3 Columns for Mobile (Min 6 visible) */}
                <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-8 items-start relative h-full">

                    {/* FAST COLUMN */}
                    <motion.div style={{ y: y1 }} className="flex flex-col gap-2 md:gap-12 relative top-0 md:-top-20">
                        {col1.map((src, i) => (
                            <ParallaxImage key={`c1-${i}`} src={src} index={i} onClick={() => setSelectedImg(src)} speed="Fast" />
                        ))}
                    </motion.div>

                    {/* SLOW COLUMN */}
                    <motion.div style={{ y: y2 }} className="flex flex-col gap-2 md:gap-12 pt-12 md:pt-32">
                        {col2.map((src, i) => (
                            <ParallaxImage key={`c2-${i}`} src={src} index={i} onClick={() => setSelectedImg(src)} speed="Slow" priority />
                        ))}
                    </motion.div>

                    {/* MEDIUM COLUMN */}
                    <motion.div style={{ y: y3 }} className="flex flex-col gap-2 md:gap-12 pt-4 md:pt-10">
                        {col3.map((src, i) => (
                            <ParallaxImage key={`c3-${i}`} src={src} index={i} onClick={() => setSelectedImg(src)} speed="Mid" />
                        ))}
                    </motion.div>
                </div>

            </div>

            {/* Lightbox / Modal */}
            {selectedImg && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setSelectedImg(null)}
                >
                    <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <div className="relative w-full h-full">
                            <Image
                                src={selectedImg}
                                alt="Fullscreen"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm backdrop-blur-md transition-all">
                                <Share2 className="w-4 h-4" /> Share
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm backdrop-blur-md transition-all">
                                <Download className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

// Optimized Image Component
function ParallaxImage({ src, index, onClick, speed, priority = false }: { src: string, index: number, onClick: () => void, speed: string, priority?: boolean }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

    // Subtle hover effect instead of heavy 3D transforms
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative group cursor-zoom-in"
            onClick={onClick}
        >
            <div className="overflow-hidden rounded-xl bg-zinc-900 shadow-2xl relative">
                {/* 3:4 Aspect Ratio Container */}
                <div className="relative aspect-[3/4] w-full">
                    <Image
                        src={src}
                        alt="Gallery Image"
                        fill
                        className="object-cover transition-transform duration-700 will-change-transform group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={priority}
                    />

                    {/* Cinematic Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
            </div>

            {/* Floating Meta (Simulated 3D) */}
            <div className="absolute -bottom-4 -right-4 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 shadow-xl z-20">
                <ZoomIn className="w-5 h-5 text-indigo-400" />
            </div>

            {/* Speed Indicator (Visual Flair) */}
            <div className="absolute -left-6 top-1/2 -rotate-90 origin-center text-[10px] text-white/10 font-mono tracking-widest uppercase pointer-events-none">
                {speed}_Layer_0{index + 1}
            </div>
        </motion.div>
    );
}
