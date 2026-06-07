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
        studentIdPrefix?: string;
        teacherIdPrefix?: string;
        studentIdSuffix?: number;
        teacherIdSuffix?: number;
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
    /** Global fee terms and pricing configuration. */
    feeConfig: {
        terms: any[];
        transportFees?: Record<string, number>;
        academicYear?: string;
    };
    /** Registry of active custom fees (targeted by class/student). */
    customFees: any[];
    /** Cache of active student groups. */
    groups: any[];
    /** Tracks the initial synchronization status with the RTDB. */
    loading: boolean;
}

const defaultClasses: Record<string, any> = {
    "CLS_01": { id: "CLS_01", name: "Nursery", isActive: true, order: 1 },
    "CLS_02": { id: "CLS_02", name: "LKG", isActive: true, order: 2 },
    "CLS_03": { id: "CLS_03", name: "UKG", isActive: true, order: 3 },
    "CLS_04": { id: "CLS_04", name: "Class 1", isActive: true, order: 4 },
    "CLS_05": { id: "CLS_05", name: "Class 2", isActive: true, order: 5 },
    "CLS_06": { id: "CLS_06", name: "Class 3", isActive: true, order: 6 },
    "CLS_07": { id: "CLS_07", name: "Class 4", isActive: true, order: 7 },
    "CLS_08": { id: "CLS_08", name: "Class 5", isActive: true, order: 8 },
    "CLS_09": { id: "CLS_09", name: "Class 6", isActive: true, order: 9 },
    "CLS_10": { id: "CLS_10", name: "Class 7", isActive: true, order: 10 }
};

const defaultSections: Record<string, any> = {
    "SEC_A": { id: "SEC_A", name: "A", isActive: true },
    "SEC_B": { id: "SEC_B", name: "B", isActive: true }
};

const defaultVillages: Record<string, any> = {
    "VIL_001": { id: "VIL_001", name: "Miyapur", isActive: true },
    "VIL_002": { id: "VIL_002", name: "Bachupally", isActive: true },
    "VIL_003": { id: "VIL_003", name: "Nizampet", isActive: true },
    "VIL_004": { id: "VIL_004", name: "Kukatpally", isActive: true }
};

const defaultSubjects: Record<string, any> = {
    "math": { id: "math", name: "Mathematics", isActive: true },
    "science": { id: "science", name: "Science", isActive: true },
    "english": { id: "english", name: "English", isActive: true }
};

const defaultClassSections: Record<string, any> = {};
Object.keys(defaultClasses).forEach(cId => {
    Object.keys(defaultSections).forEach(sId => {
        const id = `${cId}_${sId}`;
        defaultClassSections[id] = {
            id,
            classId: cId,
            className: defaultClasses[cId].name,
            sectionId: sId,
            sectionName: defaultSections[sId].name,
            displayName: `${defaultClasses[cId].name} - ${defaultSections[sId].name}`,
            isActive: true
        };
    });
});

