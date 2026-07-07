"use client";

// Must be imported FIRST — patches console.error before Firebase SDK loads


import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User
} from "firebase/auth";
import { auth, db, rtdb } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, query, collection, where } from "firebase/firestore";
import { ref, onValue, set, remove, get, serverTimestamp } from "firebase/database";
import { useRouter, usePathname } from "next/navigation";

export type AuthStatus = 
    | "INITIALIZING" 
    | "VALIDATING_SESSION" 
    | "AUTHENTICATED" 
    | "FORCE_LOGOUT" 
    | "LOGGING_OUT" 
    | "LOGGED_OUT";

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
    status: AuthStatus;
    isOffline: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<void>;
    getFreshToken: (forceRefresh?: boolean) => Promise<string | null>;
    callApi: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({ isAdmin: false, isSuperAdmin: false, branchId: null, status: "INITIALIZING", isOffline: false } as AuthContextType);

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
    const [userData, setUserDataInternal] = useState<any>(null);
    const setUserData = (data: any) => {
        setUserDataInternal(data);
        if (typeof window !== "undefined") {
            if (data) {
                localStorage.setItem("spoorthy_user_data", JSON.stringify(data));
            } else {
                localStorage.removeItem("spoorthy_user_data");
            }
        }
    };
    
    // Single Active Session State Machine
    const [status, setStatus] = useState<AuthStatus>("INITIALIZING");
    const [isOffline, setIsOffline] = useState(false);
    const [localSessionId, setLocalSessionId] = useState<string | null>(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Tab Lock State
    const [tabKickedOut, setTabKickedOut] = useState(false);
    const [deviceKickedOut, setDeviceKickedOut] = useState(false);
    const myTabIdRef = useRef<string | null>(null);
    if (!myTabIdRef.current && typeof window !== "undefined") {
        myTabIdRef.current = safeRandomUUID();
    }
    const router = useRouter();
    const pathname = usePathname();
    const [pendingStudentLeaves, setPendingStudentLeaves] = useState<number>(0);
    const isDataQuarantined = useRef(false);

    // Locks and Timers
    const isLoggingOutRef = useRef(false);
    const isAuthenticatingRef = useRef(false);
    const isBootedRef = useRef(false);
    const sessionUnsubRef = useRef<(() => void) | null>(null);
    const profileUnsubRef = useRef<(() => void) | null>(null);
    const heartbeatTimerRef = useRef<any>(null);

    // Derived loading state to guard UI rendering
    const loading = status === "INITIALIZING" || status === "VALIDATING_SESSION" || status === "LOGGING_OUT";

    // Browser and Platform Helpers
    const getBrowserAndPlatform = () => {
        if (typeof window === "undefined") return { browser: "Server", platform: "Server" };
        const ua = navigator.userAgent;
        let browser = "Unknown";
        let platform = "Unknown";

        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        else if (ua.includes("Trident")) browser = "Internet Explorer";
        else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";

        if (ua.includes("Windows")) platform = "Windows";
        else if (ua.includes("Macintosh") || ua.includes("Mac OS")) platform = "macOS";
        else if (ua.includes("Android")) platform = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) platform = "iOS";
        else if (ua.includes("Linux")) platform = "Linux";

        return { browser, platform };
    };

    const getOrCreateDeviceId = () => {
        if (typeof window === "undefined") return "Server";
        let deviceId = localStorage.getItem("spoorthy_device_id");
        if (!deviceId) {
            deviceId = safeRandomUUID();
            localStorage.setItem("spoorthy_device_id", deviceId);
        }
        return deviceId;
    };

    // Forced Logout Pipeline (Idempotent, Low-Latency)
    const executeForcedLogout = useCallback(async (isManualLogout = false, forceClear = false) => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        
        console.warn(`[Auth] Forced logout pipeline executing... (Manual: ${isManualLogout})`);

        // 1. Stop heartbeat
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }

        // 2. Unsubscribe realtime listener
        if (sessionUnsubRef.current) {
            sessionUnsubRef.current();
            sessionUnsubRef.current = null;
        }
        if (profileUnsubRef.current) {
            profileUnsubRef.current();
            profileUnsubRef.current = null;
        }

        setStatus("LOGGING_OUT");

        try {
            // 3. Clear RTDB session node ONLY if manual logout AND session matches
            const currentUid = auth.currentUser?.uid;
            if (currentUid && isManualLogout === true) {
                const sessionRef = ref(rtdb, `sessions/${currentUid}`);
                const snapshot = await get(sessionRef);
                const currentDeviceId = getOrCreateDeviceId();
                if (snapshot.exists() && snapshot.val().deviceId === currentDeviceId) {
                    await remove(sessionRef).catch(e => console.warn("Failed to remove session node:", e));
                }
            }

            // 5. Clear storage synchronously (Instant)
            let clearedSharedStorage = false;
            if (typeof window !== "undefined") {
                const storedSessionId = localStorage.getItem(SESSION_KEY);
                
                if (isManualLogout === true || forceClear === true || !storedSessionId || storedSessionId === localSessionId) {
                    const savedDeviceId = localStorage.getItem("spoorthy_device_id");
                    localStorage.clear();
                    if (savedDeviceId) localStorage.setItem("spoorthy_device_id", savedDeviceId);
                    sessionStorage.clear();
                    clearedSharedStorage = true;

                    // Multi-Tab Synchronization
                    const channel = new BroadcastChannel("session_sync");
                    channel.postMessage({ type: "LOGOUT" });
                    channel.close();

                    // Fire and forget Service Worker unregistration
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then((registrations) => {
                            for (const registration of registrations) {
                                registration.unregister().catch(() => {});
                            }
                        }).catch(() => {});
                    }
                } else {
                    console.log("[Auth] Session taken over by another tab/device. Keeping shared localStorage intact.");
                }
            }

            // 6. Perform Firebase SignOut ONLY if we cleared shared storage
            if (clearedSharedStorage) {
                await firebaseSignOut(auth).catch(e => console.warn("Firebase signOut failed:", e));
            }

            // 7. Clear application memory
            setUserData(null);
            setUser(null);
            setLocalSessionId(null);

            if (typeof window !== "undefined") {
                if (isManualLogout) {
                    window.location.href = "/login";
                }
            }
        } catch (error) {
            console.error("[Auth] Error in forced logout pipeline:", error);
            if (typeof window !== "undefined") {
                window.location.href = "/";
            }
        } finally {
            isLoggingOutRef.current = false;
        }
    }, [localSessionId]);



    // Helper to fetch user profiles
    const fetchAndSetUserProfile = async (authUser: User) => {
        const tokenResult = await authUser.getIdTokenResult(false);
        const claimRole = tokenResult.claims.role as string;
        
        let dataToStore: any = null;
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.status === "DEACTIVATED") {
                throw new Error("ACCOUNT_DEACTIVATED");
            }
            dataToStore = { ...data, uid: authUser.uid };

            // Auto-resolve teacher branchId
            if (dataToStore.role === "TEACHER" && !dataToStore.branchId && dataToStore.schoolId) {
                const teacherDoc = await getDoc(doc(db, "teachers", dataToStore.schoolId));
                if (teacherDoc.exists()) {
                    const teacherData = teacherDoc.data();
                    if (teacherData.branchId) {
                        dataToStore.branchId = teacherData.branchId;
                        await setDoc(doc(db, "users", authUser.uid), { branchId: teacherData.branchId }, { merge: true });
                    }
                }
            }

            // Auto-resolve student branchId
            if (dataToStore.role === "STUDENT" && !dataToStore.branchId && dataToStore.schoolId) {
                const studentDoc = await getDoc(doc(db, "students", dataToStore.schoolId));
                if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    if (studentData.branchId) {
                        dataToStore.branchId = studentData.branchId;
                        await setDoc(doc(db, "users", authUser.uid), { branchId: studentData.branchId }, { merge: true });
                    }
                }
            }
        } else {
            const studentDoc = await getDoc(doc(db, "students", authUser.uid));
            if (studentDoc.exists()) {
                const data = studentDoc.data();
                dataToStore = { ...data, uid: authUser.uid, role: "STUDENT" };
            }
        }

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

        setUserData(dataToStore);
    };

    // Mount handler
    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            const cached = localStorage.getItem("spoorthy_user_data");
            if (cached) {
                try {
                    setUserDataInternal(JSON.parse(cached));
                } catch (e) {}
            }
        }
    }, []);

    // 1. Identity & Session Boot Gate (Firebase Auth)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (isLoggingOutRef.current || isAuthenticatingRef.current) {
                console.log("[Auth] AuthState change ignored due to active lock.");
                return;
            }

            if (!authUser) {
                console.log("[Auth] Observer: No user.");
                setUser(null);
                setUserData(null);
                setLocalSessionId(null);
                setStatus("LOGGED_OUT");
                isBootedRef.current = true;
                setIsInitialized(true);
                return;
            }

            console.log("[Auth] Observer: User detected:", authUser.email);
            
            // If already booted, this is just a token refresh or secondary event.
            // Do not re-validate the session (which unmounts the app and flashes loaders).
            if (isBootedRef.current) {
                setUser(authUser);
                return;
            }

            setStatus("VALIDATING_SESSION");

            try {                
                const storedSessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
                const currentDeviceId = getOrCreateDeviceId();
                
                if (!storedSessionId) {
                    console.warn("[Auth] No local sessionId found for logged-in user. Triggering forced logout.");
                    await executeForcedLogout(false, true);
                    return;
                }

                // Verify session against RTDB
                const sessionRef = ref(rtdb, `sessions/${authUser.uid}`);
                let snapshot = await get(sessionRef);
                
                if (!snapshot.exists()) {
                    console.warn("[Auth] No session record exists in RTDB after boot. Waiting 1000ms grace period.");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    snapshot = await get(sessionRef);
                    if (!snapshot.exists()) {
                        console.warn("[Auth] No session record exists in RTDB after grace period. Triggering forced logout.");
                        await executeForcedLogout(false, false);
                        return;
                    }
                }

                const sessionData = snapshot.val();
                if (sessionData.deviceId !== currentDeviceId) {
                    console.warn("[Auth] Device mismatch on boot! Remote:", sessionData.deviceId, "Local:", currentDeviceId);
                    console.warn("[Auth] Another device holds the active session. Gracefully logging out local memory.");
                    await executeForcedLogout(false, false);
                    return;
                }

                // Valid session on boot!
                setLocalSessionId(storedSessionId);
                await fetchAndSetUserProfile(authUser);

                setUser(authUser);
                setStatus("AUTHENTICATED");
            } catch (err: any) {
                console.warn("[Auth] Boot validation failed:", err);
                const msg = err.message || "";
                if (msg.includes("permission") || msg.includes("unauthorized") || msg.includes("denied")) {
                    await executeForcedLogout(false, true);
                } else {
                    // Fallback to local session on network failures
                    const storedSessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
                    if (storedSessionId) {
                        setLocalSessionId(storedSessionId);
                        try {
                            await fetchAndSetUserProfile(authUser);
                        } catch (profileErr) {
                            console.warn("[Auth] Failed to load profile on fallback:", profileErr);
                        }
                        setUser(authUser);
                        setStatus("AUTHENTICATED");
                    } else {
                        await executeForcedLogout(false, true);
                    }
                }
            } finally {
                isBootedRef.current = true;
                setIsInitialized(true);
            }
        });

        return () => unsubscribe();
    }, [executeForcedLogout]);

    // 1.5 Real-time Profile & Academic Promotion Listener
    useEffect(() => {
        if (!user) {
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }
            return;
        }

        console.log("[Auth] Subscribing to real-time profile updates for:", user.uid);
        let nestedCleanup: (() => void) | null = null;

        const userDocRef = doc(db, "users", user.uid);
        const unsubUser = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === "DEACTIVATED") {
                    await executeForcedLogout();
                    return;
                }

                const role = data.role?.toString().toUpperCase() || "";
                if (role === "STUDENT" && data.schoolId) {
                    if (nestedCleanup) nestedCleanup();
                    const studentDocRef = doc(db, "students", data.schoolId);
                    const unsubStudent = onSnapshot(studentDocRef, (studentSnap) => {
                        if (studentSnap.exists()) {
                            const sData = studentSnap.data();
                            setUserData({ ...data, ...sData, uid: user.uid, role: "STUDENT" });
                        }
                    }, (err) => {
                        console.warn("[Auth] Nested Student doc listen error:", err.message);
                    });
                    nestedCleanup = unsubStudent;
                } else if (role === "TEACHER" && data.schoolId) {
                    if (nestedCleanup) nestedCleanup();
                    const teacherDocRef = doc(db, "teachers", data.schoolId);
                    const unsubTeacher = onSnapshot(teacherDocRef, (teacherSnap) => {
                        if (teacherSnap.exists()) {
                            const tData = teacherSnap.data();
                            setUserData({ ...data, ...tData, uid: user.uid, role: "TEACHER" });
                        }
                    }, (err) => {
                        console.warn("[Auth] Nested Teacher doc listen error:", err.message);
                    });
                    nestedCleanup = unsubTeacher;
                } else {
                    if (nestedCleanup) {
                        nestedCleanup();
                        nestedCleanup = null;
                    }
                    setUserData({ ...data, uid: user.uid });
                }
            } else {
                if (nestedCleanup) nestedCleanup();
                const studentDocRef = doc(db, "students", user.uid);
                const unsubStudentDirect = onSnapshot(studentDocRef, (studentSnap) => {
                    if (studentSnap.exists()) {
                        const sData = studentSnap.data();
                        setUserData({ ...sData, uid: user.uid, role: "STUDENT" });
                    }
                }, (err) => {
                    console.warn("[Auth] Direct Student doc listen error:", err.message);
                });
                nestedCleanup = unsubStudentDirect;
            }
        }, (err) => {
            console.warn("[Auth] User doc listen error:", err.message);
        });

        profileUnsubRef.current = () => {
            unsubUser();
            if (nestedCleanup) nestedCleanup();
        };

        return () => {
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }
        };
    }, [user, executeForcedLogout]);

    // 2. Real-time Session Monitoring Lifecycle
    useEffect(() => {
        if (!user || !localSessionId || status !== "AUTHENTICATED") {
            if (sessionUnsubRef.current) {
                sessionUnsubRef.current();
                sessionUnsubRef.current = null;
            }
            return;
        }

        const sessionRef = ref(rtdb, `sessions/${user.uid}`);
        const currentDeviceId = getOrCreateDeviceId();
        
        const unsub = onValue(sessionRef, async (snapshot) => {
            if (isLoggingOutRef.current || isAuthenticatingRef.current) return;

            if (!snapshot.exists()) {
                console.warn("[Auth] Session record disappeared from database.");
                await executeForcedLogout(false, true);
                return;
            }

            const data = snapshot.val();
            if (data.deviceId !== currentDeviceId) {
                console.warn("[Auth] Remote device ID changed! Mismatch detected. Remote:", data.deviceId, "Local:", currentDeviceId);
                await executeForcedLogout(false, false);
            }
        }, (err) => {
            console.warn("[Auth] Session listener error:", err);
        });

        sessionUnsubRef.current = unsub;

        return () => {
            if (sessionUnsubRef.current) {
                sessionUnsubRef.current();
                sessionUnsubRef.current = null;
            }
        };
    }, [user?.uid, localSessionId, status, executeForcedLogout]);

    // 3. Heartbeat Lifecycle
    useEffect(() => {
        if (!user || isOffline || status !== "AUTHENTICATED") {
            if (heartbeatTimerRef.current) {
                clearInterval(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
            }
            return;
        }

        const runHeartbeat = async () => {
            if (isOffline || typeof window === "undefined" || isLoggingOutRef.current) return;

            try {
                const sessionHeartbeatRef = ref(rtdb, `sessions/${user.uid}/lastHeartbeat`);
                await set(sessionHeartbeatRef, serverTimestamp());
            } catch (e: any) {
                console.warn("[Auth] Heartbeat update failed:", e.message);
            }
        };

        runHeartbeat();
        heartbeatTimerRef.current = setInterval(runHeartbeat, 20000);

        return () => {
            if (heartbeatTimerRef.current) {
                clearInterval(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
            }
        };
    }, [user?.uid, isOffline, status]);

    // 4. Offline / Online Connectivity Listener
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleOnline = async () => {
            setIsOffline(false);
            console.log("[Auth] Network reconnected. Revalidating session...");
            
            const authUser = auth.currentUser;
            const currentSession = localStorage.getItem(SESSION_KEY);
            
            if (authUser && currentSession) {
                try {
                    const sessionRef = ref(rtdb, `sessions/${authUser.uid}`);
                    const snapshot = await get(sessionRef);
                    
                    if (snapshot.exists()) {
                        const currentDeviceId = getOrCreateDeviceId();
                        if (data.deviceId === currentDeviceId) {
                            console.log("[Auth] Session still valid after network recovery.");
                            return;
                        }
                    }
                } catch (e) {
                    console.warn("[Auth] Failed to revalidate session on reconnect:", e);
                }
                
                console.warn("[Auth] Session invalid on reconnect. Logging out.");
                await executeForcedLogout(false, true);
            }
        };

        const handleOffline = () => {
            setIsOffline(true);
            console.warn("[Auth] Network disconnected. Pausing session heartbeat.");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOffline(!navigator.onLine);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [executeForcedLogout]);
    // 5. Multi-Tab Sync & Broadcast Receiver
    useEffect(() => {
        if (typeof window === "undefined" || !myTabIdRef.current) return;

        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel("session_sync");
            channel.onmessage = async (e) => {
                if (e.data && e.data.type === "LOGOUT") {
                    console.warn("[Auth] Broadcast received: Session terminated on another tab.");
                    await executeForcedLogout();
                } else if (e.data && e.data.type === "TAB_OPENED" && e.data.tabId !== myTabIdRef.current) {
                    console.warn("[Auth] Another tab took over.");
                    setTabKickedOut(true);
                }
            };
            
            // Broadcast that we opened
            channel.postMessage({ type: "TAB_OPENED", tabId: myTabIdRef.current });
        } catch (e) {
            console.warn("[Auth] BroadcastChannel not supported.");
        }

        const syncLogout = async (e: StorageEvent) => {
            if (e.key === "spoorthy_active_tab" && e.newValue && e.newValue !== myTabIdRef.current) {
                setTabKickedOut(true);
            }
            if (e.key === SESSION_KEY) {
                const newId = localStorage.getItem(SESSION_KEY);
                if (localSessionId && (!newId || newId !== localSessionId)) {
                    console.warn("[Auth] Storage event: Session ID changed or cleared.");
                    if (!newId) {
                        // Logged out in another tab
                        await executeForcedLogout(false, false);
                    } else {
                        // Logged into a new session in another tab. 
                        // Instead of a jarring forced logout, smoothly sync or reload.
                        window.location.reload();
                    }
                }
            }
        };

        window.addEventListener("storage", syncLogout);
        
        // Announce our presence via localStorage fallback
        localStorage.setItem("spoorthy_active_tab", myTabIdRef.current);

        return () => {
            window.removeEventListener("storage", syncLogout);
            if (channel) {
                channel.close();
            }
        };
    }, [executeForcedLogout, localSessionId]);

    const takeOverTab = () => {
        if (typeof window === "undefined") return;
        myTabIdRef.current = safeRandomUUID();
        localStorage.setItem("spoorthy_active_tab", myTabIdRef.current);
        try {
            const channel = new BroadcastChannel("session_sync");
            channel.postMessage({ type: "TAB_OPENED", tabId: myTabIdRef.current });
            channel.close();
        } catch (e) {}
        setTabKickedOut(false);
    };

    // 4. Smart Redirect Logic
    useEffect(() => {
        if (deviceKickedOut || tabKickedOut || isLoggingOutRef.current) return;

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
                        console.warn("[Auth] Invalid role. Forcing logout.");
                        executeForcedLogout();
                    }
                } else if (!userData) {
                    console.warn("[Auth] Authenticated user has no profile data. Forcing logout.");
                    executeForcedLogout();
                }
            } else if (!user) {
                const isProtectedRoute = 
                    pathname.startsWith("/super-admin") ||
                    pathname.startsWith("/admin") ||
                    pathname.startsWith("/teacher") ||
                    pathname.startsWith("/student") ||
                    pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/notifications");
                
                if (isProtectedRoute) {
                    console.log("[Auth] Public user at protected path, forcing login.");
                    router.replace("/login");
                }
            }
        }
    }, [user, userData, loading, isInitialized, pathname, router, executeForcedLogout, deviceKickedOut, tabKickedOut]);

    const isAdmin = ['ADMIN', 'MANAGER', 'DEVELOPER', 'OWNER'].includes(String(userData?.role || "").toUpperCase());
    const isSuperAdmin = ['SUPER_ADMIN', 'SUPERADMIN'].includes(String(userData?.role || "").toUpperCase());

    // 4. Listen for Pending Leaves (Admins)
    useEffect(() => {
        if (isAdmin && !isDataQuarantined.current) {
            const studentLeavesQ = query(
                collection(db, "student_leaves"), 
                where("status", "==", "PENDING"),
                where("schoolId", "==", userData?.schoolId || "global")
            );
            const unsubStudentLeaves = onSnapshot(studentLeavesQ, (snap) => setPendingStudentLeaves(snap.size), (err) => {
                console.warn("[Auth] Student leaves sync error:", err.message);
                isDataQuarantined.current = true;
            });
            return () => unsubStudentLeaves();
        }
    }, [isAdmin, userData?.schoolId]);

    const signIn = async (email: string, pass: string) => {
        if (isLoggingOutRef.current || isAuthenticatingRef.current) return null;
        
        isAuthenticatingRef.current = true;
        setStatus("VALIDATING_SESSION");

        try {
            if (typeof window !== "undefined") {
                window.localStorage.removeItem("spoorthy_logging_out");
            }
            
            const result = await signInWithEmailAndPassword(auth, email, pass);
            if (!result.user) {
                throw new Error("Authentication failed.");
            }

            // 1. Generate session ID and local session ID
            const newSessionId = safeRandomUUID();
            const { browser, platform } = getBrowserAndPlatform();
            const deviceId = getOrCreateDeviceId();

            // 2. Fetch User Profile to get details (and verify activation)
            const tokenResult = await result.user.getIdTokenResult(false); // OPTIMIZED: Use cached token, it's fresh from login
            const claimRole = tokenResult.claims.role as string;
            
            let dataToStore: any = null;
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.status === "DEACTIVATED") {
                    throw new Error("Account is deactivated. Please contact administrator.");
                }
                dataToStore = { ...data, uid: result.user.uid };

                // Auto-resolve teacher branchId
                if (dataToStore.role === "TEACHER" && !dataToStore.branchId && dataToStore.schoolId) {
                    const teacherDoc = await getDoc(doc(db, "teachers", dataToStore.schoolId));
                    if (teacherDoc.exists()) {
                        const teacherData = teacherDoc.data();
                        if (teacherData.branchId) {
                            dataToStore.branchId = teacherData.branchId;
                            await setDoc(doc(db, "users", result.user.uid), { branchId: teacherData.branchId }, { merge: true });
                        }
                    }
                }

                // Auto-resolve student branchId
                if (dataToStore.role === "STUDENT" && !dataToStore.branchId && dataToStore.schoolId) {
                    const studentDoc = await getDoc(doc(db, "students", dataToStore.schoolId));
                    if (studentDoc.exists()) {
                        const studentData = studentDoc.data();
                        if (studentData.branchId) {
                            dataToStore.branchId = studentData.branchId;
                            await setDoc(doc(db, "users", result.user.uid), { branchId: studentData.branchId }, { merge: true });
                        }
                    }
                }
            } else {
                const studentDoc = await getDoc(doc(db, "students", result.user.uid));
                if (studentDoc.exists()) {
                    const data = studentDoc.data();
                    dataToStore = { ...data, uid: result.user.uid, role: "STUDENT" };
                }
            }

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

            // 3. Save Session ID Locally FIRST (prevents cross-tab race conditions)
            if (typeof window !== "undefined") {
                localStorage.setItem(SESSION_KEY, newSessionId);
            }
            setLocalSessionId(newSessionId);

            // 4. Write Session Document to RTDB 
            const sessionRef = ref(rtdb, `sessions/${result.user.uid}`);
            const sessionPayload: any = {
                sessionId: newSessionId,
                userId: result.user.uid,
                deviceId: deviceId,
                browser: browser,
                platform: platform,
                loginTime: serverTimestamp(),
                lastHeartbeat: serverTimestamp(),
                status: "active",
                appVersion: "1.2.5"
            };
            
            await set(sessionRef, sessionPayload);

            setUserData(dataToStore);
            setUser(result.user);
            setStatus("AUTHENTICATED");

            return dataToStore;
        } catch (error) {
            console.error("[Auth] Login failed:", error);
            // If partial login succeeded but profile fetch failed, cleanly sign out without reloading page
            if (auth.currentUser) {
                await firebaseSignOut(auth).catch(() => {});
            }
            setStatus("LOGGED_OUT");
            setUser(null);
            setUserData(null);
            setLocalSessionId(null);
            throw error;
        } finally {
            isAuthenticatingRef.current = false;
        }
    };

    const signOut = async () => {
        await executeForcedLogout(true);
    };

    const [warmedToken, setWarmedToken] = useState<{ token: string; expiry: number } | null>(null);

    // SPECULATIVE TOKEN WARMING (Zero-Latency Pillar)
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

        warm();
        const interval = setInterval(warm, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    const getFreshToken = async (forceRefresh = false) => {
        if (!user) return null;
        
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

    const callApi = async (url: string, options: RequestInit = {}) => {
        let token = await getFreshToken(false);
        
        const execute = async (authToken: string | null) => {
            const headers = new Headers(options.headers || {});
            if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
            
            return await fetch(url, { ...options, headers });
        };

        let response = await execute(token);

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

    if (status === "LOGGING_OUT") {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#0A192F] flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-8 h-8 border-4 border-[#64FFDA]/20 border-t-[#64FFDA] rounded-full animate-spin" />
                <p className="text-white/50 animate-pulse text-xs uppercase tracking-widest font-mono">Signing out securely...</p>
            </div>
        );
    }

    if (tabKickedOut) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#0A192F] flex flex-col items-center justify-center text-white space-y-6">
                <div className="w-16 h-16 bg-[#112240] rounded-2xl flex items-center justify-center border border-[#64FFDA]/30 shadow-[0_0_15px_rgba(100,255,218,0.2)]">
                    <svg className="w-8 h-8 text-[#64FFDA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-[#E6F1FF]">Session Active in Another Tab</h2>
                    <p className="text-[#8892B0] max-w-md">For security and data integrity, only one active tab is allowed per session. Please use the other tab or click below to use it here.</p>
                </div>
                <button 
                    onClick={takeOverTab}
                    className="px-6 py-3 bg-transparent border border-[#64FFDA] text-[#64FFDA] rounded-lg font-mono text-sm hover:bg-[#64FFDA]/10 transition-colors"
                >
                    USE HERE INSTEAD
                </button>
            </div>
        );
    }

    if (deviceKickedOut) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#0A192F] flex flex-col items-center justify-center text-white space-y-6 p-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-[#E6F1FF]">Session Expired</h2>
                    <p className="text-[#8892B0] max-w-md">Your account was logged in from another device. For your security, this session has been terminated.</p>
                </div>
                <button 
                    onClick={() => window.location.href = "/login"}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition-colors"
                >
                    RETURN TO LOGIN PAGE
                </button>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            userData, 
            role: userData?.role || "", 
            branchId: userData?.branchId || userData?.schoolId || null,
            isAdmin, 
            isSuperAdmin,
            loading, 
            status,
            isOffline,
            signIn, 
            signOut, 
            getFreshToken, 
            callApi 
        }}>
            {children}
            {isOffline && (
                <div className="fixed bottom-4 right-4 z-[9999] bg-amber-500 text-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-400 font-sans font-bold text-xs animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-black animate-ping" />
                    <span>Connection Lost. Reconnecting...</span>
                </div>
            )}
            <div className="hidden">{pendingStudentLeaves}</div>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
