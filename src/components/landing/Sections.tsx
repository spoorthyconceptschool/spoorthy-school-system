"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { MoveRight, ArrowRight, Quote, Instagram, Twitter, Facebook, ExternalLink, Calendar, BookOpen, User, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { cn } from "@/lib/utils";

// === SHARED UTILS (Cinematic Typography) ===
const SectionHeader = ({ title, subtitle, align = "left" }: { title: string, subtitle?: string, align?: "left" | "center" }) => (
    <div className={`mb-8 md:mb-12 px-6 md:px-0 max-w-5xl ${align === "center" ? "mx-auto text-center" : ""}`}>
        {subtitle && (
            <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="block text-accent font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase mb-4 md:mb-6"
            >
                {subtitle}
            </motion.span>
        )}
        <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-7xl lg:text-8xl font-sans font-black text-white tracking-tighter leading-[0.9] text-balance"
        >
            {title}
        </motion.h2>
    </div>
);

// === FACILITIES / CAMPUS (Premium Motion Slideshow) ===
export function Facilities() {
    const [facilities, setFacilities] = useState<any[]>([]);
    const [originalLen, setOriginalLen] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isJumping, setIsJumping] = useState(false);

    const SLOT_WIDTH = 340;

    // Initial Data Load - Triple the list for infinite loop
    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'siteContent/home/facilities'), (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const list = Object.values(data)
                    .filter((i: any) => i.isPublished)
                    .sort((a: any, b: any) => a.order - b.order);

                if (list.length > 0) {
                    setOriginalLen(list.length);
                    setFacilities([...list, ...list, ...list]);
                    setActiveIndex(list.length); // Start in the middle set
                }
            }
        }, (error: any) => {
            console.warn("RTDB Permission (facilities):", error.message);
        });
        return () => unsub();
    }, []);

    // ONE-WAY CIRCULAR LOOP LOGIC
    // Monitor activeIndex and perform an invisible teleport jump back to the middle set
    useEffect(() => {
        if (originalLen === 0) return;

        // When we reach the end of the second set (index 2N), we're identical to index N
        if (activeIndex === originalLen * 2) {
            const timer = setTimeout(() => {
                setIsJumping(true);
                setActiveIndex(originalLen);
                // Reveal transition after the teleport is processed by React
                setTimeout(() => setIsJumping(false), 50);
            }, 700); // Wait for the transition to 2N to finish before jumping
            return () => clearTimeout(timer);
        }

        // Handle reverse jump if user clicks previous at index 0
        if (activeIndex === 0) {
            const timer = setTimeout(() => {
                setIsJumping(true);
                setActiveIndex(originalLen * 2 - 1); // Jump to the equivalent position in the second set
                setTimeout(() => setIsJumping(false), 50);
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [activeIndex, originalLen]);

    // Auto-play (Strictly one-way)
    useEffect(() => {
        if (originalLen === 0 || isPaused) return;
        const interval = setInterval(() => {
            setActiveIndex(prev => prev + 1);
        }, 3500);
        return () => clearInterval(interval);
    }, [originalLen, isPaused]);

    const _setIsPaused = () => {
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 15000);
    };

    const getDim = (idx: number) => {
        // Calculate distance considering the circular nature for scaling logic
        const dist = Math.abs(idx - activeIndex);
        const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

        if (dist === 0) return {
            w: isMobile ? 280 : 520, h: isMobile ? 280 : 520,
            opacity: 1, grayscale: 0, blur: 0, scale: 1, z: 40
        };
        if (dist === 1) return {
            w: isMobile ? 120 : 260, h: isMobile ? 180 : 400,
            opacity: 0.6, grayscale: 0.8, blur: 2, scale: 0.94, z: 30
        };
        if (dist === 2) return {
            w: isMobile ? 100 : 200, h: isMobile ? 140 : 320,
            opacity: 0.3, grayscale: 1, blur: 4, scale: 0.88, z: 20
        };
        return {
            w: isMobile ? 80 : 160, h: isMobile ? 110 : 240,
            opacity: 0.1, grayscale: 1, blur: 8, scale: 0.8, z: 10
        };
    };

    return (
        <section id="campus" className="py-10 md:py-32 bg-[#0A192F] relative overflow-hidden border-b border-[#64FFDA]/5">
            <div className="container mx-auto px-6 mb-6 md:mb-12 flex justify-between items-end relative z-50">
                <SectionHeader title="Where We Belong." subtitle="Campus" />

                <div className="hidden md:flex gap-4 mb-4">
                    <button
                        onClick={() => {
                            _setIsPaused();
                            setActiveIndex(prev => prev - 1);
                        }}
                        className="w-12 h-12 rounded-full border border-[#64FFDA]/20 flex items-center justify-center text-[#64FFDA] hover:bg-[#64FFDA]/10 transition-all active:scale-95"
                    >
                        <ArrowRight className="rotate-180" size={20} />
                    </button>
                    <button
                        onClick={() => {
                            _setIsPaused();
                            setActiveIndex(prev => prev + 1);
                        }}
                        className="w-12 h-12 rounded-full border border-[#64FFDA]/20 flex items-center justify-center text-[#64FFDA] hover:bg-[#64FFDA]/10 transition-all active:scale-95"
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            <div className="relative h-[400px] md:h-[800px] w-full flex items-center overflow-visible">
                <motion.div
                    animate={{ x: `calc(50vw - ${activeIndex * SLOT_WIDTH}px - ${SLOT_WIDTH / 2}px)` }}
                    transition={isJumping ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 20, mass: 1 }}
                    className="flex items-center"
                >
                    {facilities.map((item, idx) => {
                        const dim = getDim(idx);
                        const isFocused = idx === activeIndex;

                        return (
                            <div key={idx} style={{ width: SLOT_WIDTH }} className="shrink-0 flex items-center justify-center">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        width: dim.w,
                                        height: dim.h,
                                        opacity: dim.opacity,
                                        scale: dim.scale,
                                        filter: `grayscale(${dim.grayscale}) blur(${dim.blur}px)`,
                                    }}
                                    transition={isJumping ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 20 }}
                                    className={cn(
                                        "relative rounded-[2.5rem] md:rounded-[4.5rem] overflow-hidden cursor-pointer bg-[#112240]",
                                        isFocused ? "z-40 ring-4 ring-[#64FFDA]/20 shadow-[0_0_100px_-20px_rgba(100,255,218,0.4)]" : "z-10"
                                    )}
                                    onClick={() => {
                                        _setIsPaused();
                                        setActiveIndex(idx);
                                    }}
                                >
                                    {item.image ? (
                                        <Image
                                            src={item.image}
                                            alt={item.title || "Facility"}
                                            fill
                                            className="object-cover"
                                            priority={isFocused}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-[#0A192F]" />
                                    )}

                                    <div className={cn(
                                        "absolute inset-0 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/10 to-transparent transition-opacity duration-1000",
                                        isFocused ? "opacity-90" : "opacity-0"
                                    )} />

                                    <div className={cn(
                                        "absolute bottom-0 left-0 w-full p-8 md:p-14 transition-all duration-[1s]",
                                        isFocused ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
                                    )}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-[1px] w-8 bg-accent/40" />
                                            <p className="text-accent font-mono text-[10px] md:text-xs uppercase tracking-[0.4em]">Section 0{(idx % originalLen) + 1}</p>
                                        </div>
                                        <h3 className="text-3xl md:text-5xl font-black text-white leading-none uppercase italic tracking-tighter mb-4 drop-shadow-2xl">{item.title}</h3>
                                        <p className="text-white/60 text-xs md:text-sm max-w-sm line-clamp-2 md:line-clamp-none font-medium italic leading-relaxed">{item.desc}</p>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                </motion.div>
            </div>

            <div className="container mx-auto px-6 mt-8 md:mt-24 relative z-50">
                <div className="flex items-center gap-8 justify-center md:justify-start">
                    <div className="text-[#64FFDA] font-mono text-xs tracking-widest uppercase opacity-40">Discovery</div>
                    <div className="flex gap-3">
                        {[...Array(originalLen)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    _setIsPaused();
                                    setActiveIndex(originalLen + i);
                                }}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-700",
                                    (activeIndex % originalLen) === i ? "w-20 bg-accent" : "w-1.5 bg-white/10 hover:bg-white/30"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// === LEADERSHIP (Stories Format) ===
export function Leadership() {
    const { branding } = useMasterData();
    const [leaders, setLeaders] = useState<any>({
        chairman: { name: "Mr. Spoorthy Reddy", title: "Chairman", photo: "https://images.unsplash.com/photo-1544717297-fa154da09f5b?q=80&w=2070&auto=format&fit=crop" },
        principal: { name: "Mrs. Lakshmi", title: "Principal", photo: "https://images.unsplash.com/photo-1580894732230-285b963a9483?q=80&w=2070&auto=format&fit=crop" }
    });

    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'siteContent/home/leadership'), (snap) => {
            if (snap.exists()) setLeaders((prev: any) => ({ ...prev, ...snap.val() }));
        }, (error: any) => {
            console.warn("RTDB Permission (leadership):", error.message);
        });
        return () => unsub();
    }, []);

    return (
        <section id="about" className="py-10 md:py-16 bg-[#0A192F] relative overflow-hidden">
            {/* Premium Background Atmosphere */}
            <div className="absolute top-0 left-[-10%] w-[60%] h-[60%] bg-[#64FFDA]/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-[-10%] w-[60%] h-[60%] bg-[#64FFDA]/5 blur-[150px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <SectionHeader title="The Visionaries." subtitle="Leadership" align="center" />

                <div className="grid grid-cols-2 gap-4 md:gap-12 mt-8 md:mt-16 max-w-6xl mx-auto">
                    {[leaders.chairman, leaders.principal].map((leader, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className="group relative w-full flex flex-col items-center"
                        >
                            <motion.div
                                whileHover={{ y: -15, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className="relative w-full aspect-[4/5] rounded-[1rem] md:rounded-[2rem] bg-[#112240] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_40px_80px_-20px_rgba(100,255,218,0.2)] transition-all duration-500 overflow-hidden border border-white/10"
                            >
                                {/* Image Mask */}
                                <div className="absolute inset-0">
                                    {leader.photo && (leader.photo.startsWith('http') || leader.photo.startsWith('/')) ? (
                                        <Image
                                            src={leader.photo}
                                            alt={leader.name}
                                            fill
                                            className="object-cover transition-all duration-[2s] group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <User className="text-white/10 w-20 h-20" />
                                        </div>
                                    )}

                                    {/* Premium Overlays */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-transparent to-transparent opacity-80" />
                                </div>
                            </motion.div>

                            {/* Details (Majestic Size) */}
                            <div className="mt-8 md:mt-16 text-center space-y-4 md:space-y-6">
                                <h3 className="text-xl md:text-7xl font-sans font-black text-white leading-none tracking-tighter">
                                    {leader.name}
                                </h3>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    className="px-4 md:px-8 py-2 md:py-3 bg-white/5 backdrop-blur-md text-accent font-black text-[8px] md:text-sm tracking-[0.2em] md:tracking-[0.5em] uppercase rounded-full border border-accent/20 inline-block shadow-lg"
                                >
                                    {leader.title}
                                </motion.div>

                                <div className="flex flex-col items-center gap-4 md:gap-6">
                                    <div className="h-[3px] w-12 bg-accent/30 rounded-full group-hover:w-40 group-hover:bg-accent transition-all duration-1000" />
                                    <p className="max-w-xs text-white/50 text-xs md:text-lg font-medium leading-relaxed italic">
                                        Defining the future of excellence at {branding.schoolName || "Spoorthy Concept School"}.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// === PHILOSOPHY // WHY US (Renamed Component for Logic, but conceptually Philosophy) ===
export function WhyUs() {
    return (
        <section id="philosophy" className="py-10 md:py-16 bg-[#0A192F] text-white relative overflow-hidden">
            <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        viewport={{ margin: "-200px", once: true }}
                    >
                        <SectionHeader title="We Don't Just Teach." subtitle="Philosophy" />
                    </motion.div>

                    <div className="space-y-8 text-xl md:text-2xl text-white/70 font-sans font-medium max-w-md leading-relaxed">
                        <p>We inspire curiosity. At Spoorthy, education goes beyond textbooks.</p>
                        <p>We craft experiences that shape character, foster creativity, and build the confidence to lead.</p>
                    </div>

                    <Link href="/about">
                        <button className="px-8 py-4 rounded-full border border-white/20 hover:bg-white text-white hover:text-black transition-all font-bold tracking-wide uppercase text-sm">
                            Read Our Manifesto
                        </button>
                    </Link>
                </div>

                <div className="relative h-[600px] w-full rounded-2xl overflow-hidden group">
                    <Image
                        src="https://plus.unsplash.com/premium_photo-1661764832352-790112837918?q=80&w=2070&auto=format&fit=crop"
                        alt="Philosophy"
                        fill
                        className="object-cover transition-transform duration-[2s] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-12 left-12">
                        <p className="text-white font-sans text-2xl md:text-4xl font-bold">The Spoorthy Way.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// === GALLERY (Mosaic Grid) ===
export function GalleryPreview() {
    const [activities, setActivities] = useState<any[]>([
        { title: "Science Discovery", category: "Academics", src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1600&auto=format&fit=crop" },
        { title: "Sports Tournament", category: "Athletics", src: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=1600&auto=format&fit=crop" },
        { title: "Cultural Festival", category: "Arts", src: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1600&auto=format&fit=crop" },
        { title: "Digital Literacy", category: "Tech", src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&auto=format&fit=crop" }
    ]);

    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'siteContent/home/gallery'), (snap) => {
            if (snap.exists() && Array.isArray(snap.val())) {
                const data = snap.val();
                if (data.length > 0) {
                    // Map RTDB strings to objects if they aren't already
                    const mapped = data.map((item: any, i: number) => {
                        if (typeof item === 'string') return { title: `Activity ${i + 1}`, category: "Gallery", src: item };
                        return item;
                    });
                    setActivities(mapped);
                }
            }
        }, (error: any) => {
            console.warn("RTDB Permission (gallery):", error.message);
        });
        return () => unsub();
    }, []);

    return (
        <section id="gallery" className="py-10 md:py-16 bg-[#0A192F]">
            <div className="container mx-auto px-6 mb-8 md:mb-16 flex justify-between items-end">
                <SectionHeader title="Campus Life." subtitle="Gallery" />
                <Link href="/gallery" className="flex mb-2 md:mb-0">
                    <button className="flex items-center gap-2 hover:text-accent transition-colors text-white/60 font-bold uppercase tracking-widest text-[10px] md:text-sm">
                        View All <ExternalLink size={14} />
                    </button>
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 h-[60vh] md:h-[80vh] w-full gap-2 p-2">
                {activities.slice(0, 4).map((item, i) => (
                    <motion.div
                        key={i}
                        className={`relative group overflow-hidden bg-[#112240]/40 backdrop-blur-sm rounded-2xl ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        viewport={{ margin: "-100px", once: true }}
                        whileHover={{ scale: 0.98 }}
                    >
                        {item.src && (item.src.startsWith('http') || item.src.startsWith('/')) && (
                            <Image
                                src={item.src}
                                alt={item.title || "Gallery"}
                                fill
                                unoptimized
                                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                            />
                        )}

                        {/* Always visible title for better accessibility/UX if image lazy loads */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 md:p-10 flex flex-col justify-end">
                            <p className="text-accent font-mono text-[8px] md:text-xs uppercase tracking-widest mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                {item.category || "Moment"}
                            </p>
                            <h3 className="text-white font-black text-xl md:text-4xl uppercase italic tracking-tighter leading-none group-hover:text-accent transition-colors uppercase">
                                {item.title || "Campus Activity"}
                            </h3>

                            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                                <div className="px-5 py-2 md:px-8 md:py-3 bg-white text-black text-[10px] md:text-xs font-black uppercase tracking-widest rounded-full w-fit">
                                    View Moment
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

// === TESTIMONIALS (Infinite Marquee) ===
export function Testimonials() {
    return (
        <section title="voices" className="py-10 md:py-16 bg-[#0A192F] overflow-hidden">
            <div className="container mx-auto px-6 mb-8 md:mb-16">
                <SectionHeader title="Voices." subtitle="Testimonials" />
            </div>
            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee whitespace-nowrap flex gap-8">
                    {[...Array(4)].map((_, i) => ( // Duplicate more for smoother loop
                        <div key={i} className="flex gap-8">
                            {[
                                { text: "The transformation in my child's confidence and curiosity since joining Spoorthy has been remarkable. A truly dedicated team.", author: "P. Sharma", role: "Parent" },
                                { text: "We appreciate the blend of modern pedagogy with traditional values. The facilities are truly world-class and safe.", author: "M. Reddy", role: "Parent" },
                                { text: "A vibrant learning environment that doesn't just focus on grades but on building real character and leading skills.", author: "S. Rao", role: "Parent" },
                            ].map((t, idx) => (
                                <div key={idx} className="w-[85vw] md:w-[30vw] min-h-[160px] md:min-h-[180px] p-8 md:p-10 bg-[#112240]/30 backdrop-blur-lg border border-[#64FFDA]/10 rounded-[2rem] shrink-0 whitespace-normal hover:bg-[#112240]/50 transition-colors flex flex-col justify-between">
                                    <p className="text-sm md:text-lg text-white font-medium leading-tight mb-4 group-hover:text-accent transition-colors">"{t.text}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                                            {t.author.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-xs uppercase tracking-wide">{t.author}</h4>
                                            <span className="text-[10px] text-white/40">{t.role}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// === CTA BAND (Minimal & Bold) ===
export function ContactBand() {
    return (
        <section id="contact" className="py-24 md:py-32 bg-accent text-black relative overflow-hidden flex flex-col items-center justify-center text-center">
            {/* Noise texture for depth */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 mix-blend-overlay pointer-events-none" />

            <div className="relative z-10 space-y-12 px-6 max-w-4xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-5xl md:text-9xl font-sans font-black tracking-tighter leading-[0.85]"
                >
                    START YOUR JOURNEY.
                </motion.h2>

                <p className="text-xl md:text-3xl font-medium max-w-2xl mx-auto opacity-80 leading-relaxed">
                    Admissions for 2026-27 are closing soon. <br /> Be part of the legacy.
                </p>

                <div className="pt-12">
                    <Link href="/admissions/apply">
                        <button className="px-16 py-8 rounded-full bg-black text-white font-bold text-lg md:text-2xl hover:bg-black/90 transition-all hover:scale-105 shadow-2xl">
                            Apply for Admission
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

// === FOOTER (Big & Clean) ===
export function Footer() {
    const { branding } = useMasterData();
    return (
        <footer className="bg-[#0A192F] text-white pt-12 md:pt-20 pb-16 border-t border-[#64FFDA]/10">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 lg:gap-24 mb-16 md:mb-32">
                    <div className="space-y-8">
                        <Link href="/" className="flex items-center gap-3 group">
                            {branding.schoolLogo && (
                                <div className="w-12 h-12 rounded-xl bg-white/5 p-1 border border-white/10 group-hover:scale-110 transition-transform">
                                    <img src={branding.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <span className="text-2xl md:text-4xl font-premium tracking-tighter block group-hover:text-accent transition-colors">
                                {branding.schoolName || "Spoorthy"}.
                            </span>
                        </Link>
                        <div className="flex gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer"><Instagram size={20} className="md:w-6 md:h-6" /></div>
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer"><Twitter size={20} className="md:w-6 md:h-6" /></div>
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer"><Facebook size={20} className="md:w-6 md:h-6" /></div>
                        </div>
                    </div>

                    {/* Columns styled cleanly */}
                    {[
                        { head: 'Platform', links: ['Student Portal', 'Admin Login', 'Staff Portal'] },
                        { head: 'Company', links: ['About Us', 'Careers', 'Contact'] },
                        { head: 'Resources', links: ['Admission Guide', 'Fee Structure', 'Academic Calendar'] }
                    ].map((col, i) => (
                        <div key={i}>
                            <h4 className="font-bold mb-4 md:mb-8 text-base md:text-xl">{col.head}</h4>
                            <ul className="space-y-3 md:space-y-6 text-white/50 text-sm md:text-lg">
                                {col.links.map((link, j) => (
                                    <li key={j}><Link href="#" className="hover:text-white transition-colors">{link}</Link></li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center text-sm text-white/30 font-bold uppercase tracking-widest">
                    <p>© {new Date().getFullYear()} {branding.schoolName || "Spoorthy School"}.</p>
                    <div className="flex gap-12 mt-8 md:mt-0">
                        <span>Privacy</span>
                        <span>Terms</span>
                        <span>Sitemap</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
