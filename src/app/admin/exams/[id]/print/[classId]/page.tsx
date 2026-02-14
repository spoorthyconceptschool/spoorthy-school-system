"use client";

import React, { useEffect, useState, use } from "react";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMasterData } from "@/context/MasterDataContext";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HallTicketPrintPage({ params }: { params: Promise<{ id: string; classId: string }> }) {
    const { id: examId, classId } = use(params);
    const { classes, subjects } = useMasterData();
    const [exam, setExam] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const examSnap = await getDoc(doc(db, "exams", examId));
                if (!examSnap.exists()) return;
                setExam({ id: examSnap.id, ...examSnap.data() });

                const q = query(collection(db, "students"), where("classId", "==", classId), where("status", "==", "ACTIVE"));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                list.sort((a: any, b: any) => (a.rollNo || 999) - (b.rollNo || 999));
                setStudents(list);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [examId, classId]);

    // Auto-trigger print
    useEffect(() => {
        if (!loading && students.length > 0) {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading, students]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-black" /></div>;
    if (!exam) return <div>Exam not found</div>;

    const timetable = exam.timetables?.[classId] || {};
    const schedule = Object.entries(timetable)
        .map(([subId, data]: any) => ({ subId, ...data }))
        .filter((s: any) => s.date && s.startTime)
        .sort((a: any, b: any) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());

    const className = classes[classId]?.name || `Class ${classId}`;

    return (
        <div className="bg-slate-50 text-black font-serif print:bg-white print:p-0 min-h-screen print:min-h-0">
            <div className="print:hidden p-4 md:p-6 flex flex-col md:flex-row justify-between items-center max-w-5xl mx-auto border-b bg-white mb-4 md:mb-8 sticky top-0 z-50 shadow-sm gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-xl md:text-2xl font-bold">Hall Ticket Batch Preview</h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                        <p className="text-[10px] md:text-xs text-gray-500 font-sans uppercase font-bold tracking-widest">{students.length} Students Selected</p>
                        <span className="hidden md:inline text-gray-300">|</span>
                        <p className="text-[9px] uppercase font-black tracking-widest text-blue-600/60 md:hidden italic">Swipe to see full tickets</p>
                    </div>
                </div>
                <Button onClick={() => window.print()} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 font-black px-8 h-12">
                    <Printer className="mr-2 h-5 w-5" /> PRINT ALL
                </Button>
            </div>

            <div className="overflow-x-auto pb-20 pt-4 md:pt-0">
                <div className="min-w-[850px] md:min-w-0 md:max-w-[210mm] mx-auto print:max-w-none print:mx-0 print:block">
                    {students.map((student, idx) => (
                        <div className="ticket-wrapper" key={student.id}>
                            <div className="hall-ticket">
                                {/* PROFESSIONAL DOUBLE BORDER */}
                                <div className="inner-border">
                                    {/* HEADER SECTION */}
                                    <div className="header-grid">
                                        <div className="logo-box">LOGO</div>
                                        <div className="center-header">
                                            <h1 className="school-name">SPOORTHY CONCEPT SCHOOL</h1>
                                            <h2 className="exam-title-badge">{exam.name} – HALL TICKET</h2>
                                        </div>
                                        <div className="photo-box">
                                            {student.photoUrl ? (
                                                <img src={student.photoUrl} alt="Student" className="w-full h-full object-cover" />
                                            ) : "PHOTO"}
                                        </div>
                                    </div>

                                    {/* STUDENT INFO GRID */}
                                    <div className="info-section">
                                        <div className="info-item"><span className="tag">NAME:</span> <span className="val uppercase">{student.studentName}</span></div>
                                        <div className="info-item"><span className="tag">CENTER:</span> <span className="val">{exam.examCenter || "SCS-HYD"}</span></div>
                                        <div className="info-item"><span className="tag">CLASS:</span> <span className="val">{className} {student.sectionId ? `(${student.sectionId})` : ""}</span></div>
                                        <div className="info-item"><span className="tag">YEAR:</span> <span className="val">{exam.academicYear || "2025–26"}</span></div>
                                        <div className="info-item col-span-2 flex justify-center mt-1">
                                            <div className="roll-pill">ROLL NO: <span className="roll-val">{student.rollNo || "_________"}</span></div>
                                        </div>
                                    </div>

                                    {/* TWO-COLUMN TIMETABLE */}
                                    <div className="timetable-container">
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0 height-fit">
                                            {schedule.map((slot: any) => {
                                                const dateObj = new Date(slot.date);
                                                const dateStr = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                                                return (
                                                    <div key={slot.subId} className="subject-record">
                                                        <div className="sub-meta">
                                                            <span className="sub-date">{dateStr} ({dayName})</span>
                                                            <span className="sub-time">{slot.startTime} - {slot.endTime}</span>
                                                        </div>
                                                        <div className="sub-header">
                                                            <span className="sub-name">{subjects[slot.subId]?.name || slot.subId}</span>
                                                            <span className="sub-sign">SIGN: ____</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {schedule.length === 0 && <div className="text-center p-4 text-gray-400 italic">No exams scheduled</div>}
                                    </div>

                                    {/* FOOTER */}
                                    <div className="footer-grid">
                                        <div className="instructions">
                                            <p className="titles">INSTRUCTIONS:</p>
                                            <p className="text-[9px] leading-[1.1]">1. Carry Hall Ticket. 2. Report 15m early. 3. No electronic items.</p>
                                        </div>
                                        <div className="signatures">
                                            <div className="sig-slot">
                                                <div className="line"></div>
                                                <p>Class Teacher</p>
                                            </div>
                                            <div className="sig-slot">
                                                <div className="line"></div>
                                                <p>Principal</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {idx % 2 === 0 && idx < students.length - 1 && (
                                <div className="cut-line-wrapper">
                                    <div className="line"></div>
                                    <span className="scissor">✂</span>
                                    <span className="label">CUT HERE</span>
                                    <div className="line"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @media screen {
                    .ticket-wrapper {
                        margin: 20px auto;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                    }
                }

                @media screen, print {
                    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                    .ticket-wrapper {
                        width: 210mm;
                        height: 148.5mm;
                        padding: 8mm; 
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        position: relative;
                        overflow: hidden;
                    }

                    .hall-ticket {
                        height: 100% !important;
                        flex: 1;
                        padding: 2px;
                        border: 2px solid #000;
                        display: flex;
                        flex-direction: column;
                    }

                    .inner-border {
                        height: 100%;
                        flex: 1;
                        border: 1px solid #000;
                        padding: 5mm;
                        display: flex;
                        flex-direction: column;
                    }

                    /* HEADER - CONSTANT SIZE */
                    .header-grid {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 5px;
                    }

                    .logo-box, .photo-box {
                        width: 50px;
                        height: 60px;
                        border: 1px solid #000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 8px;
                        font-weight: bold;
                        flex-shrink: 0;
                        background: #fff;
                    }

                    .center-header { flex: 1; text-align: center; }
                    .school-name { font-size: 18px; font-weight: 900; line-height: 1.1; margin: 0; text-transform: uppercase; }
                    .exam-title-badge { 
                        display: inline-block;
                        border: 1.5px solid #000;
                        padding: 1px 10px;
                        margin-top: 3px;
                        font-size: 12px;
                        font-weight: 900;
                        text-transform: uppercase;
                        background: #f0f0f0;
                    }

                    /* INFO SECTION - CONSTANT SIZE */
                    .info-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2px 15px;
                        margin: 10px 0;
                    }
                    .info-item { font-size: 11px; display: flex; align-items: baseline; gap: 4px; }
                    .tag { font-size: 8px; font-weight: 900; color: #000; width: 50px; flex-shrink: 0; }
                    .val { font-weight: 900; border-bottom: 1px solid #000; color: #000; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
                    
                    .roll-pill {
                        border: 1.5px solid #000;
                        padding: 1px 15px;
                        font-family: monospace;
                        font-weight: 900;
                        font-size: 13px;
                        background: #fff;
                        color: #000;
                    }

                    /* TIMETABLE GRID - CONSTANT SIZE */
                    .timetable-container { flex: 1; margin: 3px 0; }
                    .subject-record {
                        border: 1.2px solid #000;
                        padding: 3px 5px;
                        margin-bottom: 3px;
                        background: #fff;
                    }
                    .sub-meta { display: flex; justify-content: space-between; font-size: 8px; font-weight: 900; color: #000; border-bottom: 0.5px solid #000; margin-bottom: 1px; }
                    .sub-header { display: flex; justify-content: space-between; align-items: center; color: #000; }
                    .sub-name { font-weight: 900; font-size: 10px; text-transform: uppercase; color: #000; }
                    .sub-sign { font-size: 7px; font-family: sans-serif; font-weight: 900; color: #000; }

                    /* FOOTER - Pinned to bottom of the fixed-height box */
                    .footer-grid { 
                        display: flex; 
                        align-items: flex-end; 
                        justify-content: space-between; 
                        margin-top: auto; 
                        border-top: 1.5px solid #000; 
                        padding-top: 5px; 
                    }
                    .instructions { flex: 1; margin-right: 15px; }
                    .titles { font-size: 9px; font-weight: 900; text-decoration: underline; margin-bottom: 2px; }
                    
                    .signatures { display: flex; gap: 15px; }
                    .sig-slot { text-align: center; min-width: 90px; }
                    .line { border-top: 1px solid #000; margin-bottom: 3px; }
                    .sig-slot p { font-size: 10px; font-weight: 900; margin: 0; }

                    /* CUT LINE */
                    .cut-line-wrapper {
                        position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; 
                        display: flex; align-items: center; justify-content: center; gap: 10px;
                        color: #ccc; font-size: 10px;
                    }
                    .cut-line-wrapper .line { flex: 1; border-top: 1px dashed #ccc; margin: 0; }
                    .label { font-size: 8px; font-weight: bold; letter-spacing: 2px; }
                }

                @media print {
                    /* THE HAMMER: Reset all potential scroll-parent containers */
                    html, body, 
                    div[class*="h-screen"], 
                    div[class*="overflow-hidden"],
                    div[class*="overflow-y-auto"],
                    main, 
                    section {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        display: block !important;
                        min-height: 0 !important;
                        max-height: none !important;
                    }

                    /* Hide default dashboard components */
                    header, nav, aside, .sidebar, .topbar, .print\\:hidden { 
                        display: none !important; 
                    }

                    @page { 
                        size: A4 portrait; 
                        margin: 0 !important; 
                    }

                    .ticket-wrapper { 
                        display: block !important;
                        height: 148.5mm !important; 
                        width: 210mm !important;
                        break-inside: avoid !important;
                        position: relative !important;
                        page-break-inside: avoid !important;
                        margin: 0 !important;
                    }
                    
                    .ticket-wrapper:nth-child(even) { 
                        break-after: page !important; 
                        page-break-after: always !important;
                    }
                }
            `}</style>
        </div>
    );
}
