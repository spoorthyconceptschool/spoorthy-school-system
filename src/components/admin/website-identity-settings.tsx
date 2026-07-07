"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Save, Image as ImageIcon, CheckCircle2, Globe, Phone, MapPin, Mail, MessageSquare, Facebook, Twitter, Instagram } from "lucide-react";
import { toast } from "@/lib/toast-store";

export function WebsiteIdentitySettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form States
    const [schoolName, setSchoolName] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [tagline, setTagline] = useState("");
    const [contact, setContact] = useState("");
    const [address, setAddress] = useState("");
    const [email, setEmail] = useState("");
    const [footer, setFooter] = useState("");
    const [facebook, setFacebook] = useState("");
    const [twitter, setTwitter] = useState("");
    const [instagram, setInstagram] = useState("");
    const [brandingContent, setBrandingContent] = useState("");

    // Preview and Upload States
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState("");
    const [manualLogo, setManualLogo] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch("/api/admin/settings/website", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.settings) {
                    const s = data.settings;
                    setSchoolName(s.website_school_name || "");
                    setLogoUrl(s.website_logo || "");
                    setTagline(s.website_tagline || "");
                    setContact(s.website_contact || "");
                    setAddress(s.website_address || "");
                    setEmail(s.website_email || "");
                    setFooter(s.website_footer || "");
                    setFacebook(s.website_facebook || "");
                    setTwitter(s.website_twitter || "");
                    setInstagram(s.website_instagram || "");
                    setBrandingContent(s.website_branding_content || "");
                }
            } catch (e) {
                console.error("Failed to load website settings", e);
                toast({ title: "Fetch Error", description: "Failed to load website settings.", type: "error" });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const performSafeUpload = async (file: File) => {
        const token = await auth.currentUser?.getIdToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "logo");

        const res = await fetch("/api/admin/media/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Upload failed");
        }

        return data.url;
    };

    const handleFileUpload = async (file: File) => {
        setLogoUploading(true);
        setLogoPreview(URL.createObjectURL(file));

        try {
            const downloadUrl = await performSafeUpload(file);
            setLogoUrl(downloadUrl);
            toast({ title: "Logo Uploaded", description: "Public storage sync complete.", type: "success" });
        } catch (err: any) {
            toast({
                title: "Upload Failed",
                description: err.message || "Cannot upload storage. Paste direct URL instead.",
                type: "error"
            });
            setLogoPreview("");
        } finally {
            setLogoUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/settings/website", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    website_school_name: schoolName,
                    website_logo: logoUrl,
                    website_tagline: tagline,
                    website_contact: contact,
                    website_address: address,
                    website_email: email,
                    website_footer: footer,
                    website_facebook: facebook,
                    website_twitter: twitter,
                    website_instagram: instagram,
                    website_branding_content: brandingContent
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Failed to update settings");

            toast({ title: "Website Branding Saved", description: "Website identity settings updated successfully!", type: "success" });
        } catch (e: any) {
            toast({ title: "Save Failed", description: e.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="bg-zinc-900/40 border-white/10 p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#64FFDA]" />
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/40 border-white/10 overflow-hidden shadow-2xl relative backdrop-blur-xl ring-1 ring-white/5">
            {saving && (
                <div className="absolute top-0 left-0 w-full h-0.5 z-50 overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" style={{ width: '100%' }}></div>
                </div>
            )}

            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <Globe className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <CardTitle className="text-base md:text-lg font-bold text-white tracking-tight">
                            Website Identity Settings
                        </CardTitle>
                        <CardDescription className="text-zinc-400 text-xs mt-0.5">
                            Branding and contact details specifically for the public-facing landing page.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4 md:gap-6 pb-6 border-b border-white/5">
                    {/* Public School Name */}
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            Website School Name
                        </Label>
                        <Input
                            value={schoolName}
                            onChange={e => setSchoolName(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white font-medium text-xs md:text-sm"
                            placeholder="e.g. Prerana Education Group"
                        />
                    </div>

                    {/* Public Tagline */}
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            Website Tagline
                        </Label>
                        <Input
                            value={tagline}
                            onChange={e => setTagline(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white font-medium text-xs md:text-sm"
                            placeholder="e.g. Empowering minds, shaping futures."
                        />
                    </div>

                    {/* Public Contact */}
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" /> Website Contact Phone
                        </Label>
                        <Input
                            value={contact}
                            onChange={e => setContact(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white font-medium text-xs md:text-sm"
                            placeholder="e.g. +91 9876543210"
                        />
                    </div>

                    {/* Public Email */}
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" /> Website Contact Email
                        </Label>
                        <Input
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white font-medium text-xs md:text-sm"
                            placeholder="e.g. admissions@school.com"
                        />
                    </div>

                    {/* Public Address */}
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Website Office Address
                        </Label>
                        <Input
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white font-medium text-xs md:text-sm"
                            placeholder="e.g. H.No 123, Jubilee Hills, Hyderabad, India"
                        />
                    </div>

                    {/* Public Footer */}
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            Website Footer Copy
                        </Label>
                        <Input
                            value={footer}
                            onChange={e => setFooter(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white font-medium text-xs md:text-sm"
                            placeholder="e.g. © 2026 Prerana Group. All Rights Reserved."
                        />
                    </div>
                </div>

                {/* Social Media Links & Branding Content */}
                <div className="grid md:grid-cols-2 gap-4 md:gap-6 pb-6 border-b border-white/5">
                    {/* Social Media Links */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Social Media Links</h4>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Facebook className="w-4 h-4 text-blue-500 shrink-0" />
                                <Input
                                    value={facebook}
                                    onChange={e => setFacebook(e.target.value)}
                                    className="bg-zinc-950/50 border-white/10 h-9 rounded-lg text-xs"
                                    placeholder="Facebook URL"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Twitter className="w-4 h-4 text-[#1DA1F2] shrink-0" />
                                <Input
                                    value={twitter}
                                    onChange={e => setTwitter(e.target.value)}
                                    className="bg-zinc-950/50 border-white/10 h-9 rounded-lg text-xs"
                                    placeholder="Twitter URL"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
                                <Input
                                    value={instagram}
                                    onChange={e => setInstagram(e.target.value)}
                                    className="bg-zinc-950/50 border-white/10 h-9 rounded-lg text-xs"
                                    placeholder="Instagram URL"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Public Branding Content */}
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            Website Branding / Manifesto Content
                        </Label>
                        <Textarea
                            value={brandingContent}
                            onChange={e => setBrandingContent(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-28 rounded-lg focus:ring-emerald-500/20 focus:border-emerald-500/50 text-white text-xs md:text-sm"
                            placeholder="Write a brief intro/philosophy content to display on the landing page..."
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Logo Section */}
                    <div className="space-y-3 md:col-span-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs md:text-sm font-semibold text-zinc-300">Website Main Logo</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManualLogo(!manualLogo)}
                                className="text-[10px] font-medium text-zinc-500 hover:text-emerald-400 h-6 px-2 hover:bg-transparent"
                            >
                                {manualLogo ? "Upload File" : "Paste URL"}
                            </Button>
                        </div>

                        {manualLogo ? (
                            <Input
                                value={logoUrl}
                                onChange={e => setLogoUrl(e.target.value)}
                                className="bg-zinc-950/50 border-white/10 h-10 rounded-lg font-mono text-[10px] md:text-xs text-zinc-300"
                                placeholder="https://..."
                            />
                        ) : (
                            <div className="border border-dashed border-zinc-700/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-emerald-500/30 transition-all relative group h-32 md:h-48 overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

                                <div className="w-16 h-16 md:w-24 md:h-24 relative flex items-center justify-center bg-zinc-950 rounded-xl border border-white/5 shadow-inner">
                                    {logoPreview || logoUrl ? (
                                        <div className="relative w-full h-full p-2">
                                            <img src={logoPreview || logoUrl} alt="Website Logo" className="w-full h-full object-contain" />
                                            {!logoUploading && logoUrl && (
                                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-lg ring-2 ring-black">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-zinc-800" />
                                    )}
                                </div>

                                {logoUploading && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                    </div>
                                )}

                                {!logoUploading && (
                                    <Button variant="secondary" size="sm" className="relative pointer-events-none h-7 md:h-9 px-3 text-[10px] md:text-xs bg-zinc-800 text-zinc-300 border border-white/5 shadow-sm">
                                        <Upload className="w-3 h-3 mr-1.5" />
                                        <span>Select Logo File</span>
                                    </Button>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    onChange={handleFileChange}
                                    disabled={logoUploading}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                    <Button
                        onClick={handleSave}
                        disabled={saving || logoUploading || !schoolName}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white w-full md:w-auto px-8 h-10 md:h-11 rounded-lg font-semibold text-xs md:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        {saving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Website Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
