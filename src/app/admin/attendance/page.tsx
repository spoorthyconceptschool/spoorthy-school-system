
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

export default function AdminAttendancePage() {
    const { classes, classSections, sections } = useMasterData();
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedSection, setSelectedSection] = useState<string>("");
    // Initialize date synchronously to avoid first-render flicker
    const [date, setDate] = useState(() => {
        if (typeof window === "undefined") return "2026-02-23"; // Fallback for SSR using current user time
        return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
        // Double check on client side to handle overnight sessions
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
        <div className="max-w-none p-0 space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold">Attendance Management</h1>
                    <p className="text-muted-foreground">Mark or modify attendance for students and teachers.</p>
                </div>
                <div className="w-full md:w-48 space-y-2">
                    <label className="text-xs text-muted-foreground uppercase font-medium">Select Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-md py-2 px-3 w-full text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="student" className="w-full">
                <TabsList className="flex flex-wrap h-auto w-full md:grid md:grid-cols-3 md:w-full max-w-[600px] mb-6 bg-black/40 border border-white/10 gap-2 p-1">
                    <TabsTrigger value="student" className="flex-1 min-w-[140px]">Student Attendance</TabsTrigger>
                    <TabsTrigger value="teacher" className="flex-1 min-w-[140px]">Teacher Attendance</TabsTrigger>
                    <TabsTrigger value="staff" className="flex-1 min-w-[140px]">Staff Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="student" className="space-y-6">
                    <Card className="bg-black/20 border-white/10 p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="space-y-2 w-full md:w-48">
                                <label className="text-xs text-muted-foreground uppercase">Class</label>
                                <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedSection(""); }}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(classes || {}).map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 w-full md:w-32">
                                <label className="text-xs text-muted-foreground uppercase">Section</label>
                                <Select
                                    value={selectedSection}
                                    onValueChange={setSelectedSection}
                                    disabled={!selectedClass}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Sec" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fetchedSections.map((sec: any) => (
                                            <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedClass && fetchedSections.length === 0 && (
                                    <p className="text-[10px] text-red-400">No sections linked.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    {selectedClass && selectedSection && date && (
                        <div>
                            <AttendanceManager
                                classId={selectedClass}
                                sectionId={selectedSection}
                                defaultDate={date}
                            />
                        </div>
                    )}
                    {(!selectedClass || !selectedSection) && (
                        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                            <p className="text-muted-foreground">Please select Class and Section to view student attendance.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="teacher">
                    <TeacherAttendanceManager defaultDate={date} />
                </TabsContent>

                <TabsContent value="staff">
                    <StaffAttendanceManager defaultDate={date} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
