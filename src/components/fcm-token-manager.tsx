"use client";

import { useEffect } from "react";
import { messaging, db } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc, arrayUnion, setDoc } from "firebase/firestore";
import { toast } from "@/lib/toast-store"; // Assuming you have a toast store

export function FCMTokenManager() {
    const { user } = useAuth();

    useEffect(() => {
        // 1. Basic Checks
        if (typeof window === "undefined" || !user || !messaging) return;

        // 2. Request Permission & Get Token
        const registerToken = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    console.log("Notification permission denied");
                    return;
                }

                // Get Token
                // Note: If you have a VAPID key, pass it here: { vapidKey: "YOUR_PUBLIC_VAPID_KEY" }
                // For now, we try default. If it fails, we need the user to generate a key pair in Firebase Console.
                const token = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });

                if (token) {
                    console.log("FCM Token:", token);
                    // Save to User Profile
                    const userRef = doc(db, "users", user.uid);

                    // Helper to save token safely
                    try {
                        await updateDoc(userRef, {
                            fcmTokens: arrayUnion(token),
                            lastFcmTokenAt: new Date()
                        });
                    } catch (err: any) {
                        // If document doesn't exist, create it (rare for existing users, but safe)
                        if (err.code === 'not-found') {
                            await setDoc(userRef, {
                                fcmTokens: [token],
                                uid: user.uid,
                                email: user.email,
                                role: "UNKNOWN", // Default
                                lastFcmTokenAt: new Date()
                            });
                        } else {
                            console.error("Error saving FCM token to Firestore:", err);
                        }
                    }
                }
            } catch (err) {
                console.error("FCM Token Registration Failed:", err);
            }
        };

        registerToken();

        // 3. Foreground Message Listener
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground Notification Received:", payload);
            if (payload.notification) {
                toast({
                    title: payload.notification.title || "New Notification",
                    description: payload.notification.body,
                    type: "info" // or 'default'
                });

                // Optional: Play sound
                try {
                    const audio = new Audio('/sounds/notification.mp3'); // Ensure this exists or remove
                    audio.play().catch(() => { });
                } catch (e) { }
            }
        });

        return () => unsubscribe();
    }, [user]);

    return null;
}
