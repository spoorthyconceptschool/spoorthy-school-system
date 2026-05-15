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
        // Prefetch core routes on idle
        const prefetchCore = () => {
            const routes = ["/login", "/admissions/apply", "/about", "/contact"];
            routes.forEach(route => {
                router.prefetch(route);
            });
        };

        if (window.requestIdleCallback) {
            window.requestIdleCallback(prefetchCore);
        } else {
            setTimeout(prefetchCore, 2000);
        }
    }, [router]);

    return null;
}
