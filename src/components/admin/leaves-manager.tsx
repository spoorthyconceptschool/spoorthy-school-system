"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, doc, getDoc, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Check, X, RotateCcw, CalendarDays, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";

export function LeavesManager() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);

    // Impact View
    const [selectedLeave, setSelectedLeave] = useState<any>(null);
    const [schedule, setSchedule] = useState<any>(null);
    const [loadingImpact, setLoadingImpact] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "leave_requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLeaves(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Leaves Listener Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchImpact = async (leave: any) => {
        setSelectedLeave(leave);
        setLoadingImpact(true);
        setSchedule(null);
        try {
            const yearId = "2025-2026";
            const tQuery = query(collection(db, "teachers"), where("uid", "==", leave.teacherId), limit(1));
            const tSnap = await getDocs(tQuery);

            if (!tSnap.empty) {
                const teacherData = tSnap.docs[0].data();
                const teacherIdRes = teacherData.schoolId || teacherData.teacherId || teacherData.id || tSnap.docs[0].id;

                const snap = await getDoc(doc(db, "teacher_schedules", `${yearId}_${teacherIdRes}`));
                if (snap.exists()) {
                    setSchedule(snap.data().schedule || {});
                }
            }
        } catch (e) {
            console.error("Impact Fetch Error", e);
        } finally {
            setLoadingImpact(false);
        }
    };

    const handleAction = async (leaveId: string, action: "APPROVE" | "REJECT" | "REVERT") => {
        if (!user) {
            alert("System is Verifying your identity... Please try again.");
            return;
        }

        const confirmMsg = action === "REVERT"
            ? "This will remove all coverage assignments for this leave. Move back to Pending?"
            : `Are you sure you want to ${action.toLowerCase()} this leave?`;

        if (!confirm(confirmMsg)) return;

        setActioning(leaveId);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/leaves/approve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ leaveId, action })
            });
            const data = await res.json();
            if (data.success) {
                // onSnapshot will update the list automatically
            } else {
                alert("Error: " + data.error);
            }
        } catch (e: any) { alert(e.message); }
        finally { setActioning(null); }
    };

    return (
        <div className="space-y-3 md:space-y-6 max-w-none p-0 animate-in fade-in">
            <div className="mobile-dense-table overflow-hidden">
                <DataTable
                    data={leaves}
                    isLoading={loading}
                    columns={[
                        {
                            key: "teacherName",
                            header: "Staff",
                            render: (leave: any) => (
                                <div className="font-bold text-white truncate max-w-[60px] md:max-w-none text-[9px] md:text-sm">
                                    {leave.teacherName}
                                </div>
                            )
                        },
                        {
                            key: "dates",
                            header: "Term",
                            render: (leave: any) => (
                                <div className="text-white/70 leading-tight">
                                    <div className="text-[8px] md:text-sm whitespace-nowrap">
                                        {leave.fromDate === leave.toDate
                                            ? formatDateToDDMMYYYY(leave.fromDate)
                                            : `${formatDateToDDMMYYYY(leave.fromDate).split('/').slice(0, 2).join('/')}..`}
                                    </div>
                                    <Badge variant="outline" className="h-3 md:h-4 text-[7px] md:text-[10px] border-white/10 text-white/40 px-1 py-0 px-0.5">
                                        {leave.type.slice(0, 4)}
                                    </Badge>
                                </div>
                            )
                        },
                        {
                            key: "reason",
                            header: "Cause",
                            render: (leave: any) => (
                                <div className="text-[8px] md:text-sm max-w-[50px] md:max-w-xs truncate text-white/50 italic" title={leave.reason}>
                                    {leave.reason}
                                </div>
                            )
                        },
                        {
                            key: "status",
                            header: "Status",
                            render: (leave: any) => (
                                <div className="scale-[0.8] md:scale-100 origin-left">
                                    {leave.status === "PENDING" && <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 py-0 px-1 text-[8px] md:text-xs">Pend</Badge>}
                                    {leave.status === "APPROVED" && <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-0 px-1 text-[8px] md:text-xs">Appr</Badge>}
                                    {leave.status === "REJECTED" && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 py-0 px-1 text-[8px] md:text-xs">Rej</Badge>}
                                </div>
                            )
                        }
                    ]}
                    actions={(leave: any) => (
                        <div className="flex flex-col gap-1 p-1">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start gap-2 h-8 hover:bg-zinc-800 text-white/70"
                                        onClick={() => fetchImpact(leave)}
                                    >
                                        <CalendarDays className="w-4 h-4" /> Impact Analysis
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#0A192F] border-white/10 text-white max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-accent" />
                                            Classes Affected
                                        </DialogTitle>
                                        <DialogDescription className="text-white/60">
                                            Teacher schedule for this leave period.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                        {loadingImpact ? (
                                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>
                                        ) : !schedule || Object.keys(schedule).length === 0 ? (
                                            <div className="text-center p-8 text-white/40 italic">No classes scheduled for this teacher.</div>
                                        ) : (
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map(day => {
                                                    const dayClasses = schedule[day];
                                                    if (!dayClasses || Object.keys(dayClasses).length === 0) return null;

                                                    return (
                                                        <div key={day} className="space-y-2">
                                                            <Badge variant="outline" className="border-accent/20 text-accent text-[10px] uppercase tracking-wider">{day}</Badge>
                                                            <div className="grid gap-2">
                                                                {Object.entries(dayClasses).map(([slotId, info]: [string, any]) => (
                                                                    <div key={slotId} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10">
                                                                        <div className="text-xs font-mono text-white/50">Period {slotId}</div>
                                                                        <div className="text-sm font-bold text-white">Class {info.classId}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {leave.status === "PENDING" ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start gap-2 h-8 hover:bg-emerald-500/10 text-emerald-400 font-bold"
                                        onClick={() => handleAction(leave.id, "APPROVE")}
                                        disabled={actioning === leave.id}
                                    >
                                        {actioning === leave.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Approve Leave
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start gap-2 h-8 hover:bg-red-500/10 text-red-400 font-bold"
                                        onClick={() => handleAction(leave.id, "REJECT")}
                                        disabled={actioning === leave.id}
                                    >
                                        <X className="w-4 h-4" /> Reject Leave
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start gap-2 h-8 text-white/40 hover:text-white"
                                    onClick={() => handleAction(leave.id, "REVERT")}
                                    disabled={actioning === leave.id}
                                >
                                    {actioning === leave.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                    Revert Status
                                </Button>
                            )}
                        </div>
                    )}
                />

                {leaves.length === 0 && !loading && (
                    <div className="text-center py-12 text-white/30 italic bg-black/10 rounded-xl border border-dashed border-white/10 text-sm">
                        No leave requests found.
                    </div>
                )}
            </div>
        </div>
    );
}
