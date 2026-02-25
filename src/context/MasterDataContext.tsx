"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { ref, onValue, off } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { rtdb, db, auth } from "@/lib/firebase";
import { useAuth } from "./AuthContext";
import { collection, query, limit, orderBy } from "firebase/firestore";

interface MasterDataState {
    villages: Record<string, any>;
    classes: Record<string, any>;
    sections: Record<string, any>;
    subjects: Record<string, any>;
    classSections: Record<string, any>;
    classSubjects: Record<string, any>;
    subjectTeachers: Record<string, any>;
    homeworkSubjects: Record<string, any>;
    roles: Record<string, any>;
    branding: {
        schoolName: string;
        address: string;
        schoolLogo: string;
        principalSignature: string;
    };
    academicYears: Record<string, { id: string, name: string, active: boolean, startDate: string, endDate: string }>;
    systemConfig: {
        testingMode: boolean;
        developerMaintenance: boolean;
    };
    selectedYear: string;
    setSelectedYear: (year: string) => void;
    students: any[];
    teachers: any[];
    staff: any[];
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
        schoolName: "Spoorthy Concept School",
        address: "",
        schoolLogo: "https://fwsjgqdnoupwemaoptrt.supabase.co/storage/v1/object/public/media/6cf7686d-e311-441f-b7f1-9eae54ffad18.png",
        principalSignature: ""
    },
    academicYears: {},
    systemConfig: {
        testingMode: false,
        developerMaintenance: false,
    },
    selectedYear: "2025-2026",
    setSelectedYear: () => { },
    students: [],
    teachers: [],
    staff: [],
    loading: true
};

const MasterDataContext = createContext<MasterDataState>(initialState);

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

export const MasterDataProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<Omit<MasterDataState, 'selectedYear' | 'setSelectedYear'>>({
        ...initialState,
    });

    const [selectedYear, setSelectedYear] = useState("2025-2026");

    useEffect(() => {
        // Hydration-safe cache loading
        if (typeof window !== "undefined") {
            const cached = localStorage.getItem(MASTER_CACHE_KEY);
            if (cached) {
                try {
                    setData(prev => ({ ...JSON.parse(cached), loading: false }));
                } catch (e) {
                    console.warn("Master cache parse failed");
                }
            }
            const savedYear = localStorage.getItem("spoorthy_academic_year");
            if (savedYear) setSelectedYear(savedYear);
        }
    }, []);

    // Helper to persist data
    useEffect(() => {
        if (typeof window !== "undefined" && !data.loading) {
            localStorage.setItem(MASTER_CACHE_KEY, JSON.stringify(data));
        }
    }, [data.branding, data.classes, data.sections, data.villages, data.subjects]);

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
        }, 3000);

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

    // 4. Authenticated State Management
    const { role, user } = useAuth();
    useEffect(() => {
        if (!user || (role !== "ADMIN" && role !== "MANAGER")) {
            if (data.students.length > 0) setData(prev => ({ ...prev, students: [], teachers: [], staff: [] }));
            return;
        }

        // NOTE: Large datasets (Students/Teachers) are no longer synced globally to prevent 
        // browser memory overload and long initial load times. 
        // Use local page hooks with limit() and pagination instead.
        setData(prev => ({ ...prev, loading: false }));

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

    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
