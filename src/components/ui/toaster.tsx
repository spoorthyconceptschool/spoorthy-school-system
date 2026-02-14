'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, ToastType } from '@/lib/toast-store';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
};

const styles: Record<ToastType, string> = {
    success: 'bg-zinc-950/90 border-emerald-500/50 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]',
    error: 'bg-zinc-950/90 border-red-500/50 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]',
    info: 'bg-zinc-950/90 border-blue-500/50 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]',
    warning: 'bg-zinc-950/90 border-amber-500/50 shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]',
};

export function Toaster() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none p-4 sm:p-0">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={cn(
                            "pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-xl border p-4 shadow-xl pr-10 backdrop-blur-md transition-all",
                            toast.type ? styles[toast.type] : "bg-zinc-950/90 border-white/10 text-white"
                        )}
                    >
                        {toast.type && (
                            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
                        )}

                        <div className="flex-1 grid gap-1">
                            {toast.title && (
                                <div className={cn("text-sm font-bold leading-tight", toast.type === 'error' ? "text-red-200" : "text-white")}>
                                    {toast.title}
                                </div>
                            )}
                            {toast.description && (
                                <div className="text-xs text-zinc-400 leading-relaxed font-medium">
                                    {toast.description}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="absolute right-3 top-3 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
