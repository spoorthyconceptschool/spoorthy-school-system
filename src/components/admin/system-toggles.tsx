"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { Terminal, FlaskConical, ShieldAlert, Loader2 } from "lucide-react";

export function SystemToggles() {
    const { systemConfig } = useMasterData();
    const [updating, setUpdating] = useState(false);

    const toggleTestingMode = async (enabled: boolean) => {
        setUpdating(true);
        try {
            await setDoc(doc(db, "config", "system"), {
                ...systemConfig,
                testingMode: enabled
            }, { merge: true });
            toast({
                title: enabled ? "Testing Mode Active" : "Testing Mode Disabled",
                description: enabled ? "Developer tools and seed buttons are now visible." : "System is now in production view.",
                type: "success"
            });
        } catch (e: any) {
            toast({ title: "Update Failed", description: e.message, type: "error" });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Card className="bg-[#0A192F]/50 border-[#64FFDA]/10 backdrop-blur-sm overflow-hidden group">
            <CardHeader className="border-b border-[#64FFDA]/5 bg-[#64FFDA]/5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#64FFDA]/10 flex items-center justify-center text-[#64FFDA]">
                        <Terminal size={20} />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-display text-white italic">Developer <span className="text-[#64FFDA]">Environment</span></CardTitle>
                        <CardDescription className="text-[10px] uppercase tracking-widest text-[#64FFDA]/60 font-bold">System Level Diagnostics</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#0A192F]/40 border border-[#64FFDA]/10 transition-all hover:border-[#64FFDA]/30">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FlaskConical size={16} className="text-purple-400" />
                            <Label htmlFor="testing-mode" className="text-sm font-bold text-white uppercase tracking-wider">Testing Mode</Label>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                            Enable this to show data seeding buttons and scale-testing tools in the topbar.
                        </p>
                    </div>
                    <div className="relative">
                        {updating && <Loader2 className="absolute -left-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#64FFDA]" />}
                        <Switch
                            id="testing-mode"
                            checked={systemConfig.testingMode}
                            onCheckedChange={toggleTestingMode}
                            disabled={updating}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <ShieldAlert size={14} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-500/80 font-medium">
                        Testing mode should be disabled in production unless you are performing maintenance or seeding demo data.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
