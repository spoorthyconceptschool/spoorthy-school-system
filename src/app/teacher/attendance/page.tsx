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
    const { classes, sections, classSections, subjectTeachers } = useMasterData();
    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedClassKey, setSelectedClassKey] = useState("");

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (user && userData?.schoolId) {
            fetchTeacher();
        }
    }, [user, userData]);

    const fetchTeacher = async () => {
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

                // Initial Selection
                const authorized = getAuthorizedClasses(tData);
                if (authorized.length > 0) {
                    setSelectedClassKey(authorized[0].key);
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

        // 2. Classes where I am Subject Teacher (Dynamic from RTDB)
        if (subjectTeachers) {
            Object.keys(subjectTeachers).forEach(key => {
                const subjectsObj = subjectTeachers[key];
                const teacherIds = Object.values(subjectsObj);
                const isMatch = (tId && teacherIds.includes(tId)) || (tDocId && teacherIds.includes(tDocId));

                if (isMatch) {
                    // BUG FIX: Don't split by underscore as IDs often contain them (e.g. CLS_01)
                    const cs = classSections[key];
                    const cId = cs?.classId || key.split('_')[0];
                    const sId = cs?.sectionId || key.split('_')[1];

                    if (!set.has(key)) {
                        set.set(key, { classId: cId, sectionId: sId, key, isClassTeacher: false });
                    }
                }
            });
        }

        return Array.from(set.values());
    };

    const { loading: masterLoading } = useMasterData();
    if (loading || masterLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;

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
        <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic leading-tight">
                        Daily Attendance
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] md:text-xs text-muted-foreground font-black uppercase tracking-widest opacity-60">
                            Authorized for {authorizedClasses.length} class{authorizedClasses.length > 1 ? 'es' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Select Active Class</label>
                        <Select value={selectedClassKey} onValueChange={setSelectedClassKey}>
                            <SelectTrigger className="w-full md:w-[220px] h-12 bg-white/5 border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {authorizedClasses.map(c => (
                                    <SelectItem key={c.key} value={c.key} className="focus:bg-accent focus:text-black font-bold py-3">
                                        <div className="flex items-center justify-between w-full gap-4">
                                            <span>{classes[c.classId]?.name || c.classId} - {sections[c.sectionId]?.name || c.sectionId}</span>
                                            {c.isClassTeacher && <Badge className="text-[8px] bg-amber-500 text-black">In-charge</Badge>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="px-5 h-12 flex items-center bg-black/40 border border-white/10 rounded-xl backdrop-blur-md">
                        <span className="text-xs font-black uppercase tracking-widest text-white/40">
                            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-black/20 border border-white/10 rounded-3xl p-2 md:p-6 backdrop-blur-xl shadow-2xl">
                <AttendanceManager
                    classId={currentSelection.classId}
                    sectionId={currentSelection.sectionId}
                    defaultDate={today}
                />
            </div>
        </div>
    );
}
