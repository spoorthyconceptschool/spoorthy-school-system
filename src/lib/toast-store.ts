import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    type?: ToastType;
    duration?: number;
    timestamp?: number;
}

interface ToastState {
    toasts: Toast[];
    history: Toast[];
    addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
    removeToast: (id: string) => void;
    dismissToast: (id: string) => void;
    clearHistory: () => void;
    removeFromHistory: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    history: [],
    addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { ...toast, id, timestamp: Date.now() };

        set((state) => ({
            toasts: [...state.toasts, newToast],
            history: [newToast, ...state.history].slice(0, 50), // Keep last 50
        }));

        if (toast.duration !== Infinity) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, toast.duration || 5000);
        }
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
    dismissToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
    clearHistory: () => set({ history: [] }),
    removeFromHistory: (id) =>
        set((state) => ({
            history: state.history.filter((t) => t.id !== id),
        })),
}));

export const toast = (props: Omit<Toast, 'id'>) => useToastStore.getState().addToast(props);
