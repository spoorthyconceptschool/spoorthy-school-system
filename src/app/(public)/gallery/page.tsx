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
    { title: "Science Discovery", category: "Academics", src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1600&auto=format&fit=crop" },
    { title: "Morning Assembly", category: "Tradition", src: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=1600&auto=format&fit=crop" },
    { title: "Art & Creativity", category: "Hobbies", src: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1600&auto=format&fit=crop" },
    { title: "Reading Room", category: "Academics", src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1600&auto=format&fit=crop" },
    { title: "Soccer Practice", category: "Sports", src: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=1600&auto=format&fit=crop" },
    { title: "Music Class", category: "Arts", src: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1600&auto=format&fit=crop" },
    { title: "Basketball Game", category: "Sports", src: "https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=1600&auto=format&fit=crop" },
    { title: "Group Discussion", category: "Learning", src: "https://images.unsplash.com/photo-1510531704581-5b2870972060?q=80&w=1600&auto=format&fit=crop" },
    { title: "Library Deep Dive", category: "Resources", src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1600&auto=format&fit=crop" },
    { title: "Annual Day", category: "Celebration", src: "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=1600&auto=format&fit=crop" },
    { title: "School Corridor", category: "Campus", src: "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1600&auto=format&fit=crop" },
    { title: "Math Workshop", category: "Academics", src: "https://images.unsplash.com/photo-1571260899304-42d98b60d713?q=80&w=1600&auto=format&fit=crop" },
    { title: "Technology Lab", category: "Digital", src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&auto=format&fit=crop" },
    { title: "Collaborative Study", category: "Learning", src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop" },
    { title: "Laboratory Work", category: "Science", src: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=1600&auto=format&fit=crop" },
    { title: "Class Project", category: "Academics", src: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1600&auto=format&fit=crop" },
    { title: "Lunch Break", category: "Social", src: "https://images.unsplash.com/photo-1511631231751-2292419a32c2?q=80&w=1600&auto=format&fit=crop" },
    { title: "Outdoor Learning", category: "Nature", src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1600&auto=format&fit=crop" },
    { title: "Chemistry Lab", category: "Academics", src: "https://images.unsplash.com/photo-1577896338042-327704b77134?q=80&w=1600&auto=format&fit=crop" },
    { title: "School Gathering", category: "Tradition", src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop" }
];

export default function SmoothParallaxGallery() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState<string | null>(null);

    // Initial Data Load
    useEffect(() => {
        const unsub = onValue(ref(rtdb, "siteContent/home/gallery"), (snap) => {
            const realImages = snap.exists() && Array.isArray(snap.val()) ? snap.val().filter(Boolean) : [];
            const mappedReal = realImages.map((s: any, i: number) => {
                if (typeof s === 'string') return { src: s, title: `Activity ${i + 1}`, category: "Gallery" };
                return s;
            });
            const mixed = [...mappedReal, ...DEMO_IMAGES].slice(0, 20);
            setActivities(mixed);
            setLoading(false);
        }, (error: any) => {
            console.warn("RTDB Permission (gallery page):", error.message);
            setActivities(DEMO_IMAGES.slice(0, 20));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const { scrollY } = useScroll();

    const col1 = activities.filter((_, i) => i % 3 === 0);
    const col2 = activities.filter((_, i) => i % 3 === 1);
    const col3 = activities.filter((_, i) => i % 3 === 2);

    const y1 = useTransform(scrollY, [0, 2000], [0, -200]);
    const y2 = useTransform(scrollY, [0, 2000], [0, -400]);
    const y3 = useTransform(scrollY, [0, 2000], [0, -100]);

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-[#050b14]">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <main className="bg-[#050b14] min-h-screen overflow-x-hidden selection:bg-indigo-500/30">
            <div className="container mx-auto max-w-7xl px-4 pt-32 pb-32">
                <div className="mb-20 px-2 md:px-8">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/20 tracking-tighter mb-6 uppercase italic"
                    >
                        Moments<br />In Motion.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-zinc-400 max-w-xl text-lg font-light leading-relaxed border-l-2 border-indigo-500 pl-6"
                    >
                        Explore the vibrant tapestry of school life. From academic breakthroughs to championship wins, witness the journey of Spoorthy Concept School.
                    </motion.p>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-8 items-start relative h-full">
                    <motion.div style={{ y: y1 }} className="flex flex-col gap-2 md:gap-12 relative top-0 md:-top-20">
                        {col1.map((item, i) => (
                            <ParallaxImage key={`c1-${i}`} item={item} index={i} onClick={() => setSelectedImg(item.src)} speed="Fast" />
                        ))}
                    </motion.div>

                    <motion.div style={{ y: y2 }} className="flex flex-col gap-2 md:gap-12 pt-12 md:pt-32">
                        {col2.map((item, i) => (
                            <ParallaxImage key={`c2-${i}`} item={item} index={i} onClick={() => setSelectedImg(item.src)} speed="Slow" priority />
                        ))}
                    </motion.div>

                    <motion.div style={{ y: y3 }} className="flex flex-col gap-2 md:gap-12 pt-4 md:pt-10">
                        {col3.map((item, i) => (
                            <ParallaxImage key={`c3-${i}`} item={item} index={i} onClick={() => setSelectedImg(item.src)} speed="Mid" />
                        ))}
                    </motion.div>
                </div>
            </div>

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
function ParallaxImage({ item, index, onClick, speed, priority = false }: { item: any, index: number, onClick: () => void, speed: string, priority?: boolean }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

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
                <div className="relative aspect-[3/4] w-full">
                    {item.src && (
                        <Image
                            src={item.src}
                            alt={item.title || "Gallery Image"}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-700 will-change-transform group-hover:scale-110 opacity-90 group-hover:opacity-100"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            priority={priority}
                        />
                    )}

                    {/* Activity Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-transparent to-transparent flex flex-col justify-end p-6 md:p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <span className="text-indigo-400 font-mono text-[10px] uppercase tracking-widest mb-1">{item.category}</span>
                        <h4 className="text-white font-black text-xl md:text-2xl italic tracking-tighter leading-none">{item.title}</h4>
                    </div>
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
