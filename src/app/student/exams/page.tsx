"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, where, doc, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, AlertCircle, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

export default function StudentExamsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState<any[]>([]);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [feeStatus, setFeeStatus] = useState<"CLEARED" | "PENDING">("PENDING");
    const [dueAmount, setDueAmount] = useState(0);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            if (!user?.uid) return;

            // 1. Fetch Student Profile
            const sQ = query(collection(db, "students"), where("uid", "==", user.uid));
            const sSnap = await getDocs(sQ);
            if (sSnap.empty) {
                setLoading(false);
                return;
            }
            const sData = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as any;
            const schoolId = sData.schoolId || sData.id;
            setStudentProfile(sData);

            // 2. Fetch Fee Status
            const yearId = "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${schoolId}_${yearId}`);
            const ledgerSnap = await getDoc(ledgerRef);
            let totalDue = 0;
            if (ledgerSnap.exists()) {
                const items = ledgerSnap.data().items || [];
                totalDue = items.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);
            }
            setDueAmount(totalDue);
            setFeeStatus(totalDue <= 0 ? "CLEARED" : "PENDING"); // Strict check: Must be <= 0

            // 3. Fetch Active Exams
            const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
            const examSnap = await getDocs(q);
            const allExams = examSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter exams relevant to student's class
            const myClassId = sData.classId;
            const validExams = allExams.filter((e: any) => {
                // Check if timetable exists for this class
                return e.timetables && e.timetables[myClassId];
            });

            setExams(validExams);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20 text-[#E6F1FF]"><Loader2 className="animate-spin" /></div>;

    if (!studentProfile) return <div className="p-8 text-center text-[#8892B0]">Student profile not found.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#E6F1FF]">My Examinations</h1>
                    <p className="text-[#8892B0]">View schedules and download hall tickets.</p>
                </div>
                {feeStatus === "PENDING" && (
                    <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                            <p className="font-bold text-sm">Action Required</p>
                            <p className="text-xs">Clear dues (₹{dueAmount}) to access Hall Tickets.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(exam => (
                    <Card key={exam.id} className="bg-[#112240] border-[#64FFDA]/10 hover:border-[#64FFDA]/30 transition-all group">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <Badge variant={exam.status === "ACTIVE" ? "default" : "secondary"} className="bg-[#64FFDA]/10 text-[#64FFDA] border-[#64FFDA]/20">
                                    {exam.status || "Scheduled"}
                                </Badge>
                            </div>
                            <CardTitle className="text-[#E6F1FF] mt-4 text-xl">{exam.name}</CardTitle>
                            <CardDescription className="text-[#8892B0] flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-[#0A192F]/50 rounded p-3 mb-4 border border-white/5">
                                <p className="text-xs text-[#8892B0] uppercase tracking-wider mb-2">Timetable Overview</p>
                                <div className="space-y-1">
                                    {Object.entries(exam.timetables?.[studentProfile.classId] || {})
                                        .filter(([_, d]: any) => d.date)
                                        .slice(0, 3)
                                        .map(([subId, d]: any) => (
                                            <div key={subId} className="flex justify-between text-sm text-[#E6F1FF]">
                                                <span>{subId}</span> {/* Ideally fetch subject name, but ID OK for preview */}
                                                <span className="text-[#8892B0] text-xs">{d.date}</span>
                                            </div>
                                        ))
                                    }
                                    {(Object.keys(exam.timetables?.[studentProfile.classId] || {}).length > 3) && (
                                        <div className="text-xs text-[#64FFDA] pt-1 text-center">+ More subjects</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {exam.status === 'RESULTS_RELEASED' && (
                                    <Link href={`/student/exams/${exam.id}/results`}>
                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_0_15px_-5px_#10B981]">
                                            <FileText className="w-4 h-4 mr-2" /> View Results / Report Card
                                        </Button>
                                    </Link>
                                )}

                                {feeStatus === "CLEARED" ? (
                                    <Link href={`/student/exams/${exam.id}/hall-ticket`} target="_blank">
                                        <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                                            <CheckCircle className="w-4 h-4 mr-2" /> Download Hall Ticket
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button disabled className="w-full bg-white/5 text-[#8892B0] border border-white/10 cursor-not-allowed">
                                        <Lock className="w-4 h-4 mr-2" /> Hall Ticket Locked (Fees Pending)
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {exams.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-[#64FFDA]/10 rounded-lg text-[#8892B0]">
                        No exams scheduled for your class ({studentProfile.className}) yet.
                    </div>
                )}
            </div>
        </div>
    );
}
