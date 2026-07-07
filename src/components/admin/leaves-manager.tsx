"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, doc, getDoc, limit, onSnapshot } from "firebase/firestore";
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
import { useMasterData } from "@/context/MasterDataContext";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const LEAVES_CACHE_KEY = "spoorthy_leaves_cache";
const DEFAULT_LEAVES = [
    {
        id: "L-2026-001",
        teacherId: "TCH-2026-042",
        teacherName: "Prasad Kumar",
        fromDate: "2026-05-30",
        toDate: "2026-06-01",
        type: "CL",
        reason: "Family function in village",
        status: "PENDING",
        createdAt: "2026-05-25T12:00:00.000Z"
    },
    {
        id: "L-2026-002",
        teacherId: "TCH-2026-002",
        teacherName: "Saraswathi Devi",
        fromDate: "2026-05-28",
        toDate: "2026-05-28",
        type: "SL",
        reason: "Medical checkup",
        status: "APPROVED",
        createdAt: "2026-05-24T09:00:00.000Z"
    }
];

export function LeavesManager() {
    const { user, branchId: authBranchId, userData } = useAuth();
    const branchId = authBranchId || "global";
    const { selectedYear } = useMasterData();
    const [leaves, setLeaves] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(LEAVES_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch(e) {}
            }
        }
        return DEFAULT_LEAVES;
    });
    const [loading, setLoading] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);
 
    // Impact Monitoring
    const [schedule, setSchedule] = useState<any>(null);
    const [loadingImpact, setLoadingImpact] = useState(false);
 
    useEffect(() => {
        const isGlobal = branchId === "global";
        let q;
        if (!isGlobal) {
            q = query(
                collection(db, "leave_requests"),
                where("schoolId", "==", branchId)
            );
        } else {
            q = query(
                collection(db, "leave_requests"),
                orderBy("createdAt", "desc"),
                limit(50)
            );
        }
 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            if (!isGlobal) {
                loaded.sort((a: any, b: any) => {
                    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
                    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
                    return (timeB || 0) - (timeA || 0);
                });
                loaded = loaded.slice(0, 50);
            }
            setLeaves(loaded);
            if (typeof window !== 'undefined') {
                localStorage.setItem(LEAVES_CACHE_KEY, JSON.stringify(loaded));
            }
            setLoading(false);
        }, (err) => {
            console.error("Leaves Sync Error:", err);
            setLoading(false);
        });
 
        return () => unsubscribe();
    }, [branchId]);

    const fetchImpact = async (leave: any) => {
        setLoadingImpact(true);
        try {
            const teacherDoc = await getDoc(doc(db, "teachers", leave.teacherId));
            if (teacherDoc.exists()) {
                setSchedule(teacherDoc.data().timetable || {});
            }
        } catch (e) {
            console.error("Impact Check Error:", e);
        } finally {
            setLoadingImpact(false);
        }
    };

    const handleAction = async (leaveId: string, action: "APPROVE" | "REJECT" | "REVERT") => {
        if (!user) return;


        setActioning(leaveId);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/leaves/approve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    leaveId, 
                    action,
                    yearId: selectedYear || "2025-2026"
                })
            });
            const data = await res.json();
            if (!data.success) {
                alert("Error: " + data.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActioning(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="hidden md:block">
                <DataTable
                    data={leaves}
                    isLoading={loading}
                    columns={[
                        {
                            key: "teacherName",
                            header: "Staff Member",
                            render: (leave: any) => (
                                <div className="flex flex-col">
                                    <span className="font-bold text-white text-xs">{leave.teacherName}</span>
                                </div>
                            )
                        },
                        {
                            key: "dates",
                            header: "Duration",
                            render: (leave: any) => (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-white/80">
                                        {leave.fromDate === leave.toDate 
                                            ? formatDateToDDMMYYYY(leave.fromDate) 
                                            : `${formatDateToDDMMYYYY(leave.fromDate)} - ${formatDateToDDMMYYYY(leave.toDate)}`
                                        }
                                    </span>
                                    <Badge variant="outline" className="w-fit h-4 text-[8px] uppercase font-black border-white/5 bg-white/5 text-muted-foreground px-1">
                                        {leave.type}
                                    </Badge>
                                </div>
                            )
                        },
                        {
                            key: "reason",
                            header: "Reason",
                            render: (leave: any) => (
                                <div className="text-xs text-white/50 italic max-w-[200px] truncate" title={leave.reason}>
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
                        <div className="flex flex-col gap-1 p-1">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="w-full justify-start gap-2 h-8 text-[10px] uppercase font-black tracking-widest text-blue-400 hover:bg-blue-500/10"
                                        onClick={() => fetchImpact(leave)}
                                    >
                                        <BookOpen className="w-3.5 h-3.5" /> Check Impact
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#0B1120]/95 shadow-2xl text-white backdrop-blur-2xl border-white/10">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-accent" />
                                            Impact Analysis: {leave.teacherName}
                                        </DialogTitle>
                                        <DialogDescription className="text-white/40">
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
                    serverPagination={false}
                />

                {leaves.length === 0 && !loading && (
                    <div className="text-center py-12 text-white/30 italic bg-black/10 rounded-xl border border-dashed border-white/10 text-sm">
                        No leave requests found.
                    </div>
                )}
            </div>

            {/* Mobile Cards (Native Feel) */}
            <div className="md:hidden space-y-4">
                {leaves.map(leave => (
                    <div key={leave.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-white leading-tight">{leave.teacherName}</h3>
                            </div>
                            <Badge className={cn(
                                "text-[10px] font-black uppercase tracking-tighter py-0 h-5 border-none",
                                leave.status === "PENDING" ? "bg-amber-500/10 text-amber-500" :
                                leave.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" :
                                "bg-red-500/10 text-red-400"
                            )}>
                                {leave.status}
                            </Badge>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-white/60">
                                <CalendarDays className="w-3.5 h-3.5 text-accent" />
                                {formatDateToDDMMYYYY(leave.fromDate)} - {formatDateToDDMMYYYY(leave.toDate)}
                                <Badge variant="outline" className="ml-auto text-[8px] h-4 bg-white/5 border-none">{leave.type}</Badge>
                             </div>
                             <p className="text-xs italic text-white/40 italic">"{leave.reason}"</p>
                        </div>
                        <div className="flex gap-2">
                            {leave.status === "PENDING" ? (
                                <>
                                    <Button className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none h-9 rounded-xl text-xs font-bold" onClick={() => handleAction(leave.id, "APPROVE")} disabled={actioning === leave.id}>Approve</Button>
                                    <Button className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none h-9 rounded-xl text-xs font-bold" onClick={() => handleAction(leave.id, "REJECT")} disabled={actioning === leave.id}>Reject</Button>
                                </>
                            ) : (
                                <Button className="w-full bg-white/5 text-white/40 hover:bg-white/10 border-none h-9 rounded-xl text-xs font-bold" onClick={() => handleAction(leave.id, "REVERT")} disabled={actioning === leave.id}>Revert to Pending</Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
