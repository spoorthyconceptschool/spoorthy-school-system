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
    const isDataQuarantined = React.useRef(false);
    
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
            try { return JSON.parse(localStorage.getItem("student_teacherMap_cache") || "{}"); } catch (e) { return {}; }
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
    const [loading, setLoading] = useState(() => {
        if (typeof window !== "undefined") {
            return !localStorage.getItem("student_profile_cache");
        }
        return true;
    });

    useEffect(() => {
        const handleBranchChange = () => {
            setProfile(null);
            setLedger(null);
            setTransactions([]);
            setHomework([]);
            setNotices([]);
            setAttendanceMap({});
            setAttendanceStats({ total: 0, present: 0, absent: 0, percentage: 0 });
            setSchedule(null);
            setSubstitutions([]);
            setTeacherMap({});
            setLeaves([]);
            setExams([]);
            setClassSyllabi([]);
            
            const keys = [
                "student_profile_cache", "student_ledger_cache", "student_tx_cache",
                "student_hw_cache", "student_notices_cache", "student_att_map_cache",
                "student_att_stats_cache", "student_schedule_cache", "student_substitutions_cache",
                "student_teacherMap_cache", "student_leaves_cache", "student_exams_cache",
                "student_syllabi_cache"
            ];
            keys.forEach(k => localStorage.removeItem(k));
        };
        
        if (typeof window !== "undefined") {
            window.addEventListener("branch_changed", handleBranchChange);
            return () => window.removeEventListener("branch_changed", handleBranchChange);
        }
    }, []);

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
                setLeaves(data.data || []);
            }
        } catch (e) {
            console.error("[StudentCache] Error refreshing leaves:", e);
        }
    }, [user]);

    // 1. Sync Student Profile (Dual-Path Strategy)
    useEffect(() => {
        if (!user?.email || isDataQuarantined.current) {
            setLoading(false);
            return;
        }

        const schoolIdFromEmail = user.email.split("@")[0].toUpperCase();
        
        const processProfileData = (pData: any) => {
            setProfile(pData);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_profile_cache", JSON.stringify(pData));
            }
            setLoading(false);
        };

        let active = true;

        // Primary doc listener
        const unsubProfile = onSnapshot(doc(db, "students", schoolIdFromEmail), (pSnap) => {
            if (!active) return;
            if (pSnap.exists()) {
                processProfileData({ id: pSnap.id, ...pSnap.data() });
            }
        }, (err) => {
            console.warn("[StudentCache] Primary profile listen error:", err.message);
            if (err.code === "permission-denied" || err.message?.includes("permission")) {
                if (unsubProfile) {
                    try { (unsubProfile as any)(); } catch (ue) {}
                } else {
                    setTimeout(() => {
                        if (unsubProfile) {
                            try { (unsubProfile as any)(); } catch (ue) {}
                        }
                    }, 0);
                }
            }
            isDataQuarantined.current = true;
        });

        // Fallback UID listener
        let unsubFallback: (() => void) | null = null;
        if (user.uid) {
            const qProfile = query(
                collection(db, "students"),
                where("uid", "==", user.uid)
            );
            unsubFallback = onSnapshot(qProfile, (qSnap) => {
                if (!active) return;
                if (!qSnap.empty) {
                    processProfileData({ id: qSnap.docs[0].id, ...qSnap.docs[0].data() });
                } else {
                    console.warn("[StudentCache] Profile not found in uid fallback.");
                }
            }, (err) => {
                console.warn("[StudentCache] Fallback profile listen error:", err.message);
                if (err.code === "permission-denied" || err.message?.includes("permission")) {
                    if (unsubFallback) {
                        try { unsubFallback(); } catch (ue) {}
                    } else {
                        setTimeout(() => {
                            if (unsubFallback) {
                                try { unsubFallback(); } catch (ue) {}
                            }
                        }, 0);
                    }
                }
                isDataQuarantined.current = true;
            });
        }

        return () => {
            active = false;
            unsubProfile();
            if (unsubFallback) unsubFallback();
        };
    }, [user]);

    // 2. Sync all other student collections once profile is warm
    useEffect(() => {
        if (!user || !profile || isDataQuarantined.current) return;

        let active = true;
        const sId = profile.schoolId || profile.id;
        const classId = profile.classId;
        const sectionId = profile.sectionId;
        const yearId = profile.academicYear || "2025-2026";
        const schoolId = profile.branchId || profile.schoolId || "global";

        if (!sId) return;

        const unsubs: Array<() => void> = [];
        let paymentsFallbackUnsub: (() => void) | null = null;

        // A. Listen to Fee Ledger
        const unsubLedger = onSnapshot(doc(db, "student_fee_ledgers", `${sId}_${yearId}`), (lSnap) => {
            if (!active) return;
            if (lSnap.exists()) {
                const lData = lSnap.data();
                setLedger(lData);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_ledger_cache", JSON.stringify(lData));
                }
            }
        }, (err) => {
            console.warn("[StudentCache] Ledger listen error:", err);
            isDataQuarantined.current = true;
        });
        unsubs.push(unsubLedger);

        // B. Listen to Payments/Transactions
        const pxQ = query(
            collection(db, "payments"),
            where("studentId", "==", sId),
            where("schoolId", "==", schoolId),
            orderBy("createdAt", "desc"),
            limit(30)
        );
        const unsubPayments = onSnapshot(pxQ, (pxSnap) => {
            if (!active) return;
            const list = pxSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            setTransactions(list);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_tx_cache", JSON.stringify(list));
            }
        }, (err) => {
            console.warn("[StudentCache] Primary payments listen warning (index missing fallback):", err.message);
            if (!active) return;
            // Index fallback
            const pxQFallback = query(collection(db, "payments"), where("studentId", "==", sId), where("schoolId", "==", schoolId));
            if (paymentsFallbackUnsub) {
                try { paymentsFallbackUnsub(); } catch(e) {}
            }
            paymentsFallbackUnsub = onSnapshot(pxQFallback, (pxSnap) => {
                if (!active) return;
                const sorted = pxSnap.docs
                    .map((d: any) => ({ id: d.id, ...d.data() }))
                    .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setTransactions(sorted);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_tx_cache", JSON.stringify(sorted));
                }
            }, (fallbackErr) => {
                console.warn("[StudentCache] Fallback TX error:", fallbackErr.message);
                isDataQuarantined.current = true;
            });
        });
        unsubs.push(unsubPayments);

        // C. Listen to Homework
        const hwQ = query(
            collection(db, "homework"),
            where("schoolId", "==", schoolId)
        );
        const unsubHomework = onSnapshot(hwQ, (snapshot) => {
            if (!active) return;
            const list = snapshot.docs
                .map((d: any) => ({ id: d.id, ...d.data() }))
                .filter((hw: any) => hw.classId === classId);
            const filtered = sectionId
                ? list.filter((hw: any) => !hw.sectionId || hw.sectionId === sectionId || hw.sectionId === "ALL" || hw.sectionId === "GENERAL")
                : list;
            const sorted = filtered.sort((a: any, b: any) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
                return (timeB || 0) - (timeA || 0);
            });
            const sliced = sorted.slice(0, 50);
            setHomework(sliced);
            if (typeof window !== "undefined") {
                localStorage.setItem("student_hw_cache", JSON.stringify(sliced));
            }
        }, (err) => {
            console.warn("[StudentCache] Homework listen error:", err);
            isDataQuarantined.current = true;
        });
        unsubs.push(unsubHomework);

        // D. Listen to Notices
        const noticeQ = query(
            collection(db, "notices"),
            where("schoolId", "==", schoolId)
        );
        const unsubNotices = onSnapshot(noticeQ, (snap) => {
            if (!active) return;
            const now = Date.now();
            const list = snap.docs
                .map((d: any) => ({ id: d.id, ...d.data() }))
                .filter((n: any) => n.target === "ALL" || n.target === "STUDENTS" || n.target === classId)
                .filter((n: any) => {
                    if (n.expiresAt) return n.expiresAt.seconds * 1000 > now;
                    return true;
                });
            const sorted = list.sort((a: any, b: any) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
                return (timeB || 0) - (timeA || 0);
            });
            setNotices(sorted);
        }, (err) => {
            console.warn("[StudentCache] Notices listen error:", err);
            isDataQuarantined.current = true;
        });
        unsubs.push(unsubNotices);

        // E. Listen to Attendance
        const attQuery = query(
            collection(db, "attendance_daily"),
            where("classId", "==", classId),
            where("sectionId", "==", sectionId),
            where("branchId", "==", schoolId)
        );
        const unsubAttendance = onSnapshot(attQuery, (attSnap) => {
            if (!active) return;
            const map: Record<string, "P" | "A"> = {};
            let present = 0;
            let absent = 0;
            let total = 0;

            attSnap.forEach((doc: any) => {
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
        }, (err) => {
            console.warn("[StudentCache] Attendance listen error:", err);
            isDataQuarantined.current = true;
        });
        unsubs.push(unsubAttendance);

        // F. Listen to Exams (real-time, zero latency)
        const unsubExams = onSnapshot(
            query(collection(db, "exams"), where("schoolId", "==", schoolId)),
            (snap) => {
                if (!active) return;
                const allExams = snap.docs
                    .map((d: any) => ({ id: d.id, ...d.data() }))
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
            }, (err) => {
                console.warn("[StudentCache] Exams listen error:", err);
                isDataQuarantined.current = true;
            });
        unsubs.push(unsubExams);

        // G. Listen to Syllabi (real-time, zero latency)
        const unsubSyllabi = onSnapshot(
            query(collection(db, "exam_syllabus"), where("classId", "==", classId)),
            (snap) => {
                if (!active) return;
                const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                setClassSyllabi(list);
                if (typeof window !== "undefined") {
                    localStorage.setItem("student_syllabi_cache", JSON.stringify(list));
                }
            },
            (err) => {
                console.warn("[StudentCache] Syllabi listen error:", err);
                isDataQuarantined.current = true;
            }
        );
        unsubs.push(unsubSyllabi);

        // H. Prefetch remaining static/dynamic endpoints in parallel
        const fetchInitialAsyncs = async () => {
            if (isDataQuarantined.current) return;
            try {
                const token = await user.getIdToken();
                await Promise.allSettled([
                    // 1. Timetable Schedule
                    (async () => {
                        try {
                            const tRes = await fetch("/api/timetable/my-schedule", {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const tData = await tRes.json();
                            if (tData.success && !isDataQuarantined.current) {
                                setSchedule(tData.data.weeklySchedule || {});
                                setSubstitutions(tData.data.substitutions || []);
                            }
                        } catch (err) {
                            console.warn("[StudentCache] Timetable fetch failed:", err);
                        }
                    })(),

                    // 2. Teachers
                    (async () => {
                        try {
                            const teachersSnap = await getDocs(
                                query(
                                    collection(db, "teachers"),
                                    where("branchId", "==", profile.branchId || userData?.branchId || "global")
                                )
                            );
                            const tMap: Record<string, string> = {};
                            teachersSnap.docs.forEach((d: any) => {
                                const data = d.data();
                                if (data.schoolId) tMap[data.schoolId] = data.name;
                                tMap[d.id] = data.name;
                            });
                            if (!isDataQuarantined.current) setTeacherMap(tMap);
                        } catch (err) {
                            console.warn("[StudentCache] Teachers fetch failed:", err);
                        }
                    })(),

                    // 3. Leaves History
                    (async () => {
                        try {
                            const lRes = await fetch("/api/student/leaves", {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const lData = await lRes.json();
                            if (lData.success && !isDataQuarantined.current) {
                                setLeaves(lData.data || []);
                            }
                        } catch (err) {
                            console.warn("[StudentCache] Leaves fetch failed:", err);
                        }
                    })()
                ]);
            } catch (err) {
                console.warn("[StudentCache] Batch prefetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialAsyncs();

        // Ensure completely strict clean up
        return () => {
            active = false;
            unsubs.forEach(unsub => unsub());
            if (paymentsFallbackUnsub) paymentsFallbackUnsub();
        };
    }, [user, profile]);

    // Persist notices, schedule, substitutions, teacherMap, leaves to cache when updated
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (notices && notices.length > 0) {
                localStorage.setItem("student_notices_cache", JSON.stringify(notices));
            }
        }
    }, [notices]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (schedule) {
                localStorage.setItem("student_schedule_cache", JSON.stringify(schedule));
            }
        }
    }, [schedule]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (substitutions && substitutions.length > 0) {
                localStorage.setItem("student_substitutions_cache", JSON.stringify(substitutions));
            }
        }
    }, [substitutions]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (teacherMap && Object.keys(teacherMap).length > 0) {
                localStorage.setItem("student_teacherMap_cache", JSON.stringify(teacherMap));
            }
        }
    }, [teacherMap]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (leaves && leaves.length > 0) {
                localStorage.setItem("student_leaves_cache", JSON.stringify(leaves));
            }
        }
    }, [leaves]);

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
