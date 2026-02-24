"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Save, Image as ImageIcon, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "@/lib/toast-store";
import { useMasterData } from "@/context/MasterDataContext";

export function BrandingSettings() {
    const { branding } = useMasterData();
    const [saving, setSaving] = useState(false);

    // Form State
    const [schoolName, setSchoolName] = useState("");
    const [address, setAddress] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [signatureUrl, setSignatureUrl] = useState("");

    // Preview and Upload States
    const [logoUploading, setLogoUploading] = useState(false);
    const [sigUploading, setSigUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState("");
    const [signaturePreview, setSignaturePreview] = useState("");

    // Manual URL Entry mode
    const [manualLogo, setManualLogo] = useState(false);
    const [manualSig, setManualSig] = useState(false);

    useEffect(() => {
        // Only initialize form from DB if we aren't currently saving
        // AND if the form hasn't been touched yet (all fields empty)
        // or if we explicitly want to refresh data
        const isFormPristine = !schoolName && !address && !logoUrl && !signatureUrl;

        if (branding && (isFormPristine || !saving)) {
            // If the user hasn't typed anything yet, or we're not saving, sync from DB
            // However, to prevent overwriting WIP typing, we only do this when branding actually CHANGES
            // and we're not focused on the fields. 
            // For simplicity: only initialize if fields are empty
            if (isFormPristine) {
                setSchoolName(branding.schoolName || "");
                setAddress(branding.address || "");
                setLogoUrl(branding.schoolLogo || "");
                setSignatureUrl(branding.principalSignature || "");
            }
        }
    }, [branding, saving, schoolName, address, logoUrl, signatureUrl]);

    // SMARTER UPLOAD: Uses internal API which fallbacks between MediaVault and Firebase
    const performSafeUpload = async (file: File, type: string) => {
        const token = await auth.currentUser?.getIdToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

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

    const handleFileUpload = async (file: File, type: 'logo' | 'signature') => {
        const isLogo = type === 'logo';
        if (isLogo) {
            setLogoUploading(true);
            setLogoPreview(URL.createObjectURL(file));
        } else {
            setSigUploading(true);
            setSignaturePreview(URL.createObjectURL(file));
        }

        try {
            const downloadUrl = await performSafeUpload(file, type);
            if (isLogo) {
                setLogoUrl(downloadUrl);
                toast({ title: "Logo Ready", description: "Cloud storage sync complete.", type: "success" });
            } else {
                setSignatureUrl(downloadUrl);
                toast({ title: "Signature Ready", description: "Cloud storage sync complete.", type: "success" });
            }
        } catch (err: any) {
            toast({
                title: "Upload Blocked",
                description: "Cannot reach storage. Please try pasting a direct URL using the button above.",
                type: "error"
            });
            // Revert preview
            if (isLogo) { setLogoPreview(""); setLogoUrl(branding.schoolLogo || ""); }
            else { setSignaturePreview(""); setSignatureUrl(branding.principalSignature || ""); }
        } finally {
            if (isLogo) setLogoUploading(false);
            else setSigUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0], type);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/admin/settings/branding", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ schoolName, address, schoolLogo: logoUrl, principalSignature: signatureUrl })
            });

            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error);

            setLogoPreview("");
            setSignaturePreview("");
            toast({ title: "Settings Saved", description: "Branding updated successfully!", type: "success" });
        } catch (e: any) {
            toast({ title: "Save Failed", description: e.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const isUploading = logoUploading || sigUploading;
    const hasChanges = (schoolName !== (branding.schoolName || "")) ||
        (address !== (branding.address || "")) ||
        logoUrl !== (branding.schoolLogo || "") ||
        signatureUrl !== (branding.principalSignature || "");

    return (
        <Card className="bg-zinc-900/40 border-white/10 overflow-hidden shadow-2xl relative backdrop-blur-xl ring-1 ring-white/5">
            {(saving || logoUploading || sigUploading) && (
                <div className="absolute top-0 left-0 w-full h-0.5 z-50 overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]" style={{ width: '100%' }}></div>
                </div>
            )}

            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle className="text-base md:text-lg font-bold text-white tracking-tight">Organization Identity</CardTitle>
                        <CardDescription className="text-zinc-400 text-xs mt-0.5">Manage official school branding and assets.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4 md:gap-6 pb-4 md:pb-6 border-b border-white/5">
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            School Name
                        </Label>
                        <Input
                            value={schoolName}
                            onChange={e => setSchoolName(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-white font-medium text-xs md:text-sm placeholder:text-zinc-700"
                            placeholder="e.g. Spoorthy Concept School"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            Address Line
                        </Label>
                        <Input
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 h-10 md:h-11 rounded-lg focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-white font-medium text-xs md:text-sm placeholder:text-zinc-700"
                            placeholder="City, State, Country"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8">
                    {/* Logo Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs md:text-sm font-semibold text-zinc-300">School Logo</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManualLogo(!manualLogo)}
                                className="text-[10px] font-medium text-zinc-500 hover:text-indigo-400 h-6 px-2 hover:bg-transparent"
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
                            <div className="border border-dashed border-zinc-700/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-indigo-500/30 transition-all relative group h-32 md:h-48 overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

                                <div className="w-16 h-16 md:w-24 md:h-24 relative flex items-center justify-center bg-zinc-950 rounded-xl border border-white/5 shadow-inner">
                                    {logoPreview || logoUrl ? (
                                        <div className="relative w-full h-full p-2">
                                            <img src={logoPreview || logoUrl} alt="Logo" className="w-full h-full object-contain" />
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
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    </div>
                                )}

                                {!logoUploading && (
                                    <Button variant="secondary" size="sm" className="relative pointer-events-none h-7 md:h-9 px-3 text-[10px] md:text-xs bg-zinc-800 text-zinc-300 border border-white/5 shadow-sm">
                                        <Upload className="w-3 h-3 mr-1.5" />
                                        <span className="hidden md:inline">Select File</span> <span className="md:hidden">Upload</span>
                                    </Button>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    onChange={(e) => handleFileChange(e, 'logo')}
                                    disabled={logoUploading}
                                />
                            </div>
                        )}
                    </div>

                    {/* Signature Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs md:text-sm font-semibold text-zinc-300">Principal Signature</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManualSig(!manualSig)}
                                className="text-[10px] font-medium text-zinc-500 hover:text-indigo-400 h-6 px-2 hover:bg-transparent"
                            >
                                {manualSig ? "Upload File" : "Paste URL"}
                            </Button>
                        </div>

                        {manualSig ? (
                            <Input
                                value={signatureUrl}
                                onChange={e => setSignatureUrl(e.target.value)}
                                className="bg-zinc-950/50 border-white/10 h-10 rounded-lg font-mono text-[10px] md:text-xs text-zinc-300"
                                placeholder="https://..."
                            />
                        ) : (
                            <div className="border border-dashed border-zinc-700/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-indigo-500/30 transition-all relative group h-32 md:h-48 overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

                                <div className="w-24 h-12 md:w-36 md:h-20 relative flex items-center justify-center bg-white rounded-lg border border-white/10 shadow-sm">
                                    {signaturePreview || signatureUrl ? (
                                        <div className="relative w-full h-full flex items-center justify-center p-2">
                                            <img src={signaturePreview || signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                                            {!sigUploading && signatureUrl && (
                                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-lg ring-2 ring-black">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-zinc-200 text-[10px] font-mono italic">NO SIGNATURE</span>
                                    )}
                                </div>

                                {sigUploading && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    </div>
                                )}

                                {!sigUploading && (
                                    <Button variant="secondary" size="sm" className="relative pointer-events-none h-7 md:h-9 px-3 text-[10px] md:text-xs bg-zinc-800 text-zinc-300 border border-white/5 shadow-sm">
                                        <Upload className="w-3 h-3 mr-1.5" />
                                        <span className="hidden md:inline">Select File</span> <span className="md:hidden">Upload</span>
                                    </Button>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    onChange={(e) => handleFileChange(e, 'signature')}
                                    disabled={sigUploading}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                    <Button
                        onClick={handleSave}
                        disabled={saving || isUploading || !hasChanges}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white w-full md:w-auto px-8 h-10 md:h-11 rounded-lg font-semibold text-xs md:text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        {saving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
