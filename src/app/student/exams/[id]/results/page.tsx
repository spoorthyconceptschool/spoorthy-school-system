"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Trophy, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);
    const { user } = useAuth();
    const router = useRouter();
    const { subjects } = useMasterData();

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<any>(null);
    const [result, setResult] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [branding, setBranding] = useState<any>(null);

    useEffect(() => {
        if (user) fetchData();
    }, [user, examId]);

    const fetchData = async () => {
        try {
            if (!user?.uid) return;

            // Parallel Data Fetching
            const [sSnap, examSnap, brandingSnap] = await Promise.all([
                getDocs(query(collection(db, "students"), where("uid", "==", user.uid))),
                getDoc(doc(db, "exams", examId)),
                getDoc(doc(db, "settings", "branding"))
            ]);

            // 1. Student Profile
            if (sSnap.empty) {
                setLoading(false);
                return;
            }
            const sData = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as any;
            setStudent(sData);

            // 2. Exam Details
            if (!examSnap.exists()) {
                router.push("/student/exams");
                return;
            }
            setExam({ id: examSnap.id, ...examSnap.data() });

            // 3. Branding
            if (brandingSnap.exists()) {
                setBranding(brandingSnap.data());
            }

            // 4. Results
            const resultRef = doc(db, "exam_results", `${examId}_${sData.id}`);
            const resultSnap = await getDoc(resultRef);

            if (resultSnap.exists()) {
                setResult(resultSnap.data());
            } else {
                setResult(null);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        if (!result?.subjects) return { total: 0, max: 0, percentage: 0 };
        let total = 0;
        let max = 0;
        Object.values(result.subjects).forEach((sub: any) => {
            const ob = parseFloat(sub.obtained);
            const m = parseFloat(sub.maxMarks);
            if (!isNaN(ob)) total += ob;
            if (!isNaN(m)) max += m;
        });
        return { total, max, percentage: max > 0 ? (total / max) * 100 : 0 };
    };

    if (loading) return <div className="flex justify-center p-20 text-[#E6F1FF]"><Loader2 className="animate-spin" /></div>;
    if (!exam) return null;

    const stats = calculateTotal();
    const resultStatus = stats.percentage >= 35 ? "PASSED" : "FAILED";

    const formatToDDMMYY = (dateVal: any) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    };

    return (
        <div className="min-h-screen bg-[#0A192F] text-white p-4 md:p-8 select-none">
            {/* Action Bar (Top) */}
            <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
                <Button 
                    variant="outline" 
                    onClick={() => router.back()}
                    className="border-white/10 hover:bg-white/5 text-white gap-2 rounded-xl"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Exams
                </Button>
                {result && (
                    <Button 
                        onClick={() => window.print()}
                        className="bg-[#64FFDA] text-[#0A192F] hover:bg-[#64FFDA]/80 gap-2 font-bold rounded-xl"
                    >
                        <Download className="w-4 h-4" /> Print Results
                    </Button>
                )}
            </div>

            {/* Certificate Style Box */}
            <div className="max-w-4xl mx-auto bg-white text-black p-6 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden border-4 border-double border-slate-200">
                {/* Decorative border */}
                <div className="absolute inset-2 border-2 border-slate-100 rounded-[1.4rem] pointer-events-none" />

                {/* Ribbon decoration top right */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/5 rounded-bl-full pointer-events-none" />

                {/* Header */}
                <div className="text-center mb-8 relative z-10">
                    <div className="flex justify-center items-center gap-4 mb-4">
                        {branding?.schoolLogo ? (
                            <img 
                                src={branding.schoolLogo} 
                                alt="Logo" 
                                className="w-16 h-16 object-contain"
                            />
                        ) : (
                            <Trophy className="w-16 h-16 text-yellow-500" />
                        )}
                        <div>
                            <h1 className="text-3xl font-serif font-bold uppercase tracking-wide mb-2">Spoorthy Concept School</h1>
                            <p className="text-sm text-gray-500 font-medium tracking-widest uppercase">Excellence in Education</p>
                        </div>
                    </div>

                    <div className="mt-2 inline-block px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-widest rounded-full">
                        Statement of Marks
                    </div>
                </div>

                {/* Exam & Student Info */}
                <div className="grid grid-cols-2 gap-8 mb-8 text-sm relative z-10">
                    <div>
                        <p className="text-black/50 font-bold uppercase text-[10px] tracking-widest mb-1">Student Details</p>
                        <h3 className="text-xl font-bold">{student?.studentName}</h3>
                        <p className="font-mono mt-1">ID: {student?.schoolId}</p>
                        <p className="font-medium mt-1">Class: {student?.className} - {student?.sectionName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-black/50 font-bold uppercase text-[10px] tracking-widest mb-1">Examination</p>
                        <h3 className="text-xl font-bold">{exam.name}</h3>
                        <p className="mt-1">{exam.academicYear || "2025-26"}</p>
                        <p className="text-black/50 mt-1 text-xs">Date: {formatToDDMMYY(exam.startDate)}</p>
                    </div>
                </div>

                {/* Marks Table */}
                {!result ? (
                    <div className="text-center py-20 border border-dashed border-black/20 rounded-lg relative z-10">
                        <AlertCircle className="w-10 h-10 mx-auto text-black/20 mb-4" />
                        <p className="text-black/50 font-medium">Results for this exam have not been uploaded for your profile yet.</p>
                        <p className="text-black/40 text-xs mt-2">Please contact your class teacher.</p>
                    </div>
                ) : (
                    <div className="relative z-10">
                        <table className="w-full mb-8">
                            <thead>
                                <tr className="border-b-2 border-black">
                                    <th className="py-3 text-left font-bold uppercase text-xs tracking-wider w-1/2">Subject</th>
                                    <th className="py-3 text-center font-bold uppercase text-xs tracking-wider">Max Marks</th>
                                    <th className="py-3 text-center font-bold uppercase text-xs tracking-wider">Obtained</th>
                                    <th className="py-3 text-left pl-8 font-bold uppercase text-xs tracking-wider">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/10">
                                {Object.entries(result.subjects || {}).map(([subId, data]: any) => (
                                    <tr key={subId}>
                                        <td className="py-4 font-bold">{subjects[subId]?.name || subId}</td>
                                        <td className="py-4 text-center font-mono text-black/60">{data.maxMarks}</td>
                                        <td className="py-4 text-center font-bold text-lg">{data.obtained}</td>
                                        <td className="py-4 pl-8 text-sm italic text-black/60">{data.remarks || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-black bg-black/5">
                                <tr>
                                    <td className="py-4 pl-4 font-bold uppercase text-sm">Grand Total</td>
                                    <td className="py-4 text-center font-bold">{stats.max}</td>
                                    <td className="py-4 text-center font-bold text-xl">{stats.total}</td>
                                    <td className="py-4 pl-8 font-bold text-sm">
                                        {stats.percentage.toFixed(1)}%
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Result Status */}
                        <div className="flex justify-between items-end border-t border-black/10 pt-8 mt-12">
                            <div>
                                <p className="text-black/50 font-bold uppercase text-[10px] tracking-widest mb-2">Final Result</p>
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border ${resultStatus === "PASSED" ? "bg-green-500/10 border-green-500 text-green-700" : "bg-red-500/10 border-red-500 text-red-700"
                                    }`}>
                                    {resultStatus === "PASSED" ? <Trophy className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    <span className="font-bold tracking-widest">{resultStatus}</span>
                                </div>
                            </div>

                            <div className="text-center flex flex-col items-center gap-2">
                                {branding?.principalSignature ? (
                                    <img src={branding.principalSignature} alt="Principal Signature" className="h-16 object-contain -mb-4" />
                                ) : (
                                    <div className="w-32 border-b border-black/20 h-16"></div>
                                )}
                                <div className="w-32 border-b border-black/20"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Principal Signature</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-[10px] text-black/30 font-mono">
                            Generated electronically from Spoorthy School System. Valid without signature for online verification.
                        </div>
                    </div>
                )}

                {/* Watermark */}
                {branding?.schoolLogo && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                        <img src={branding.schoolLogo} alt="" className="w-full max-w-lg object-contain grayscale" />
                    </div>
                )}
            </div>
        </div>
    );
}
