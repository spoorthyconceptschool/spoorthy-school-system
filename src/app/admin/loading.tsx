import { Loader2 } from "lucide-react";

export default function AdminLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-emerald-500/20 rounded-full" />
            </div>
            <div className="flex flex-col items-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500 animate-pulse">Initializing</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Establishing Secure Connection</p>
            </div>
        </div>
    );
}
