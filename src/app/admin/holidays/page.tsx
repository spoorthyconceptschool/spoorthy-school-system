"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Loader2, RefreshCw, Trash2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/lib/toast-store";

const HOLIDAYS_CACHE_KEY = "spoorthy_holidays_cache";
const DEFAULT_HOLIDAYS = [
    {
        id: "hol_default_1",
        title: "Summer Vacation",
        description: "Annual summer break for all classes.",
        startDate: "2026-05-01",
        endDate: "2026-06-10",
        type: "HOLIDAY",
        status: "PUBLISHED"
    },
    {
        id: "hol_default_2",
        title: "Diwali Festival",
        description: "Festival of lights holidays.",
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        type: "HOLIDAY",
        status: "PUBLISHED"
    }
];

export default function AdminHolidaysPage() {
    const { user, userData, role } = useAuth();
    const activeBranchId = userData?.schoolId || userData?.branchId || (role === "SUPER_ADMIN" ? "global" : null);

    const HOLIDAYS_CACHE_KEY = activeBranchId ? `spoorthy_holidays_cache_${activeBranchId}` : null;
    const [holidays, setHolidays] = useState<any[]>(DEFAULT_HOLIDAYS);

    useEffect(() => {
        if (typeof window !== 'undefined' && HOLIDAYS_CACHE_KEY) {
            const cached = localStorage.getItem(HOLIDAYS_CACHE_KEY);
            if (cached) {
                try {
                    setHolidays(JSON.parse(cached));
                    return;
                } catch (e) {}
            }
        }
        setHolidays([]); // Reset if not cached or activeBranchId changes
    }, [HOLIDAYS_CACHE_KEY]);

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openAdd, setOpenAdd] = useState(false);
    const [hasLoggedError, setHasLoggedError] = useState(false);
    const { loading: authLoading } = useAuth();
 
    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
 
    useEffect(() => {
        const userId = user?.uid;
        
        // CIRCUIT BREAKER: Stop execution if auth is transitioning, missing, or if we've already hit an error
        if (authLoading || !userId || !activeBranchId || hasLoggedError) {
            if (!activeBranchId && !authLoading) {
                console.log("[HolidaysPage] activeBranchId is not yet resolved, skipping subscription.");
            }
            return;
        }

        // Synchronous cache purge before listening
        setHolidays([]);
        setLoading(true);

        try {
            let baseConstraints: any[] = [
                where("type", "==", "HOLIDAY")
            ];
            if (activeBranchId && activeBranchId !== "global") {
                baseConstraints.push(where("schoolId", "==", activeBranchId));
            }

            const q = query(
                collection(db, "notices"),
                ...baseConstraints
            );
     
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const hols = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a: any, b: any) => {
                        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
                        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
                        return dateB - dateA; // descending
                    });
                     
                setHolidays(hols);
                if (typeof window !== 'undefined' && HOLIDAYS_CACHE_KEY) {
                    localStorage.setItem(HOLIDAYS_CACHE_KEY, JSON.stringify(hols));
                }
                setLoading(false);
            }, (error) => {
                console.warn("[Holidays] Permission Denied or Fetch error:", error.message);
                setHasLoggedError(true); // TRIPS THE CIRCUIT BREAKER
                setLoading(false);
            });
     
            return () => unsubscribe();
        } catch (e: any) {
            console.error("[Holidays] Setup Error:", e.message);
            setHasLoggedError(true); // TRIPS THE CIRCUIT BREAKER
            setLoading(false);
        }
    }, [user?.uid, activeBranchId, HOLIDAYS_CACHE_KEY, authLoading, hasLoggedError]);

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startDate || !endDate) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", type: "error" });
            return;
        }

        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        if (sDate > eDate) {
            toast({ title: "Invalid Dates", description: "End date must be after start date.", type: "error" });
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/holidays/manage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, startDate, endDate })
            });

            const data = await res.json();
            if (data.success) {
                toast({ title: "Holiday Declared", description: `Successfully declared holiday and swept ${data.data?.daysSwept || 0} attendance records.` });
                setOpenAdd(false);
                setTitle("");
                setDescription("");
                setStartDate("");
                setEndDate("");
            } else {
                toast({ title: "Failed", description: data.error, type: "error" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevertHoliday = async (id: string, title: string) => {
        if (!window.confirm(`Are you sure you want to revert "${title}" into a regular working day? Attendance will need to be re-marked manually.`)) {
            return;
        }

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/admin/holidays/manage?id=${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await res.json();
            if (data.success) {
                toast({ title: "Holiday Reverted", description: "Successfully restored to working day." });
            } else {
                toast({ title: "Failed", description: data.error, type: "error" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, type: "error" });
        }
    };

    if (loading) {
        return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Holiday Hub</h1>
                    <p className="text-muted-foreground">Declare new holidays and automatically resolve attendance conflicts natively.</p>
                </div>
                
                <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                    <DialogTrigger asChild>
                        <Button className="bg-accent text-black hover:bg-accent/80 font-bold uppercase tracking-widest text-[10px] gap-2 rounded-xl">
                            <Plus className="w-4 h-4" /> Declare Holiday
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white sm:max-w-[425px] border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-accent" /> New Holiday
                            </DialogTitle>
                            <DialogDescription className="text-white/60">
                                Declaring a holiday will automatically <strong className="text-red-400">sweep and wipe</strong> any attendance records mistakenly marked for these dates globally.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateHoliday} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">Holiday Title</Label>
                                <Input 
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20" 
                                    placeholder="e.g. Summer Vacation, Diwali" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">Start Date</Label>
                                    <Input 
                                        type="date" 
                                        className="bg-white/5 border-white/10 text-white css-invert-calendar" 
                                        value={startDate} 
                                        onChange={(e) => setStartDate(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">End Date</Label>
                                    <Input 
                                        type="date" 
                                        className="bg-white/5 border-white/10 text-white css-invert-calendar" 
                                        value={endDate} 
                                        onChange={(e) => setEndDate(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/70 text-xs font-bold uppercase tracking-widest">Description (Optional)</Label>
                                <Textarea 
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[80px]" 
                                    placeholder="Add any additional context..." 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-black hover:bg-accent/80 font-bold uppercase tracking-widest text-xs h-12 rounded-xl group relative overflow-hidden">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish & Sweep Attendance"}
                                    {!isSubmitting && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-black/20 border-white/10 overflow-hidden backdrop-blur-md">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-lg flex items-center gap-2 text-white/90">
                        <Calendar className="w-5 h-5 text-accent" /> Global Holiday Calendar
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {holidays.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <Calendar className="w-12 h-12 opacity-20" />
                            <p>No holidays declared yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {holidays.map((hol) => {
                                // Safe Date Formatting
                                const parseDate = (d: any) => {
                                    if (!d) return new Date();
                                    if (d.seconds) return new Date(d.seconds * 1000);
                                    return new Date(d);
                                };

                                const sDateObj = parseDate(hol.startDate);
                                const eDateObj = parseDate(hol.endDate);

                                const start = sDateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                const end = eDateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                const isMultiDay = start !== end;
                                
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const isPast = eDateObj < today;

                                return (
                                    <div key={hol.id} className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-white/5 ${isPast ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border shadow-lg ${isPast ? 'bg-white/5 border-white/10' : 'bg-accent/20 border-accent/40 text-accent'}`}>
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg text-white group-hover:text-accent transition-colors">{hol.title}</h3>
                                                    {isPast && <Badge variant="outline" className="text-[10px] bg-white/5 text-white/40 border-white/10">Past</Badge>}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-white/60 font-mono tracking-tight bg-black/20 px-2 py-1 rounded inline-flex border border-white/5">
                                                    {start} {isMultiDay && <span className="opacity-50 mx-1">→</span>} {isMultiDay && end}
                                                </div>
                                                {hol.description && (
                                                    <p className="text-sm text-white/40 mt-2 line-clamp-2">{hol.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-end">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleRevertHoliday(hol.id, hol.title)}
                                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2 h-9 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" /> Revert
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
