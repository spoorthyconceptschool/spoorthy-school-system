"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from "react";
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
        schoolId?: string;
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
        schoolName: "",
        address: "",
        schoolLogo: "",
        principalSignature: "",
        studentIdPrefix: "",
        teacherIdPrefix: "",
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

const MASTER_CACHE_KEY_PREFIX = "spoorthy_master_cache_";

/**
 * Central data synchronization provider for the entire school application.
 * Listens to Realtime Database changes and hydration events to keep all
 * UI components in sync with the school's master configuration.
 */
export const MasterDataProvider = ({ children }: { children: ReactNode }) => {
    const { user, userData, branchId: userBranchId, role } = useAuth();
    const activeBranchId = userBranchId || userData?.schoolId || (role === "SUPER_ADMIN" ? "global" : null);
    const MASTER_CACHE_KEY = activeBranchId ? `${MASTER_CACHE_KEY_PREFIX}${activeBranchId}` : null;

    const isDataQuarantined = useRef(false);
    const getCachedBranding = () => {
        if (typeof window === "undefined") {
            return {
                schoolLogo: "",
                schoolName: "",
                address: "",
                principalSignature: "",
                studentIdPrefix: "",
                teacherIdPrefix: "",
                studentIdSuffix: 1,
                teacherIdSuffix: 1,
                schoolId: "",
                branchDocId: ""
            };
        }
        try {
            const lastBranchId = localStorage.getItem("spoorthy_last_branch_id");
            if (lastBranchId) {
                const cached = localStorage.getItem(`spoorthy_cached_branding_${lastBranchId}`);
                if (cached) {
                    return JSON.parse(cached);
                }
            }
        } catch (e) {}
        return {
            schoolLogo: "",
            schoolName: "Spoorthy High School",
            address: "",
            principalSignature: "",
            studentIdPrefix: "",
            teacherIdPrefix: "",
            studentIdSuffix: 1,
            teacherIdSuffix: 1,
            schoolId: "",
            branchDocId: ""
        };
    };

    const [cachedBranding, setCachedBranding] = useState(() => getCachedBranding());
    const [data, setData] = useState<Omit<MasterDataState, 'selectedYear' | 'setSelectedYear'>>(initialState);
    
    // Cache hydration removed to prevent stale data flash. Data will load fresh from Firestore/RTDB.
    useEffect(() => {
        // No-op
    }, [MASTER_CACHE_KEY]);

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

    // Helper to persist data - Removed to prevent stale flash
    useEffect(() => {
        // No-op
    }, [data.classes, data.sections, data.villages, data.subjects, data.branding, MASTER_CACHE_KEY]);

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
        }, (error) => {
            console.warn("[MasterDataContext] RTDB Permission (branding):", error.message);
        });

        const DEFAULT_SUBJECTS = {
            "math": { id: "math", name: "Mathematics", isActive: true },
            "science": { id: "science", name: "Science", isActive: true },
            "english": { id: "english", name: "English", isActive: true }
        };

        // Protected Master Data Sync (Authenticated only)
        const authUnsub = onAuthStateChanged(auth, (user) => {
            if (masterUnsub) { masterUnsub(); masterUnsub = null; }

            if (user) {
                const dataRef = ref(rtdb, 'master');
                const onMasterValue = onValue(dataRef, (snapshot) => {
                    const rawData = snapshot.val() || {};
                    setData(prev => {
                        return { 
                            ...prev, 
                            subjects: rawData.subjects || prev.subjects || DEFAULT_SUBJECTS,
                            classSubjects: rawData.classSubjects || prev.classSubjects || {},
                            subjectTeachers: rawData.subjectTeachers || prev.subjectTeachers || {},
                            loading: false 
                        };
                    });
                }, (error) => {
                    console.warn("RTDB Permission (master):", error.message);
                    setData(prev => ({ 
                        ...prev, 
                        subjects: prev.subjects || DEFAULT_SUBJECTS,
                        loading: false 
                    }));
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
        if (isDataQuarantined.current) return;
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
        if (isDataQuarantined.current) return;
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
    const [branchBranding, setBranchBranding] = useState<any>(null);
    const [branchBrandingLoading, setBranchBrandingLoading] = useState(false);
    const [websiteBranding, setWebsiteBranding] = useState<any>(null);

    // Sync website settings branding
    useEffect(() => {
        if (isDataQuarantined.current) return;
        const unsub = onSnapshot(doc(db, "website_settings", "main"), (snap) => {
            if (snap.exists()) {
                setWebsiteBranding(snap.data());
            }
        }, (err) => {
            console.warn("[MasterData] Website settings sync error:", err.message);
        });
        return () => unsub();
    }, []);

    // Sync branch-specific branding if not global
    useEffect(() => {
        if (!activeBranchId || activeBranchId === "global" || isDataQuarantined.current) {
            setBranchBranding(null);
            setBranchBrandingLoading(false);
            return;
        }

        setBranchBrandingLoading(true);
        const unsub = onSnapshot(doc(db, "branches", activeBranchId), (snap) => {
            if (snap.exists()) {
                setBranchBranding(snap.data());
            } else {
                setBranchBranding(null);
            }
            setBranchBrandingLoading(false);
        }, (err) => {
            console.warn("[MasterData] Branch sync error:", err.message);
            setBranchBranding(null);
            setBranchBrandingLoading(false);
        });

        return () => unsub();
    }, [activeBranchId]);

    // Sync branch-specific Master Data (Villages, Classes, Sections, combinations) from Firestore
    useEffect(() => {
        if (!activeBranchId || activeBranchId === "global" || isDataQuarantined.current) {
            return;
        }

        console.log(`[MasterDataContext] Syncing Firestore master registries for branch: ${activeBranchId}`);

        const currentSchoolId = activeBranchId;
        const authUser = { token: { schoolId: userData?.schoolId || userData?.branchId } };

        const classesQuery = query(collection(db, "classes"), where("schoolId", "==", authUser.token.schoolId || currentSchoolId));
        const sectionsQuery = query(collection(db, "sections"), where("schoolId", "==", authUser.token.schoolId || currentSchoolId));
        const villagesQuery = query(collection(db, "villages"), where("schoolId", "==", authUser.token.schoolId || currentSchoolId));
        const classSectionsQuery = query(collection(db, "master_class_sections"), where("schoolId", "==", authUser.token.schoolId || currentSchoolId));

        let localClassesMap: Record<string, any> = {};
        let localSectionsMap: Record<string, any> = {};
        let localVillagesMap: Record<string, any> = {};
        let localClassSectionsMap: Record<string, any> = {};

        const updateMasterDataState = () => {
            const finalClassesMap = { ...localClassesMap };
            Object.values(localClassSectionsMap).forEach((cs: any) => {
                const classId = cs.classId;
                const sectionId = cs.sectionId;
                if (finalClassesMap[classId]) {
                    finalClassesMap[classId].sections = finalClassesMap[classId].sections || {};
                    finalClassesMap[classId].sections[sectionId] = {
                        id: sectionId,
                        name: localSectionsMap[sectionId]?.name || sectionId.split('_').pop() || "A"
                    };
                }
            });

            setData(prev => ({
                ...prev,
                classes: finalClassesMap,
                sections: localSectionsMap,
                villages: localVillagesMap,
                classSections: localClassSectionsMap
            }));
        };

        const unsubClasses = onSnapshot(classesQuery, (snap) => {
            const classesMap: Record<string, any> = {};
            snap.docs.forEach(doc => {
                const d = doc.data();
                const classId = d.id;
                classesMap[classId] = {
                    id: classId,
                    name: d.name,
                    isActive: d.isActive || d.active || false,
                    order: d.order || 99,
                    sections: {}
                };
            });
            localClassesMap = classesMap;
            updateMasterDataState();
        }, (err) => {
            console.warn("[MasterDataContext] classes listener error:", err.message);
        });

        const unsubSections = onSnapshot(sectionsQuery, (snap) => {
            const sectionsMap: Record<string, any> = {};
            snap.docs.forEach(doc => {
                const d = doc.data();
                const sectionId = d.id;
                sectionsMap[sectionId] = {
                    id: sectionId,
                    name: d.name,
                    isActive: d.isActive || d.active || false
                };
            });
            localSectionsMap = sectionsMap;
            updateMasterDataState();
        }, (err) => {
            console.warn("[MasterDataContext] sections listener error:", err.message);
        });

        const unsubVillages = onSnapshot(villagesQuery, (snap) => {
            const villagesMap: Record<string, any> = {};
            snap.docs.forEach(doc => {
                const d = doc.data();
                const villageId = d.id;
                villagesMap[villageId] = {
                    id: villageId,
                    name: d.name,
                    isActive: d.isActive || d.active || false
                };
            });
            localVillagesMap = villagesMap;
            updateMasterDataState();
        }, (err) => {
            console.warn("[MasterDataContext] villages listener error:", err.message);
        });

        const unsubClassSections = onSnapshot(classSectionsQuery, (snap) => {
            const classSectionsMap: Record<string, any> = {};
            snap.docs.forEach(doc => {
                const d = doc.data();
                const id = d.id;
                const key = id.startsWith(activeBranchId + '_') ? id.substring(activeBranchId.length + 1) : id;
                classSectionsMap[key] = {
                    id: key,
                    classId: d.classId,
                    sectionId: d.sectionId,
                    isActive: d.isActive !== false,
                    displayName: d.displayName || `${d.className} - ${d.sectionName}`
                };
            });
            localClassSectionsMap = classSectionsMap;
            updateMasterDataState();
        }, (err) => {
            console.warn("[MasterDataContext] classSections listener error:", err.message);
        });

        return () => {
            unsubClasses();
            unsubSections();
            unsubVillages();
            unsubClassSections();
        };
    }, [activeBranchId, userData]);

    const effectiveBranding = useMemo(() => {
        const globalBranding = data.branding || initialState.branding;
        
        // Merge website settings from Firestore if available
        const currentWebsiteBranding: MasterDataState['branding'] = websiteBranding ? {
            schoolLogo: websiteBranding.website_logo || globalBranding.schoolLogo || "",
            schoolName: websiteBranding.website_school_name || globalBranding.schoolName || "",
            address: websiteBranding.website_address || globalBranding.address || "",
            principalSignature: globalBranding.principalSignature || "",
            studentIdPrefix: globalBranding.studentIdPrefix || "",
            teacherIdPrefix: globalBranding.teacherIdPrefix || "",
            studentIdSuffix: globalBranding.studentIdSuffix || 1,
            teacherIdSuffix: globalBranding.teacherIdSuffix || 1,
            schoolId: globalBranding.schoolId || ""
        } : globalBranding;

        let resolved = currentWebsiteBranding;

        if (activeBranchId && activeBranchId !== "global") {
            if (branchBrandingLoading || !branchBranding) {
                // If we have a cached branding for this branch, use it immediately to prevent loading states
                if (cachedBranding && cachedBranding.branchDocId === activeBranchId) {
                    return cachedBranding;
                }
                return {
                    schoolLogo: "",
                    schoolName: "",
                    address: "",
                    principalSignature: "",
                    studentIdPrefix: "",
                    teacherIdPrefix: "",
                    studentIdSuffix: 1,
                    teacherIdSuffix: 1,
                    schoolId: "",
                    branchDocId: activeBranchId
                };
            }
            resolved = {
                schoolLogo: branchBranding.logoUrl || branchBranding.logo || currentWebsiteBranding.schoolLogo || "", 
                schoolName: branchBranding.schoolName || currentWebsiteBranding.schoolName || "",
                address: branchBranding.address || currentWebsiteBranding.address || "",
                principalSignature: branchBranding.principalSignature || currentWebsiteBranding.principalSignature || "",
                studentIdPrefix: branchBranding.studentIdPrefix || currentWebsiteBranding.studentIdPrefix || "",
                teacherIdPrefix: branchBranding.teacherIdPrefix || currentWebsiteBranding.teacherIdPrefix || "",
                studentIdSuffix: branchBranding.studentIdSuffix !== undefined ? Number(branchBranding.studentIdSuffix) : (currentWebsiteBranding.studentIdSuffix || 1),
                teacherIdSuffix: branchBranding.teacherIdSuffix !== undefined ? Number(branchBranding.teacherIdSuffix) : (currentWebsiteBranding.teacherIdSuffix || 1),
                schoolId: branchBranding.schoolId || branchBranding.branchCode || ""
            };
        } else {
            // If activeBranchId is not set yet, but we have a cached branding, return it as a placeholder to prevent flicker
            if (!activeBranchId && cachedBranding && cachedBranding.schoolName) {
                return cachedBranding;
            }
        }

        // Cache the resolved branding if it has valid contents
        if (typeof window !== "undefined" && resolved && resolved.schoolName && resolved.schoolName !== "School ERP") {
            const cachePayload = { 
                ...resolved as any, 
                schoolId: resolved.schoolId || "", 
                branchDocId: activeBranchId || "" 
            };
            if (activeBranchId) {
                try {
                    localStorage.setItem("spoorthy_last_branch_id", activeBranchId);
                    localStorage.setItem(`spoorthy_cached_branding_${activeBranchId}`, JSON.stringify(cachePayload));
                } catch (e) {}
            }
            if (JSON.stringify(cachedBranding) !== JSON.stringify(cachePayload)) {
                // Set state asynchronously to avoid render loop warning
                setTimeout(() => setCachedBranding(cachePayload), 0);
            }
        }

        return resolved;
    }, [data.branding, branchBranding, branchBrandingLoading, websiteBranding, activeBranchId, cachedBranding]);

    // --- DECOUPLED HEAVY FETCHES ---
    // The previous monolithic fetch blocks for 'teachers', 'staff', 'groups', 'students', 'feeConfig', and 'customFees'
    // have been entirely removed to smash the monolithic global context and prevent permission-denied crashes.
    // These collections must now be fetched exclusively at the page-level using the `useTenantQuery` architecture.

    // Synchronous Cache Purge Interceptor (ABSOLUTE GLOBAL CACHE DESTRUCTION)
    // When the tenant (activeBranchId) changes, we IMMEDIATELY wipe any residual data arrays
    // so old school data does not "fall back" or bleed into the new school's UI portal.
    useEffect(() => {
        if (activeBranchId) {
            setData(prev => ({
                ...prev,
                students: [],
                teachers: [],
                staff: [],
                groups: [],
                customFees: [],
                feeConfig: { terms: [] },
                villages: {},
                classes: {},
                sections: {},
                subjects: {},
                classSections: {},
                homeworkSubjects: {},
                roles: {}
            }));
            
            // Absolute cache annihilation using the new global utility
            import("@/lib/cache-utils").then(({ clearTenantCache }) => {
                clearTenantCache(activeBranchId);
            });
        }
    }, [activeBranchId]);

    const handleSetSelectedYear = (year: string) => {
        setSelectedYear(year);
        localStorage.setItem("spoorthy_academic_year", year);
    };

    const contextValue = useMemo(() => ({
        ...data,
        branding: effectiveBranding,
        selectedYear,
        setSelectedYear: handleSetSelectedYear
    }), [data, effectiveBranding, selectedYear]);



    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
