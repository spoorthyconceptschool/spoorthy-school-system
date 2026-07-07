"use client";

import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, ArrowRight, FolderOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AlumniDashboard() {
    const { academicYears, loading: masterLoading } = useMasterData();
    const { branchId, role } = useAuth();
    const [alumniYears, setAlumniYears] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!branchId || branchId === "global") return;
        const fetchAlumniGroups = async () => {
            setLoading(true);
            try {
                // Fetch all alumni for this branch matching schoolId
                const q = query(
                    collection(db, "students"),
                    where("schoolId", "==", branchId),
                    where("status", "==", "ALUMNI")
                );
                const snap = await getDocs(q);
                
                // Also query matching branchId
                const q2 = query(
                    collection(db, "students"),
                    where("branchId", "==", branchId),
                    where("status", "==", "ALUMNI")
                );
                const snap2 = await getDocs(q2);

                const yearsSet = new Set<string>();
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.alumniYear) yearsSet.add(data.alumniYear);
                });
                snap2.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.alumniYear) yearsSet.add(data.alumniYear);
                });

                setAlumniYears(Array.from(yearsSet));
            } catch (err) {
                console.error("Error fetching alumni groups:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAlumniGroups();
    }, [branchId]);

    if (masterLoading || loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    const years = alumniYears.map(yearId => {
        const yearConfig = (academicYears as any)?.[yearId];
        return {
            id: yearId,
            active: yearConfig?.active || false
        };
    }).sort((a: any, b: any) => 
        String(b.id || "").localeCompare(String(a.id || ""))
    );

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0B1524] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/10 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/30 shadow-inner">
                        <GraduationCap className="w-7 h-7 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Alumni Network</h1>
                        <p className="text-zinc-400 text-sm mt-1">Manage graduated students by academic year</p>
                    </div>
                </div>
            </div>

            {/* Academic Years Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {years.map((year: any, i) => (
                    <Link href={`/admin/alumni/${year.id}`} key={year.id}>
                        <div 
                            className="group relative bg-[#0B1524] rounded-2xl p-6 border border-white/5 shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            <div className="flex items-start justify-between mb-8 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors border border-white/5 group-hover:border-cyan-500/20 text-zinc-400">
                                    <FolderOpen className="w-6 h-6" />
                                </div>
                                {year.active && (
                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-500/20">
                                        Active
                                    </span>
                                )}
                            </div>

                            <div className="mt-auto relative z-10">
                                <h3 className="text-xl font-bold text-white mb-1 tracking-tight">Class of {year.id}</h3>
                                <p className="text-zinc-400 text-sm font-medium">View alumni records</p>
                            </div>
                            
                            <div className="absolute bottom-6 right-6 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-cyan-400">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>
                    </Link>
                ))}

                {years.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                        <FolderOpen className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-white mb-1">No Academic Years Found</h3>
                        <p className="text-zinc-400 text-sm">Create an academic year in Master Data to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
