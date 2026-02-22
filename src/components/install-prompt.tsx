"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Check for iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);
        if (isIosDevice) {
            // Show iOS instructions after a delay
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }

        // Handle Android/Desktop "beforeinstallprompt"
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setDeferredPrompt(null);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
            >
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4">
                    <div className="p-3 bg-accent/10 rounded-xl shrink-0">
                        <Smartphone className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-white text-sm">Install App</h4>
                        <p className="text-xs text-white/60 leading-relaxed">
                            {isIOS
                                ? "Tap the Share button and select 'Add to Home Screen' for the best experience."
                                : "Install our app for easier access and better performance."}
                        </p>
                        {!isIOS && (
                            <Button
                                onClick={handleInstall}
                                size="sm"
                                className="mt-2 w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs h-8"
                            >
                                <Download className="w-3 h-3 mr-2" />
                                Install Now
                            </Button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
