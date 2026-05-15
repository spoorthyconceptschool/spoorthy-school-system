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
    isAdmin: boolean;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
    getFreshToken: (forceRefresh?: boolean) => Promise<string | null>;
    callApi: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({ isAdmin: false } as AuthContextType);

const STORAGE_KEY = "spoorthy_user_cache";
const SESSION_KEY = "local_session_id";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    });
    // System starts in a guarded loading state until Firebase physically confirms presence
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [pendingStudentLeaves, setPendingStudentLeaves] = useState(0);

    useEffect(() => {
        setMounted(true);

        const syncLogout = (e: StorageEvent) => {
            if (e.key === "spoorthy_logout_sync") {
                console.warn("[Auth] Cross-tab logout detected.");
                firebaseSignOut(auth);
                setUser(null);
                setUserData(null);
                router.push("/login?error=session_expired");
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
                    await authUser.getIdToken(false);
                    
                    let dataToStore = null;
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

    // 2. Single-Device Session Monitor (DISABLED to allow multi-device usage)
    // Removed to prevent emergency logout when switching between mobile and laptop.


    // 3. Smart Redirect Logic
    useEffect(() => {
        if (isInitialized && !loading) {
            if (user && pathname === "/login") {
                console.log("[Auth] Logged-in user at /login. Checking profile data...");
                
                if (userData && userData.role) {
                    const r = String(userData.role).toUpperCase();
                    if (["ADMIN", "SUPER_ADMIN", "MANAGER", "DEVELOPER", "OWNER", "SUPERADMIN"].includes(r)) {
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
            } else if (!user && pathname !== "/login" && pathname !== "/" && !pathname.startsWith("/admissions")) {
                console.log("[Auth] Public user at protected path, forcing login.");
                router.replace("/login");
            }
        }
    }, [user, userData, loading, isInitialized, pathname, router]);

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'DEVELOPER', 'MANAGER'].includes(String(userData?.role || "").toUpperCase());

    // 4. Listen for Pending Leaves (Admins)
    useEffect(() => {
        if (isAdmin) {
            const studentLeavesQ = query(
                collection(db, "student_leaves"), 
                where("status", "==", "PENDING"),
                where("schoolId", "==", userData?.schoolId || "global")
            );
            const unsubStudentLeaves = onSnapshot(studentLeavesQ, (snap) => setPendingStudentLeaves(snap.size));
            return () => unsubStudentLeaves();
        }
    }, [isAdmin]);

    const signIn = async (email: string, pass: string) => {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        if (result.user) {
            // 1. Establish session identity FIRST (Before UI re-renders or listeners fire)
            const newSessionId = crypto.randomUUID();
            localStorage.setItem(SESSION_KEY, newSessionId);
            
            await setDoc(doc(db, "user_sessions", result.user.uid), {
                currentSessionId: newSessionId,
                lastActive: new Date().toISOString()
            }, { merge: true });

            // 2. Refresh token and data
            await result.user.getIdToken(true);
            
            let dataToStore = null;
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
            
            if (dataToStore) {
                setUserData(dataToStore);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
            }

            // 3. Finally set user state (triggers redirection and monitor mounting)
            setUser(result.user);
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUserData(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.setItem("spoorthy_logout_sync", Date.now().toString());
        router.push("/login");
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
        <AuthContext.Provider value={{ user, userData, role: userData?.role || "", isAdmin, loading, signIn, signOut, getFreshToken, callApi }}>
            {children}
            <div className="hidden">{pendingStudentLeaves}</div>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
