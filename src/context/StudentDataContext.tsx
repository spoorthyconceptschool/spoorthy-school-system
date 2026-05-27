"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    doc,
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    getDocs,
    getDoc
} from "firebase/firestore";

export interface StudentDataContextType {
    profile: any;
    ledger: any;
    transactions: any[];
    homework: any[];
    notices: any[];
    attendanceMap: Record<string, "P" | "A">;
    attendanceStats: { total: number; present: number; absent: number; percentage: number };
    schedule: any;
    substitutions: any[];
    teacherMap: Record<string, string>;
    leaves: any[];
    exams: any[];
    classSyllabi: any[];
    loading: boolean;
    refetchLeaves: () => Promise<void>;
}

const StudentDataContext = createContext<StudentDataContextType | null>(null);

export function useStudentData() {
    const context = useContext(StudentDataContext);
    if (!context) {
        throw new Error("useStudentData must be used within a StudentDataProvider");
    }
    return context;
}

export function StudentDataProvider({ children }: { children: React.ReactNode }) {
    const { user, userData } = useAuth();
    
    // Core state
    const [profile, setProfile] = useState<any>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_profile_cache") || "null"); } catch (e) { return null; }
        }
        return null;
    });
    
    const [ledger, setLedger] = useState<any>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_ledger_cache") || "null"); } catch (e) { return null; }
        }
        return null;
    });

    const [transactions, setTransactions] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_tx_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });

    const [homework, setHomework] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_hw_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });

    const [notices, setNotices] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_notices_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });
    
    const [attendanceMap, setAttendanceMap] = useState<Record<string, "P" | "A">>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_att_map_cache") || "{}"); } catch (e) { return {}; }
        }
        return {};
    });

    const [attendanceStats, setAttendanceStats] = useState(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_att_stats_cache") || '{"total":0,"present":0,"absent":0,"percentage":0}'); } catch (e) { return { total: 0, present: 0, absent: 0, percentage: 0 }; }
        }
        return { total: 0, present: 0, absent: 0, percentage: 0 };
    });

    const [schedule, setSchedule] = useState<any>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_schedule_cache") || "null"); } catch (e) { return null; }
        }
        return null;
    });

    const [substitutions, setSubstitutions] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_substitutions_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });

    const [teacherMap, setTeacherMap] = useState<Record<string, string>>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_teacher_map_cache") || "{}"); } catch (e) { return {}; }
        }
        return {};
    });

    const [leaves, setLeaves] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_leaves_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });

    const [exams, setExams] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_exams_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });

    const [classSyllabi, setClassSyllabi] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            try { return JSON.parse(localStorage.getItem("student_syllabi_cache") || "[]"); } catch (e) { return []; }
        }
        return [];
    });

    const [loading, setLoading] = useState(true);

    // Dynamic refetch helper for Leaves
    const refetchLeaves = useCallback(async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/student/leaves", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const list = data.data || [];
                setLeaves(list);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_leaves_cache", JSON.stringify(list));
                }
            }
        } catch (e) {
            console.error("[StudentCache] Error refreshing leaves:", e);
        }
    }, [user]);

    // 1. Sync Student Profile (Dual-Path Strategy)
    useEffect(() => {
        if (!user?.email) {
            setLoading(false);
            return;
        }

        const schoolIdFromEmail = user.email.split("@")[0].toUpperCase();
        
        const processProfileData = (pData: any) => {
            setProfile(pData);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_profile_cache", JSON.stringify(pData));
            }
        };

        const unsubProfile = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (pSnap.exists()) {
                processProfileData({ id: pSnap.id, ...pSnap.data() });
            } else if (user.uid) {
                const qProfile = query(
                    collection(db, "students"),
                    where("uid", "==", user.uid)
                );
                const unsubQuery = onSnapshot(qProfile, (qSnap) => {
                    if (!qSnap.empty) {
                        processProfileData({ id: qSnap.docs[0].id, ...qSnap.docs[0].data() });
                    } else {
                        console.warn("[StudentCache] Profile not found in uid fallback either.");
                        setLoading(false);
                    }
                }, (err) => {
                    console.error("[StudentCache] Fallback profile listen error:", err);
                    setLoading(false);
                });
                
                return () => unsubQuery();
            } else {
                console.warn("[StudentCache] Profile not found and no uid fallback.");
                setLoading(false);
            }
        }, (err) => {
            console.error("[StudentCache] Primary profile listen error:", err);
            setLoading(false);
        });

        return () => {
            unsubProfile();
        };
    }, [user]);

    // 2. Sync all other student collections once profile is warm
    useEffect(() => {
        if (!user || !profile) return;

        const sId = profile.schoolId || profile.id;
        const classId = profile.classId;
        const sectionId = profile.sectionId;
        const yearId = profile.academicYear || "2025-2026";

        if (!sId) return;

        // A. Listen to Fee Ledger
        const unsubLedger = onSnapshot(doc(db, "student_fee_ledgers", `${sId}_${yearId}`), (lSnap) => {
            if (lSnap.exists()) {
                const lData = lSnap.data();
                setLedger(lData);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_ledger_cache", JSON.stringify(lData));
                }
            }
        }, (err) => console.warn("[StudentCache] Ledger listen error:", err));

        // B. Listen to Payments/Transactions
        const pxQ = query(
            collection(db, "payments"),
            where("studentId", "==", sId),
            orderBy("createdAt", "desc"),
            limit(30)
        );
        const unsubPayments = onSnapshot(pxQ, (pxSnap) => {
            const list = pxSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTransactions(list);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_tx_cache", JSON.stringify(list));
            }
        }, (err) => {
            // Index fallback
            const pxQFallback = query(collection(db, "payments"), where("studentId", "==", sId));
            onSnapshot(pxQFallback, (pxSnap) => {
                const sorted = pxSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setTransactions(sorted);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_tx_cache", JSON.stringify(sorted));
                }
            });
        });

        // C. Listen to Homework
        const hwQ = query(
            collection(db, "homework"),
            where("classId", "==", classId),
            orderBy("createdAt", "desc"),
            limit(50)
        );
        const unsubHomework = onSnapshot(hwQ, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const filtered = sectionId
                ? list.filter((hw: any) => !hw.sectionId || hw.sectionId === sectionId || hw.sectionId === "ALL" || hw.sectionId === "GENERAL")
                : list;
            setHomework(filtered);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_hw_cache", JSON.stringify(filtered));
            }
        }, (err) => {
            // Index fallback
            const hwQFallback = query(collection(db, "homework"), where("classId", "==", classId));
            onSnapshot(hwQFallback, (snapshot) => {
                const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                let filtered = sectionId
                    ? list.filter((hw: any) => !hw.sectionId || hw.sectionId === sectionId || hw.sectionId === "ALL" || hw.sectionId === "GENERAL")
                    : list;
                filtered = filtered.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setHomework(filtered);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_hw_cache", JSON.stringify(filtered));
                }
            });
        });

        // D. Listen to Notices
        const noticeQ = query(
            collection(db, "notices"),
            where("target", "in", ["ALL", "STUDENTS", classId]),
            orderBy("createdAt", "desc")
        );
        const unsubNotices = onSnapshot(noticeQ, (snap) => {
            const now = Date.now();
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((n: any) => {
                    if (n.expiresAt) return n.expiresAt.seconds * 1000 > now;
                    return true;
                });
            setNotices(list);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_notices_cache", JSON.stringify(list));
            }
        }, (err) => {
            // Index fallback
            const noticeQFallback = query(
                collection(db, "notices"),
                where("target", "in", ["ALL", "STUDENTS", classId])
            );
            onSnapshot(noticeQFallback, (snap) => {
                const now = Date.now();
                let list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((n: any) => {
                        if (n.expiresAt) return n.expiresAt.seconds * 1000 > now;
                        return true;
                    });
                list = list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setNotices(list);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_notices_cache", JSON.stringify(list));
                }
            });
        });

        // E. Listen to Attendance
        const attQuery = query(
            collection(db, "attendance_daily"),
            where("classId", "==", classId),
            where("sectionId", "==", sectionId)
        );
        const unsubAttendance = onSnapshot(attQuery, (attSnap) => {
            const map: Record<string, "P" | "A"> = {};
            let present = 0;
            let absent = 0;
            let total = 0;

            attSnap.forEach(doc => {
                const data = doc.data();
                const status = data.records?.[sId];
                if (status) {
                    map[data.date] = status;
                    total++;
                    if (status === "P") present++;
                    else if (status === "A") absent++;
                }
            });

            const newStats = {
                total,
                present,
                absent,
                percentage: total > 0 ? Math.round((present / total) * 100) : 0
            };

            setAttendanceMap(map);
            setAttendanceStats(newStats);

            if (typeof window !== "undefined") {
                localStorage.setItem("student_att_map_cache", JSON.stringify(map));
                localStorage.setItem("student_att_stats_cache", JSON.stringify(newStats));
            }
        }, (err) => console.error("[StudentCache] Attendance listen error:", err));

        // F. Prefetch Background / Static endpoints once (or update context)
        const fetchInitialAsyncs = async () => {
            try {
                const token = await user.getIdToken();

                // 1. Timetable Schedule
                try {
                    const tRes = await fetch("/api/timetable/my-schedule", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const tData = await tRes.json();
                    if (tData.success) {
                        const sched = tData.data.weeklySchedule || {};
                        const subs = tData.data.substitutions || [];
                        setSchedule(sched);
                        setSubstitutions(subs);
                        if (typeof window !== "undefined") {
                            localStorage.setItem("student_schedule_cache", JSON.stringify(sched));
                            localStorage.setItem("student_substitutions_cache", JSON.stringify(subs));
                        }
                    }
                } catch (err) {
                    console.error("[StudentCache] Timetable fetch failed:", err);
                }

                // 2. Teachers
                try {
                    const teachersSnap = await getDocs(
                        query(
                            collection(db, "teachers"),
                            where("schoolId", "==", userData?.schoolId || profile.schoolId || "global")
                        )
                    );
                    const tMap: Record<string, string> = {};
                    teachersSnap.docs.forEach(d => {
                        const data = d.data();
                        if (data.schoolId) tMap[data.schoolId] = data.name;
                        tMap[d.id] = data.name;
                    });
                    setTeacherMap(tMap);
                    if (typeof window !== "undefined") {
                        localStorage.setItem("student_teacher_map_cache", JSON.stringify(tMap));
                    }
                } catch (err) {
                    console.error("[StudentCache] Teachers fetch failed:", err);
                }

                // 3. Leaves History
                try {
                    const lRes = await fetch("/api/student/leaves", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const lData = await lRes.json();
                    if (lData.success) {
                        const list = lData.data || [];
                        setLeaves(list);
                        if (typeof window !== "undefined") {
                            localStorage.setItem("student_leaves_cache", JSON.stringify(list));
                        }
                    }
                } catch (err) {
                    console.error("[StudentCache] Leaves fetch failed:", err);
                }

                // 4. Exams List (Safe sort in-memory to avoid missing Firestore index crashes)
                try {
                    const examsSnap = await getDocs(collection(db, "exams"));
                    const allExams = examsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter((e: any) => e.status !== "DELETED")
                        .sort((a: any, b: any) => {
                            const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                            const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                            return dateB - dateA;
                        });
                    setExams(allExams);
                    if (typeof window !== "undefined") {
                        localStorage.setItem("student_exams_cache", JSON.stringify(allExams));
                    }
                } catch (err) {
                    console.error("[StudentCache] Exams fetch failed:", err);
                }

                // 5. Syllabi
                try {
                    const sylSnap = await getDocs(
                        query(collection(db, "exam_syllabus"), where("classId", "==", classId))
                    );
                    const classSyllabiList = sylSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setClassSyllabi(classSyllabiList);
                    if (typeof window !== "undefined") {
                        localStorage.setItem("student_syllabi_cache", JSON.stringify(classSyllabiList));
                    }
                } catch (err) {
                    console.error("[StudentCache] Syllabi fetch failed:", err);
                }

            } catch (e) {
                console.error("[StudentCache] Background fetches failed:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialAsyncs();

        return () => {
            unsubLedger();
            unsubPayments();
            unsubHomework();
            unsubNotices();
            unsubAttendance();
        };
    }, [user, profile]);

    return (
        <StudentDataContext.Provider
            value={{
                profile,
                ledger,
                transactions,
                homework,
                notices,
                attendanceMap,
                attendanceStats,
                schedule,
                substitutions,
                teacherMap,
                leaves,
                exams,
                classSyllabi,
                loading,
                refetchLeaves
            }}
        >
            {children}
        </StudentDataContext.Provider>
    );
}
