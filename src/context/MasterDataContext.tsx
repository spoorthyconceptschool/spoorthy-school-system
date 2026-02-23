"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ref, onValue, off } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { rtdb, db, auth } from "@/lib/firebase";

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
    selectedYear: string;
    setSelectedYear: (year: string) => void;
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
        schoolLogo: "",
        principalSignature: ""
    },
    academicYears: {},
    selectedYear: "2025-2026",
    setSelectedYear: () => { },
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

export const MasterDataProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<Omit<MasterDataState, 'selectedYear' | 'setSelectedYear'>>({
        ...initialState,
    });
    const [selectedYear, setSelectedYear] = useState("2025-2026");

    // 1. RTDB Sync for Master Data & Branding
    useEffect(() => {
        // Public Branding Sync
        const brandingRef = ref(rtdb, 'siteContent/branding');
        const brandingUnsub = onValue(brandingRef, (snap) => {
            if (snap.exists()) {
                setData(prev => ({
                    ...prev,
                    branding: { ...initialState.branding, ...snap.val() }
                }));
            }
        });

        // Protected Master Data Sync (Authenticated only)
        let masterUnsub: any = null;

        const authUnsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                const dataRef = ref(rtdb, 'master');
                masterUnsub = onValue(dataRef, (snapshot) => {
                    const rawData = snapshot.val() || {};
                    const newState: Partial<MasterDataState> = {
                        loading: false,
                    };

                    // Only update branding from master if siteContent/branding is empty
                    if (rawData.branding) {
                        newState.branding = { ...initialState.branding, ...rawData.branding };
                    }

                    const keys: (keyof Omit<MasterDataState, 'loading' | 'selectedYear' | 'setSelectedYear' | 'branding' | 'academicYears'>)[] =
                        ['villages', 'classes', 'sections', 'subjects', 'classSections', 'classSubjects', 'subjectTeachers', 'homeworkSubjects', 'roles'];

                    keys.forEach(key => {
                        const val = rawData[key] || {};
                        const processed = { ...val };
                        Object.keys(processed).forEach(id => {
                            if (typeof processed[id] === 'object' && processed[id] !== null) {
                                processed[id].id = id;
                            }
                        });
                        (newState as any)[key] = processed;
                    });

                    setData(prev => ({ ...prev, ...newState }));
                }, (error) => {
                    console.warn("RTDB Sync restricted (master):", error.message);
                    setData(prev => ({ ...prev, loading: false }));
                });
            } else {
                // If logged out, stop listening to master
                if (masterUnsub) off(ref(rtdb, 'master'));
                setData(prev => ({ ...prev, loading: false }));
            }
        });

        const timer = setTimeout(() => {
            setData(prev => ({ ...prev, loading: false }));
        }, 2000);

        return () => {
            brandingUnsub();
            authUnsub();
            if (masterUnsub) off(ref(rtdb, 'master'));
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

    const handleSetSelectedYear = (year: string) => {
        setSelectedYear(year);
        localStorage.setItem("spoorthy_academic_year", year);
    };

    return (
        <MasterDataContext.Provider value={{
            ...data,
            selectedYear,
            setSelectedYear: handleSetSelectedYear
        }}>
            {children}
        </MasterDataContext.Provider>
    );
};
