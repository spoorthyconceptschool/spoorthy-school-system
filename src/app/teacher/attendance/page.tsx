"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import AttendanceManager from "@/components/attendance/attendance-manager";

/**
 * MarkAttendancePage Component
 * 
 * Provides a dedicated interface for teachers to record student attendance.
 * Dynamically resolves accessible classes by combining explicit "Class Teacher"
 * roles from RTDB and "Subject Teacher" assignments from the master registry.
 * 
 * @returns {JSX.Element} The rendered attendance management view.
 */
export default function MarkAttendancePage() {
    const { user, userData } = useAuth();
    const { classes, sections, classSections, subjectTeachers, branding } = useMasterData();
    const [teacher, setTeacher] = useState<any>((() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("teacher_profile_cache") || "null") : null));
    const [loading, setLoading] = useState(() => typeof window !== 'undefined' ? !localStorage.getItem("teacher_profile_cache") : true);
    const [selectedClassKey, setSelectedClassKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem("teacher_attendance_class_key") || "" : "");

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (selectedClassKey && typeof window !== 'undefined') {
            localStorage.setItem("teacher_attendance_class_key", selectedClassKey);
        }
    }, [selectedClassKey]);

    useEffect(() => {
        if (user && userData?.schoolId) {
            fetchTeacher();
        }
    }, [user, userData]);

    const fetchTeacher = async () => {
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
                if (typeof window !== 'undefined') localStorage.setItem("teacher_profile_cache", JSON.stringify(tData));

                // Initial Selection
                const authorized = getAuthorizedClasses(tData);
                if (authorized.length > 0) {
                    setSelectedClassKey(prev => {
                        const exists = authorized.some(c => c.key === prev);
                        const next = exists && prev ? prev : authorized[0].key;
                        if (typeof window !== 'undefined') localStorage.setItem("teacher_attendance_class_key", next);
                        return next;
                    });
                }
            }
        } catch (e: any) {
            console.warn("[Attendance] Teacher fetch error:", e.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Resolves the set of classes for which the current teacher is authorized
     * to perform attendance operations.
     * 
     * @param {any} tProfile - The base Firestore profile of the teacher.
     * @returns {Array<{classId: string, sectionId: string, key: string, isClassTeacher: boolean}>} 
     *          List of authorized class objects.
     */
    const getAuthorizedClasses = (tProfile: any) => {
        if (!tProfile || !classSections) return [];
        const tId = tProfile.schoolId;
        const tDocId = tProfile.id;
        const set = new Map<string, { classId: string, sectionId: string, key: string, isClassTeacher: boolean }>();

        // 1. Classes where I am Class Teacher (Dynamic from RTDB)
        Object.values(classSections).forEach((cs: any) => {
            const isMatch = (tId && cs.classTeacherId === tId) || (tDocId && cs.classTeacherId === tDocId);
            if (isMatch && cs.isActive !== false) {
                set.set(cs.id, { classId: cs.classId, sectionId: cs.sectionId, key: cs.id, isClassTeacher: true });
            }
        });

        return Array.from(set.values());
    };

    if (loading && !teacher) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;

    const authorizedClasses = getAuthorizedClasses(teacher);

    if (authorizedClasses.length === 0) {
        return (
            <div className="p-10 text-center space-y-4 max-w-md mx-auto mt-20 bg-black/20 border border-white/10 rounded-3xl backdrop-blur-xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-lg shadow-red-500/20">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">No Classes Assigned</h2>
                <p className="text-muted-foreground text-sm">You are not currently assigned as a Class Teacher or Subject Teacher for any active classes.</p>
                <p className="text-[10px] text-muted-foreground/30 uppercase tracking-widest pt-4 font-black">Contact Admin for Access</p>
            </div>
        );
    }

    const currentSelection = authorizedClasses.find(c => c.key === selectedClassKey) || authorizedClasses[0];

    return (
        <div className="min-h-screen text-[#E6F1FF] bg-[#070F1E] pb-24">
            <div className="md:hidden flex h-16 items-center justify-between px-4 bg-[#0A192F]/80 backdrop-blur sticky top-0 z-40 shrink-0 border-b border-[#10B981]/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-amber-500/40 shadow-md shrink-0 overflow-hidden">
                        <img
                            src={branding?.schoolLogo || "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png"}
                            alt="Logo"
                            className="w-full h-full object-contain filter drop-shadow-sm"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png";
                            }}
                        />
                    </div>
                    <h1 className="text-sm font-bold text-white tracking-tight">Daily Attendance</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">4</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#053d2c] text-[#10B981] flex items-center justify-center font-black text-sm border border-[#10B981]/25">
                        {user?.email?.substring(0, 1).toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-10 lg:p-12 space-y-4 md:space-y-8 max-w-[1600px] mx-auto animate-in fade-in">
                {/* Desktop Header */}
                <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">Daily Attendance</h1>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] md:text-xs text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                Authorized for {authorizedClasses.length} class{authorizedClasses.length > 1 ? 'es' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Selectors Area */}
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                            <SelectTrigger className="w-full h-11 bg-[#0b172c] border-[#1e293b] rounded-xl font-bold hover:bg-white/5 transition-all text-white text-xs shadow-none">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    <SelectValue placeholder="Select Class" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b172c] border-[#1e293b] text-white rounded-2xl">
                                {authorizedClasses.map(c => (
                                    <SelectItem key={c.key} value={c.key} className="focus:bg-white/10 font-bold py-3 text-xs rounded-xl">
                                        {classes[c.classId]?.name || c.classId} - {sections[c.sectionId]?.name || c.sectionId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 h-11 px-3 flex items-center justify-between bg-[#0b172c] border border-[#1e293b] rounded-xl text-white text-xs font-bold">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <svg className="w-4 h-4 text-white/50 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>

                <div className="mt-4">
                    <AttendanceManager
                        classId={currentSelection.classId}
                        sectionId={currentSelection.sectionId}
                        defaultDate={today}
                    />
                </div>
            </div>
        </div>
    );
}
