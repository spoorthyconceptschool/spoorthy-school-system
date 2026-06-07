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
    const [formData, setFormData] = useState({
        branchName: "",
        branchCode: "",
        schoolName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        principalName: "",
        status: "ACTIVE" as const
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await branchService.createBranch(formData);
            toast({
                title: "Branch Created",
                description: "The new branch has been created successfully."
            });
            router.push("/super-admin/branches");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create branch",
                variant: "destructive"
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
                    <h1 className="text-3xl font-bold font-display text-white">Add New Branch</h1>
                    <p className="text-[#8892B0] mt-1">Configure a new campus for the organization</p>
                </div>
            </div>

            <Card className="bg-[#0f172a] border-white/5 rounded-2xl overflow-hidden">
                <CardContent className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                                <Building2 className="w-5 h-5 text-indigo-400" /> Basic Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Branch Name</label>
                                    <Input 
                                        name="branchName" 
                                        value={formData.branchName} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="e.g. Hyderabad Campus"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Branch Code</label>
                                    <Input 
                                        name="branchCode" 
                                        value={formData.branchCode} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="e.g. HYD"
                                        className="bg-white/5 border-white/10 text-white uppercase"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">School Name (Official)</label>
                                    <Input 
                                        name="schoolName" 
                                        value={formData.schoolName} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="e.g. Spoorthy Concept School - Hyderabad"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
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
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-[#8892B0]">Email</label>
                                    <Input 
                                        name="email" 
                                        type="email"
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="branch@school.edu"
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
                                {loading ? "Creating..." : "Create Branch"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
