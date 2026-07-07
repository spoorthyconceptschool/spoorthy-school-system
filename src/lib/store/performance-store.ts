import { create } from 'zustand';
import { User } from 'firebase/auth';

export type AuthStatus = 
    | "INITIALIZING" 
    | "VALIDATING_SESSION" 
    | "AUTHENTICATED" 
    | "FORCE_LOGOUT" 
    | "LOGGING_OUT" 
    | "LOGGED_OUT";

interface BrandingConfig {
    schoolName: string;
    address: string;
    schoolLogo: string;
    principalSignature: string;
    studentIdPrefix?: string;
    teacherIdPrefix?: string;
    studentIdSuffix?: number;
    teacherIdSuffix?: number;
    schoolId?: string;
}

interface AcademicYear {
    id: string;
    name: string;
    active: boolean;
    startDate: string;
    endDate: string | null;
}

interface PerformanceState {
    // Auth & Session Slice
    user: User | null;
    userData: any | null;
    role: string;
    branchId: string | null;
    authStatus: AuthStatus;
    isOffline: boolean;
    
    // Master Data Slice
    villages: Record<string, any>;
    classes: Record<string, any>;
    sections: Record<string, any>;
    subjects: Record<string, any>;
    classSections: Record<string, any>;
    branding: BrandingConfig;
    academicYears: Record<string, AcademicYear>;
    selectedYear: string;
    masterLoading: boolean;

    // Cache Slice
    cache: Record<string, { data: any; expiresAt: number }>;

    // UI/Layout Slice
    sidebarOpen: boolean;

    // Actions
    setAuth: (payload: { user: User | null; userData: any | null; role: string; branchId: string | null; authStatus: AuthStatus }) => void;
    setOfflineStatus: (isOffline: boolean) => void;
    setMasterData: (payload: Partial<Omit<PerformanceState, 'cache' | 'setAuth' | 'setOfflineStatus' | 'setMasterData' | 'setSelectedYear' | 'getCache' | 'setCache' | 'clearCache' | 'toggleSidebar'>>) => void;
    setSelectedYear: (year: string) => void;
    
    // Cache Helpers
    getCache: <T = any>(key: string) => T | null;
    setCache: (key: string, data: any, ttlMs: number) => void;
    clearCache: (keyPrefix?: string) => void;
    
    // UI Helpers
    toggleSidebar: (open?: boolean) => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
    // Auth defaults
    user: null,
    userData: null,
    role: "STUDENT",
    branchId: null,
    authStatus: "INITIALIZING",
    isOffline: typeof window !== 'undefined' ? !navigator.onLine : false,

    // Master configuration defaults
    villages: {},
    classes: {},
    sections: {},
    subjects: {},
    classSections: {},
    branding: {
        schoolName: "",
        address: "",
        schoolLogo: "",
        principalSignature: ""
    },
    academicYears: {},
    selectedYear: typeof window !== 'undefined' ? localStorage.getItem("spoorthy_academic_year") || "2025-2026" : "2025-2026",
    masterLoading: false,

    // Cache registry
    cache: {},

    // UI state
    sidebarOpen: false,

    // Auth actions
    setAuth: (payload) => set((state) => ({
        user: payload.user,
        userData: payload.userData,
        role: payload.role,
        branchId: payload.branchId,
        authStatus: payload.authStatus
    })),

    // Connectivity status action
    setOfflineStatus: (isOffline) => set({ isOffline }),

    // Master configuration action
    setMasterData: (payload) => set((state) => ({
        ...state,
        ...payload
    })),

    // Academic Year context switch
    setSelectedYear: (year) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem("spoorthy_academic_year", year);
        }
        set({ selectedYear: year });
    },

    // Cache operations
    getCache: (key) => {
        const entry = get().cache[key];
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            // Delete expired cache asynchronously
            setTimeout(() => {
                set((state) => {
                    const newCache = { ...state.cache };
                    delete newCache[key];
                    return { cache: newCache };
                });
            }, 0);
            return null;
        }
        return entry.data;
    },

    setCache: (key, data, ttlMs) => set((state) => ({
        cache: {
            ...state.cache,
            [key]: {
                data,
                expiresAt: Date.now() + ttlMs
            }
        }
    })),

    clearCache: (keyPrefix) => set((state) => {
        if (!keyPrefix) return { cache: {} };
        const newCache = { ...state.cache };
        Object.keys(newCache).forEach((key) => {
            if (key.startsWith(keyPrefix)) {
                delete newCache[key];
            }
        });
        return { cache: newCache };
    }),

    // UI operations
    toggleSidebar: (open) => set((state) => ({
        sidebarOpen: open !== undefined ? open : !state.sidebarOpen
    }))
}));
