"use client";

import { NotificationManager } from "@/components/notification-manager";
import { FCMTokenManager } from "@/components/fcm-token-manager";
import { InstallPrompt } from "@/components/install-prompt";
import { LiveUpdatePrompt } from "@/components/live-update-prompt";
import { Toaster } from "@/components/ui/toaster";

export function AuthenticatedProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <NotificationManager />
            <FCMTokenManager />
            <InstallPrompt />
            <LiveUpdatePrompt />
        </>
    );
}
