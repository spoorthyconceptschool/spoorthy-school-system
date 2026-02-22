"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Layers, BookOpen, MapPin } from "lucide-react";
import { ClassesSectionsManager } from "@/components/admin/master-data/ClassesSectionsManager";
import { SubjectsManager } from "@/components/admin/master-data/SubjectsManager";
import { VillagesManager } from "@/components/admin/master-data/VillagesManager";

export default function MasterDataPage() {
    const [activeTab, setActiveTab] = useState("classes");

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Consolidated Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-5xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic leading-tight">
                        Master Data Center
                    </h1>
                    <p className="text-muted-foreground text-[10px] md:text-sm tracking-tight uppercase font-black opacity-50">
                        Primary School Setup: <span className="text-accent">Classes • Subjects • Villages</span>
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="px-2 md:px-0 bg-black/20 p-1 rounded-2xl border border-white/5 backdrop-blur-md sticky top-0 z-10 mx-2 md:mx-0 shadow-2xl">
                    <TabsList className="bg-transparent h-auto w-full grid grid-cols-3 gap-1">
                        <TabsTrigger
                            value="classes"
                            className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-4 font-bold transition-all text-[10px] md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-3"
                        >
                            <Layers size={14} className="md:w-5 md:h-5" />
                            <div className="flex flex-col items-start leading-none gap-1">
                                <span>Classes</span>
                                <span className="text-[8px] opacity-40 uppercase hidden md:block">Structure</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="subjects"
                            className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-4 font-bold transition-all text-[10px] md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-3"
                        >
                            <BookOpen size={14} className="md:w-5 md:h-5" />
                            <div className="flex flex-col items-start leading-none gap-1">
                                <span>Subjects</span>
                                <span className="text-[8px] opacity-40 uppercase hidden md:block">Curriculum</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="villages"
                            className="data-[state=active]:bg-white data-[state=active]:text-black rounded-xl py-2 md:py-4 font-bold transition-all text-[10px] md:text-sm flex flex-col md:flex-row items-center gap-1 md:gap-3"
                        >
                            <MapPin size={14} className="md:w-5 md:h-5" />
                            <div className="flex flex-col items-start leading-none gap-1">
                                <span>Villages</span>
                                <span className="text-[8px] opacity-40 uppercase hidden md:block">Transport</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="space-y-6 px-1 md:px-0">
                    <TabsContent value="classes" className="outline-none m-0 animate-in slide-in-from-left-4 duration-300">
                        <ClassesSectionsManager />
                    </TabsContent>

                    <TabsContent value="subjects" className="outline-none m-0 animate-in slide-in-from-right-4 duration-300">
                        <SubjectsManager />
                    </TabsContent>

                    <TabsContent value="villages" className="outline-none m-0 animate-in slide-in-from-bottom-4 duration-300">
                        <VillagesManager />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
