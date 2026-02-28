"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Database,
    UploadCloud,
    ShieldAlert,
    Search,
    ChevronDown
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SeedDataButton() {
    const [loading, setLoading] = useState(false);
    const [settingLogins, setSettingLogins] = useState(false);
    const [confirmingLogins, setConfirmingLogins] = useState(false);

    const setupLogins = async () => {
        if (!confirmingLogins) {
            setConfirmingLogins(true);
            setTimeout(() => setConfirmingLogins(false), 3000); // Reset after 3s
            return;
        }

        setSettingLogins(true);
        setConfirmingLogins(false);
        try {
            const res = await fetch("/api/admin/demo/setup-logins", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                toast({ title: "Logins Ready", description: data.message, type: "success" });
            } else {
                throw new Error(data.error || "API failed");
            }
        } catch (e: any) {
            toast({ title: "Failed", description: e.message, type: "error" });
        } finally {
            setSettingLogins(false);
        }
    };

    const seedData = async () => {
        const ok = window.confirm("This will purge existing data and seed 200 fresh students. Continue?");
        if (!ok) return;

        setLoading(true);
        try {
            const res = await fetch("/api/setup-data");
            const data = await res.json();
            if (data.success) {
                toast({ title: "System Ready", description: "Successfully seeded 200 students.", type: "success" });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error(data.error || "Seeding failed");
            }
        } catch (e: any) {
            toast({ title: "Seed Failed", description: e.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const reindexSearch = async () => {
        const ok = window.confirm("Rebuild global search index?");
        if (!ok) return;

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/search/reindex", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: "Re-indexing Started", description: data.message, type: "success" });
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            toast({ title: "Re-index Failed", description: e.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-full border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 transition-all font-mono"
                    disabled={loading || settingLogins}
                >
                    {loading || settingLogins ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">System Tools</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-white p-1 rounded-xl shadow-2xl">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Testing & Maintenance</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />

                <DropdownMenuItem onClick={seedData} className="rounded-lg gap-2 py-2 px-3 focus:bg-white/5 cursor-pointer">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold">Seed Demo Data</span>
                        <span className="text-[9px] text-muted-foreground">Rebuild 200 student ecosystem</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={setupLogins} className="rounded-lg gap-2 py-2 px-3 focus:bg-white/5 cursor-pointer">
                    {confirmingLogins ? <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" /> : <UploadCloud className="w-4 h-4 text-blue-400" />}
                    <div className="flex flex-col">
                        <span className={cn("text-xs font-bold", confirmingLogins && "text-amber-500")}>
                            {confirmingLogins ? "Confirm Login Setup" : "Setup All Logins"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">Provision Auth accounts</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={reindexSearch} className="rounded-lg gap-2 py-2 px-3 focus:bg-white/5 cursor-pointer">
                    <Search className="w-4 h-4 text-purple-400" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold">Reindex Search</span>
                        <span className="text-[9px] text-muted-foreground">Refresh global search cache</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
