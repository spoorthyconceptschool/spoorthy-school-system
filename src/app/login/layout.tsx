"use client";

import { AuthProvider } from "@/context/AuthContext";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
