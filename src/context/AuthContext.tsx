"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

/**
 * Defines the shape of the global authentication state and available actions.
 */
interface AuthContextType {
    /** The raw Firebase Auth User object. */
    user: User | null;
    /** Extended user profile attributes from the 'users' Firestore collection. */
    userData: any | null;
    /** Computed permission role (e.g., 'ADMIN', 'STUDENT'). */
    role: string;
    /** Whether the user has any administrative role. */
    isAdmin: boolean;
    /** Global authentication loading state. */
    loading: boolean;
    /** Function to execute email/password sign-in. */
    signIn: (email: string, pass: string) => Promise<void>;
    /** Function to sign out and clear local caches. */
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ isAdmin: false } as AuthContextType);

const STORAGE_KEY = "spoorthy_user_cache";

/**
 * Global authentication provider that handles session persistence and role hydration.
 * This component monitors the Firebase Auth state and synchronizes it with 
 * the school's internal user directory automatically.
 */
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
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.status !== "ACTIVE") {
                            await firebaseSignOut(auth);
                            setUser(null);
                            setUserData(null);
                            localStorage.removeItem(STORAGE_KEY);
                            router.push("/login?error=account_deactivated");
                        } else {
                            const uData = { ...data, uid: authUser.uid };
                            setUser(authUser);
                            setUserData(uData);
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(uData));
                        }
                    } else {
                        // User exists in Auth but not in Firestore users collection
                        setUser(authUser);
                    }
                } catch (err: any) {
                    console.warn("[Auth] Context user data fetch failed:", err.message);
                }
            } else {
                setUser(null);
                setUserData(null);
                localStorage.removeItem(STORAGE_KEY);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, pass: string) => {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        if (result.user) {
            setUser(result.user);
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.status !== "ACTIVE") {
                    await firebaseSignOut(auth);
                    setUser(null);
                    throw new Error("Account is deactivated. Please contact administrator.");
                }
                const uData = { ...data, uid: result.user.uid };
                setUserData(uData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(uData));
            }
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUserData(null);
        localStorage.removeItem(STORAGE_KEY);
        router.push("/login");
    };

    if (!mounted) {
        return <div className="min-h-screen bg-[#0A192F]" />;
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'DEVELOPER', 'MANAGER'].includes(String(userData?.role || "").toUpperCase());

    return (
        <AuthContext.Provider value={{ user, userData, role: userData?.role || "", isAdmin, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Convenience hook to access the current authenticated user and their permissions.
 * @returns The global Authentication context state.
 */
export const useAuth = () => useContext(AuthContext);
