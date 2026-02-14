"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, AlertTriangle } from "lucide-react";

export default function StudentHallTicketPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = use(params);
    const { user } = useAuth();
    const { classes, subjects, branding } = useMasterData();

    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState(false);
    const [data, setData] = useState<{ exam: any, student: any, schedule: any[] } | null>(null);

    useEffect(() => {
        if (user) fetchData();
    }, [user, examId]);

    const fetchData = async () => {
        try {
            if (!user?.uid) return;

            // 1. Fetch Student
            const sQ = query(collection(db, "students"), where("uid", "==", user.uid));
            const sSnap = await getDocs(sQ);
            if (sSnap.empty) {
                setLoading(false);
                return;
            }
            const sData = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as any;
            const schoolId = sData.schoolId || sData.id;

            // 2. Check Fees (Security)
            const yearId = "2025-2026";
            const ledgerRef = doc(db, "student_fee_ledgers", `${schoolId}_${yearId}`);
            const ledgerSnap = await getDoc(ledgerRef);
            let totalDue = 0;
            if (ledgerSnap.exists()) {
                const items = ledgerSnap.data().items || [];
                totalDue = items.reduce((sum: number, item: any) => sum + (item.amount - (item.paidAmount || 0)), 0);
            }

            if (totalDue > 0) {
                setDenied(true);
                setLoading(false);
                return;
            }

            // 3. Fetch Exam
            const examSnap = await getDoc(doc(db, "exams", examId));
            if (!examSnap.exists()) {
                setLoading(false);
                return;
            }
            const examData = { id: examSnap.id, ...examSnap.data() } as any;

            // 4. Process Schedule
            const myClassId = sData.classId;
            const rawTimetable = examData.timetables?.[myClassId] || {};
            const schedule = Object.entries(rawTimetable)
                .map(([subId, d]: any) => ({ subId, ...d }))
                .filter((s: any) => s.date && s.startTime)
                .sort((a: any, b: any) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());

            setData({ exam: examData, student: sData, schedule });

            // Set title for PDF filename
            document.title = `HallTicket_${sData.studentName}_${examData.name}`.replace(/\s+/g, '_');

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center h-screen items-center bg-gray-50"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

    if (denied) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
                <p className="text-gray-500 mt-2 max-w-md">
                    Hall Ticket access is restricted due to pending fee dues. Please clear your outstanding balance to download your hall ticket.
                </p>
                <Button className="mt-6" variant="outline" onClick={() => window.close()}>Close Window</Button>
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center">Exam not found or schedule not released.</div>;

    const { exam, student, schedule } = data;
    const className = classes[student.classId]?.name || `Class ${student.classId}`;

    return (
        <div className="bg-gray-100 min-h-screen py-4 md:py-8 print:bg-white print:p-0 font-sans">
            <div className="max-w-5xl mx-auto px-0 md:px-4">
                <div className="print:hidden p-4 border-b flex flex-col md:flex-row justify-between items-center bg-white rounded-t-xl gap-4 sticky top-0 z-50 shadow-sm mx-4 md:mx-0">
                    <div className="text-center md:text-left">
                        <div className="font-bold text-gray-800 text-lg md:text-xl">Hall Ticket Preview</div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-blue-600/60 md:hidden mt-0.5">Swipe left/right to view full ticket</p>
                    </div>
                    <Button onClick={() => window.print()} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-bold px-8 h-11">
                        <Printer className="mr-2 h-5 w-5" /> PRINT NOW
                    </Button>
                </div>

                <div className="overflow-x-auto pb-10 pt-4 md:pt-0">
                    <div className="min-w-[850px] md:min-w-0 md:max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none mb-8 print:mb-0 relative border-[1pt] border-gray-200 print:border-none">
                        <div className="p-8 print:p-0 min-h-[297mm] flex flex-col">
                            {/* HALL TICKET CONTAINER - High Fidelity Document Layout */}
                            <div className="flex-1 relative border-[3pt] border-double border-[#1e40af] p-8 flex flex-col bg-white overflow-hidden shadow-sm">

                                {/* Security Watermark */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-[-35deg] select-none z-0">
                                    <h1 className="text-[120pt] font-black uppercase text-[#1e40af]">OFFICIAL</h1>
                                </div>

                                {/* HEADER */}
                                <div className="relative z-10 flex items-center gap-8 border-b-[1.5pt] border-[#1e40af] pb-6 mb-8">
                                    <div className="w-24 h-24 flex items-center justify-center">
                                        {branding?.schoolLogo ? (
                                            <img src={branding.schoolLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400">LOGO</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h1 className="text-[24pt] font-black uppercase tracking-tight text-[#1e3a8a] leading-none mb-1">{branding?.schoolName || "SPOORTHY CONCEPT SCHOOL"}</h1>
                                        <p className="text-[9pt] font-bold uppercase tracking-[2px] text-blue-900/60 mb-3">Recognition of Govt. of Telangana (Affiliated)</p>
                                        <div className="inline-flex items-center gap-2 bg-[#1e40af] text-white px-6 py-1.5 rounded-sm font-black text-xs uppercase tracking-widest shadow-lg">
                                            {exam.name}
                                        </div>
                                    </div>
                                    <div className="w-28 h-32 border border-[#1e40af]/20 bg-gray-50 rounded-sm overflow-hidden flex items-center justify-center">
                                        {student.photoUrl ? (
                                            <img src={student.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300" />
                                                <span className="text-[8px] font-bold text-gray-400">PASTE PHOTO</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* STUDENT PROFILE GRID */}
                                <div className="relative z-10 grid grid-cols-3 gap-6 mb-8 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                                    <div className="col-span-2 grid grid-cols-2 gap-y-4 gap-x-8">
                                        <div>
                                            <p className="text-[8pt] font-black uppercase tracking-widest text-slate-500 mb-0.5">Full Name</p>
                                            <p className="text-[13pt] font-black text-slate-900 border-b border-slate-200 pb-1">{student.studentName.toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8pt] font-black uppercase tracking-widest text-slate-500 mb-0.5">School Code / UID</p>
                                            <p className="text-[13pt] font-black text-slate-900 border-b border-slate-200 pb-1">{student.schoolId}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8pt] font-black uppercase tracking-widest text-slate-500 mb-0.5">Class Designation</p>
                                            <p className="text-[13pt] font-black text-slate-900 border-b border-slate-200 pb-1">{className} {student.sectionId ? `(${student.sectionId})` : ""}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8pt] font-black uppercase tracking-widest text-slate-500 mb-0.5">Roll Identity</p>
                                            <p className="text-[13pt] font-black text-slate-900 border-b border-slate-200 pb-1">{student.rollNo || "___"}</p>
                                        </div>
                                    </div>
                                    <div className="border-l border-slate-200 pl-6 flex flex-col justify-center gap-3">
                                        <div className="bg-white p-3 border border-slate-100 rounded shadow-sm">
                                            <p className="text-[7pt] font-black uppercase tracking-widest text-slate-400">Exam Center</p>
                                            <p className="text-sm font-bold text-slate-800">SCS-Siddipet Node</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-8 bg-white border border-slate-100 rounded flex items-center justify-center">
                                                <div className="w-full h-full opacity-20 bg-repeat-x flex items-center gap-1 overflow-hidden px-2">
                                                    {Array.from({ length: 20 }).map((_, i) => <div key={i} className="w-1 h-6 bg-black flex-shrink-0" />)}
                                                </div>
                                            </div>
                                            <span className="text-[7pt] font-black text-slate-400 rotate-90">ID-AUTH</span>
                                        </div>
                                    </div>
                                </div>

                                {/* TIMETABLE SECTION */}
                                <div className="relative z-10 flex-1 mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-[1pt] bg-slate-200 flex-1" />
                                        <span className="text-[8pt] font-black uppercase tracking-[3px] text-slate-400">Examination Schedule</span>
                                        <div className="h-[1pt] bg-slate-200 flex-1" />
                                    </div>
                                    <table className="w-full border-collapse rounded-xl overflow-hidden border border-slate-200">
                                        <thead>
                                            <tr className="bg-slate-900 text-white">
                                                <th className="p-3 text-xs font-black uppercase tracking-widest w-32 border-r border-white/10">Date</th>
                                                <th className="p-3 text-xs font-black uppercase tracking-widest w-24 border-r border-white/10">Day</th>
                                                <th className="p-3 text-xs font-black uppercase tracking-widest w-40 border-r border-white/10">Session Time</th>
                                                <th className="p-3 text-xs font-black uppercase tracking-widest text-left pl-6">Subject Code & Particulars</th>
                                                <th className="p-3 text-xs font-black uppercase tracking-widest w-32">Invig-Auth</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {schedule.map((slot: any, idx: number) => {
                                                const dateObj = new Date(slot.date);
                                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                                                return (
                                                    <tr key={slot.subId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                        <td className="p-3 border-r border-slate-100 text-center font-black text-sm text-slate-900">{dateObj.toLocaleDateString()}</td>
                                                        <td className="p-3 border-r border-slate-100 text-center uppercase text-[9px] font-black text-slate-500">{dayName}</td>
                                                        <td className="p-3 border-r border-slate-100 text-center font-bold text-xs text-slate-700">{slot.startTime} - {slot.endTime}</td>
                                                        <td className="p-3 pl-6 border-r border-slate-100">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-[#1e3a8a] uppercase">{subjects[slot.subId]?.name || slot.subId}</span>
                                                                <span className="text-[8px] font-bold text-slate-400 tracking-wider">CODE: {slot.subId.substring(0, 6).toUpperCase()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-0 border-slate-100">
                                                            <div className="h-10 w-full flex items-center justify-center opacity-10">
                                                                <span className="text-[6pt] italic font-serif">Verification Pending</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {schedule.length === 0 && (
                                                <tr><td colSpan={5} className="p-12 text-center italic text-slate-400 font-bold bg-slate-50/30">No official schedule detected for this class assignment.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* INSTRUCTIONS & SIGNATURE BLOCK */}
                                <div className="relative z-10 pt-8 border-t-2 border-[#1e40af] flex justify-between items-end gap-10">
                                    <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <h4 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            Administrative Protocol
                                        </h4>
                                        <ul className="text-[8pt] text-slate-600 font-medium space-y-1.5 leading-tight">
                                            <li className="flex gap-2"><span>1.</span><span>Official Hall Ticket must be presented for authentication at the exam portal.</span></li>
                                            <li className="flex gap-2"><span>2.</span><span>Candidates must report to the tactical center 15 minutes before launch.</span></li>
                                            <li className="flex gap-2"><span>3.</span><span>Unauthorized electronic hardware or communication nodes are prohibited.</span></li>
                                            <li className="flex gap-2"><span>4.</span><span>Any breach of protocol will result in immediate session termination.</span></li>
                                        </ul>
                                    </div>
                                    <div className="w-[200px] flex flex-col items-center gap-4">
                                        <div className="relative w-full flex flex-col items-center">
                                            {branding?.principalSignature && (
                                                <img src={branding.principalSignature} alt="Sign" className="h-14 absolute -top-10 object-contain pointer-events-none" />
                                            )}
                                            <div className="w-full h-[1pt] bg-slate-900 mb-2 shadow-sm" />
                                            <p className="font-black text-[9pt] uppercase tracking-[2px] text-slate-900">Principal Signature</p>
                                            <p className="text-[6pt] font-black text-slate-400 mt-0.5 uppercase tracking-widest">Spoorthy Academic Node</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:mb-0 { margin-bottom: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .h-\\[140mm\\] { height: 140mm !important; margin: 10mm; } /* Center on page */
                }
            `}</style>
        </div>
    );
}
