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

    const [branding, setBranding] = useState<any>(null);
    const [range, setRange] = useState({ start: 0, end: 50 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examSnap, brandingSnap] = await Promise.all([
                    getDoc(doc(db, "exams", examId)),
                    getDoc(doc(db, "settings", "branding"))
                ]);

                if (examSnap.exists()) setExam({ id: examSnap.id, ...examSnap.data() });
                if (brandingSnap.exists()) setBranding(brandingSnap.data());

                const q = query(collection(db, "students"), where("classId", "==", classId), where("status", "==", "ACTIVE"));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                list.sort((a: any, b: any) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999));
                setStudents(list);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [examId, classId]);

    const filteredStudents = students.slice(range.start, range.end);

    // Auto-trigger print ONLY for small batches
    useEffect(() => {
        if (!loading && filteredStudents.length > 0 && filteredStudents.length <= 10) {
            const timer = setTimeout(() => {
                window.print();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [loading, filteredStudents.length]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-black" /></div>;
    if (!exam) return <div>Exam not found</div>;

    const timetable = exam.timetables?.[classId] || {};
    const schedule = Object.entries(timetable)
        .map(([subId, data]: any) => ({ subId, ...data }))
        .filter((s: any) => s.date && s.startTime)
        .sort((a: any, b: any) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());

    const className = classes[classId]?.name || `Class ${classId}`;
    const instructions = exam.instructions ? exam.instructions.split('\n') : ["Carry Hall Ticket.", "Report 15m early.", "No electronic items."];

    return (
        <div className="bg-slate-900 text-white font-serif print:bg-white print:text-black print:p-0 min-h-screen print:min-h-0">
            <div className="print:hidden p-4 md:p-6 flex flex-col md:flex-row justify-between items-center max-w-5xl mx-auto border-b border-white/10 bg-black/40 backdrop-blur-xl mb-4 md:mb-8 sticky top-0 z-50 shadow-2xl gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-blue-400">HALL TICKET GENERATOR</h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Batch:</span>
                            <select
                                className="bg-white/10 border-white/10 text-xs font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 text-white outline-none"
                                value={`${range.start}-${range.end}`}
                                onChange={(e) => {
                                    const [s, f] = e.target.value.split('-').map(Number);
                                    setRange({ start: s, end: f });
                                }}
                            >
                                {Array.from({ length: Math.ceil(students.length / 50) }).map((_, i) => (
                                    <option key={i} value={`${i * 50}-${(i + 1) * 50}`} className="bg-slate-900">
                                        Students {i * 50 + 1} - {Math.min((i + 1) * 50, students.length)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-[10px] md:text-xs text-gray-400 font-sans uppercase font-bold tracking-widest">{filteredStudents.length} Profiles Ready</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={() => window.print()} className="flex-1 md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg font-black px-10 h-14 rounded-2xl transition-all hover:scale-105 active:scale-95">
                        <Printer className="mr-2 h-5 w-5" /> START PRINTING
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto pb-20 pt-4 md:pt-0">
                <div className="min-w-[850px] md:min-w-0 md:max-w-[210mm] mx-auto print:max-w-none print:mx-0 print:block">
                    {filteredStudents.map((student, idx) => (
                        <div className="ticket-wrapper" key={student.id}>
                            <div className="hall-ticket">
                                <div className="inner-border">
                                    <div className="header-grid">
                                        <div className="logo-box">
                                            {branding?.schoolLogo ? <img src={branding.schoolLogo} className="w-full h-full object-contain" /> : "LOGO"}
                                        </div>
                                        <div className="center-header">
                                            <h1 className="school-name">{branding?.schoolName?.toUpperCase() || "SPOORTHY HIGH SCHOOL"}</h1>
                                            <p className="school-motto text-[8px] font-bold tracking-[3px] opacity-60 mb-1">STRIVE FOR EXCELLENCE</p>
                                            <h2 className="exam-title-badge">{exam.name} – HALL TICKET</h2>
                                        </div>
                                        <div className="photo-box">
                                            {student.photoUrl ? (
                                                <img src={student.photoUrl} alt="Student" className="w-full h-full object-cover" />
                                            ) : <div className="text-[7px] text-center leading-tight">PASTE PHOTO<br />HERE</div>}
                                        </div>
                                    </div>

                                    <div className="info-section">
                                        <div className="info-item"><span className="tag">NAME:</span> <span className="val uppercase">{student.studentName}</span></div>
                                        <div className="info-item"><span className="tag">CENTER:</span> <span className="val">{exam.examCenter || "SCS CAMPUS"}</span></div>
                                        <div className="info-item"><span className="tag">CLASS:</span> <span className="val">{className} {student.sectionId ? `(${student.sectionId})` : ""}</span></div>
                                        <div className="info-item"><span className="tag">YEAR:</span> <span className="val">{exam.academicYear || "2025–26"}</span></div>
                                        <div className="info-item col-span-2 flex justify-center mt-2">
                                            <div className="roll-pill">ROLL NO: <span className="roll-val">{student.rollNo || "_________"}</span></div>
                                        </div>
                                    </div>

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
                                        {schedule.length === 0 && <div className="text-center p-4 text-gray-400 italic font-sans text-xs">No examination schedule has been configured yet.</div>}
                                    </div>

                                    <div className="footer-grid">
                                        <div className="instructions">
                                            <p className="titles">PROTOCOLS & INSTRUCTIONS:</p>
                                            <div className="text-[8px] leading-[1.2] font-sans font-bold flex flex-wrap gap-x-3">
                                                {instructions.slice(0, 3).map((line: string, i: number) => (
                                                    <span key={i}>{i + 1}. {line}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="signatures">
                                            <div className="sig-slot">
                                                <div className="line"></div>
                                                <p>Inviligator</p>
                                            </div>
                                            <div className="sig-slot relative">
                                                {branding?.principalSignature && (
                                                    <img src={branding.principalSignature} className="absolute -top-10 left-1/2 -translate-x-1/2 h-12 mix-blend-multiply opacity-90" />
                                                )}
                                                <div className="line"></div>
                                                <p>Principal Signature</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {idx % 2 === 0 && idx < filteredStudents.length - 1 && (
                                <div className="cut-line-wrapper">
                                    <div className="line"></div>
                                    <span className="scissor">✂</span>
                                    <span className="label">PERFORATION LINE</span>
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
                        margin: 40px auto;
                        box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                        border-radius: 8px;
                        transition: transform 0.3s ease;
                    }
                    .ticket-wrapper:hover { transform: translateY(-5px); }
                }

                @media screen, print {
                    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                    .ticket-wrapper {
                        width: 210mm;
                        height: 59mm;
                        padding: 2mm 5mm; 
                        display: flex;
                        background: #fff;
                        position: relative;
                        overflow: hidden;
                        color: #000;
                    }

                    .hall-ticket {
                        height: 100% !important;
                        flex: 1;
                        padding: 2px;
                        border: 1.5pt solid #000;
                        display: flex;
                        flex-direction: row;
                        align-items: stretch;
                        background: #fff;
                    }

                    .inner-border {
                        height: 100%;
                        flex: 1;
                        border: 1pt solid #000;
                        padding: 3mm;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        gap: 10px;
                    }

                    .header-grid {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        border-right: 1.5pt solid #000;
                        padding-right: 10px;
                        width: 140px;
                    }

                    .logo-box {
                        width: 28px;
                        height: 28px;
                        margin-bottom: 2px;
                    }

                    .school-name { font-size: 11px; font-weight: 950; line-height: 1; margin: 0; text-align: center; }
                    .school-motto { display: none; }
                    .exam-title-badge { 
                        display: inline-block;
                        border: 1pt solid #000;
                        padding: 1px 4px;
                        margin-top: 2px;
                        font-size: 8px;
                        font-weight: 950;
                        background: #000;
                        color: #fff;
                        text-align: center;
                    }

                    .info-section {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 1px;
                        flex: 1;
                    }
                    .info-item { font-size: 10px; display: flex; align-items: baseline; gap: 4px; }
                    .tag { font-size: 8px; font-weight: 950; color: #000; width: 45px; flex-shrink: 0; }
                    .val { font-weight: 950; border-bottom: 0.5px solid #000; color: #000; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px; }
                    
                    .roll-pill {
                        border: 1.5pt solid #000;
                        padding: 1px 10px;
                        font-family: monospace;
                        font-weight: 950;
                        font-size: 11px;
                        margin-top: 3px;
                        display: inline-block;
                    }

                    .photo-box {
                        width: 40px;
                        height: 48px;
                        border: 1pt solid #000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 6px;
                        font-weight: 900;
                        flex-shrink: 0;
                        margin-left: auto;
                        margin-right: 10px;
                    }

                    .timetable-container { width: 220px; border-left: 1pt solid #000; padding-left: 10px; height: 100%; display: flex; flex-direction: column; justify-content: center; }
                    .subject-record {
                        display: flex;
                        justify-content: space-between;
                        font-size: 7px;
                        border-bottom: 0.5px solid #ccc;
                        padding: 1px 0;
                    }
                    .sub-date { font-weight: 900; width: 40px; }
                    .sub-name { font-weight: 900; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .sub-time { font-family: monospace; width: 60px; text-align: right; }

                    .footer-grid { 
                        display: flex; 
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        border-left: 1pt solid #000; 
                        padding-left: 10px; 
                        width: 80px;
                        height: 100%;
                    }
                    
                    .instructions { display: none; }
                    
                    .signatures { display: flex; flex-direction: column; gap: 10px; width: 100%; }
                    .sig-slot { text-align: center; width: 100%; }
                    .line { border-top: 1pt solid #000; margin-bottom: 2px; }
                    .sig-slot p { font-size: 7px; font-weight: 950; margin: 0; }

                    .cut-line-wrapper {
                        position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; 
                        display: flex; align-items: center; justify-content: center; gap: 10px;
                    }
                    .cut-line-wrapper .line { flex: 1; border-top: 0.5px dashed #ccc; margin: 0; }
                    .label { font-size: 6px; font-weight: 900; letter-spacing: 2px; font-family: sans-serif; color: #ccc;}
                }

                @media print {
                    html, body { height: auto !important; overflow: visible !important; }
                    header, nav, aside, .sidebar, .topbar, .print\\:hidden { display: none !important; }
                    @page { size: A4 portrait; margin: 0 !important; }
                    .ticket-wrapper { break-inside: avoid !important; page-break-inside: avoid !important; margin: 0 !important; height: 59mm !important; }
                    .ticket-wrapper:nth-child(5n) { break-after: page !important; page-break-after: always !important; }
                    .ticket-wrapper:nth-child(5n) .cut-line-wrapper { display: none; }
                }
            `}</style>
        </div>
    );
}
