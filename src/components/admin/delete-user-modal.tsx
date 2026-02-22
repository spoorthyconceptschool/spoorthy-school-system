"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Lock, Trash2, Archive, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";

/**
 * Props for the DeleteUserModal
 * @param user - The user object (id, name, schoolId, role)
 * @param checkEligibility - Async function returning { canDelete: boolean, reason: string }
 * @param onDeactivate - Async function to handle deactivation
 * @param onDelete - Async function to handle hard delete
 */
interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string; // Firestore Doc ID
        schoolId: string; // Display ID (SCSS...)
        name: string;
        role: "student" | "teacher" | "admin" | "manager" | "timetable_editor" | string;
        isDemo?: boolean;
    };
    checkEligibility: () => Promise<{ canDelete: boolean; reason?: string }>;
    onDeactivate: (reason: string) => Promise<void>;
    onDelete: (reason: string) => Promise<void>;
}

export function DeleteUserModal({
    isOpen,
    onClose,
    user,
    checkEligibility,
    onDeactivate,
    onDelete
}: DeleteUserModalProps) {
    const [mode, setMode] = useState<"deactivate" | "delete">("deactivate");
    const [isLoading, setIsLoading] = useState(false);
    const [eligibility, setEligibility] = useState<{ canDelete: boolean; reason?: string } | null>(null);
    const [confirmationText, setConfirmationText] = useState("");
    const [reason, setReason] = useState("");

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setMode("deactivate");
            setConfirmationText("");
            setReason("");
            setEligibility(null);
            checkEligibility().then(setEligibility);
        }
    }, [isOpen, checkEligibility]);

    const targetPhrase = "DELETE";
    const isDeleteMatched = confirmationText === targetPhrase;



    const handleAction = async () => {
        if (mode === "delete" && !isDeleteMatched) return;

        setIsLoading(true);
        try {
            if (mode === "deactivate") {
                await onDeactivate(reason || "Admin request");
                toast({
                    title: "User Deactivated",
                    description: `${user.name} has been deactivated.`,
                    type: "success"
                });
            } else {
                await onDelete(reason || "Admin request");
                toast({
                    title: "User Deleted",
                    description: `${user.name} has been permanently deleted.`,
                    type: "success"
                });
            }
            onClose();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Action Failed",
                description: error.message || "Something went wrong. Please try again.",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-black/95 border-white/10 text-white backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {mode === "delete" ? (
                            <span className="text-red-500 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Permanent Delete</span>
                        ) : (
                            <span className="text-yellow-500 flex items-center gap-2"><Archive className="w-5 h-5" /> Deactivate User</span>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Managing access for <span className="text-white font-medium">{user.name}</span> ({user.schoolId})
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">

                    {/* Mode Selection Tabs */}
                    <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={() => setMode("deactivate")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                mode === "deactivate" ? "bg-yellow-500/20 text-yellow-500" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Archive className="w-4 h-4" /> Deactivate
                        </button>
                        <button
                            onClick={() => setMode("delete")}
                            disabled={!eligibility?.canDelete && !user.isDemo}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                mode === "delete"
                                    ? "bg-red-500/20 text-red-500"
                                    : (!eligibility?.canDelete && !user.isDemo ? "opacity-90 cursor-not-allowed text-zinc-600" : "text-zinc-500 hover:text-zinc-300")
                            )}
                        >
                            {(!eligibility?.canDelete && !user.isDemo) && <Lock className="w-3 h-3" />} <Trash2 className="w-4 h-4" /> Hard Delete
                        </button>
                    </div>

                    {/* Deactivate Content */}
                    {mode === "deactivate" && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <Alert className="bg-yellow-500/10 border-yellow-500/20">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <AlertTitle className="text-yellow-500">Recommended Action</AlertTitle>
                                <AlertDescription className="text-yellow-500/80 text-xs">
                                    Deactivation immediately revokes login access but preserves historical records (payments, grades, etc.). This is reversible.
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-zinc-500">Reason (Optional)</Label>
                                <Input
                                    className="bg-black/40 border-white/10"
                                    placeholder="e.g. Graduated, Left School"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Delete Content */}
                    {mode === "delete" && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            {!eligibility?.canDelete && !user.isDemo ? (
                                <Alert className="bg-red-900/20 border-red-500/20">
                                    <Lock className="h-4 w-4 text-red-500" />
                                    <AlertTitle className="text-red-500">Deletion Blocked</AlertTitle>
                                    <AlertDescription className="text-red-400/80 text-xs mt-1">
                                        {eligibility?.reason || "This user has linked records and cannot be hard deleted."}
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <Alert className="bg-red-500/10 border-red-500/20">
                                        <BannerAlertIcon />
                                        <AlertTitle className="text-red-500 font-bold">ACCOUNT DELETION (ARCHIVE)</AlertTitle>
                                        <AlertDescription className="text-red-500/80 text-xs mt-1">
                                            This action will deactivate the user account and mark it as <strong>DELETED</strong>.
                                            All data will be archived and preserved. The user will no longer be able to log in.
                                            <br className="my-2" />
                                            This action can be reversed by an administrator.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-red-400">Type Confirmation</Label>
                                        <div className="bg-black/40 p-2 rounded border border-red-500/20 text-center font-mono text-xs select-all text-red-300">
                                            {targetPhrase}
                                        </div>
                                        <Input
                                            className="bg-black/40 border-red-500/30 text-red-500 focus-visible:ring-red-500"
                                            placeholder={targetPhrase}
                                            value={confirmationText}
                                            onChange={e => setConfirmationText(e.target.value)}
                                            onPaste={e => e.preventDefault()}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button
                        disabled={isLoading || (mode === "delete" && !isDeleteMatched)}
                        className={cn(
                            mode === "delete"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-yellow-600 hover:bg-yellow-700 text-white"
                        )}
                        onClick={handleAction}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {mode === "delete" ? "Delete Permanently" : "Confirm Deactivation"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BannerAlertIcon() {
    return <AlertTriangle className="h-4 w-4 text-red-500" />
}
