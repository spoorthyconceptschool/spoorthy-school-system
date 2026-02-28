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

interface AuthContextType {
    user: User | null;
    userData: any | null;
    role: string;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const STORAGE_KEY = "spoorthy_user_cache";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Hydrate from cache on mount
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            try {
                setUserData(JSON.parse(cached));
            } catch (e) {
                console.warn("Auth cache corrupted");
            }
        }
    }, []);
    const router = useRouter();

    useEffect(() => {
        // Background refresh only, initial state is already set from cache above

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);
                // Background refresh
                try {
                    const userDoc = await getDoc(doc(db, "users", authUser.uid));
                    if (userDoc.exists()) {
                        const data = { ...userDoc.data(), uid: authUser.uid };
                        setUserData(data);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("Auth context user data fetch failed", err);
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
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (userDoc.exists()) {
                const data = { ...userDoc.data(), uid: result.user.uid };
                setUserData(data);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

    return (
        <AuthContext.Provider value={{ user, userData, role: userData?.role || "", loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
