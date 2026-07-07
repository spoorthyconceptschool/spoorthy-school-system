"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { branchService } from "@/lib/services/branchService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast-store";

export default function CreateBranchPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        branchName: "",
        branchCode: "",
        schoolId: "",
        schoolName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        principalName: "",
        studentIdPrefix: "",
        teacherIdPrefix: "",
        status: "ACTIVE" as const
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setValidationErrors([]);
        setSuggestions({});

        try {
            const allBranches = await branchService.getAllBranches();
            let errors: string[] = [];
            let newSuggestions: Record<string, string> = {};

            if (allBranches.some(b => b.branchName.toLowerCase() === formData.branchName.toLowerCase())) {
                errors.push("School Name is already taken.");
                newSuggestions.branchName = formData.branchName + " " + Math.floor(Math.random() * 100);
            }
            if (allBranches.some(b => b.branchCode.toLowerCase() === formData.branchCode.toLowerCase())) {
                errors.push("School Code is already taken.");
                newSuggestions.branchCode = formData.branchCode + Math.floor(Math.random() * 100);
            }
            if (allBranches.some(b => b.schoolId?.toLowerCase() === formData.schoolId.toLowerCase())) {
                errors.push("School ID is already taken.");
                newSuggestions.schoolId = formData.schoolId + Math.floor(Math.random() * 100);
            }
            if (allBranches.some(b => b.studentIdPrefix?.toLowerCase() === formData.studentIdPrefix.toLowerCase())) {
                errors.push("Student ID Prefix is already taken.");
                newSuggestions.studentIdPrefix = formData.studentIdPrefix + "1";
            }
            if (allBranches.some(b => b.teacherIdPrefix?.toLowerCase() === formData.teacherIdPrefix.toLowerCase())) {
                errors.push("Teacher ID Prefix is already taken.");
                newSuggestions.teacherIdPrefix = formData.teacherIdPrefix + "1";
            }

            if (errors.length > 0) {
                setValidationErrors(errors);
                setSuggestions(newSuggestions);
                setLoading(false);
                toast({
                    title: "Validation Error",
                    description: "Please resolve the duplicate values.",
                    type: "error"
                });
                return;
            }

            const branchId = await branchService.createBranch(formData);
            
            // Auto-provision the branch admin using the provided email and phone as password
            try {
                const { auth } = await import("@/lib/firebase");
                const token = await auth.currentUser?.getIdToken();
                if (token && formData.email && formData.phone) {
                    await fetch("/api/admin/branch/credentials", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json", 
                            "Authorization": `Bearer ${token}` 
                        },
                        body: JSON.stringify({ 
                            branchId, 
                            newEmail: formData.email, 
                            newPassword: formData.phone 
                        })
                    });
                }
            } catch (err) {
                console.error("Failed to provision initial admin credentials:", err);
            }

            toast({
                title: "School Created",
                description: "The new school has been created successfully."
            });
            router.push("/super-admin/branches");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create school",
                type: "error"
            });
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/super-admin/branches">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/5 text-[#8892B0] hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold font-display text-white">Add New School</h1>
                    <p className="text-[#8892B0] mt-1">Configure a new school for the organization</p>
                </div>
            </div>

            <Card className="bg-[#0f172a] border-white/5 rounded-2xl overflow-hidden">
                <CardContent className="p-6 md:p-8">
                    {validationErrors.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6">
                            <h4 className="text-rose-500 font-bold mb-2">Duplicate Values Detected</h4>
                            <ul className="list-disc list-inside text-sm text-rose-400 space-y-1 mb-4">
                                {validationErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                            {Object.keys(suggestions).length > 0 && (
                                <div className="pt-4 border-t border-rose-500/10">
                                    <h5 className="text-xs font-bold text-zinc-300 mb-3 uppercase tracking-wider">Suggested Alternatives</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(suggestions).map(([key, val]) => (
                                            <div
                                                key={key}
                                                className="bg-zinc-950/50 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border border-white/5 cursor-pointer hover:bg-zinc-800 transition-colors"
                                                onClick={() => setFormData(prev => ({ ...prev, [key]: val }))}
                                            >
                                                <span className="text-zinc-500 uppercase font-bold">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                                <span className="text-emerald-400 font-mono font-bold text-sm">{val}</span>
                                                <span className="text-[10px] text-zinc-500 ml-1 bg-white/5 px-2 py-0.5 rounded-full">Click to apply</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                                <Building2 className="w-5 h-5 text-indigo-400" /> Basic Information
                            </h3>
                            <p className="text-xs text-[#8892B0] mb-4">The School Code and School ID are just for school identity. Here we will also confirm the Student ID Prefix and Teacher ID Prefix.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">School Name</label>
                                    <Input
                                        name="branchName"
                                        value={formData.branchName}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Spoorthy High School"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">School Code</label>
                                    <Input
                                        name="branchCode"
                                        value={formData.branchCode}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. SPOORTHY"
                                        className="bg-white/5 border-white/10 text-white uppercase"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">School ID</label>
                                    <Input
                                        name="schoolId"
                                        value={formData.schoolId}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. SHS001"
                                        className="bg-white/5 border-white/10 text-white uppercase"
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Official / Full School Name</label>
                                    <Input
                                        name="schoolName"
                                        value={formData.schoolName}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Spoorthy Concept High School"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                    <p className="text-[10px] text-zinc-500">This name applies and appears only for users within this specific school.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Student ID Prefix</label>
                                    <Input
                                        name="studentIdPrefix"
                                        value={formData.studentIdPrefix}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. STU"
                                        className="bg-white/5 border-white/10 text-white uppercase"
                                        maxLength={10}
                                    />
                                    <p className="text-[10px] text-zinc-500">Determines the auto-generated student IDs (e.g., STU00001).</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Teacher ID Prefix</label>
                                    <Input
                                        name="teacherIdPrefix"
                                        value={formData.teacherIdPrefix}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. TCH"
                                        className="bg-white/5 border-white/10 text-white uppercase"
                                        maxLength={10}
                                    />
                                    <p className="text-[10px] text-zinc-500">Determines the auto-generated teacher IDs (e.g., TCH00001).</p>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Principal Name</label>
                                    <Input
                                        name="principalName"
                                        value={formData.principalName}
                                        onChange={handleChange}
                                        placeholder="Principal Name"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                                Contact & Location
                            </h3>
                            <p className="text-xs text-[#8892B0] mb-4">These details will be used in receipts, hall tickets, report cards, fee invoices, and anywhere printing or downloading is used.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Email</label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="school@example.com"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Phone</label>
                                    <Input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        placeholder="+91"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Address</label>
                                    <Input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        required
                                        placeholder="Street Address"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">City</label>
                                    <Input
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required
                                        placeholder="City"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">State</label>
                                    <Input
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        required
                                        placeholder="State"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Pincode</label>
                                    <Input
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={handleChange}
                                        required
                                        placeholder="Zip/Pincode"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                            <Link href="/super-admin/branches">
                                <Button type="button" variant="ghost" className="text-[#8892B0] hover:text-white">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 shadow-lg shadow-emerald-500/20">
                                {loading ? "Creating..." : "Create School"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
