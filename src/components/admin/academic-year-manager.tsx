
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, ArrowRight, CheckCircle, AlertTriangle, Play, Loader2, Plus, Edit, Pencil, History, TrendingUp, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import confetti from "canvas-confetti";

interface AcademicYear {
    year: string;
    isActive: boolean;
    isUpcoming?: boolean;
    startDate: string | null;
    endDate: string | null;
    stats?: {
        promoted: number;
        detained: number;
        total: number;
    } | null;
}

export function AcademicYearManager() {
    const { user } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);

    // Transition State
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
    const [selectedTargetYear, setSelectedTargetYear] = useState("");
    const [transitionStep, setTransitionStep] = useState<"SETUP" | "REVIEW" | "EXECUTING" | "DONE">("SETUP");
    const [transitionStats, setTransitionStats] = useState<any>(null);

    // Add Year State
    const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
    const [newUpcomingYear, setNewUpcomingYear] = useState("");
    const [addingYear, setAddingYear] = useState(false);

    // Edit Year State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [editForm, setEditForm] = useState({ label: "", startDate: "", endDate: "" });
    const [savingEdit, setSavingEdit] = useState(false);

    // Fetch Years
    const fetchYears = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/academic-years/history", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setYears(data.years || []);
            }
        } catch (e) {
            console.error("Failed to fetch years", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchYears();
    }, [user]);

    const handleCreateYear = async () => {
        if (!newUpcomingYear) return;
        setAddingYear(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/academic-years/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ yearLabel: newUpcomingYear })
            });

            const data = await res.json();
            if (data.success) {
                setIsAddYearModalOpen(false);
                setNewUpcomingYear("");
                fetchYears();
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setAddingYear(false);
        }
    };

    const handleStartNewYear = async () => {
        if (!selectedTargetYear) return;
        setTransitionStep("EXECUTING");

        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/academic-years/start-new", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ newYearLabel: selectedTargetYear })
            });

            const data = await res.json();

            if (data.success) {
                setTransitionStats(data.stats);
                setTransitionStep("DONE");
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#10b981', '#ffffff']
                });
                await fetchYears();
            } else {
                alert("Error: " + data.error);
                setTransitionStep("SETUP");
            }
        } catch (e: any) {
            alert("Error: " + e.message);
            setTransitionStep("SETUP");
        }
    };

    const openEditModal = (year: AcademicYear) => {
        setEditingYear(year);
        setEditForm({
            label: year.year,
            startDate: year.startDate ? new Date(year.startDate).toISOString().split('T')[0] : "",
            endDate: year.endDate ? new Date(year.endDate).toISOString().split('T')[0] : ""
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingYear) return;
        setSavingEdit(true);
        try {
            const payload = {
                targetYear: editingYear.year,
                newLabel: editForm.label,
                startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
                endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null
            };

            const token = await user?.getIdToken();
            const res = await fetch("/api/admin/academic-years/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setIsEditModalOpen(false);
                setEditingYear(null);
                fetchYears();
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSavingEdit(false);
        }
    };

    const activeYear = years.find(y => y.isActive);
    const upcomingYears = years.filter(y => y.isUpcoming);
    const pastYears = years.filter(y => !y.isActive && !y.isUpcoming).sort((a, b) => b.year.localeCompare(a.year));

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-0">
                <div>
                    <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                        <History className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                        <h2 className="text-base md:text-xl font-bold text-white">Academic Lifecycle</h2>
                    </div>
                    <p className="text-[10px] md:text-sm text-slate-400">Archiving, student promotion, and multi-year management.</p>
                </div>
                <div className="flex gap-2 md:gap-3">
                    <Button
                        onClick={() => setIsAddYearModalOpen(true)}
                        variant="outline"
                        className="bg-slate-900/50 border-slate-800 text-slate-300 hover:text-white h-8 md:h-10 text-[10px] md:text-sm px-2 md:px-4"
                    >
                        <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Define New Year
                    </Button>
                    <Button
                        onClick={() => {
                            setSelectedTargetYear(upcomingYears[0]?.year || "");
                            setIsTransitionModalOpen(true);
                            setTransitionStep("SETUP");
                        }}
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 h-8 md:h-10 text-[10px] md:text-sm px-2 md:px-4"
                        disabled={upcomingYears.length === 0}
                    >
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Start Transition
                    </Button>
                </div>
            </div>

            {/* Active Year Card - Premium Look */}
            {activeYear && (
                <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-indigo-900/20 via-zinc-900/40 to-black/40 backdrop-blur-xl relative group shadow-2xl ring-1 ring-white/5">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-90" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 z-10 text-zinc-500 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full transition-all"
                        onClick={() => openEditModal(activeYear)}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    <CardContent className="p-5 md:p-8 flex items-center justify-between relative z-0">
                        <div className="space-y-3 md:space-y-5">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                        Live Session
                                    </Badge>
                                </div>
                                <h3 className="text-3xl md:text-6xl font-mono font-bold text-white tracking-tighter drop-shadow-xl">{activeYear.year}</h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 md:gap-8 pt-2">
                                <div className="flex items-center gap-2 text-zinc-400 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] md:text-xs font-medium">Started {activeYear.startDate ? format(new Date(activeYear.startDate), 'MMM d, yyyy') : 'Recently'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] md:text-xs font-medium">Full Enrolment</span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse box-shadow-[0_0_8px_#34d399]" />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-bold">Active</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lists Section */}
            <div className="grid grid-cols-1 gap-6 md:gap-8">
                {/* Upcoming Years */}
                <div className="space-y-3">
                    <h3 className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Planned Sessions
                    </h3>
                    <div className="space-y-2">
                        {upcomingYears.length > 0 ? upcomingYears.map(year => (
                            <div key={year.year} className="p-3 md:p-4 rounded-xl border border-white/5 bg-zinc-900/30 flex items-center justify-between group hover:bg-zinc-900/50 hover:border-indigo-500/20 transition-all cursor-default">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10 group-hover:scale-110 transition-transform">
                                        <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div>
                                        <span className="font-mono text-sm md:text-base font-bold text-zinc-200 group-hover:text-white transition-colors">{year.year}</span>
                                        <p className="text-[9px] text-zinc-500 hidden md:block">Scheduled for future deployment</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-lg"
                                    onClick={() => openEditModal(year)}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )) : (
                            <div className="p-6 border border-dashed border-zinc-800 rounded-xl text-center">
                                <p className="text-zinc-600 text-[10px] md:text-xs">No future academic years defined.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Past Years */}
                <div className="space-y-3">
                    <h3 className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> Archives
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {pastYears.map(year => (
                            <div key={year.year} className="p-3 md:p-4 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between group grayscale hover:grayscale-0 transition-all hover:bg-zinc-900/40">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <span className="font-mono text-sm md:text-base font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">{year.year}</span>
                                        <div className="text-[9px] text-zinc-700 group-hover:text-zinc-500 uppercase tracking-wider">
                                            {year.endDate ? format(new Date(year.endDate), 'MMM yyyy') : 'Closed'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex gap-4 text-right">
                                        <div>
                                            <div className="text-[9px] text-zinc-600 uppercase">Promoted</div>
                                            <div className="text-xs font-bold text-zinc-400 group-hover:text-emerald-400 transition-colors">{year.stats?.promoted || 0}</div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-zinc-700 hover:text-white hover:bg-white/5 rounded-lg"
                                        onClick={() => openEditModal(year)}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add Year Modal */}
            <Dialog open={isAddYearModalOpen} onOpenChange={setIsAddYearModalOpen}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Define New Session</DialogTitle>
                        <DialogDescription className="text-slate-400">Add a future academic year to the planning queue.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-slate-400 mb-2 block">Year Label</Label>
                        <Input
                            value={newUpcomingYear}
                            onChange={(e) => setNewUpcomingYear(e.target.value)}
                            placeholder="e.g. 2027-2028"
                            className="bg-slate-900 border-slate-800 text-lg py-6"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddYearModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateYear} disabled={!newUpcomingYear || addingYear} className="bg-blue-600 text-white hover:bg-blue-500">
                            {addingYear ? <Loader2 className="animate-spin" /> : "Confirm Year"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Year Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Refine Academic Details</DialogTitle>
                        <DialogDescription className="text-slate-400">Modify properties for the {editingYear?.year} session.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-500 uppercase text-[10px] tracking-widest font-bold">Year Identifier</Label>
                            <Input
                                value={editForm.label}
                                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                className="bg-slate-900 border-slate-800"
                            />
                        </div>

                        {/* Hide Start Date for Upcoming as per request */}
                        {(!editingYear?.isUpcoming || editingYear?.isActive) && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 uppercase text-[10px] tracking-widest font-bold">Session Start</Label>
                                    <Input
                                        type="date"
                                        value={editForm.startDate}
                                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                        className="bg-slate-900 border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 uppercase text-[10px] tracking-widest font-bold">Archival Date</Label>
                                    <Input
                                        type="date"
                                        value={editForm.endDate}
                                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                        className="bg-slate-900 border-slate-800"
                                    />
                                </div>
                            </div>
                        )}

                        {editingYear?.isUpcoming && (
                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg text-xs text-blue-300">
                                <div className="flex gap-2">
                                    <CheckCircle className="w-4 h-4 shrink-0" />
                                    <span>Date selection is managed automatically during the transition process. Only the label can be changed at this stage.</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="text-slate-400" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={!editForm.label || savingEdit} className="bg-blue-600 text-white">
                            {savingEdit ? <Loader2 className="animate-spin" /> : "Persist Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transition Wizard Modal */}
            <Dialog open={isTransitionModalOpen} onOpenChange={(open) => {
                if (!open && transitionStep === "EXECUTING") return;
                setIsTransitionModalOpen(open);
            }}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <TrendingUp className="text-blue-500" />
                            Academic Transition
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Move system from <strong>{activeYear?.year}</strong> to a new session.
                        </DialogDescription>
                    </DialogHeader>

                    {transitionStep === "SETUP" && (
                        <div className="space-y-6 py-4">
                            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200 flex gap-4">
                                <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500" />
                                <div>
                                    <strong className="block mb-2 text-amber-400 uppercase tracking-widest text-xs">Automated Lifecycle Actions:</strong>
                                    <ul className="space-y-2 text-xs opacity-90">
                                        <li className="flex gap-2"><ArrowRight className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" /> <strong>Student Promotion</strong>: Promoted students move to next class level.</li>
                                        <li className="flex gap-2"><ArrowRight className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" /> <strong>Fee Carryover</strong>: Pending balances are added to new year's ledger.</li>
                                        <li className="flex gap-2"><ArrowRight className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" /> <strong>Staffing Preservation</strong>: Subject and teacher assignments are cloned.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-400 uppercase text-[10px] tracking-widest pl-1">Target Entry Year</Label>
                                    <Select value={selectedTargetYear} onValueChange={setSelectedTargetYear}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-14 text-xl font-mono">
                                            <SelectValue placeholder="Select Year..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-slate-800">
                                            {upcomingYears.map(y => (
                                                <SelectItem key={y.year} value={y.year} className="text-lg font-mono">{y.year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {transitionStep === "EXECUTING" && (
                        <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                            <div className="relative">
                                <Loader2 className="w-20 h-20 animate-spin text-blue-500 opacity-20" />
                                <TrendingUp className="w-10 h-10 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">Syncing Lifecycle Hub...</h3>
                                <p className="text-sm text-slate-400 mt-2 max-w-xs">Bulk updating students, cloning assignments, and calculating fee carryovers.</p>
                            </div>
                        </div>
                    )}

                    {transitionStep === "DONE" && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                                <CheckCircle className="w-12 h-12 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tight italic">SYSTEM ADVANCED!</h3>
                                <p className="text-slate-400 mt-2">
                                    Successful transition to <span className="text-white font-bold">{selectedTargetYear}</span>.
                                </p>
                                <div className="mt-8 flex gap-4 justify-center">
                                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                                        <div className="text-[10px] uppercase text-slate-500">Promoted</div>
                                        <div className="text-lg font-bold text-emerald-400">{transitionStats?.promoted}</div>
                                    </div>
                                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                                        <div className="text-[10px] uppercase text-slate-500">Retained</div>
                                        <div className="text-lg font-bold text-blue-400">{transitionStats?.retained}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="bg-slate-900/50 p-6 border-t border-slate-800 rounded-b-xl">
                        {transitionStep === "SETUP" && (
                            <>
                                <Button variant="ghost" className="text-slate-400" onClick={() => setIsTransitionModalOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleStartNewYear}
                                    disabled={!selectedTargetYear}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8"
                                >
                                    Initiate Deployment
                                </Button>
                            </>
                        )}
                        {transitionStep === "DONE" && (
                            <Button onClick={() => {
                                setIsTransitionModalOpen(false);
                                window.location.reload();
                            }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                                Enter New Session
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
