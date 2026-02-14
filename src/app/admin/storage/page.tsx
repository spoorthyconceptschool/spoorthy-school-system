"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Trash2, Database, AlertTriangle, LogOut, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { ref as rtdbRef, set, remove } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";

export default function StoragePurgePage() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [confirmation, setConfirmation] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"IDLE" | "DONE">("IDLE");
    const [successMsg, setSuccessMsg] = useState("");

    const handleReset = async () => {
        if (confirmation.trim() !== "DELETE ALL DATA") return;
        setIsLoading(true);

        try {
            if (!user) { alert("Login required"); setIsLoading(false); return; }

            setSuccessMsg("Starting Client-Side Purge...");

            // 1. RTDB WIPE (Master Data)
            const rtdbPaths = ["master", "siteContent", "analytics", "notifications", "chats", "presence", "config", "settings", "demo_state"];
            await Promise.all(rtdbPaths.map(path => remove(rtdbRef(rtdb, path))));

            // 2. FIRESTORE WIPE
            const collections = [
                "students", "teachers", "staff", "usersBySchoolId", "designations",
                "student_fee_ledgers", "payments", "invoices", "transactions", "fee_structures", "fee_types",
                "attendance", "leaves", "class_timetables", "teacher_schedules", "substitutions",
                "homework", "homework_submissions", "exam_results", "grades", "subjects",
                "announcements", "events", "notifications", "audit_logs", "notices", "reports",
                "feedback", "enquiries", "applications", "config", "villages", "classes", "sections",
                "leave_requests", "payroll", "salary_adjustments", "salary_payments", "expenses",
                "custom_fees", "master_classes", "search_index", "site_config", "vouchers"
            ];

            let count = 0;
            for (const col of collections) {
                const snap = await getDocs(collection(db, col));
                if (snap.empty) continue;

                const batch = writeBatch(db);
                snap.docs.forEach(doc => {
                    batch.delete(doc.ref);
                    count++;
                });
                await batch.commit();
            }

            // 3. USERS COLLECTION (Exclude current admin)
            const usersSnap = await getDocs(collection(db, "users"));
            const userBatch = writeBatch(db);
            let userCount = 0;
            usersSnap.docs.forEach(d => {
                const dData = d.data();
                const email = dData.email?.toLowerCase();
                if (d.id !== user.uid && email !== "spoorthy@school.local") {
                    userBatch.delete(d.ref);
                    userCount++;
                }
            });
            if (userCount > 0) await userBatch.commit();


            setSuccessMsg(`Purge Complete! Deleted ${count} records and ${userCount} users via Client Connection.`);
            setStep("DONE");

        } catch (err: any) {
            console.error("Client Purge Error:", err);
            alert("Error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    console.log("Rendering StoragePurgePage (Client Mode)");

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="font-display text-3xl font-bold">Storage & Purge</h1>
                <p className="text-muted-foreground">Manage system storage and perform data retention tasks.</p>
            </div>

            {/* Storage Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                            <Database className="w-5 h-5" />
                        </div>
                        <h3 className="font-medium">Total Storage</h3>
                    </div>
                    <p className="text-2xl font-bold">-- / 5 GB</p>
                    <p className="text-xs text-muted-foreground mt-1">Files, Backups, & Media</p>
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="border border-red-500/30 bg-red-500/5 rounded-xl overflow-hidden">
                <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-2">
                    <AlertTriangle className="text-red-500 w-5 h-5" />
                    <h2 className="font-bold text-red-500">Danger Zone: Factory Reset</h2>
                </div>

                <div className="p-6 space-y-6">
                    {step === "IDLE" ? (
                        <>
                            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-200">
                                <AlertTitle>This action is irreversible</AlertTitle>
                                <AlertDescription>
                                    Performing a Factory Reset will permanently delete <strong>ALL</strong> data including students, teachers, payments, and settings.
                                    <br /><br />
                                    <strong>Only Admin Accounts will be preserved.</strong> Use this only for a fresh start.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-red-400">
                                        Type <span className="font-mono font-bold select-all">DELETE ALL DATA</span> to confirm
                                    </label>
                                    <Input
                                        value={confirmation}
                                        onChange={(e) => setConfirmation(e.target.value)}
                                        className="bg-black/40 border-red-500/30 text-red-500 font-mono placeholder:text-red-500/30"
                                        placeholder="DELETE ALL DATA"
                                    />
                                </div>

                                <Button
                                    variant="destructive"
                                    className="w-full gap-2"
                                    disabled={confirmation.trim() !== "DELETE ALL DATA" || isLoading}
                                    onClick={handleReset}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    {isLoading ? "Purging via Client Connection..." : "NUCLEAR RESET (CLIENT MODE)"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 space-y-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            <h3 className="text-2xl font-bold text-green-500">System Reset Complete</h3>
                            <p className="text-green-400/80 font-mono text-sm max-w-lg mx-auto">
                                {successMsg}
                            </p>
                            <Button
                                onClick={async () => {
                                    await signOut();
                                    router.push('/login');
                                }}
                                variant="outline"
                                className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout & Refresh
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
