"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, RefreshCw, Laptop, Tablet, Smartphone, ExternalLink, HelpCircle, LayoutGrid, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DesignSystemShowcase() {
    const [activeTab, setActiveTab] = useState<"dashboard" | "students" | "timetable">("dashboard");
    const [scaleFactor, setScaleFactor] = useState<number>(0.65);
    const [refreshKey, setRefreshKey] = useState<number>(0);

    const getIframeUrl = () => {
        const base = typeof window !== "undefined" ? window.location.origin : "";
        switch (activeTab) {
            case "students":
                return `${base}/teacher/students`;
            case "timetable":
                return `${base}/teacher/timetable`;
            default:
                return `${base}/teacher`;
        }
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-[#0A111E] text-white p-4 md:p-8 font-sans pb-20">
            
            {/* Control Header */}
            <div className="max-w-[1700px] mx-auto bg-[#0F1C30]/80 border border-white/10 rounded-3xl p-4 md:p-6 mb-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 pl-4 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981] rounded-full" />
                    <div className="flex items-center gap-2">
                        <Link href="/teacher" className="text-xs uppercase font-black text-[#10B981] hover:underline flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                        </Link>
                    </div>
                    <h1 className="text-xl md:text-2xl font-display font-black tracking-tight flex items-center gap-2">
                        Responsive Showroom
                    </h1>
                    <p className="text-xs text-white/50">Live real-time viewport simulation for mobile size grids, tablets, and full desktop wrappers.</p>
                </div>

                {/* Tab selectors for target pages */}
                <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 gap-1 w-full md:w-auto overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeTab === "dashboard" ? "bg-[#10B981] text-black shadow-md shadow-[#10B981]/25" : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab("students")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeTab === "students" ? "bg-[#10B981] text-black shadow-md shadow-[#10B981]/25" : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" /> Students
                    </button>
                    <button
                        onClick={() => setActiveTab("timetable")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeTab === "timetable" ? "bg-[#10B981] text-black shadow-md shadow-[#10B981]/25" : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" /> Schedule
                    </button>
                </div>

                {/* Zoom Controls & Refresh */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs">
                        <span className="text-white/40 font-bold">Scale:</span>
                        <input
                            type="range"
                            min="0.4"
                            max="1.0"
                            step="0.05"
                            value={scaleFactor}
                            onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                            className="w-20 accent-[#10B981]"
                        />
                        <span className="font-mono text-white/80 font-bold">{Math.round(scaleFactor * 100)}%</span>
                    </div>

                    <Button onClick={handleRefresh} variant="outline" className="h-10 border-white/10 hover:bg-white/10 gap-2 rounded-xl text-xs font-bold px-4">
                        <RefreshCw className="w-3.5 h-3.5 text-[#10B981]" /> Refresh Frames
                    </Button>
                </div>
            </div>

            {/* Simulated Viewport Showcase Area */}
            <div className="max-w-[1700px] mx-auto overflow-x-auto pb-10">
                <div className="flex flex-col xl:flex-row gap-8 items-start justify-center min-w-[1200px] py-4">
                    
                    {/* 1. DESKTOP VIEWPORT MOCKUP */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/50">
                            <Laptop className="w-4 h-4 text-blue-400" /> Desktop Viewport (1440px)
                            <Badge className="bg-blue-400/10 text-blue-400 border border-blue-400/20 text-[9px] uppercase font-bold py-0.5">1440 × 900</Badge>
                        </div>
                        
                        <div 
                            className="bg-[#0B1524] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
                            style={{ 
                                width: `${1440 * scaleFactor}px`, 
                                height: `${850 * scaleFactor}px`,
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                        >
                            {/* Browser bar top */}
                            <div className="h-8 bg-[#111C2E] border-b border-white/10 px-4 flex items-center justify-between relative shrink-0">
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 bg-black/40 rounded-lg px-6 py-0.5 text-[9px] font-mono text-white/40 border border-white/5 max-w-[200px] truncate">
                                    {getIframeUrl()}
                                </div>
                                <div className="w-4 h-4" />
                            </div>

                            <iframe
                                key={`desktop-${refreshKey}`}
                                src={getIframeUrl()}
                                className="w-[1440px] h-[818px] border-none origin-top-left"
                                style={{
                                    transform: `scale(${scaleFactor})`,
                                    width: "1440px",
                                    height: `${818 / scaleFactor}px`,
                                }}
                            />
                        </div>
                    </div>

                    {/* 2. TABLET VIEWPORT MOCKUP */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/50">
                            <Tablet className="w-4 h-4 text-purple-400" /> Collapsed Tablet (800px)
                            <Badge className="bg-purple-400/10 text-purple-400 border border-purple-400/20 text-[9px] uppercase font-bold py-0.5">800 × 1024</Badge>
                        </div>

                        <div 
                            className="bg-[#0B1524] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
                            style={{ 
                                width: `${800 * scaleFactor}px`, 
                                height: `${850 * scaleFactor}px`,
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                        >
                            {/* Browser bar top */}
                            <div className="h-8 bg-[#111C2E] border-b border-white/10 px-4 flex items-center justify-between relative shrink-0">
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 bg-black/40 rounded-lg px-6 py-0.5 text-[9px] font-mono text-white/40 border border-white/5 max-w-[150px] truncate">
                                    /tablet-mode
                                </div>
                                <div className="w-4 h-4" />
                            </div>

                            <iframe
                                key={`tablet-${refreshKey}`}
                                src={getIframeUrl()}
                                className="w-[800px] h-[818px] border-none origin-top-left"
                                style={{
                                    transform: `scale(${scaleFactor})`,
                                    width: "800px",
                                    height: `${818 / scaleFactor}px`,
                                }}
                            />
                        </div>
                    </div>

                    {/* 3. MOBILE VIEWPORT MOCKUP */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/50">
                            <Smartphone className="w-4 h-4 text-emerald-400" /> Phone Viewport (375px)
                            <Badge className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-[9px] uppercase font-bold py-0.5">375 × 760</Badge>
                        </div>

                        <div 
                            className="bg-[#0B1524] border-4 border-slate-850 rounded-[2.5rem] overflow-hidden shadow-2xl relative outline outline-1 outline-white/15"
                            style={{ 
                                width: `${375 * scaleFactor * 1.3}px`, 
                                height: `${850 * scaleFactor}px`,
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                        >
                            {/* Simulated iOS Dynamic Island notch */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-50 flex items-center justify-center border border-white/5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute right-4" />
                            </div>

                            <iframe
                                key={`mobile-${refreshKey}`}
                                src={getIframeUrl()}
                                className="border-none origin-top-left"
                                style={{
                                    transform: `scale(${scaleFactor * 1.3})`,
                                    width: "375px",
                                    height: `${850 / (scaleFactor * 1.3)}px`,
                                }}
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Design Specifications & Guidance */}
            <div className="max-w-[1700px] mx-auto bg-[#0F1C30]/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl mt-4">
                <h3 className="text-sm font-black uppercase text-[#10B981] tracking-wider mb-4">Responsive Blueprint Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <h4 className="text-xs font-black uppercase text-blue-400 mb-2">Desktop Viewport (1440px+)</h4>
                        <ul className="text-xs text-white/60 space-y-2 list-disc pl-4 font-semibold">
                            <li>12-column expansive layout grid</li>
                            <li>Fixed spacious sidebar navigation</li>
                            <li>High density, scroll-minimized dashboards</li>
                            <li>Hover transitions & responsive spacing</li>
                        </ul>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <h4 className="text-xs font-black uppercase text-purple-400 mb-2">Tablet Viewport (768px - 1023px)</h4>
                        <ul className="text-xs text-white/60 space-y-2 list-disc pl-4 font-semibold">
                            <li>8-column optimized content flow</li>
                            <li>Sidebar collapses automatically to a narrow icon rail</li>
                            <li>Compact margins and padded containers</li>
                            <li>Responsive grid wraps side widgets neatly</li>
                        </ul>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <h4 className="text-xs font-black uppercase text-emerald-400 mb-2">Mobile Viewport (320px - 767px)</h4>
                        <ul className="text-xs text-white/60 space-y-2 list-disc pl-4 font-semibold">
                            <li>4-column high-density layout</li>
                            <li>No sidebars: collapses into beautiful bottom navigators</li>
                            <li>Click-to-call action callbacks for parents</li>
                            <li>High-contrast roll number indicators (#01 badge)</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    );
}
