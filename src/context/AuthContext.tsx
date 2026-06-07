"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, query, collection, where } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

/**
 * Defines the shape of the global authentication state and available actions.
 */
interface AuthContextType {
    user: User | null;
    userData: any | null;
    role: string;
    branchId: string | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
    getFreshToken: (forceRefresh?: boolean) => Promise<string | null>;
    callApi: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({ isAdmin: false, isSuperAdmin: false, branchId: null } as AuthContextType);

const STORAGE_KEY = "spoorthy_user_cache";
const SESSION_KEY = "local_session_id";

function safeRandomUUID(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    console.error("Failed to parse cached user data", e);
                }
            }
        }
        return null;
    });
    // System starts in a guarded loading state until Firebase physically confirms presence
    // But we recover synchronously from local storage if session cache is present to hit < 1ms perceived loads
    const [loading, setLoading] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem(STORAGE_KEY);
        }
        return true;
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [pendingStudentLeaves, setPendingStudentLeaves] = useState(0);

    // Initial hydration and cache recovery
    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                try {
                    setUserData(JSON.parse(cached));
                } catch (e) {
                    console.error("Failed to parse cached user data", e);
                }
            }
        }

        const syncLogout = (e: StorageEvent) => {
            if (e.key === "spoorthy_logout_sync") {
                console.warn("[Auth] Cross-tab logout detected.");
                firebaseSignOut(auth);
                setUser(null);
                setUserData(null);
                router.push("/");
            }
        };
        window.addEventListener("storage", syncLogout);
        return () => window.removeEventListener("storage", syncLogout);
    }, [router]);

    // 1. Identity Monitor (Firebase Auth)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                try {
                    console.log("[Auth] Observer: User detected:", authUser.email);
                    
                    // --- ZERO-LATENCY BOOT GATE ---
                    // Trust local session for initial hydration to achieve zero latency.
                    // The background monitor (Effect #2) will handle eviction if needed.
                    const tokenResult = await authUser.getIdTokenResult(false);
                    const claimRole = tokenResult.claims.role as string;
                    
                    let dataToStore: any = null;
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.status === "DEACTIVATED") {
                            console.warn("[Auth] Account DEACTIVATED. Forced logout.");
                            await firebaseSignOut(auth);
                            return;
                        }
                        dataToStore = { ...data, uid: authUser.uid };
                    } else {
                        const studentDoc = await getDoc(doc(db, "students", authUser.uid));
                        if (studentDoc.exists()) {
                            const data = studentDoc.data();
                            dataToStore = { ...data, uid: authUser.uid, role: "STUDENT" };
                        }
                    }

                    // Fallback to custom claims / email pattern if Firestore profile is missing or lacks role
                    if (!dataToStore) {
                        dataToStore = {
                            uid: authUser.uid,
                            email: authUser.email,
                            role: claimRole || (authUser.email?.includes("admin") ? "ADMIN" : authUser.email?.includes("teacher") ? "TEACHER" : "STUDENT"),
                            name: authUser.displayName || authUser.email?.split("@")[0] || "User",
                            status: "ACTIVE"
                        };
                    } else if (!dataToStore.role) {
                        dataToStore.role = claimRole || (authUser.email?.includes("admin") ? "ADMIN" : authUser.email?.includes("teacher") ? "TEACHER" : "STUDENT");
                    }

                    if (dataToStore) {
                        setUserData(dataToStore);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
                    }
                    setUser(authUser);
                } catch (err: any) {
                    console.warn("[Auth] Identity fetch failed:", err.message);
                }
            } else {
                console.log("[Auth] Observer: No user.");
                setUser(null);
                setUserData(null);
                localStorage.removeItem(STORAGE_KEY);
            }
            setLoading(false);
            setIsInitialized(true);
        });

        return () => unsubscribe();
    }, [router]);

    // 2. Single-Device Session Monitor (Firestore Snapshot)
    useEffect(() => {
        if (!user || pathname === "/login") return;

        const unsub = onSnapshot(doc(db, "user_sessions", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const dbSessionId = data.currentSessionId;
                const dbOrigin = data.origin;
                const localSessionId = localStorage.getItem(SESSION_KEY);
                
                // Only enforce eviction if BOTH sessions exist, don't match, and are on the SAME origin.
                // This prevents race conditions, and allows developers to run localhost & production simultaneously.
                if (dbSessionId && localSessionId && dbSessionId !== localSessionId) {
                    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
                    if (!dbOrigin || dbOrigin === currentOrigin) {
                        console.error("[Auth] SESSION OVERRIDE DETECTED. Executing emergency logout.");
                        firebaseSignOut(auth);
                        localStorage.removeItem(STORAGE_KEY);
                        localStorage.removeItem(SESSION_KEY);
                        setUser(null);
                        setUserData(null);
                        router.push("/");
                    }
                }
            }
        }, (err) => {
            console.warn("[Auth] Session monitor error:", err.message);
        });

        return () => unsub();
    }, [user?.uid, pathname, router]);



    // 3. Smart Redirect Logic
    useEffect(() => {
        if (isInitialized && !loading) {
            if (user && pathname === "/login") {
                console.log("[Auth] Logged-in user at /login. Checking profile data...");
                
                if (userData && userData.role) {
                    const r = String(userData.role).toUpperCase();
                    if (["SUPER_ADMIN", "SUPERADMIN"].includes(r)) {
                        router.replace("/super-admin");
                    } else if (["ADMIN", "MANAGER", "DEVELOPER", "OWNER"].includes(r)) {
                        router.replace("/admin");
                    } else if (r === "TEACHER") {
                        router.replace("/teacher");
                    } else if (r === "STUDENT") {
                        router.replace("/student");
                    } else {
                        console.warn("[Auth] Invalid role. Forcing logout to break loop.");
                        firebaseSignOut(auth);
                        setUserData(null);
                        setUser(null);
                    }
                } else if (!userData) {
                    // This is the critical loop breaker.
                    // If a user exists in Auth but has no Firestore profile,
                    // they will loop forever between /login and /admin. We MUST log them out.
                    console.warn("[Auth] Authenticated user has no profile data. Forcing logout to break loop.");
                    firebaseSignOut(auth);
                    setUserData(null);
                    setUser(null);
                }
            } else if (!user) {
                const isProtectedRoute = 
                    pathname.startsWith("/super-admin") ||
                    pathname.startsWith("/admin") ||
                    pathname.startsWith("/teacher") ||
                    pathname.startsWith("/student") ||
                    pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/notifications");
                
                if (isProtectedRoute && !window.localStorage.getItem("spoorthy_logging_out")) {
                    console.log("[Auth] Public user at protected path, forcing login.");
                    router.replace("/login");
                }
            }
        }
    }, [user, userData, loading, isInitialized, pathname, router]);

    const isAdmin = ['ADMIN', 'MANAGER', 'DEVELOPER', 'OWNER'].includes(String(userData?.role || "").toUpperCase());
    const isSuperAdmin = ['SUPER_ADMIN', 'SUPERADMIN'].includes(String(userData?.role || "").toUpperCase());

    // 4. Listen for Pending Leaves (Admins)
    useEffect(() => {
        if (isAdmin) {
            const studentLeavesQ = query(
                collection(db, "student_leaves"), 
                where("status", "==", "PENDING"),
                where("schoolId", "==", userData?.schoolId || "global")
            );
            const unsubStudentLeaves = onSnapshot(studentLeavesQ, (snap) => setPendingStudentLeaves(snap.size), (err) => console.warn("[Auth] Student leaves sync error:", err.message));
            return () => unsubStudentLeaves();
        }
    }, [isAdmin]);

    const signIn = async (email: string, pass: string) => {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        if (result.user) {
            // 1. Establish session identity FIRST (Before UI re-renders or listeners fire)
            const newSessionId = safeRandomUUID();
            localStorage.setItem(SESSION_KEY, newSessionId);
            
            await setDoc(doc(db, "user_sessions", result.user.uid), {
                currentSessionId: newSessionId,
                origin: typeof window !== "undefined" ? window.location.origin : "",
                lastActive: new Date().toISOString()
            }, { merge: true });

            // 2. Refresh token and data
            const tokenResult = await result.user.getIdTokenResult(true);
            const claimRole = tokenResult.claims.role as string;
            
            let dataToStore: any = null;
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.status === "DEACTIVATED") {
                    await firebaseSignOut(auth);
                    throw new Error("Account is deactivated. Please contact administrator.");
                }
                dataToStore = { ...data, uid: result.user.uid };
            } else {
                const studentDoc = await getDoc(doc(db, "students", result.user.uid));
                if (studentDoc.exists()) {
                    const data = studentDoc.data();
                    dataToStore = { ...data, uid: result.user.uid, role: "STUDENT" };
                }
            }
            
            // Fallback to custom claims / email pattern if Firestore profile is missing or lacks role
            if (!dataToStore) {
                dataToStore = {
                    uid: result.user.uid,
                    email: result.user.email,
                    role: claimRole || (result.user.email?.includes("admin") ? "ADMIN" : result.user.email?.includes("teacher") ? "TEACHER" : "STUDENT"),
                    name: result.user.displayName || result.user.email?.split("@")[0] || "User",
                    status: "ACTIVE"
                };
            } else if (!dataToStore.role) {
                dataToStore.role = claimRole || (result.user.email?.includes("admin") ? "ADMIN" : result.user.email?.includes("teacher") ? "TEACHER" : "STUDENT");
            }

            if (dataToStore) {
                setUserData(dataToStore);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
            }

            // 3. Finally set user state (triggers redirection and monitor mounting)
            setUser(result.user);
        }
    };

    const signOut = async () => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("spoorthy_logging_out", "true");
        }
        await firebaseSignOut(auth);
        setUserData(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.setItem("spoorthy_logout_sync", Date.now().toString());
        window.location.href = "/";
        
        // Cleanup after navigation is likely complete
        setTimeout(() => {
            if (typeof window !== "undefined") {
                window.localStorage.removeItem("spoorthy_logging_out");
            }
        }, 2000);
    };

    const [warmedToken, setWarmedToken] = useState<{ token: string; expiry: number } | null>(null);

    // SPECULATIVE TOKEN WARMING (Zero-Latency Pillar)
    // We keep the token fresh in the background so API calls are instantaneous
    useEffect(() => {
        if (!user) {
            setWarmedToken(null);
            return;
        }

        const warm = async () => {
            try {
                console.log("[Auth] Speculative Token Warming...");
                const token = await user.getIdToken(true);
                setWarmedToken({ token, expiry: Date.now() + (30 * 60 * 1000) });
            } catch (e) {
                console.warn("[Auth] Token warming failed:", e);
            }
        };

        warm(); // Initial warm
        const interval = setInterval(warm, 30 * 60 * 1000); // Refresh every 30 mins
        return () => clearInterval(interval);
    }, [user]);

    const getFreshToken = async (forceRefresh = false) => {
        if (!user) return null;
        
        // Use pre-warmed token if valid and not forcing
        if (!forceRefresh && warmedToken && Date.now() < warmedToken.expiry) {
            return warmedToken.token;
        }

        try {
            const token = await user.getIdToken(forceRefresh);
            setWarmedToken({ token, expiry: Date.now() + (30 * 60 * 1000) });
            return token;
        } catch (err) {
            console.error("[Auth] Token refresh failed:", err);
            return null;
        }
    };

    /**
     * SENIOR ARCHITECT PATTERN: Centralized Auth Interceptor
     * Encapsulates JWT lifecycle, silent refresh, and idempotent retries.
     */
    const callApi = async (url: string, options: RequestInit = {}) => {
        // 1. Ensure fresh token for the initial attempt
        let token = await getFreshToken(false);
        
        const execute = async (authToken: string | null) => {
            const headers = new Headers(options.headers || {});
            if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
            
            return await fetch(url, { ...options, headers });
        };

        let response = await execute(token);

        // 2. Silent Refresh & Retry Logic (Handshake recovery)
        if (response.status === 401) {
            console.warn(`[Auth Interceptor] 401 detected for ${url}. Attempting silent refresh...`);
            const refreshedToken = await getFreshToken(true);
            if (refreshedToken) {
                response = await execute(refreshedToken);
            }
        }

        return response;
    };

    // Hydration blocker
    if (!mounted) {
        return <div className="min-h-screen bg-[#0A192F]" />;
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            userData, 
            role: userData?.role || "", 
            branchId: userData?.branchId || null,
            isAdmin, 
            isSuperAdmin,
            loading, 
            signIn, 
            signOut, 
            getFreshToken, 
            callApi 
        }}>
            {children}
            <div className="hidden">{pendingStudentLeaves}</div>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
