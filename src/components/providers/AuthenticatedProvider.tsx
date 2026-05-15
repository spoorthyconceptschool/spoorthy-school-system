"use client";

import { AuthProvider } from "@/context/AuthContext";
import { MasterDataProvider } from "@/context/MasterDataContext";
import { NotificationManager } from "@/components/notification-manager";
import { FCMTokenManager } from "@/components/fcm-token-manager";
import { InstallPrompt } from "@/components/install-prompt";
import { LiveUpdatePrompt } from "@/components/live-update-prompt";
import { Toaster } from "@/components/ui/toaster";

export function AuthenticatedProvider({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <MasterDataProvider>
                {children}
                <NotificationManager />
                <FCMTokenManager />
                <InstallPrompt />
                <LiveUpdatePrompt />
            </MasterDataProvider>
            <Toaster />
        </AuthProvider>
    );
}
