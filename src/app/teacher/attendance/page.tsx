"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ChevronDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import AttendanceManager from "@/components/attendance/attendance-manager";

/**
 * MarkAttendancePage — Ultra-compact daily attendance interface.
 * Header is compressed to ~80px. Class + date selector in a single row.
 * The AttendanceManager fills all remaining vertical space.
 */
export default function MarkAttendancePage() {
    const { user, userData } = useAuth();
    const { classes, sections, classSections, subjectTeachers } = useMasterData();
    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedClassKey, setSelectedClassKey] = useState("");
    const [classDropdownOpen, setClassDropdownOpen] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const todayLabel = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    useEffect(() => {
        if (user && userData?.schoolId) fetchTeacher();
    }, [user, userData]);

    const fetchTeacher = async () => {
        if (!user || !userData?.schoolId) return;
        setLoading(true);
        try {
            let q = query(collection(db, "teachers"), where("schoolId", "==", userData.schoolId), limit(1));
            let snap = await getDocs(q);
            if (snap.empty && user?.uid) {
                q = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
                snap = await getDocs(q);
            }
            if (!snap.empty) {
                const tData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setTeacher(tData);
                const authorized = getAuthorizedClasses(tData);
                if (authorized.length > 0) setSelectedClassKey(authorized[0].key);
            }
        } catch (e: any) {
            console.warn("[Attendance] Teacher fetch error:", e.message);
        } finally {
            setLoading(false);
        }
    };

    const getAuthorizedClasses = (tProfile: any) => {
        if (!tProfile || !classSections) return [];
        const tId = tProfile.schoolId;
        const tDocId = tProfile.id;
        const set = new Map<string, { classId: string, sectionId: string, key: string, isClassTeacher: boolean }>();

        Object.values(classSections).forEach((cs: any) => {
            if (!cs) return;
            const isMatch = (tId && cs.classTeacherId === tId) || (tDocId && cs.classTeacherId === tDocId);
            if (isMatch && cs.isActive !== false)
                set.set(cs.id, { classId: cs.classId || "", sectionId: cs.sectionId || "", key: cs.id, isClassTeacher: true });
        });

        if (subjectTeachers) {
            Object.keys(subjectTeachers).forEach(key => {
                const subjectsObj = subjectTeachers[key];
                if (!subjectsObj || typeof subjectsObj !== 'object') return;
                const teacherIds = Object.values(subjectsObj);
                const isMatch = (tId && teacherIds.includes(tId)) || (tDocId && teacherIds.includes(tDocId));
                if (isMatch) {
                    const cs = classSections?.[key];
                    const cId = cs?.classId || key.split('_')[0];
                    const sId = cs?.sectionId || key.split('_')[1];
                    if (!set.has(key)) set.set(key, { classId: cId, sectionId: sId, key, isClassTeacher: false });
                }
            });
        }
        return Array.from(set.values());
    };

    const { loading: masterLoading } = useMasterData();


    const authorizedClasses = getAuthorizedClasses(teacher);

    if (!loading && !masterLoading && authorizedClasses.length === 0) {
        return (
            <div className="p-6 text-center max-w-sm mx-auto mt-16 space-y-4">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-base font-black text-white uppercase tracking-wider">No Classes Assigned</h2>
                <p className="text-xs text-white/40 leading-relaxed">
                    You are not currently assigned as a Class Teacher or Subject Teacher for any active classes. Contact your Admin.
                </p>
            </div>
        );
    }

    const currentSelection = authorizedClasses.find(c => c.key === selectedClassKey) || authorizedClasses[0] || {};
    const currentClassName = currentSelection?.classId
        ? `${classes?.[currentSelection.classId]?.name || currentSelection.classId} - ${sections?.[currentSelection.sectionId]?.name || currentSelection.sectionId}`
        : "Select Class";
    const isClassTeacher = authorizedClasses.find(c => c.key === selectedClassKey)?.isClassTeacher;

    return (
        <>
            <style>{`
                @media (max-width: 1023px) {
                    main > div.overflow-y-auto {
                        padding-bottom: calc(3.5rem + env(safe-area-inset-bottom)) !important;
                    }
                }
            `}</style>
            <div className="flex flex-col h-full w-full text-[#E6F1FF] bg-transparent">
                {/* ─── ULTRA-COMPACT HEADER ─── */}
            <div className="px-2 pt-2 pb-1.5 border-b border-white/5 flex-none space-y-1.5">

                {/* Row 1: Title + Date */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#10B981]/15 border border-[#10B981]/25 flex items-center justify-center shrink-0">
                            <BookOpen className="w-3 h-3 text-[#10B981]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white tracking-tight leading-none uppercase">Daily Attendance</h1>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                                <span className="text-[8.5px] text-white/35 font-bold uppercase tracking-widest">
                                    {authorizedClasses.length} class{authorizedClasses.length > 1 ? 'es' : ''} authorized
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Date chip */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1">
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-wider">{todayLabel}</span>
                    </div>
                </div>

                {/* Row 2: Class Selector */}
                <div className="relative">
                    <button
                        id="class-selector-btn"
                        onClick={() => setClassDropdownOpen(v => !v)}
                        className="w-full h-9 flex items-center justify-between gap-2 px-3 bg-[#0b172c] border border-white/8 rounded-xl text-left transition-all hover:border-[#10B981]/40 focus:outline-none focus:border-[#10B981]/50"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-[#10B981]/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-2.5 h-2.5 text-[#10B981]" />
                            </div>
                            <span className="text-xs font-black text-white truncate">{currentClassName}</span>
                            {isClassTeacher && (
                                <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[7px] px-1 py-0 rounded font-black shrink-0">In-charge</Badge>
                            )}
                        </div>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-white/40 shrink-0 transition-transform", classDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown */}
                    {classDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setClassDropdownOpen(false)} />
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#080F1E] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/60">
                                {authorizedClasses.map(c => {
                                    const label = `${classes?.[c.classId]?.name || c.classId} - ${sections?.[c.sectionId]?.name || c.sectionId}`;
                                    const active = c.key === selectedClassKey;
                                    return (
                                        <button
                                            key={c.key}
                                            onClick={() => { setSelectedClassKey(c.key); setClassDropdownOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-all text-xs font-bold",
                                                active ? "bg-[#10B981]/10 text-[#10B981]" : "text-white/70 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <span className="truncate">{label}</span>
                                            {c.isClassTeacher && (
                                                <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[7px] px-1 py-0 rounded font-black shrink-0">In-charge</Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ─── ATTENDANCE MANAGER (fills remaining space) ─── */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <AttendanceManager
                    classId={currentSelection?.classId || ""}
                    sectionId={currentSelection?.sectionId || ""}
                    defaultDate={today}
                />
            </div>
        </div>
        </>
    );
}
