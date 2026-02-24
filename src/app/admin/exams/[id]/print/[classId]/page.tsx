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
                                            <h1 className="school-name">{branding?.schoolName?.toUpperCase() || "SPOORTHY CONCEPT SCHOOL"}</h1>
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
                        height: 148mm;
                        padding: 10mm; 
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        position: relative;
                        overflow: hidden;
                        color: #000;
                    }

                    .hall-ticket {
                        height: 100% !important;
                        flex: 1;
                        padding: 3px;
                        border: 2pt solid #000;
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                    }

                    .inner-border {
                        height: 100%;
                        flex: 1;
                        border: 1pt solid #000;
                        padding: 6mm;
                        display: flex;
                        flex-direction: column;
                    }

                    .header-grid {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        border-bottom: 2pt solid #000;
                        padding-bottom: 8px;
                    }

                    .logo-box, .photo-box {
                        width: 65px;
                        height: 75px;
                        border: 1.5pt solid #000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 8px;
                        font-weight: 900;
                        flex-shrink: 0;
                        background: #fff;
                        overflow: hidden;
                    }

                    .center-header { flex: 1; text-align: center; }
                    .school-name { font-size: 20px; font-weight: 950; line-height: 1; margin: 0; letter-spacing: -0.5px; }
                    .exam-title-badge { 
                        display: inline-block;
                        border: 1.5pt solid #000;
                        padding: 2px 15px;
                        margin-top: 5px;
                        font-size: 13px;
                        font-weight: 950;
                        text-transform: uppercase;
                        background: #000;
                        color: #fff;
                    }

                    .info-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 4px 20px;
                        margin: 12px 0;
                    }
                    .info-item { font-size: 12px; display: flex; align-items: baseline; gap: 6px; }
                    .tag { font-size: 9px; font-weight: 950; color: #000; width: 55px; flex-shrink: 0; opacity: 0.7; }
                    .val { font-weight: 950; border-bottom: 1px solid #000; color: #000; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
                    
                    .roll-pill {
                        border: 2pt solid #000;
                        padding: 2px 25px;
                        font-family: monospace;
                        font-weight: 950;
                        font-size: 15px;
                        background: #fff;
                        color: #000;
                        box-shadow: 4px 4px 0px #eee;
                    }

                    .timetable-container { flex: 1; margin: 5px 0; }
                    .subject-record {
                        border: 1.5pt solid #000;
                        padding: 4px 8px;
                        margin-bottom: 5px;
                        background: #fff;
                    }
                    .sub-meta { display: flex; justify-content: space-between; font-size: 9px; font-weight: 950; color: #000; border-bottom: 0.5px solid #000; margin-bottom: 2px; }
                    .sub-header { display: flex; justify-content: space-between; align-items: center; }
                    .sub-name { font-weight: 950; font-size: 11px; text-transform: uppercase; }
                    .sub-sign { font-size: 8px; font-family: sans-serif; font-weight: 950; opacity: 0.5; }

                    .footer-grid { 
                        display: flex; 
                        align-items: flex-end; 
                        justify-content: space-between; 
                        margin-top: auto; 
                        border-top: 2pt solid #000; 
                        padding-top: 8px; 
                    }
                    .instructions { flex: 1; margin-right: 20px; }
                    .titles { font-size: 10px; font-weight: 950; text-decoration: underline; margin-bottom: 4px; }
                    
                    .signatures { display: flex; gap: 20px; }
                    .sig-slot { text-align: center; min-width: 100px; }
                    .line { border-top: 1.5pt solid #000; margin-bottom: 4px; }
                    .sig-slot p { font-size: 11px; font-weight: 950; margin: 0; }

                    .cut-line-wrapper {
                        position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; 
                        display: flex; align-items: center; justify-content: center; gap: 15px;
                        color: #ddd; font-size: 10px;
                    }
                    .cut-line-wrapper .line { flex: 1; border-top: 1px dashed #ddd; margin: 0; }
                    .label { font-size: 9px; font-weight: 900; letter-spacing: 3px; font-family: sans-serif; }
                }

                @media print {
                    html, body { height: auto !important; overflow: visible !important; }
                    header, nav, aside, .sidebar, .topbar, .print\\:hidden { display: none !important; }
                    @page { size: A4 portrait; margin: 0 !important; }
                    .ticket-wrapper { break-inside: avoid !important; page-break-inside: avoid !important; margin: 0 !important; height: 148mm !important; }
                    .ticket-wrapper:nth-child(even) { break-after: page !important; page-break-after: always !important; }
                }
            `}</style>
        </div>
    );
}
