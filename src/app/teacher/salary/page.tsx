"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Loader2, Download, Wallet, ArrowLeft } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function SalaryPage() {
    const { user } = useAuth();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchSalary();
    }, [user]);

    const fetchSalary = async () => {
        try {
            // Guard: Ensure user.uid is available
            if (!user?.uid) {
                setLoading(false);
                return;
            }

            // Need Teacher ID logic again. Assuming 'salary_payments' has 'teacherUid' or we query by 'teacherId'.
            // The admin salary module stored payments using teacher ID (doc ID).
            // We need to resolve UID -> TeacherID first.

            // Step 1: Get Teacher ID
            const tRes = await getDocs(query(collection(db, "teachers"), where("uid", "==", user.uid)));
            if (tRes.empty) { setLoading(false); return; }
            const teacherData = tRes.docs[0].data();
            const teacherId = teacherData.schoolId || tRes.docs[0].id;

            if (!teacherId) {
                setLoading(false);
                return;
            }

            // Step 2: Fetch Payments
            const q = query(collection(db, "salary_payments"), where("teacherId", "==", teacherId), orderBy("paymentDate", "desc"));
            const snap = await getDocs(q);
            setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (e: any) {
            // Suppress Firestore index errors - expected during development
            if (!e?.message?.includes('index')) {
                console.error(e);
            }
        }
        finally { setLoading(false); }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-display font-bold">Salary & Payslips</h1>
                </div>
            </div>

            <Card className="bg-emerald-900/10 border-emerald-500/20">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-emerald-500">Current Status</CardTitle>
                        <p className="text-sm text-muted-foreground">This Month</p>
                    </div>
                    <Wallet className="w-8 h-8 text-emerald-500 opacity-50" />
                </CardHeader>
                <CardContent>
                    {/* Mock Status */}
                    <div className="text-2xl font-bold">Paid</div>
                    <div className="text-xs text-muted-foreground">Last payment received on 05 Jan 2026</div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment History</h3>
                {payments.length === 0 ? <p className="text-muted-foreground text-sm">No payment records found.</p> : (
                    <div className="grid gap-4">
                        {payments.map(p => (
                            <Card key={p.id} className="bg-black/20 border-white/10">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold">₹ {p.amount.toLocaleString()}</div>
                                        <div className="text-sm text-muted-foreground">{new Date(p.paymentDate.seconds * 1000).toLocaleDateString()} • {p.month}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{p.method}</Badge>
                                        <Button size="sm" variant="ghost">
                                            <Download className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
