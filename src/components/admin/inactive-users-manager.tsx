"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, RefreshCcw, Search, Trash2, Loader2, User } from "lucide-react";
import { collection, query, onSnapshot, where, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { useAuth } from "@/context/AuthContext";

const INACTIVE_STUDENTS_CACHE_KEY = "spoorthy_inactive_students_cache";
const INACTIVE_TEACHERS_CACHE_KEY = "spoorthy_inactive_teachers_cache";
const DEFAULT_INACTIVE_STUDENTS = [
    {
        id: "STD-INACTIVE-01",
        studentName: "Kalyan Varma",
        schoolId: "SPO-2026-090",
        collection: "students",
        status: "INACTIVE",
        className: "Class 5",
        sectionName: "A"
    }
];
const DEFAULT_INACTIVE_TEACHERS = [
    {
        id: "TCH-INACTIVE-01",
        name: "Ramesh Sharma",
        schoolId: "TCH-2026-003",
        collection: "teachers",
        status: "INACTIVE"
    }
];

export function InactiveUsersManager() {
    const { user: currentUser, userData, branchId: userBranchId } = useAuth();
    const activeBranchId = userBranchId || null;

    const [search, setSearch] = useState("");
    const [students, setStudents] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(INACTIVE_STUDENTS_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch(e) {}
            }
        }
        return DEFAULT_INACTIVE_STUDENTS;
    });
    const [teachers, setTeachers] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(INACTIVE_TEACHERS_CACHE_KEY);
            if (cached) {
                try { return JSON.parse(cached); } catch(e) {}
            }
        }
        return DEFAULT_INACTIVE_TEACHERS;
    });
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    useEffect(() => {
        if (!activeBranchId || !currentUser) return;

        let isStudentsDead = false;
        let isTeachersDead = false;

        // Sync Inactive Students
        let qStudents = query(collection(db, "students"), where("status", "==", "INACTIVE"));
        if (activeBranchId !== "global") {
            qStudents = query(collection(db, "students"), where("status", "==", "INACTIVE"), where("branchId", "==", activeBranchId));
        }

        const unsubStudents = onSnapshot(qStudents, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, collection: "students", ...d.data() }));
            setStudents(list);
            if (typeof window !== 'undefined') {
                localStorage.setItem(INACTIVE_STUDENTS_CACHE_KEY, JSON.stringify(list));
            }
            setLoading(false);
        }, (err) => {
            console.warn("Inactive Students Sync Warning:", err.message);
            isStudentsDead = true;
            setLoading(false);
        });

        // Sync Inactive Teachers
        let qTeachers = query(collection(db, "teachers"), where("status", "==", "INACTIVE"));
        if (activeBranchId !== "global") {
            qTeachers = query(collection(db, "teachers"), where("status", "==", "INACTIVE"), where("schoolId", "==", activeBranchId));
        }

        const unsubTeachers = onSnapshot(qTeachers, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, collection: "teachers", ...d.data() }));
            setTeachers(list);
            if (typeof window !== 'undefined') {
                localStorage.setItem(INACTIVE_TEACHERS_CACHE_KEY, JSON.stringify(list));
            }
            setLoading(false);
        }, (err) => {
            console.warn("Inactive Teachers Sync Warning:", err.message);
            isTeachersDead = true;
            setLoading(false);
        });

        return () => {
            if (!isStudentsDead && typeof unsubStudents === 'function') {
                try { unsubStudents(); } catch(e) {}
            }
            if (!isTeachersDead && typeof unsubTeachers === 'function') {
                try { unsubTeachers(); } catch(e) {}
            }
        };
    }, [currentUser, activeBranchId]);

    const allInactive = [...students, ...teachers].filter(u =>
        (u.studentName || u.name)?.toLowerCase().includes(search.toLowerCase()) ||
        (u.schoolId || u.id)?.toLowerCase().includes(search.toLowerCase())
    );

    const handleRestore = async (u: any) => {
        setRestoringId(u.id);
        try {
            const batch = writeBatch(db);
            const docRef = doc(db, u.collection, u.id);
            batch.update(docRef, { status: "ACTIVE", updatedAt: new Date().toISOString() });

            if (u.uid) {
                batch.update(doc(db, "users", u.uid), { status: "ACTIVE", updatedAt: new Date().toISOString() });
            }

            await batch.commit();
            toast({
                title: "User Restored",
                description: `${u.studentName || u.name} is now active.`,
                type: "success"
            });
        } catch (error: any) {
            toast({
                title: "Restore Failed",
                description: error.message,
                type: "error"
            });
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <Card className="bg-black/20 border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <UserX className="text-rose-500" size={20} />
                        Deactivated Accounts
                    </CardTitle>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Archives of students and faculty</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Filter by name/ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-white/5 border-white/10 text-xs"
                    />
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-3">
                    {loading ? (
                        <div className="p-10 text-center animate-pulse text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing archives...
                        </div>
                    ) : allInactive.length === 0 ? (
                        <div className="p-10 text-center border border-dashed border-white/5 rounded-xl text-muted-foreground italic text-sm">
                            {search ? "No matches found in archives." : "No deactivated accounts found."}
                        </div>
                    ) : (
                        allInactive.map((u) => (
                            <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                        <User size={18} className="text-rose-500/60" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white">{u.studentName || u.name}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-white/40 uppercase">{u.schoolId || u.id}</span>
                                            <Badge className="text-[8px] h-4 py-0 bg-white/5 text-white/40 border-none uppercase">
                                                {u.collection === "students" ? "Student" : "Teacher"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={restoringId === u.id}
                                        onClick={() => handleRestore(u)}
                                        className="h-8 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 gap-2 font-bold text-[10px] uppercase tracking-tighter"
                                    >
                                        {restoringId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw size={12} />}
                                        Restore
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10"
                                        onClick={() => alert("Permanent deletion is disabled in archives for safety. Use the main directory for hard deletes.")}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
