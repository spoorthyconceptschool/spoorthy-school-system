"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ref, onValue, off } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import { rtdb, db } from "@/lib/firebase";

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

    // 1. RTDB Sync for Master Data
    useEffect(() => {
        const dataRef = ref(rtdb, 'master');

        const callback = (snapshot: any) => {
            const rawData = snapshot.val() || {};

            const newState: Partial<MasterDataState> = {
                loading: false,
                branding: rawData.branding || initialState.branding
            };

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
        };

        const errorCallback = (error: any) => {
            console.error("RTDB Sync Error:", error);
            setData(prev => ({ ...prev, loading: false }));
        };

        onValue(dataRef, callback, errorCallback);

        // Debug: Log the RTDB instance
        if (typeof window !== 'undefined') {
            console.log("[MasterData] Connecting to RTDB...", (rtdb as any)._repoInternal?.repoInfo_?.host);
        }

        // Safety timeout to prevent infinite loading
        const timer = setTimeout(() => {
            setData(prev => ({ ...prev, loading: false }));
        }, 1500); // Fast fallback

        return () => {
            off(dataRef, "value", callback);
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
