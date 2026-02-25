"use client";

import { useEffect, useState } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Button } from "@/components/ui/button";
import { RefreshCw, DownloadCloud } from "lucide-react";

export function LiveUpdatePrompt() {
    const [initialVersion, setInitialVersion] = useState<number | null>(null);
    const [currentVersion, setCurrentVersion] = useState<number | null>(null);

    useEffect(() => {
        const versionRef = ref(rtdb, 'system/liveVersion');

        const unsub = onValue(versionRef, (snap) => {
            const val = snap.val();
            if (val) {
                // First load -> sync the initial version
                if (initialVersion === null) {
                    setInitialVersion(val);
                    setCurrentVersion(val);
                } else {
                    // Update happened while the app was open!
                    setCurrentVersion(val);
                }
            }
        });

        return () => unsub();
    }, [initialVersion]);

    const isUpdateAvailable = initialVersion !== null && currentVersion !== null && currentVersion > initialVersion;

    if (!isUpdateAvailable) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500 w-[90%] max-w-sm">
            <div className="bg-indigo-600/95 backdrop-blur-xl border border-indigo-400/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative overflow-hidden">
                {/* Shiny glowing effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/30 blur-3xl rounded-full" />

                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-white/10 rounded-xl shrink-0">
                        <DownloadCloud className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">App Update Available</span>
                        <span className="text-xs text-indigo-100/80">Get the latest features and data!</span>
                    </div>
                </div>

                <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-white text-indigo-600 hover:bg-zinc-100 active:scale-95 transition-all shadow-xl font-bold h-10 mt-1 relative z-10"
                >
                    <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Update Now
                </Button>
            </div>
        </div>
    );
}
