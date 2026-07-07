"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Search, GraduationCap, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "@/context/MasterDataContext";

export default function AlumniYearPage() {
    const params = useParams();
    const router = useRouter();
    const { branchId } = useAuth();
    const { classes } = useMasterData();
    const year = params.year as string;

    const [alumni, setAlumni] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!branchId || branchId === "global" || !year) return;

        const fetchAlumni = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "students"),
                    where("schoolId", "==", branchId),
                    where("status", "==", "ALUMNI"),
                    where("alumniYear", "==", year)
                );
                
                const snap = await getDocs(q);
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAlumni(data);
            } catch (error) {
                console.error("Error fetching alumni:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlumni();
    }, [branchId, year]);

    const filteredAlumni = alumni.filter(student => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            student.studentName?.toLowerCase().includes(search) ||
            student.schoolId?.toLowerCase().includes(search) ||
            student.parentMobile?.includes(search)
        );
    });

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => router.push("/admin/alumni")}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 shrink-0 p-0 flex items-center justify-center transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight flex items-center gap-3">
                            Class of {year} 
                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-cyan-500/20 font-sans">
                                Alumni
                            </span>
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">{filteredAlumni.length} students graduated in this session</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-80 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                        placeholder="Search name, ID or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-[#0B1524] border-white/10 rounded-xl focus:ring-cyan-500/30 text-white placeholder-white/40 font-sans"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center bg-[#0B1524]/50 border border-white/5 rounded-2xl">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                        <span className="text-sm font-medium text-zinc-400">Loading alumni records...</span>
                    </div>
                </div>
            ) : filteredAlumni.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-[#0B1524]/50 border border-white/5 rounded-2xl py-24 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-4">
                        <GraduationCap className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Alumni Found</h3>
                    <p className="text-zinc-400 max-w-sm">
                        {searchQuery 
                            ? "No alumni match your search query." 
                            : `There are no graduated students recorded for the ${year} academic session.`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAlumni.map((s) => (
                        <div key={s.id} className="bg-[#0B1524] p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-cyan-500/5 transition-all group flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">
                                        {s.studentName}
                                    </span>
                                    <span className="text-xs font-mono text-zinc-400 mt-0.5">
                                        ID: {s.schoolId || "N/A"}
                                    </span>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
                                    <GraduationCap className="w-5 h-5 text-cyan-400" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="flex flex-col gap-1 p-3 bg-white/[0.02] rounded-xl border border-white/[0.02]">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Contact</span>
                                    <span className="text-sm text-emerald-400 font-bold">{s.parentMobile || "N/A"}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-3 bg-white/[0.02] rounded-xl border border-white/[0.02]">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Class of Graduation</span>
                                    <span className="text-sm text-white font-medium">{classes?.[s.classId]?.name || s.className || "Unknown"}</span>
                                </div>
                            </div>

                            {s.villageName && (
                                <div className="flex items-center gap-2 text-zinc-400 text-xs mt-2 px-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{s.villageName}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
