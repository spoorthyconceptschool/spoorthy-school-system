"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { ref, onValue, off } from "firebase/database";
import { doc, onSnapshot, collection, query, limit, orderBy, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { rtdb, db, auth } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

/**
 * Represents the comprehensive master data schema for the school.
 * Contains configuration, registries, and system-wide state synchronized from Realtime DB.
 */
interface MasterDataState {
    /** Mapping of unique village IDs to their metadata. */
    villages: Record<string, any>;
    /** School class definitions and ordering. */
    classes: Record<string, any>;
    /** Section definitions for classes. */
    sections: Record<string, any>;
    /** Available subjects registry. */
    subjects: Record<string, any>;
    /** Junction records linking classes to their sections. */
    classSections: Record<string, any>;
    /** Junction records linking classes to their subjects. */
    classSubjects: Record<string, any>;
    /** Assignment records for subject teachers. */
    subjectTeachers: Record<string, any>;
    /** Filtered set of subjects for homework assignment. */
    homeworkSubjects: Record<string, any>;
    /** Registry of system-wide administrative roles. */
    roles: Record<string, any>;
    /** Global school identity and visual appearance config. */
    branding: {
        schoolName: string;
        address: string;
        schoolLogo: string;
        principalSignature: string;
    };
    /** Configured academic cycles and their timeline status. */
    academicYears: Record<string, { id: string, name: string, active: boolean, startDate: string, endDate: string }>;
    /** Operational flags for developers and system modes. */
    systemConfig: {
        testingMode: boolean;
        developerMaintenance: boolean;
    };
    /** The currently active academic year context for the session. */
    selectedYear: string;
    /** Callback to switch the active academic year global context. */
    setSelectedYear: (year: string) => void;
    /** Cached set of active students. */
    students: any[];
    /** Cached set of active teachers. */
    teachers: any[];
    /** Cached set of active staff. */
    staff: any[];
    /** Tracks the initial synchronization status with the RTDB. */
    loading: boolean;
}

const initialState: MasterDataState = {
    villages: {},
    classes: {},
    sections: {},
    subjects: {},
    classSections: {},
    classSubjects: {},
    subjectTeachers: {},
    homeworkSubjects: {},
    roles: {},
    branding: {
        schoolName: "",
        address: "",
        schoolLogo: "",
        principalSignature: ""
    },
    academicYears: {},
    systemConfig: {
        testingMode: false,
        developerMaintenance: false,
    },
    selectedYear: "2026-2027",
    setSelectedYear: () => { },
    students: [],
    teachers: [],
    staff: [],
    loading: true
};

const MasterDataContext = createContext<MasterDataState>(initialState);

/**
 * Primary hook to access global school configuration and synchronized master registries.
 * Use this to fetch school branding, class lists, and active student data.
 * 
 * @returns The complete Master Data state.
 */
export function useMasterData() {
    return useContext(MasterDataContext);
}

// Helpers to get display names safely
export function useVillageName(id: string) {
    const { villages } = useMasterData();
    return villages[id]?.name || "Unknown Village";
}

export function useClassName(id: string) {
    const { classes } = useMasterData();
    return classes[id]?.name || id;
}

export function useSubjectName(id: string) {
    const { subjects } = useMasterData();
    return subjects[id]?.name || id;
}

const MASTER_CACHE_KEY = "spoorthy_master_cache";

/**
 * Central data synchronization provider for the entire school application.
 * Listens to Realtime Database changes and hydration events to keep all
 * UI components in sync with the school's master configuration.
 */
export const MasterDataProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<Omit<MasterDataState, 'selectedYear' | 'setSelectedYear'>>(initialState);
    const [selectedYear, setSelectedYear] = useState("2026-2027");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Hydrate from cache on mount (Client-side only)
        const cached = localStorage.getItem(MASTER_CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setData(prev => ({
                    ...prev,
                    ...parsed,
                    branding: { ...initialState.branding, ...(parsed.branding || {}) },
                    systemConfig: { ...initialState.systemConfig, ...(parsed.systemConfig || {}) },
                    loading: false
                }));
            } catch (e) {
                console.warn("Master cache corrupted, resetting...");
            }
        }

        const cachedYear = localStorage.getItem("spoorthy_academic_year");
        if (cachedYear) setSelectedYear(cachedYear);
    }, []);

    useEffect(() => {
        // Cache is already loaded synchronously above.
        // We only use this for initial Auth check or other setup if needed.
    }, []);

    // Helper to persist data
    useEffect(() => {
        if (typeof window !== "undefined" && !data.loading) {
            // WE REMOVE BRANDING FROM CACHE TO PREVENT STALE LOGO FLICKER ("No Footprints")
            const cacheData = { ...data };
            delete (cacheData as any).branding;
            localStorage.setItem(MASTER_CACHE_KEY, JSON.stringify(cacheData));
        }
    }, [data.classes, data.sections, data.villages, data.subjects]);

    // 1. RTDB Sync for Master Data & Branding
    useEffect(() => {
        let masterUnsub: (() => void) | null = null;
        let brandingUnsub: (() => void) | null = null;

        // Public Branding Sync - THE source of truth for identity
        const brandingRef = ref(rtdb, 'siteContent/branding');
        brandingUnsub = onValue(brandingRef, (snap) => {
            if (snap.exists()) {
                const brandingData = snap.val();
                setData(prev => {
                    const nextBranding = { ...initialState.branding, ...brandingData };
                    // Only update if actually different
                    if (JSON.stringify(prev.branding) === JSON.stringify(nextBranding)) return prev;
                    return { ...prev, branding: nextBranding };
                });
            }
        });

        // Protected Master Data Sync (Authenticated only)
        const authUnsub = onAuthStateChanged(auth, (user) => {
            if (masterUnsub) { masterUnsub(); masterUnsub = null; }

            if (user) {
                const dataRef = ref(rtdb, 'master');
                const onMasterValue = onValue(dataRef, (snapshot) => {
                    const rawData = snapshot.val() || {};
                    const updates: Partial<MasterDataState> = { loading: false };

                    // 1. Master Data Keys (Villages, Classes, etc.)
                    const keys: (keyof Omit<MasterDataState, 'loading' | 'selectedYear' | 'setSelectedYear' | 'branding' | 'academicYears' | 'students' | 'teachers' | 'staff'>)[] =
                        ['villages', 'classes', 'sections', 'subjects', 'classSections', 'classSubjects', 'subjectTeachers', 'homeworkSubjects', 'roles'];

                    keys.forEach(key => {
                        const val = rawData[key] || {};
                        const processed = { ...val };
                        Object.keys(processed).forEach(id => {
                            if (typeof processed[id] === 'object' && processed[id] !== null) {
                                processed[id].id = id;
                            }
                        });
                        (updates as any)[key] = processed;
                    });

                    // 2. Note: Branding fallback removed to prevent split-brain flicker. 
                    // siteContent/branding is now the absolute source.

                    setData(prev => {
                        const nextState = { ...prev, ...updates };
                        if (JSON.stringify(prev) === JSON.stringify(nextState)) return prev;
                        return nextState;
                    });
                }, (error) => {
                    console.warn("RTDB Permission (master):", error.message);
                    setData(prev => ({ ...prev, loading: false }));
                });

                masterUnsub = () => off(dataRef, 'value', onMasterValue);
            } else {
                setData(prev => ({ ...prev, loading: false }));
            }
        });

        const timer = setTimeout(() => {
            setData(prev => ({ ...prev, loading: false }));
        }, 8000);

        return () => {
            if (brandingUnsub) brandingUnsub();
            authUnsub();
            if (masterUnsub) masterUnsub();
            clearTimeout(timer);
        };
    }, []);

    // 2. Firestore Sync for Academic Years
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "config", "academic_years"), (docSnap) => {
            if (docSnap.exists()) {
                const config = docSnap.data();
                const yearsMap: Record<string, any> = {};

                // Current Year
                if (config.currentYear) {
                    yearsMap[config.currentYear] = {
                        id: config.currentYear,
                        name: config.currentYear,
                        active: true,
                        startDate: config.currentYearStartDate,
                        endDate: null
                    };

                    // Auto-set selected year if not set locally
                    if (!localStorage.getItem("spoorthy_academic_year")) {
                        setSelectedYear(config.currentYear);
                    }
                }

                // Upcoming
                if (Array.isArray(config.upcoming)) {
                    config.upcoming.forEach((y: any) => {
                        const yName = typeof y === 'string' ? y : y.year;
                        yearsMap[yName] = {
                            id: yName,
                            name: yName,
                            active: false,
                            startDate: typeof y === 'object' ? y.startDate : null,
                            endDate: null
                        };
                    });
                }

                // History
                if (Array.isArray(config.history)) {
                    config.history.forEach((h: any) => {
                        yearsMap[h.year] = {
                            id: h.year,
                            name: h.year,
                            active: false,
                            startDate: h.startDate,
                            endDate: h.archivedAt
                        };
                    });
                }

                // Fallback for empty config
                if (Object.keys(yearsMap).length === 0) {
                    yearsMap["2025-2026"] = { id: "2025-2026", name: "2025-2026", active: true, startDate: "", endDate: "" };
                }

                setData(prev => ({ ...prev, academicYears: yearsMap }));

                // Ensure selectedYear is still valid
                const currentSelected = localStorage.getItem("spoorthy_academic_year") || selectedYear;
                if (Object.keys(yearsMap).length > 0 && !yearsMap[currentSelected]) {
                    const fallback = config.currentYear || Object.keys(yearsMap)[0];
                    setSelectedYear(fallback);
                    localStorage.setItem("spoorthy_academic_year", fallback);
                }
            }
        }, (error) => {
            console.warn("Firestore Permission/Error (config/academic_years):", error.message);
            setData(prev => ({
                ...prev,
                academicYears: {
                    "2025-2026": { id: "2025-2026", name: "2025-2026", active: true, startDate: "", endDate: "" }
                }
            }));
        });

        return () => unsub();
    }, []);

    // 3. Firestore Sync for System Config (Testing Mode, etc.)
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "config", "system"), (docSnap) => {
            if (docSnap.exists()) {
                const config = docSnap.data();
                setData(prev => ({
                    ...prev,
                    systemConfig: {
                        testingMode: !!config.testingMode,
                        developerMaintenance: !!config.developerMaintenance
                    }
                }));
            } else {
                // Initialize if doesn't exist (safety)
                setData(prev => ({
                    ...prev,
                    systemConfig: { ...initialState.systemConfig }
                }));
            }
        }, (error) => {
            console.warn("Firestore Permission/Error (config/system):", error.message);
        });

        return () => unsub();
    }, []);

    // 4. Authenticated Real-time Sync for Core Directories
    const { role, user } = useAuth();
    useEffect(() => {
        if (!user) return;

        const normalizedRole = String(role || "").toUpperCase();
        const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'DEVELOPER', 'MANAGER'].includes(normalizedRole);
        const isTeacher = normalizedRole === 'TEACHER';

        if (!isAdmin && !isTeacher) return;

        // Sync Teachers (Active only for speed)
        const teachersQ = query(collection(db, "teachers"), where("status", "==", "ACTIVE"));
        const teachersUnsub = onSnapshot(teachersQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, teachers: list }));
        });

        // Sync Staff (Active only)
        const staffQ = query(collection(db, "staff"), where("status", "==", "ACTIVE"));
        const staffUnsub = onSnapshot(staffQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, staff: list }));
        });

        // Sync Groups (House system)
        const groupsUnsub = onSnapshot(collection(db, "groups"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, groups: list }));
        });

        return () => {
            teachersUnsub();
            staffUnsub();
            groupsUnsub();
        };
    }, [user, role]);

    const handleSetSelectedYear = (year: string) => {
        setSelectedYear(year);
        localStorage.setItem("spoorthy_academic_year", year);
    };

    const contextValue = useMemo(() => ({
        ...data,
        selectedYear,
        setSelectedYear: handleSetSelectedYear
    }), [data, selectedYear]);

    if (!mounted) {
        // Return a minimal consistent shell to avoid hydration errors
        return <div className="min-h-screen bg-[#0A192F]" />;
    }

    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
