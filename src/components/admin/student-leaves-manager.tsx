
"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Loader2, Check, X, RotateCcw, CalendarDays, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

export function StudentLeavesManager() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "student_leaves"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLeaves(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Student Leaves Listener Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAction = async (leaveId: string, action: "APPROVE" | "REJECT" | "REVERT") => {
        if (!user) return;

        let reason = "";
        if (action === "REJECT") {
            reason = prompt("Reason for rejection:") || "";
            if (!reason) return;
        }

        if (!confirm(`Confirm ${action.toLowerCase()} this leave request?`)) return;

        setActioning(leaveId);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/student-leaves/action", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ leaveId, action, reason })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: "Success", description: `Leave ${action.toLowerCase()}d`, type: "success" });
            } else {
                toast({ title: "Error", description: data.error, type: "error" });
            }
        } catch (e: any) {
            toast({ title: "Processing Error", description: e.message, type: "error" });
        } finally {
            setActioning(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <DataTable
                    data={leaves}
                    isLoading={loading}
                    columns={[
                        {
                            key: "studentInfo",
                            header: "Student",
                            render: (leave: any) => (
                                <div className="flex flex-col">
                                    <span className="font-bold text-white text-sm">{leave.studentName}</span>
                                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">{leave.studentId} • {leave.className}</span>
                                </div>
                            )
                        },
                        {
                            key: "dates",
                            header: "Duration",
                            render: (leave: any) => (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-white/80">
                                        {leave.fromDate === leave.toDate
                                            ? formatDateToDDMMYYYY(leave.fromDate)
                                            : `${formatDateToDDMMYYYY(leave.fromDate)} to ${formatDateToDDMMYYYY(leave.toDate)}`
                                        }
                                    </span>
                                    <Badge variant="outline" className="w-fit h-4 text-[8px] uppercase font-black border-white/5 bg-white/5 text-muted-foreground px-1">
                                        {leave.type || "Personal"}
                                    </Badge>
                                </div>
                            )
                        },
                        {
                            key: "reason",
                            header: "Reason",
                            render: (leave: any) => (
                                <div className="text-sm text-white/60 italic max-w-xs truncate" title={leave.reason}>
                                    "{leave.reason}"
                                </div>
                            )
                        },
                        {
                            key: "status",
                            header: "Status",
                            cellClassName: "text-center",
                            render: (leave: any) => (
                                <Badge className={cn(
                                    "text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none",
                                    leave.status === "PENDING" ? "bg-amber-500/10 text-amber-500" :
                                        leave.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" :
                                            "bg-red-500/10 text-red-400"
                                )}>
                                    {leave.status}
                                </Badge>
                            )
                        }
                    ]}
                    actions={(leave: any) => (
                        <div className="flex items-center justify-end gap-1 p-1">
                            {leave.status === "PENDING" ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-lg hover:bg-emerald-500/20 text-emerald-400 p-0"
                                        onClick={() => handleAction(leave.id, "APPROVE")}
                                        disabled={actioning === leave.id}
                                        title="Approve"
                                    >
                                        {actioning === leave.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-lg hover:bg-red-500/20 text-red-400 p-0"
                                        onClick={() => handleAction(leave.id, "REJECT")}
                                        disabled={actioning === leave.id}
                                        title="Reject"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/40 p-0"
                                    onClick={() => handleAction(leave.id, "REVERT")}
                                    disabled={actioning === leave.id}
                                    title="Revert to Pending"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    )}
                />

                {!loading && leaves.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10">
                            <CalendarDays className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-muted-foreground italic">No student leave requests pending.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
