"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Database, UploadCloud, ShieldAlert, Search } from "lucide-react";
import { collection, doc, writeBatch, Timestamp, addDoc, query, where, getDocs, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";
import { ref as rtdbRef, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { cn } from "@/lib/utils";

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
        console.log("Starting setupLogins...");
        try {
            const res = await fetch("/api/admin/demo/setup-logins", { method: "POST" });
            const data = await res.json();
            console.log("Setup Logins API Response:", data);
            if (data.success) {
                toast({ title: "Logins Ready", description: data.message, type: "success" });
            } else {
                throw new Error(data.error || "API failed without error message");
            }
        } catch (e: any) {
            console.error("Setup Logins Error:", e);
            toast({ title: "Failed", description: e.message, type: "error" });
        } finally {
            setSettingLogins(false);
        }
    };

    const seedData = async () => {
        console.log("Ultimate Seed initiated. Requesting ecosystem rebuild...");
        setLoading(true);

        try {
            const res = await fetch("/api/admin/demo/super-seed");
            const data = await res.json();

            if (data.success) {
                console.log("Ultimate Seed Response:", data);
                toast({
                    title: "System Rebuilt",
                    description: `Successfully seeded master data, students, teachers, and finances in ${data.duration}.`,
                    type: "success"
                });

                // Optional: Trigger a refresh after a small delay to let RTDB listeners settle
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error(data.error || "Seeding API failed");
            }
        } catch (e: any) {
            console.error("Seed Data Error:", e);
            toast({ title: "Seed Failed", description: e.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button onClick={seedData} variant="outline" className="border-dashed" disabled={loading || settingLogins}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                Seed Data
            </Button>
            <Button
                onClick={setupLogins}
                variant="outline"
                className={cn(
                    "transition-all duration-300",
                    confirmingLogins ? "border-amber-500 text-amber-500 animate-pulse" : "border-emerald-500/50 text-emerald-500"
                )}
                disabled={loading || settingLogins}
            >
                {settingLogins ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : confirmingLogins ? (
                    <ShieldAlert className="w-4 h-4 mr-2" />
                ) : (
                    <UploadCloud className="w-4 h-4 mr-2" />
                )}
                {confirmingLogins ? "Confirm?" : "Setup Logins"}
            </Button>
            <Button
                onClick={async () => {
                    const confirm = window.confirm("This will rebuild the global search index. Continue?");
                    if (!confirm) return;
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
                }}
                variant="outline"
                className="border-blue-500/50 text-blue-400"
                disabled={loading || settingLogins}
            >
                <Search className="w-4 h-4 mr-2" />
                Reindex Search
            </Button>
        </div>
    );
}
