"use client";

import { useState, useEffect } from "react";
import { useMasterData } from "@/context/MasterDataContext";
import AttendanceManager from "@/components/attendance/attendance-manager";
import TeacherAttendanceManager from "@/components/attendance/teacher-attendance-manager";
import StaffAttendanceManager from "@/components/attendance/staff-attendance-manager";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users2, ShieldAlert } from "lucide-react";

export default function AdminAttendancePage() {
    const { classes, classSections, sections } = useMasterData();
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedSection, setSelectedSection] = useState<string>("");
    // Initialize date synchronously to avoid first-render flicker
    const [date, setDate] = useState(() => {
        if (typeof window === "undefined") return "2026-02-23"; 
        return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        if (date !== today) setDate(today);
    }, []);

    const fetchedSections = selectedClass
        ? Object.values(classSections || {})
            .filter((cs: any) => cs.classId === selectedClass)
            .map((cs: any) => (sections || {})[cs.sectionId])
            .filter(Boolean)
        : [];

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header section with glow effect */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-[#0B1524] p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-transparent to-transparent opacity-40 blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                        <CalendarDays className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Attendance Management</h1>
                        <p className="text-zinc-400 text-sm mt-1">Track and manage attendance records across all classes and staffing divisions</p>
                    </div>
                </div>

                <div className="w-full lg:w-auto relative z-10 shrink-0">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 px-4 flex items-center gap-4 hover:border-emerald-500/30 transition-all">
                        <div className="space-y-1">
                            <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-black">Attendance Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent border-0 p-0 text-white font-bold outline-none focus:ring-0 text-sm cursor-pointer [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Modules Tabs */}
            <Tabs defaultValue="student" className="w-full space-y-6">
                <TabsList className="bg-[#0B1524] border border-white/5 p-1.5 rounded-2xl flex flex-wrap md:inline-flex h-auto gap-1">
                    <TabsTrigger 
                        value="student" 
                        className="rounded-xl px-6 py-2.5 font-bold tracking-tight text-zinc-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-black transition-all"
                    >
                        Student Attendance
                    </TabsTrigger>
                    <TabsTrigger 
                        value="teacher" 
                        className="rounded-xl px-6 py-2.5 font-bold tracking-tight text-zinc-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-black transition-all"
                    >
                        Teacher Attendance
                    </TabsTrigger>
                    <TabsTrigger 
                        value="staff" 
                        className="rounded-xl px-6 py-2.5 font-bold tracking-tight text-zinc-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-black transition-all"
                    >
                        Staff Attendance
                    </TabsTrigger>
                </TabsList>

                {/* Students Content */}
                <TabsContent value="student" className="space-y-6 outline-none">
                    <Card className="bg-[#0B1524] border border-white/5 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/40 via-teal-500/20 to-transparent" />
                        <div className="flex flex-col sm:flex-row gap-4 items-end max-w-xl">
                            <div className="space-y-2 w-full sm:w-1/2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block">Class</label>
                                <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedSection(""); }}>
                                    <SelectTrigger className="bg-[#050B14] border-white/10 rounded-xl h-11 focus:ring-emerald-500/30 text-white font-medium">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B1524] border-white/10 text-white">
                                        {Object.values(classes || {}).map((c: any) => (
                                            <SelectItem key={c.id} value={c.id} className="hover:bg-white/5 focus:bg-white/5 rounded-lg">{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 w-full sm:w-1/2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block">Section</label>
                                <Select
                                    value={selectedSection}
                                    onValueChange={setSelectedSection}
                                    disabled={!selectedClass}
                                >
                                    <SelectTrigger className="bg-[#050B14] border-white/10 rounded-xl h-11 focus:ring-emerald-500/30 text-white font-medium disabled:opacity-40">
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B1524] border-white/10 text-white">
                                        {fetchedSections.map((sec: any) => (
                                            <SelectItem key={sec.id} value={sec.id} className="hover:bg-white/5 focus:bg-white/5 rounded-lg">{sec.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedClass && fetchedSections.length === 0 && (
                                    <p className="text-[10px] text-rose-400 font-medium">No sections linked.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    {selectedClass && selectedSection && date ? (
                        <div className="animate-in fade-in duration-500">
                            <AttendanceManager
                                classId={selectedClass}
                                sectionId={selectedSection}
                                defaultDate={date}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/10 rounded-2xl bg-[#0B1524]/20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                                <Users2 size={28} />
                            </div>
                            <div className="max-w-sm space-y-1">
                                <h3 className="font-bold text-white text-lg">No Class Selected</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">Please select a class and section from the dropdowns above to mark student attendance.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Teachers Content */}
                <TabsContent value="teacher" className="outline-none">
                    <TeacherAttendanceManager defaultDate={date} />
                </TabsContent>

                {/* Staff Content */}
                <TabsContent value="staff" className="outline-none">
                    <StaffAttendanceManager defaultDate={date} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
