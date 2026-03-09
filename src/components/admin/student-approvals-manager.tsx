"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useMasterData } from "@/context/MasterDataContext";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronRight, CheckCircle2, XCircle, User, Users, GraduationCap, Phone, MapPin, Edit, Plus } from "lucide-react";

export function StudentApprovalsManager() {
    const { user } = useAuth();
    const { selectedYear, classes, sections, villages } = useMasterData();
    const [changeRequests, setChangeRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Listen for all pending student change requests (both ADD and EDIT)
    useEffect(() => {
        const q = query(
            collection(db, "student_change_requests"),
            where("status", "==", "PENDING")
        );

        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort client-side by createdAt descending to avoid composite index
            docs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setChangeRequests(docs);
            setLoading(false);
        }, (err) => {
            console.warn("Change requests error:", err.message);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Group by teacher
    const grouped: Record<string, { teacherName: string; requests: any[] }> = {};
    const { teachers } = useMasterData();

    changeRequests.forEach(req => {
        const key = req.teacherId || "unknown";

        // Lookup teacher name
        const teacherProfile = teachers?.find((t: any) => t.id === key || t.uid === key);
        const resolvedName = teacherProfile?.name || req.teacherName || key;

        if (!grouped[key]) {
            grouped[key] = { teacherName: resolvedName, requests: [] };
        }
        grouped[key].requests.push(req);
    });

    const handleApprove = async (req: any) => {
        if (!user) return;
        setProcessingId(req.id);
        try {
            const token = await user.getIdToken();

            if (req.requestType === "ADD") {
                // Call the existing create API
                const payload = {
                    studentName: req.newData.studentName,
                    parentName: req.newData.parentName,
                    parentMobile: req.newData.parentMobile,
                    villageId: req.newData.villageId,
                    villageName: villages?.[req.newData.villageId]?.name || "",
                    classId: req.classId,
                    className: classes?.[req.classId]?.name || "",
                    sectionId: req.sectionId,
                    sectionName: sections?.[req.sectionId]?.name || "",
                    dateOfBirth: req.newData.dateOfBirth || "",
                    gender: req.newData.gender || "male",
                    transportRequired: req.newData.transportRequired || false,
                    academicYear: selectedYear || "2026-2027"
                };

                const res = await fetch("/api/admin/students/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to create student");

                await updateDoc(doc(db, "student_change_requests", req.id), {
                    status: "APPROVED",
                    approvedAt: Timestamp.now(),
                    approvedBy: user.uid,
                    assignedSchoolId: data.data?.schoolId || data.schoolId || ""
                });

                if (req.teacherId) {
                    const notifRef = doc(collection(db, "notifications"));
                    await setDoc(notifRef, {
                        userId: req.teacherId,
                        title: "Student Added",
                        message: `Your request to add ${req.newData?.studentName || 'a student'} was approved.`,
                        type: "SYSTEM",
                        status: "UNREAD",
                        target: "teacher",
                        createdAt: Timestamp.now(),
                        metadata: { requestId: req.id }
                    });
                }

                toast({ title: "Approved!", description: `${req.newData.studentName} has been admitted.`, type: "success" });

            } else if (req.requestType === "EDIT") {
                // Determine what exactly changed
                const updatesToApply: any = { ...req.newData };
                updatesToApply.updatedAt = new Date().toISOString();
                updatesToApply.updatedBy = user.uid;

                // Update the actual student doc
                const studentDocId = req.studentId;
                await updateDoc(doc(db, "students", studentDocId), updatesToApply);

                await updateDoc(doc(db, "student_change_requests", req.id), {
                    status: "APPROVED",
                    approvedAt: Timestamp.now(),
                    approvedBy: user.uid
                });

                if (req.teacherId) {
                    const notifRef = doc(collection(db, "notifications"));
                    await setDoc(notifRef, {
                        userId: req.teacherId,
                        title: "Student Updated",
                        message: `Your edit request for ${req.newData?.studentName || 'a student'} was approved.`,
                        type: "SYSTEM",
                        status: "UNREAD",
                        target: "teacher",
                        createdAt: Timestamp.now(),
                        metadata: { requestId: req.id }
                    });
                }

                toast({ title: "Approved!", description: `Profile for ${req.newData.studentName} updated.`, type: "success" });
            }

        } catch (err: any) {
            toast({ title: "Approval Failed", description: err.message, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (req: any) => {
        if (!user) return;
        if (!confirm(`Reject this ${req.requestType} request for ${req.newData?.studentName}?`)) return;
        setProcessingId(req.id);
        try {
            await updateDoc(doc(db, "student_change_requests", req.id), {
                status: "REJECTED",
                rejectedAt: Timestamp.now(),
                rejectedBy: user.uid
            });

            // Optional: Create notification for the teacher
            if (req.teacherId) {
                const notifRef = doc(collection(db, "notifications"));
                await setDoc(notifRef, {
                    userId: req.teacherId || "unknown",
                    title: "Student Request Rejected",
                    message: `Your student update request for ${req.newData?.studentName || 'a student'} was rejected by the admin.`,
                    type: "SYSTEM",
                    status: "UNREAD",
                    target: "teacher",
                    createdAt: Timestamp.now(),
                    metadata: { requestId: req.id }
                });
            }

            toast({ title: "Request Rejected", type: "info" });
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, type: "error" });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
        );
    }

    const teacherKeys = Object.keys(grouped);

    if (teacherKeys.length === 0) {
        return (
            <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-display font-bold text-white">All Clear!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    No pending student change requests from class teachers.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-xs text-amber-200/80 flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-500 shrink-0" />
                <span><strong>{changeRequests.length}</strong> request(s) awaiting approval from <strong>{teacherKeys.length}</strong> class teacher(s).</span>
            </div>

            <div className="space-y-3">
                {teacherKeys.map(teacherKey => {
                    const group = grouped[teacherKey];
                    const isExpanded = expandedTeacher === teacherKey;

                    return (
                        <div key={teacherKey} className="border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm bg-black/20">
                            {/* Teacher Row */}
                            <button
                                onClick={() => setExpandedTeacher(isExpanded ? null : teacherKey)}
                                className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-white/5 transition-all group"
                            >
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                        <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white text-sm md:text-base capitalize">{group.teacherName}</p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{group.requests.length} pending actions</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black text-[8px] md:text-[10px] tracking-widest px-2 py-0.5 rounded-full uppercase">
                                        Review
                                    </Badge>
                                    <ChevronRight className={`w-4 h-4 text-white/20 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} />
                                </div>
                            </button>

                            {/* Expanded Request List */}
                            {isExpanded && (
                                <div className="border-t border-white/5 p-3 md:p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    {group.requests.map(req => (
                                        <Card key={req.id} className="bg-white/[0.03] border-white/5 shadow-xl overflow-hidden rounded-2xl">
                                            <CardContent className="p-4 md:p-5">
                                                <div className="flex flex-col gap-5">
                                                    <div className="space-y-4 flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <Badge variant="outline" className={`text-[8px] md:text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border-none ${req.requestType === 'ADD' ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                                                                {req.requestType === 'ADD' ? <Plus className="w-3 h-3 mr-1" /> : <Edit className="w-3 h-3 mr-1" />}
                                                                {req.requestType}
                                                            </Badge>
                                                            <span className="font-bold text-white text-sm md:text-base uppercase tracking-tight">{req.newData?.studentName || 'Unknown Student'}</span>
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 border border-white/5 rounded-full font-mono text-[9px] text-white/40">
                                                                ID: {req.schoolId || 'NEW'}
                                                            </div>
                                                            <div className="text-[9px] md:text-[10px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full font-bold uppercase">
                                                                {classes?.[req.classId]?.name || req.classId} • {sections?.[req.sectionId]?.name || req.sectionId}
                                                            </div>
                                                        </div>

                                                        {req.requestType === 'ADD' ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-white/60 bg-black/30 p-4 rounded-2xl border border-white/5">
                                                                <div className="flex items-center gap-2.5"><User className="w-3.5 h-3.5 text-blue-400/50" /> {req.newData?.parentName}</div>
                                                                <div className="flex items-center gap-2.5"><Phone className="w-3.5 h-3.5 text-blue-400/50" /> {req.newData?.parentMobile}</div>
                                                                <div className="flex items-center gap-2.5 col-span-full"><MapPin className="w-3.5 h-3.5 text-blue-400/50" /> {villages?.[req.newData?.villageId]?.name || 'No Village'}</div>
                                                                {req.newData?.gender && <div className="flex items-center gap-2.5 uppercase tracking-widest text-[9px] font-bold"><Users className="w-3.5 h-3.5 text-blue-400/50" /> {req.newData.gender}</div>}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
                                                                <h4 className="text-[9px] font-black tracking-widest uppercase text-blue-400/60 flex items-center gap-2">
                                                                    <Edit className="w-3 h-3" /> Proposed Field Changes
                                                                </h4>
                                                                <div className="grid grid-cols-1 gap-2.5">
                                                                    {Object.keys(req.newData || {}).map(key => {
                                                                        const oldVal = req.oldData?.[key];
                                                                        const newVal = req.newData?.[key];
                                                                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal) && newVal !== undefined) {
                                                                            return (
                                                                                <div key={key} className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                                                    <span className="text-[8px] uppercase tracking-widest font-black text-white/30 block mb-1.5">{key}</span>
                                                                                    <div className="flex items-center justify-between gap-4">
                                                                                        <div className="bg-red-500/10 text-red-500/60 line-through px-2 py-1 rounded text-[10px] flex-1 truncate">{String(oldVal || 'None')}</div>
                                                                                        <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                                                                                        <div className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-1 rounded text-[10px] flex-1 truncate">{String(newVal || 'None')}</div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col md:flex-row justify-end md:items-center gap-3 pt-4 border-t border-white/5">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleReject(req)}
                                                            disabled={processingId === req.id}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 w-full md:w-auto md:px-6 justify-center font-black uppercase tracking-widest text-[10px] h-11 rounded-xl transition-all order-2 md:order-1"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleApprove(req)}
                                                            disabled={processingId === req.id}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 w-full md:w-auto md:px-8 justify-center font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 order-1 md:order-2"
                                                        >
                                                            {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
