"use client";

import { useEffect, useState } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, update, onValue } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Upload, ImagePlus, CheckCircle, X, Plus } from "lucide-react";

import { uploadImageFromUrl, uploadFile } from "@/lib/image-pipeline";
import { useAuth } from "@/context/AuthContext";

export default function CMSPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Data State
    const [data, setData] = useState<any>({
        hero: { title: "", subtitle: "", videoUrl: "" },
        leadership: {
            chairman: { name: "", title: "", photo: "" },
            principal: { name: "", title: "", photo: "" }
        },
        facilities: {},
        why: [], // Array of strings
        gallery: [] // Array of strings
    });

    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'siteContent/home'), (snap) => {
            if (snap.exists() && !isPublishing) {
                const val = snap.val();

                setData((prev: any) => {
                    // Check if anything has been modified locally
                    // We compare current state with the incoming value
                    // If we are already 'dirty' or 'uploading', skip the sync
                    if (isPublishing || isUploading) return prev;

                    // If the local state is still the default/empty state, allow sync
                    const isInitial = !prev.hero.title && !prev.hero.videoUrl && Object.keys(prev.facilities).length === 0;
                    if (isInitial) {
                        return {
                            ...val,
                            facilities: val.facilities || {},
                            why: val.why || [],
                            gallery: val.gallery ? (Array.isArray(val.gallery) ? val.gallery : Object.values(val.gallery)) : []
                        };
                    }

                    return prev;
                });
            }
            setLoading(false);
        });
        return () => unsub();
    }, [isPublishing, isUploading]);

    const handleSave = async () => {
        console.log("[CMS] Publish Sequence Initiated");
        setIsPublishing(true);
        try {
            // Remove any undefined values that RTDB rejects
            const sanitizedData = JSON.parse(JSON.stringify(data));
            console.log("[CMS] Sanitized Data for Publish:", sanitizedData);

            await update(ref(rtdb, 'siteContent/home'), sanitizedData);

            console.log("[CMS] Publish Success");
            alert("Changes published to Landing Page!");
        } catch (e: any) {
            console.error("[CMS] Publish Error:", e);
            alert("Failed to save: " + (e.message || "Unknown Error"));
        } finally {
            setIsPublishing(false);
        }
    };

    const handleForceAppUpdate = async () => {
        // This triggers the LiveUpdatePrompt on all connected mobile apps
        try {
            await update(ref(rtdb, 'system'), {
                liveVersion: Date.now()
            });
            alert("Update command sent! All connected mobile apps will now prompt users to refresh.");
        } catch (e: any) {
            console.error(e);
            alert("Failed to send update command.");
        }
    };

    // Image Pipeline Handler
    const handleFacilityImage = async (key: string, url: string) => {
        if (!url) return;

        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            // Upload via Server API
            const permanentUrl = await uploadImageFromUrl(url, `siteMedia/home/facilities/${key}-${Date.now()}.jpg`, token);

            // Update with permanent URL
            setData((prev: any) => ({
                ...prev,
                facilities: {
                    ...prev.facilities,
                    [key]: { ...prev.facilities[key], image: permanentUrl }
                }
            }));
        } catch (e: any) {
            console.error(e);
            alert("External cache failed: " + e.message);
        }
    };

    const handleLocalUpload = async (file: File, pathPrefix: string, onUpload: (url: string) => void) => {
        try {
            // Check file size (set to max 200MB as requested)
            const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
            if (file.size > MAX_FILE_SIZE) {
                alert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum allowed size is 200 MB.`);
                return;
            }

            setIsUploading(true);
            const token = await user?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            const url = await uploadFile(file, `siteMedia/home/${pathPrefix}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`, token);
            onUpload(url);
        } catch (e: any) {
            console.error(e);
            alert("Upload failed. Please try again or check your connection.");
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto animate-in fade-in pb-20 px-3 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">Website CMS</h1>
                    <p className="text-zinc-400 mt-2 text-sm md:text-lg font-medium">Manage public landing page content and media.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                        onClick={handleForceAppUpdate}
                        variant="outline"
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-white px-6 py-6 rounded-xl shadow-xl transition-all font-bold group"
                    >
                        Push App Update to Phones
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isPublishing || isUploading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white w-full sm:w-auto px-8 py-6 rounded-xl shadow-xl shadow-indigo-500/10 active:scale-95 transition-all text-base font-bold"
                    >
                        {isPublishing ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : <CheckCircle className="mr-2 w-5 h-5" />}
                        {isPublishing ? "Publishing..." : "Publish Changes"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="hero" className="w-full">
                <TabsList className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 w-full justify-start overflow-x-auto p-1.5 rounded-2xl h-auto gap-1.5 mb-8 no-scrollbar">
                    {["Hero", "Facilities", "Leadership", "Why Choose Us", "Gallery"].map((tab) => {
                        const value = tab.toLowerCase().split(" ")[0];
                        return (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-zinc-400 hover:text-white transition-all font-bold text-xs md:text-sm px-6 py-3 rounded-xl uppercase tracking-widest whitespace-nowrap"
                            >
                                {tab}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {/* HERO TAB */}
                <TabsContent value="hero" className="mt-6 md:mt-8">
                    <Card className="bg-zinc-900/40 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                            <CardTitle className="flex items-center gap-3 text-white">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <ImagePlus className="w-5 h-5 text-indigo-400" />
                                </div>
                                <span className="text-lg md:text-xl">Hero Section Configuration</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 md:p-8 space-y-8">
                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 md:gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Main Heading</Label>
                                        <Input
                                            value={data.hero?.title || ""}
                                            onChange={e => setData({ ...data, hero: { ...data.hero, title: e.target.value } })}
                                            className="font-display text-lg md:text-2xl bg-zinc-950/60 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-14 md:h-16 text-white placeholder:text-zinc-700 rounded-xl"
                                            placeholder="Enter main title..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Subtitle / Tagline</Label>
                                        <Input
                                            value={data.hero?.subtitle || ""}
                                            onChange={e => setData({ ...data, hero: { ...data.hero, subtitle: e.target.value } })}
                                            className="bg-zinc-950/60 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 md:h-14 text-white placeholder:text-zinc-700 rounded-xl"
                                            placeholder="Enter subtitle..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold flex items-center justify-between">
                                            Campus Tour Link (YouTube)
                                            <span className="text-[10px] text-zinc-500 font-normal opacity-60 normal-case tracking-normal">e.g. https://youtube.com/watch?v=...</span>
                                        </Label>
                                        <Input
                                            value={data.hero?.tourVideoUrl || ""}
                                            onChange={e => setData({ ...data, hero: { ...data.hero, tourVideoUrl: e.target.value } })}
                                            className="bg-zinc-950/60 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-12 md:h-14 text-white font-mono text-sm placeholder:text-zinc-700 rounded-xl"
                                            placeholder="Paste YouTube or Video link..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="space-y-4">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold flex flex-col gap-1">
                                            <span>Background Video (Desktop)</span>
                                            <span className="text-[10px] text-zinc-500 font-normal lowercase tracking-normal">Recommends 1920x1080</span>
                                        </Label>
                                        <div className="border-2 border-dashed border-zinc-700/50 rounded-2xl p-4 bg-zinc-950/40 hover:bg-zinc-950/60 transition-all group relative aspect-video flex flex-col items-center justify-center gap-3 overflow-hidden">
                                            {data.hero?.videoUrl ? (
                                                <video src={data.hero.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-20 transition-opacity" muted loop autoPlay />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                                                    <Upload className="w-5 h-5 text-zinc-400" />
                                                </div>
                                            )}

                                            <div className="relative z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <Input
                                                    type="file"
                                                    accept="video/*"
                                                    className="hidden"
                                                    id="hero-video-upload"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleLocalUpload(file, 'hero', (url) => setData((prev: any) => ({ ...prev, hero: { ...prev.hero, videoUrl: url } })));
                                                    }}
                                                />
                                                <Label htmlFor="hero-video-upload" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl cursor-pointer text-xs font-bold shadow-xl active:scale-95 transition-all flex items-center gap-2">
                                                    <Upload className="w-4 h-4" /> Upload Desktop
                                                </Label>
                                            </div>
                                        </div>
                                        <Input
                                            value={data.hero?.videoUrl || ""}
                                            onChange={e => setData({ ...data, hero: { ...data.hero, videoUrl: e.target.value } })}
                                            placeholder="URL..."
                                            className="bg-zinc-950/60 border-white/10 text-[10px] font-mono h-9 text-zinc-500 focus:text-white rounded-lg"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold flex flex-col gap-1">
                                            <span>Background Video (Mobile)</span>
                                            <span className="text-[10px] text-zinc-500 font-normal lowercase tracking-normal">Vertical video best</span>
                                        </Label>
                                        <div className="border-2 border-dashed border-zinc-700/50 rounded-2xl p-4 bg-zinc-950/40 hover:bg-zinc-950/60 transition-all group relative aspect-video flex flex-col items-center justify-center gap-3 overflow-hidden">
                                            {data.hero?.mobileVideoUrl ? (
                                                <video src={data.hero.mobileVideoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-20 transition-opacity" muted loop autoPlay />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                                                    <Upload className="w-5 h-5 text-zinc-400" />
                                                </div>
                                            )}

                                            <div className="relative z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <Input
                                                    type="file"
                                                    accept="video/*"
                                                    className="hidden"
                                                    id="hero-mobile-video-upload"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleLocalUpload(file, 'hero-mobile', (url) => setData((prev: any) => ({ ...prev, hero: { ...prev.hero, mobileVideoUrl: url } })));
                                                    }}
                                                />
                                                <Label htmlFor="hero-mobile-video-upload" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl cursor-pointer text-xs font-bold shadow-xl active:scale-95 transition-all flex items-center gap-2">
                                                    <Upload className="w-4 h-4" /> Upload Mobile
                                                </Label>
                                            </div>
                                        </div>
                                        <Input
                                            value={data.hero?.mobileVideoUrl || ""}
                                            onChange={e => setData({ ...data, hero: { ...data.hero, mobileVideoUrl: e.target.value } })}
                                            placeholder="URL..."
                                            className="bg-zinc-950/60 border-white/10 text-[10px] font-mono h-9 text-zinc-500 focus:text-white rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FACILITIES TAB */}
                <TabsContent value="facilities" className="mt-6 md:mt-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Interactive Campus Grid
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">Manage the feature cards displayed on the home page.</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const defaults: any = {
                                    digital_classrooms: { title: "Digital Classrooms", desc: "Interactive smart boards with immersive content.", order: 1, image: "https://images.unsplash.com/photo-1577896338042-327704b77134?w=800&q=80", isPublished: true },
                                    professional_teachers: { title: "Professional Teachers", desc: "Highly qualified faculty dedicated to student growth.", order: 2, image: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&q=80", isPublished: true },
                                    spoken_english: { title: "Spoken English", desc: "Special emphasis on communication and confidence.", order: 3, image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80", isPublished: true },
                                    karate_classes: { title: "Karate Classes", desc: "Self-defense and discipline for physical fitness.", order: 4, image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80", isPublished: true },
                                    computer_classes: { title: "Computer Classes", desc: "State-of-the-art systems for technical literacy.", order: 5, image: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&q=80", isPublished: true },
                                    dance_classes: { title: "Dance Classes", desc: "Creative expression through classical and modern dance.", order: 6, image: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&q=80", isPublished: true },
                                    cultural_programs: { title: "Cultural Programs", desc: "Celebrating heritage through stage performances.", order: 7, image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80", isPublished: true },
                                };
                                setData({ ...data, facilities: defaults });
                            }}
                            className="text-xs h-8 text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5"
                        >
                            <Upload className="w-3 h-3 mr-2" /> Reset Defaults
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        {[
                            { key: 'digital_classrooms', label: 'Digital Classrooms' },
                            { key: 'professional_teachers', label: 'Professional Teachers' },
                            { key: 'spoken_english', label: 'Spoken English' },
                            { key: 'karate_classes', label: 'Karate Classes' },
                            { key: 'computer_classes', label: 'Computer Classes' },
                            { key: 'dance_classes', label: 'Dance Classes' },
                            { key: 'cultural_programs', label: 'Cultural Programs' }
                        ].map(({ key, label }) => {
                            const item = data.facilities?.[key] || { title: label, desc: "", order: 99, isPublished: false };

                            return (
                                <Card key={key} className={`border-white/5 relative overflow-hidden group transition-all duration-300 ${item.isPublished ? 'bg-zinc-900/40' : 'bg-black/20 opacity-60 hover:opacity-100'}`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${item.isPublished ? 'bg-emerald-500' : 'bg-zinc-800'}`} />

                                    <CardHeader className="pb-3 flex flex-row items-center justify-between pl-6">
                                        <CardTitle className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                                            {label}
                                        </CardTitle>
                                        <div className="flex items-center gap-3">
                                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${item.isPublished ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                {item.isPublished ? 'Live' : 'Hidden'}
                                            </Label>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0 cursor-pointer"
                                                checked={item.isPublished}
                                                onChange={(e) => {
                                                    const updated = { ...data.facilities, [key]: { ...item, isPublished: e.target.checked } };
                                                    setData({ ...data, facilities: updated });
                                                }}
                                            />
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4 pl-6">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-3">
                                                <Input
                                                    placeholder="Display Title"
                                                    value={item.title || ""}
                                                    onChange={(e) => {
                                                        const updated = { ...data.facilities, [key]: { ...item, title: e.target.value } };
                                                        setData({ ...data, facilities: updated });
                                                    }}
                                                    className="bg-zinc-950/50 border-white/5 focus:border-indigo-500/30 text-xs md:text-sm h-9 md:h-10"
                                                />
                                                <Input
                                                    placeholder="Description (short)"
                                                    value={item.desc || ""}
                                                    onChange={(e) => {
                                                        const updated = { ...data.facilities, [key]: { ...item, desc: e.target.value } };
                                                        setData({ ...data, facilities: updated });
                                                    }}
                                                    className="bg-zinc-950/50 border-white/5 focus:border-indigo-500/30 text-xs md:text-sm h-9 md:h-10"
                                                />
                                                <Input
                                                    placeholder="Or paste Image URL..."
                                                    value={item.image || ""}
                                                    onChange={(e) => {
                                                        const updated = { ...data.facilities, [key]: { ...item, image: e.target.value } };
                                                        setData({ ...data, facilities: updated });
                                                    }}
                                                    className="bg-zinc-950/50 border-white/5 focus:border-indigo-500/30 text-xs md:text-sm h-9 md:h-10 text-zinc-500 font-mono focus:text-white"
                                                />
                                            </div>

                                            <div className="shrink-0 relative group/img w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-white/10 bg-black">
                                                {item.image ? (
                                                    <img src={item.image} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                        <ImagePlus className="w-5 h-5 text-zinc-700" />
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10 cursor-pointer">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleLocalUpload(file, `facilities/${key}`, (url) => {
                                                                setData((prev: any) => ({
                                                                    ...prev,
                                                                    facilities: {
                                                                        ...prev.facilities,
                                                                        [key]: { ...prev.facilities[key], image: url }
                                                                    }
                                                                }));
                                                            });
                                                        }}
                                                    />
                                                    <Upload className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* LEADERSHIP TAB */}
                <TabsContent value="leadership" className="mt-6 md:mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['chairman', 'principal'].map((role) => (
                            <Card key={role} className="bg-zinc-900/40 border-white/10 backdrop-blur-xl shadow-xl overflow-hidden">
                                <CardHeader className="bg-white/5 pb-4">
                                    <CardTitle className="capitalize text-white flex items-center gap-2 text-base md:text-lg">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        {role} Profile
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5 p-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="relative group shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg">
                                            {data.leadership?.[role]?.photo ? (
                                                <img src={data.leadership[role].photo} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                                    <ImagePlus className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleLocalUpload(file, `leadership/${role}`, url => setData((prev: any) => ({
                                                            ...prev,
                                                            leadership: {
                                                                ...prev.leadership,
                                                                [role]: { ...prev.leadership[role], photo: url }
                                                            }
                                                        })));
                                                    }}
                                                />
                                                <Upload className="w-5 h-5 text-white mb-1" />
                                                <span className="text-[9px] text-white uppercase tracking-wider font-bold">Update</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Full Name</Label>
                                                <Input
                                                    value={data.leadership?.[role]?.name || ""}
                                                    onChange={e => setData({ ...data, leadership: { ...data.leadership, [role]: { ...data.leadership[role], name: e.target.value } } })}
                                                    className="bg-zinc-950/50 border-white/10 focus:border-indigo-500/30 text-sm h-10"
                                                    placeholder={`Enter ${role} name`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Official Title</Label>
                                                <Input
                                                    value={data.leadership?.[role]?.title || ""}
                                                    onChange={e => setData({ ...data, leadership: { ...data.leadership, [role]: { ...data.leadership[role], title: e.target.value } } })}
                                                    className="bg-zinc-950/50 border-white/10 focus:border-indigo-500/30 text-sm h-10"
                                                    placeholder="e.g. Founder & Chairman"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Or Paste Photo URL</Label>
                                                <Input
                                                    value={data.leadership?.[role]?.photo || ""}
                                                    onChange={e => setData({ ...data, leadership: { ...data.leadership, [role]: { ...data.leadership[role], photo: e.target.value } } })}
                                                    className="bg-zinc-950/50 border-white/10 focus:border-indigo-500/30 text-xs h-9 font-mono text-zinc-500 focus:text-white"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-white/5">
                                        <p className="text-[10px] text-zinc-500 italic">
                                            This profile will be prominently displayed on the landing page. High-resolution headshots recommended.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* WHY CHOOSE US TAB */}
                <TabsContent value="why" className="mt-6 md:mt-8 space-y-4">
                    <Card className="bg-zinc-900/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-indigo-400" /> Why Parents Choose Us
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-zinc-400 mb-2">Define 4 key selling points for the admission section.</p>
                            {(data.why.length > 0 ? data.why : ["", "", "", ""]).map((point: string, idx: number) => (
                                <div key={idx} className="flex gap-4 items-center group">
                                    <div className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm font-bold text-indigo-400 group-focus-within:bg-indigo-500 group-focus-within:text-white transition-colors">
                                        {idx + 1}
                                    </div>
                                    <Input
                                        value={point || ""}
                                        onChange={(e) => {
                                            const updated = [...(data.why.length ? data.why : Array(4).fill(""))];
                                            updated[idx] = e.target.value;
                                            setData({ ...data, why: updated });
                                        }}
                                        className="bg-zinc-950/50 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 text-sm h-10 md:h-12"
                                        placeholder={`Key Point #${idx + 1}`}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* GALLERY TAB */}
                <TabsContent value="gallery" className="mt-6 md:mt-8 space-y-6">
                    <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-white/5 backdrop-blur-xl">
                        <div>
                            <h3 className="text-sm md:text-lg font-bold text-white flex items-center gap-2">
                                <ImagePlus className="w-5 h-5 text-indigo-400" />
                                Gallery Management
                            </h3>
                            <p className="text-[10px] md:text-xs text-zinc-400 mt-1">
                                Add unlimited images. The top 4 will be featured on the home page.
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                setData((prev: any) => ({
                                    ...prev,
                                    gallery: [...(prev.gallery || []), ""]
                                }));
                            }}
                            variant="outline"
                            className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 h-9 text-xs"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Image
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {(Array.isArray(data.gallery) ? data.gallery : []).map((url: string, idx: number) => (
                            <Card key={idx} className="bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-indigo-500/30 transition-all relative">
                                <div className="aspect-[4/3] bg-black/50 relative">
                                    {url ? (
                                        <img src={url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-700 bg-zinc-900/50">
                                            <ImagePlus className="w-8 h-8 opacity-90" />
                                            <span className="text-xs font-medium">Empty Slot {idx + 1}</span>
                                        </div>
                                    )}

                                    {/* Remove Button */}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newGallery = [...(data.gallery || [])];
                                            newGallery.splice(idx, 1);
                                            setData({ ...data, gallery: newGallery });
                                        }}
                                        className="absolute top-2 right-2 z-[30] p-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                        title="Remove Image"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 gap-3 backdrop-blur-sm z-20">
                                        <div className="relative w-full">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id={`gallery-file-${idx}`}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleLocalUpload(file, `gallery/img-${Date.now()}`, (url) => {
                                                        setData((prev: any) => {
                                                            const newGallery = [...(prev.gallery || [])];
                                                            newGallery[idx] = url;
                                                            return { ...prev, gallery: newGallery };
                                                        });
                                                    });
                                                }}
                                            />
                                            <Label
                                                htmlFor={`gallery-file-${idx}`}
                                                className="flex items-center justify-center w-full h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer text-xs font-bold transition-all shadow-lg transform hover:scale-105 active:scale-95"
                                            >
                                                <Upload className="w-3.5 h-3.5 mr-2" />
                                                {url ? 'Replace' : 'Upload'}
                                            </Label>
                                        </div>

                                        <div className="w-full border-t border-white/10 pt-3 mt-1">
                                            <Input
                                                placeholder="Or paste URL..."
                                                defaultValue={url}
                                                className="h-7 text-[10px] bg-zinc-950 border-white/10 text-zinc-300 focus:border-indigo-500/50"
                                                onBlur={async (e) => {
                                                    const val = e.target.value;
                                                    // Simplified update logic for brevity in UI
                                                    setData((prev: any) => {
                                                        const newGallery = [...(prev.gallery || [])];
                                                        newGallery[idx] = val;
                                                        return { ...prev, gallery: newGallery };
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-white/50 border border-white/5 uppercase tracking-widest backdrop-blur-md z-10">
                                        #{idx + 1}
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {/* Always visible Add Button at the end */}
                        <div
                            className="aspect-[4/3] rounded-xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/30 bg-zinc-900/20 hover:bg-indigo-500/5 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
                            onClick={() => {
                                setData((prev: any) => ({
                                    ...prev,
                                    gallery: [...(prev.gallery || []), ""]
                                }));
                            }}
                        >
                            <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors border border-white/5 group-hover:border-indigo-500/30">
                                <Plus className="w-6 h-6 text-zinc-500 group-hover:text-indigo-400" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-400 uppercase tracking-widest">Add Slot</span>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