const initialState: MasterDataState = {
    villages: defaultVillages,
    classes: defaultClasses,
    sections: defaultSections,
    subjects: defaultSubjects,
    classSections: defaultClassSections,
    classSubjects: {},
    subjectTeachers: {},
    homeworkSubjects: {},
    roles: {},
    branding: {
        schoolName: "Spoorthy High School",
        address: "Miyapur, Hyderabad",
        schoolLogo: "",
        principalSignature: "",
        studentIdPrefix: "SCS",
        teacherIdPrefix: "SHST",
        studentIdSuffix: 1,
        teacherIdSuffix: 1
    },
    academicYears: {
        "2025-2026": { id: "2025-2026", name: "2025-2026", active: true, startDate: "", endDate: "" }
    },
    systemConfig: {
        testingMode: false,
        developerMaintenance: false,
    },
    selectedYear: "2025-2026",
    setSelectedYear: () => { },
    students: [],
    teachers: [],
    staff: [],
    groups: [],
    feeConfig: { terms: [] },
    customFees: [],
    loading: false
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
    const [data, setData] = useState<Omit<MasterDataState, 'selectedYear' | 'setSelectedYear'>>(() => {
        if (typeof window !== 'undefined') {
            const cachedData = localStorage.getItem(MASTER_CACHE_KEY);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    return {
                        ...initialState,
                        ...parsed,
                        branding: { ...initialState.branding, ...(parsed.branding || {}) },
                        systemConfig: { ...initialState.systemConfig, ...(parsed.systemConfig || {}) },
                        loading: false
                    };
                } catch (e) {}
            }
        }
        return initialState;
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        if (typeof window !== 'undefined') {
            const cachedYear = localStorage.getItem("spoorthy_academic_year");
            if (cachedYear) return cachedYear;
        }
        return "2025-2026";
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Helper to persist data
    useEffect(() => {
        if (typeof window !== "undefined" && !data.loading) {
            localStorage.setItem(MASTER_CACHE_KEY, JSON.stringify(data));
        }
    }, [data.classes, data.sections, data.villages, data.subjects, data.branding]);

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
                        return { ...prev, ...updates };
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

                    // Always sync to the authoritative Firebase currentYear
                    setSelectedYear(config.currentYear);
                    localStorage.setItem("spoorthy_academic_year", config.currentYear);
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
            // Even if config fails, we shouldn't block the app forever.
            setData(prev => ({ ...prev, loading: false }));
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && data.branding?.schoolLogo) {
            const links = document.querySelectorAll("link[rel*='icon']");
            links.forEach((link) => {
                (link as HTMLLinkElement).href = data.branding!.schoolLogo;
            });
        }
    }, [data.branding?.schoolLogo]);

    // 4. Authenticated Real-time Sync for Core Directories
    const { role, user, userData } = useAuth();
    useEffect(() => {
        if (!user) return;

        const normalizedRole = String(role || "").toUpperCase();
        const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'DEVELOPER', 'MANAGER'].includes(normalizedRole);
        const isTeacher = normalizedRole === 'TEACHER';

        if (!isAdmin && !isTeacher) return;

        // Sync Teachers (Active only for speed)
        let teachersBaseQ = query(collection(db, "teachers"), where("status", "==", "ACTIVE"));
        if (userData?.schoolId && userData.schoolId !== "global") {
            teachersBaseQ = query(teachersBaseQ, where("schoolId", "==", userData.schoolId));
        }
        const teachersUnsub = onSnapshot(teachersBaseQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, teachers: list }));
        }, (err) => console.warn("[MasterData] Teachers Sync Error:", err.message));

        // Sync Staff (Active only)
        let staffBaseQ = query(collection(db, "staff"), where("status", "==", "ACTIVE"));
        if (userData?.schoolId && userData.schoolId !== "global") {
            staffBaseQ = query(staffBaseQ, where("schoolId", "==", userData.schoolId));
        }
        const staffUnsub = onSnapshot(staffBaseQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, staff: list }));
        }, (err) => console.warn("[MasterData] Staff Sync Error:", err.message));

        // Sync Groups (House system)
        let groupsBaseQ = collection(db, "groups");
        if (userData?.schoolId && userData.schoolId !== "global") {
            groupsBaseQ = query(groupsBaseQ, where("schoolId", "==", userData.schoolId)) as any;
        }
        const groupsUnsub = onSnapshot(groupsBaseQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, groups: list }));
        }, (err) => console.warn("[MasterData] Groups Sync Error:", err.message));

        // Sync Students (Active only)
        let studentsBaseQ = query(collection(db, "students"), where("status", "==", "ACTIVE"));
        if (userData?.schoolId && userData.schoolId !== "global" && normalizedRole !== "TEACHER") {
            studentsBaseQ = query(studentsBaseQ, where("branchId", "==", userData.schoolId));
        }
        const studentsUnsub = onSnapshot(studentsBaseQ, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prev => ({ ...prev, students: list }));
        }, (err) => console.warn("[MasterData] Students Sync Error:", err.message));

        return () => {
            teachersUnsub();
            staffUnsub();
            groupsUnsub();
            studentsUnsub();
        };
    }, [user, role]);

    // 5. Fee Configuration & Custom Fees Sync
    useEffect(() => {
        if (!user) return;
        const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'DEVELOPER', 'MANAGER'].includes(String(role || "").toUpperCase());
        if (!isAdmin) return;

        // Sync Global Fee Terms
        const feeConfigUnsub = onSnapshot(doc(db, "config", "fees"), (snap) => {
            if (snap.exists()) {
                setData(prev => ({ ...prev, feeConfig: snap.data() as any }));
            }
        }, (err) => console.warn("[MasterData] Fee Config Sync Error:", err.message));

        // Sync Custom Fees
        const customFeesQ = query(collection(db, "custom_fees"), where("status", "==", "ACTIVE"));
        const customFeesUnsub = onSnapshot(customFeesQ, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setData(prev => ({ ...prev, customFees: list }));
        }, (err) => console.warn("[MasterData] Custom Fees Sync Error:", err.message));

        return () => {
            feeConfigUnsub();
            customFeesUnsub();
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



    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
