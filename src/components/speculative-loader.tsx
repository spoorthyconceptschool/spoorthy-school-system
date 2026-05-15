"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Speculative Loader (Zero-Latency Pillar)
 * Predicts the user's next destination and prefetches it.
 */
export function SpeculativeLoader() {
    const router = useRouter();

    useEffect(() => {
        // 1. Idle Prefetching for Core Routes
        const prefetchCore = () => {
            const routes = [
                "/admin", 
                "/admin/students", 
                "/admin/fees/pending",
                "/admin/accounting",
                "/login"
            ];
            routes.forEach(route => router.prefetch(route));
        };

        if (window.requestIdleCallback) {
            window.requestIdleCallback(prefetchCore);
        } else {
            setTimeout(prefetchCore, 1000);
        }

        // 2. High-Intent Hover Prefetching
        const handleHover = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest("a");
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                const path = link.pathname;
                if (path && path !== window.location.pathname) {
                    router.prefetch(path);
                }
            }
        };

        document.addEventListener("mouseover", handleHover, { passive: true });
        return () => document.removeEventListener("mouseover", handleHover);
    }, [router]);

    return null;
}
