"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, FileText, Loader2 } from "lucide-react";

export default function TeacherExamsPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // Fetch all exams, sorted by date
                const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Error fetching exams:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in">
            <div>
                <h1 className="text-3xl font-display font-bold">Examinations & Results</h1>
                <p className="text-muted-foreground">Select an exam to enter marks for your students.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                    <Link key={exam.id} href={`/teacher/exams/${exam.id}`}>
                        <Card className="bg-black/20 border-white/10 hover:bg-black/30 transition-all cursor-pointer h-full group">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <Badge variant={exam.status === "ACTIVE" ? "default" : "secondary"}>
                                        {exam.status === 'RESULTS_RELEASED' ? 'PUBLISHED' : exam.status || 'ACTIVE'}
                                    </Badge>
                                </div>
                                <CardTitle className="mt-4">{exam.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-emerald-400 font-medium group-hover:underline">
                                    Enter Marks <ChevronRight className="ml-auto w-4 h-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {exams.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-lg text-muted-foreground">
                        No active examinations found.
                    </div>
                )}
            </div>
        </div>
    );
}
