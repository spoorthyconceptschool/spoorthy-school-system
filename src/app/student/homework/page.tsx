"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { useMasterData } from "@/context/MasterDataContext";
import { useStudentData } from "@/context/StudentDataContext";
import { 
    BookOpen, 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    AlertCircle, 
    Clock, 
    Check, 
    Info,
    BookOpenCheck,
    Tag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentHomeworkPage() {
    const { user } = useAuth();
    const { subjects, homeworkSubjects } = useMasterData();
    const { profile: studentProfile, homework, loading } = useStudentData();
    
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [animationDirection, setAnimationDirection] = useState<'prev' | 'next'>('next');
    const [animating, setAnimating] = useState(false);

    // Format helper for classic diary date
    const formatDiaryDate = (dateStr: string) => {
        if (!dateStr) return "N / A";
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yy = String(dateObj.getFullYear()).slice(-2);
        return `${dd} . ${mm} . ${yy}`;
    };

    // Unique dates sorting
    const getUniqueHomeworkDates = () => {
        const dates = new Set<string>();
        homework.forEach(hw => {
            if (hw.createdAt) {
                const d = new Date(hw.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                dates.add(d);
            }
        });
        return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    };

    const uniqueDates = getUniqueHomeworkDates();
    const todayStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    useEffect(() => {
        if (uniqueDates.length > 0 && !selectedDate) {
            setSelectedDate(uniqueDates[0]);
        } else if (uniqueDates.length === 0 && !selectedDate) {
            setSelectedDate(todayStr);
        }
    }, [uniqueDates, selectedDate, todayStr]);

    const formatSubjectName = (name: string) => {
        const n = name.toLowerCase().trim();
        if (n.includes('english')) return 'English';
        if (n.includes('hindi')) return 'Hindi';
        if (n.includes('telugu')) return 'Telugu';
        if (n.includes('math') || n.includes('arithmetic')) return 'Maths';
        if (n.includes('science') || n.includes('g. science') || n.includes('general science')) return 'G. Science';
        if (n.includes('social') || n.includes('s. studies') || n.includes('history') || n.includes('geography')) return 'S. Studies';
        if (n.includes('computer')) return 'Computer';
        return name;
    };

    const getHomeworkGivingSubjects = () => {
        if (!studentProfile?.classId) return [];
        const sectionId = studentProfile.sectionId || "A";
        const classKey = `${studentProfile.classId}_${sectionId}`;
        const config = homeworkSubjects[classKey] || {};
        return Object.keys(config).filter(sid => config[sid]);
    };

    const getHomeworkForSelectedDate = () => {
        const map: Record<string, any> = {};
        homework.forEach(hw => {
            if (hw.createdAt) {
                const d = new Date(hw.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                if (d === selectedDate) {
                    map[hw.subjectId] = hw;
                }
            }
        });
        return map;
    };

    const activeHW = getHomeworkForSelectedDate();
    
    const displaySubjects = Array.from(new Set([
        ...getHomeworkGivingSubjects(), 
        ...Object.keys(activeHW)
    ])).sort((a, b) => {
        const nameA = formatSubjectName(subjects[a]?.name || a);
        const nameB = formatSubjectName(subjects[b]?.name || b);
        const order = ['English', 'Telugu', 'Hindi', 'Maths', 'G. Science', 'S. Studies', 'Computer'];
        const indexA = order.indexOf(nameA);
        const indexB = order.indexOf(nameB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return nameA.localeCompare(nameB);
    });

    const displaySubjectsMobile = displaySubjects.slice(0, 4);

    const navigatePage = (direction: 'prev' | 'next') => {
        if (uniqueDates.length <= 1 || animating) return;
        const currentIndex = uniqueDates.indexOf(selectedDate);
        if (currentIndex === -1) return;

        let nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < uniqueDates.length) {
            setAnimationDirection(direction);
            setAnimating(true);
            setSelectedDate(uniqueDates[nextIndex]);
            setTimeout(() => setAnimating(false), 600);
        }
    };

    const hasNext = uniqueDates.indexOf(selectedDate) > 0;
    const hasPrev = uniqueDates.indexOf(selectedDate) < uniqueDates.length - 1 && uniqueDates.indexOf(selectedDate) !== -1;

    // Swipe gesture support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    };
    const handleSwipeGesture = () => {
        if (touchStartX - touchEndX > 50) {
            if (hasNext) navigatePage('next');
        }
        if (touchEndX - touchStartX > 50) {
            if (hasPrev) navigatePage('prev');
        }
    };

    return (
        <div className="w-full h-full overflow-y-auto">
            {/* Custom fonts & ruled notebook formatting */}
            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&family=Outfit:wght@400;600;800&display=swap');
                
                .diary-title { font-family: 'Outfit', sans-serif; }
                .diary-handwriting {
                    font-family: 'Kalam', 'Caveat', cursive;
                    line-height: 1.6rem;
                }
                .diary-lined {
                    background-color: #fdfdfa;
                    background-image: repeating-linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 27px, rgba(59, 130, 246, 0.07) 27px, rgba(59, 130, 246, 0.07) 28px);
                    background-size: 100% 28px;
                    background-position: 0 4px;
                }
                .diary-index-lined {
                    background-color: #fcfbfa;
                    background-image: repeating-linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 36px, rgba(139, 92, 26, 0.05) 36px, rgba(139, 92, 26, 0.05) 37px);
                    background-size: 100% 36px;
                }
            `}} />

            {/* =======================================
                DESKTOP DOUBLE-PAGE VIEW (>= lg)
                ======================================= */}
            <div className="hidden lg:flex lg:flex-col lg:space-y-6 w-full max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-500 relative">
                
                {/* Glowing background accent blur */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                            <BookOpen className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white diary-title tracking-tight">Student School Diary</h1>
                            <p className="text-xs text-neutral-400 font-medium">Class {studentProfile?.className || "7"} • Section {studentProfile?.sectionName || "B"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-[#112240]/60 border border-white/10 px-4 py-2 rounded-xl shadow-lg">
                        <CalendarIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black text-white/90">
                            {new Date(selectedDate || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[40vh] w-full flex flex-col items-center justify-center gap-4 text-amber-400">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-[#8892B0] font-mono animate-pulse">
                            Unlocking Homework Cache...
                        </p>
                    </div>
                ) : (
                    /* 3D Realistic Double Page Book Container */
                    <div className="relative bg-[#3a201c] rounded-[32px] p-5 shadow-2xl border-4 border-[#281513] overflow-hidden flex min-h-[580px] w-full">
                        
                        {/* 3D Shadows & Leather Texture overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-white/5 pointer-events-none z-10" />

                        {/* LEFT DIARY PAGE (Index of Dates) */}
                        <div className="w-[30%] bg-[#faf8f5] rounded-l-2xl border-r border-[#dcd9d2] shadow-inner p-5 flex flex-col justify-between relative pl-8 select-none">
                            
                            {/* Ruled red margins */}
                            <div className="absolute top-0 bottom-0 left-6 border-r border-red-400/25 pointer-events-none" />
                            <div className="absolute top-0 bottom-0 left-[27px] border-r border-red-400/25 pointer-events-none" />

                            <div className="space-y-4 relative z-10">
                                <div className="border-b border-[#ebd2be] pb-2 text-center select-none">
                                    <h3 className="font-extrabold text-[11px] text-amber-900 tracking-widest uppercase font-mono">Diary Dates Index</h3>
                                    <p className="text-[9px] text-amber-800/60 font-bold uppercase mt-0.5">Select date to view sheet</p>
                                </div>

                                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                                    {uniqueDates.length === 0 ? (
                                        <div className="text-center py-10 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                                            No Entries
                                        </div>
                                    ) : (
                                        uniqueDates.map(d => {
                                            const isActive = d === selectedDate;
                                            return (
                                                <button
                                                    key={d}
                                                    onClick={() => {
                                                        const currentIndex = uniqueDates.indexOf(selectedDate);
                                                        const targetIndex = uniqueDates.indexOf(d);
                                                        setAnimationDirection(targetIndex < currentIndex ? 'next' : 'prev');
                                                        setSelectedDate(d);
                                                    }}
                                                    className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between transition-all ${
                                                        isActive 
                                                            ? 'bg-amber-900/10 border-amber-800/30 text-amber-950 font-black shadow-sm'
                                                            : 'bg-white/40 border-neutral-300/40 hover:bg-white text-neutral-600 font-bold hover:text-neutral-900'
                                                    }`}
                                                >
                                                    <span className="text-[10px] tracking-wide font-mono">{formatDiaryDate(d)}</span>
                                                    <BookOpenCheck className={`w-3.5 h-3.5 ${isActive ? 'text-amber-800' : 'text-neutral-300'}`} />
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="text-[9px] font-black uppercase tracking-wider text-amber-800/40 font-mono select-none">
                                📖 Spoorthy Diary Index
                            </div>
                        </div>

                        {/* CENTER BINDER SPIRAL COLUMN */}
                        <div className="w-[4%] bg-gradient-to-r from-[#d8d3c9] via-[#e2ded6] to-[#d8d3c9] shadow-[inset_0_0_12px_rgba(0,0,0,0.15)] flex flex-col justify-around py-6 relative z-20 pointer-events-none">
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} className="h-3 w-8 bg-gradient-to-b from-[#cfd8dc] via-[#eceff1] to-[#90a4ae] rounded-full shadow-lg border border-neutral-700/40 transform -rotate-6 -translate-x-2" />
                            ))}
                        </div>

                        {/* RIGHT DIARY PAGE (Ruled Handwriting Sheet) */}
                        <div className="w-[66%] bg-[#faf8f5] rounded-r-2xl shadow-inner p-6 flex flex-col justify-between relative pr-8">
                            
                            {/* Ruled margins */}
                            <div className="absolute top-0 bottom-0 left-8 border-r border-red-400/25 pointer-events-none" />
                            <div className="absolute top-0 bottom-0 left-[35px] border-r border-red-400/25 pointer-events-none" />

                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={selectedDate}
                                    initial={{ 
                                        opacity: 0, 
                                        scale: 0.99,
                                        x: animationDirection === 'next' ? 20 : -20
                                    }}
                                    animate={{ 
                                        opacity: 1, 
                                        scale: 1,
                                        x: 0
                                    }}
                                    exit={{ 
                                        opacity: 0, 
                                        scale: 0.99,
                                        x: animationDirection === 'next' ? -20 : 20
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="flex-1 flex flex-col justify-between space-y-4 relative z-10 w-full"
                                >
                                    {/* Date Stamp Details */}
                                    <div className="flex justify-between items-center pb-2.5 border-b border-neutral-300/50 pl-8 select-none">
                                        <div className="flex items-center border-2 border-neutral-800 rounded-xl overflow-hidden bg-white shadow-md">
                                            <div className="bg-neutral-800 text-white font-extrabold text-[9px] uppercase tracking-widest px-3 py-1 flex items-center justify-center border-r border-neutral-800">
                                                Diary Sheet
                                            </div>
                                            <div className="px-3.5 py-1 text-neutral-800 font-black text-xs tracking-widest font-mono">
                                                {formatDiaryDate(selectedDate)}
                                            </div>
                                        </div>

                                        <span className="text-[9px] text-neutral-400 font-black uppercase font-mono bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200 shadow-sm">
                                            Page {uniqueDates.indexOf(selectedDate) + 1} of {Math.max(1, uniqueDates.length)}
                                        </span>
                                    </div>

                                    {/* Ruled Subject Diary Board */}
                                    <div className="border border-neutral-400/80 rounded-xl overflow-hidden bg-white flex-1 flex flex-col shadow-sm">
                                        <div className="grid grid-cols-12 bg-neutral-50 border-b border-neutral-400/80 text-[9px] font-black uppercase tracking-wider text-neutral-500 text-center py-2.5 select-none">
                                            <div className="border-r border-neutral-400/80 col-span-3">Subject</div>
                                            <div className="col-span-9">Homework Assignments & Faculty Remarks</div>
                                        </div>

                                        <div className="divide-y divide-neutral-400/80 flex-1 flex flex-col justify-between">
                                            {displaySubjects.length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center py-24 text-neutral-400 font-bold uppercase tracking-widest text-xs pl-8">
                                                    <AlertCircle className="w-6 h-6 mb-2 text-neutral-300" />
                                                    No homework entries recorded
                                                </div>
                                            ) : (
                                                displaySubjects.map(sid => {
                                                    const hw = activeHW[sid];
                                                    const subjectName = subjects[sid]?.name || sid;
                                                    const mappedSubject = formatSubjectName(subjectName);

                                                    return (
                                                        <div key={sid} className="grid grid-cols-12 items-stretch flex-1 min-h-[75px]">
                                                            {/* Subject Name stamp */}
                                                            <div className="col-span-3 bg-[#faf9f6] border-r border-neutral-400/80 px-2.5 flex items-center justify-center text-center font-black text-xs uppercase tracking-wider text-neutral-700 select-none">
                                                                {mappedSubject}
                                                            </div>

                                                            {/* Ruled assignment sheet */}
                                                            <div className="col-span-9 diary-lined py-1 px-4 pr-3 relative flex flex-col justify-center">
                                                                {hw ? (
                                                                    <div className="space-y-1">
                                                                        <div className="diary-handwriting text-[#123642] font-bold text-sm tracking-normal break-words whitespace-pre-line leading-relaxed pr-2">
                                                                            {hw.title}
                                                                        </div>
                                                                        {hw.dueDate && (
                                                                            <div className="text-[9px] font-black font-mono text-red-500 flex items-center uppercase tracking-wider select-none mt-1">
                                                                                <Clock className="w-3.5 h-3.5 mr-1" /> Due Date: {hw.dueDate}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="diary-handwriting text-neutral-300/50 italic font-bold tracking-widest text-sm pl-1 select-none">
                                                                        -- Complete --
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Verified Footnote */}
                            <div className="mt-3.5 pt-2 border-t border-neutral-300/50 flex justify-between items-center text-[9px] font-black tracking-widest text-neutral-400 uppercase font-mono pl-8 select-none">
                                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-200/50 rounded-lg px-2.5 py-0.5">
                                    <Check className="w-3.5 h-3.5" /> 
                                    <span>Faculty Checked</span>
                                </div>
                                <span>Spoorthy Concept School v2.5</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* =======================================
                MOBILE VIEW (< lg Breakpoint)
                ======================================= */}
            <div className="max-w-md mx-auto flex lg:hidden flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-500 pb-2 relative overflow-hidden select-none bg-gradient-to-b from-[#0a192f] via-[#0f224a] to-[#0a192f] px-2.5">
                
                {/* Glowing background accent blur */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Title Block */}
                <div className="flex items-center justify-between px-1 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-extrabold text-white diary-title leading-tight">Student School Diary</h1>
                            <p className="text-[10px] text-neutral-400 font-medium">Class {studentProfile?.className || "7 (B)"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl shadow-inner">
                        <CalendarIcon className="w-3 h-3 text-amber-400" />
                        <span className="text-[9px] font-bold text-white/90">
                            {new Date(selectedDate || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">Unlocking Diary...</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-between space-y-3.5">
                        
                        {/* Glowing Control Toggles */}
                        <div className="flex items-center justify-between px-1 gap-4 select-none shrink-0">
                            <button
                                onClick={() => navigatePage('prev')}
                                disabled={!hasPrev}
                                className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                    hasPrev
                                        ? 'bg-white/5 border-white/10 hover:border-amber-400/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] active:scale-95'
                                        : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
                                }`}
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-amber-400" /> Previous
                            </button>
                            
                            <div className="text-[9px] text-neutral-400 font-black uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Swipe
                            </div>

                            <button
                                onClick={() => navigatePage('next')}
                                disabled={!hasNext}
                                className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                    hasNext
                                        ? 'bg-white/5 border-white/10 hover:border-amber-400/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] active:scale-95'
                                        : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
                                }`}
                            >
                                Next <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                        </div>

                        {/* Realistic 3D Bound Leather & Ruled Diary */}
                        <div 
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            className="relative bg-[#3e2723] rounded-[24px] p-2.5 shadow-2xl border-2 border-[#2d1b18] overflow-hidden flex-1 flex flex-col justify-between min-h-[360px]"
                        >
                            {/* Leather grain textures */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/5 pointer-events-none z-10" />

                            {/* Mobile spiral binder rings */}
                            <div className="absolute top-0 bottom-0 left-0 w-3 z-30 flex flex-col justify-around py-5 pointer-events-none">
                                {Array.from({ length: 11 }).map((_, i) => (
                                    <div key={i} className="h-2.5 w-6 bg-gradient-to-b from-[#b0bec5] via-[#cfd8dc] to-[#78909c] rounded-full shadow-md border border-neutral-600/30 transform -rotate-12 -translate-x-1.5" />
                                ))}
                            </div>

                            {/* Inner Cream Paper Sheet */}
                            <div className="relative flex-1 bg-[#fdfcf9] rounded-xl overflow-hidden shadow-inner border border-[#d7ccc8]/40 flex flex-col justify-between p-3.5 pl-6">
                                
                                {/* Lined ruled paper margin rules */}
                                <div className="absolute top-0 bottom-0 left-12 border-r border-red-400/25 pointer-events-none" />
                                <div className="absolute top-0 bottom-0 left-[51px] border-r border-red-400/25 pointer-events-none" />

                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={selectedDate}
                                        initial={{ 
                                            opacity: 0, 
                                            scale: 0.98,
                                            rotateY: animationDirection === 'next' ? 12 : -12,
                                            x: animationDirection === 'next' ? 40 : -40
                                        }}
                                        animate={{ 
                                            opacity: 1, 
                                            scale: 1,
                                            rotateY: 0,
                                            x: 0
                                        }}
                                        exit={{ 
                                            opacity: 0, 
                                            scale: 0.98,
                                            rotateY: animationDirection === 'next' ? -12 : 12,
                                            x: animationDirection === 'next' ? -40 : 40
                                        }}
                                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                                        className="flex-1 flex flex-col justify-between space-y-3 relative z-10 w-full"
                                    >
                                        {/* Date Stamp Header */}
                                        <div className="flex justify-between items-center pb-2 border-b border-neutral-300/40 gap-3 pl-8">
                                            <div className="flex items-center border border-neutral-700/80 rounded-lg overflow-hidden bg-white shadow-inner">
                                                <div className="bg-neutral-800 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-1 flex items-center justify-center border-r border-neutral-700">
                                                    Date
                                                </div>
                                                <div className="px-2.5 py-1 text-neutral-800 font-extrabold text-[10px] tracking-wider font-mono">
                                                    {formatDiaryDate(selectedDate)}
                                                </div>
                                            </div>
                                            <span className="text-[8px] text-neutral-400 font-black uppercase font-mono bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                                                Pg {uniqueDates.indexOf(selectedDate) + 1} / {Math.max(1, uniqueDates.length)}
                                            </span>
                                        </div>

                                        {/* Notebook Homework Table */}
                                        <div className="border border-neutral-400/80 rounded-lg overflow-hidden bg-white flex-1 flex flex-col">
                                            <div className="grid grid-cols-4 bg-neutral-50 border-b border-neutral-400/80 text-[8px] font-black uppercase tracking-wider text-neutral-500 text-center py-1.5 select-none">
                                                <div className="border-r border-neutral-400/80 col-span-1">Subject</div>
                                                <div className="col-span-3">Homework Assignments</div>
                                            </div>

                                            <div className="divide-y divide-neutral-400/80 flex-1 flex flex-col">
                                                {displaySubjectsMobile.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-neutral-400 font-bold uppercase tracking-widest text-[9px] pl-8">
                                                        <AlertCircle className="w-5 h-5 mb-1.5 text-neutral-300" />
                                                        No subjects defined
                                                    </div>
                                                ) : (
                                                    displaySubjectsMobile.map(sid => {
                                                        const hw = activeHW[sid];
                                                        const subjectName = subjects[sid]?.name || sid;
                                                        const mappedSubject = formatSubjectName(subjectName);

                                                        return (
                                                            <div key={sid} className="grid grid-cols-4 items-stretch flex-1 min-h-[58px]">
                                                                <div className="col-span-1 bg-[#fbfbf9] border-r border-neutral-400/80 px-1.5 flex items-center justify-center text-center font-black text-[9px] uppercase tracking-tighter text-neutral-700">
                                                                    {mappedSubject}
                                                                </div>

                                                                <div className="col-span-3 diary-lined py-0.5 px-3 pr-2 relative flex flex-col justify-center">
                                                                    {hw ? (
                                                                        <div className="space-y-0.5">
                                                                            <div className="diary-handwriting text-[#1b3a4b] font-bold tracking-normal text-xs break-words line-clamp-2 leading-relaxed">
                                                                                {hw.title}
                                                                            </div>
                                                                            {hw.dueDate && (
                                                                                <div className="text-[7.5px] font-bold font-mono text-red-500 flex items-center uppercase tracking-tighter mt-0.5">
                                                                                    <Clock className="w-2 h-2 mr-0.5" /> Due: {hw.dueDate}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="diary-handwriting text-neutral-300/60 italic font-bold tracking-wider text-xs pl-1">
                                                                            --- Clean ---
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Stamp block */}
                                <div className="mt-2.5 pt-1.5 border-t border-neutral-300/40 flex justify-between items-center text-[8px] font-black tracking-widest text-neutral-400 uppercase font-mono pl-8 select-none">
                                    <div className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 border border-emerald-200/50 rounded px-1.5 py-0.2">
                                        <Check className="w-2.5 h-2.5" /> 
                                        <span>Verified</span>
                                    </div>
                                    <span>Spoorthy v2.5</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Tips Card */}
                        <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex items-start gap-2.5 shadow-inner">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <Info className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest leading-none">Diary Tips</h4>
                                <p className="text-[8px] text-neutral-400 mt-0.5 font-medium leading-normal">
                                    Use Previous or Next to check homework and assignments from other days.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
