"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, MapPin, Phone, ShieldAlert, Edit, Save, History, ArrowRight } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

interface ProfileTabProps {
    student: any;
    editForm: any;
    setEditForm: (form: any) => void;
    isEditing: boolean;
    setIsEditing: (isEditing: boolean) => void;
    handleUpdate: () => void;
    canEdit: boolean;
    villages: any[];
    classes: any[];
    sections: any[];
    loading?: boolean;
    setIsResetModalOpen?: (val: boolean) => void;
    classHistory?: { year: string, className: string }[];
}

export function ProfileTab({
    student,
    editForm,
    setEditForm,
    isEditing,
    setIsEditing,
    handleUpdate,
    canEdit,
    villages,
    classes,
    sections,
    loading,
    setIsResetModalOpen,
    classHistory = []
}: ProfileTabProps) {

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 animate-pulse">
                <div className="h-[400px] bg-white/5 rounded-2xl" />
                <div className="h-[400px] bg-white/5 rounded-2xl" />
            </div>
        );
    }

    if (!student) return null;

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300">
            {/* Action Bar */}
            {canEdit && isEditing && (
                <div className="flex gap-2 mb-4 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 shadow-xl">
                    <Button onClick={() => setIsEditing(false)} className="flex-1 h-9 rounded-lg text-[13px] font-bold bg-white/5 hover:bg-white/10 text-white">
                        Cancel
                    </Button>
                    <Button onClick={() => handleUpdate()} className="flex-1 h-9 rounded-lg text-[13px] font-bold bg-[#00E676] hover:bg-[#00C853] text-black shadow-[0_0_15px_-3px_rgba(0,230,118,0.4)]">
                        <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                {/* Personal Details */}
                <div className="flex flex-col border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                    <div className="bg-white/[0.05] border-b border-white/10 py-2.5 px-3 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Personal Details</h3>
                    </div>
                    <div className="flex flex-col divide-y divide-white/5">
                        <InfoField 
                            label="Student Name" 
                            value={student.studentName} 
                            isEditing={isEditing} 
                            editValue={editForm.studentName}
                            onChange={(val) => setEditForm({...editForm, studentName: val})}
                        />
                        <InfoField 
                            label="School ID" 
                            value={student.schoolId || "N/A"} 
                        />
                        <InfoField 
                            label="Roll No." 
                            value={student.rollNumber || "N/A"} 
                            isEditing={isEditing} 
                            editValue={editForm.rollNumber}
                            onChange={(val) => setEditForm({...editForm, rollNumber: val})}
                        />
                        <InfoField 
                            label="Parent Name" 
                            value={student.parentName || "N/A"} 
                            isEditing={isEditing} 
                            editValue={editForm.parentName}
                            onChange={(val) => setEditForm({...editForm, parentName: val})}
                        />
                        <InfoField 
                            label="Mobile Number" 
                            value={student.parentMobile || "N/A"} 
                            isEditing={isEditing} 
                            editValue={editForm.parentMobile}
                            onChange={(val) => setEditForm({...editForm, parentMobile: val})}
                        />
                        <InfoField 
                            label="Date of Birth" 
                            value={student.dateOfBirth ? (typeof student.dateOfBirth === 'string' && student.dateOfBirth.includes('-') ? student.dateOfBirth.split('-').reverse().join('/') : student.dateOfBirth) : "N/A"} 
                            isEditing={isEditing} 
                            editValue={editForm.dateOfBirth}
                            type="date"
                            onChange={(val) => setEditForm({...editForm, dateOfBirth: val})}
                        />
                        <InfoField 
                            label="Gender" 
                            value={student.gender || "N/A"} 
                            isEditing={isEditing} 
                            editValue={editForm.gender}
                            isSelect
                            selectOptions={[
                                { value: "male", label: "Male" },
                                { value: "female", label: "Female" },
                                { value: "other", label: "Other" }
                            ]}
                            onChange={(val) => setEditForm({...editForm, gender: val})}
                        />
                    </div>
                </div>

                {/* Academic Details */}
                <div className="flex flex-col border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                    <div className="bg-white/[0.05] border-b border-white/10 py-2.5 px-3 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Academic Details</h3>
                    </div>
                    <div className="flex flex-col divide-y divide-white/5">
                            <InfoField 
                                label="Class" 
                                value={classes.find(c => c.id === student.classId)?.name || student.className || "N/A"} 
                                isEditing={isEditing} 
                                editValue={editForm.classId}
                                isSelect
                                selectOptions={classes.map(c => ({ value: c.id, label: c.name }))}
                                onChange={(val) => setEditForm({...editForm, classId: val})}
                            />
                            <InfoField 
                                label="Section" 
                                value={sections.find(s => s.id === student.sectionId)?.name || student.sectionName || "N/A"} 
                                isEditing={isEditing} 
                                editValue={editForm.sectionId}
                                isSelect
                                selectOptions={sections.map(s => ({ value: s.id, label: s.name }))}
                                onChange={(val) => setEditForm({...editForm, sectionId: val})}
                            />
                            <InfoField 
                                label="Village" 
                                value={villages.find(v => v.id === student.villageId)?.name || student.villageName || "N/A"} 
                                isEditing={isEditing} 
                                editValue={editForm.villageId}
                                isSelect
                                selectOptions={villages.map(v => ({ value: v.id, label: v.name }))}
                                onChange={(val) => setEditForm({...editForm, villageId: val})}
                            />
                            <InfoField 
                                label="Academic Year" 
                                value={student.academicYear || "N/A"} 
                                isEditing={isEditing} 
                                editValue={editForm.academicYear}
                                onChange={(val) => setEditForm({...editForm, academicYear: val})}
                            />
                            <div className="flex items-start min-h-[36px] py-2 px-3 bg-white/[0.01]">
                                <div className="w-[100px] shrink-0 text-[11px] text-[#8892B0] font-medium pt-1">Address</div>
                                <div className="flex-1 min-w-0 pl-3 border-l border-white/5">
                                    {isEditing ? (
                                        <Textarea 
                                            className="h-auto min-h-[60px] bg-white/5 border-white/10 text-[12px] p-2 font-medium text-white resize-none rounded-md" 
                                            value={editForm.address || ""} 
                                            onChange={e => setEditForm({...editForm, address: e.target.value})} 
                                        />
                                    ) : (
                                        <span className="text-[13px] font-semibold text-white/90 block leading-relaxed">{student.address || "N/A"}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                </div>
            </div>

            {/* Class Transition Timeline */}
            {classHistory && classHistory.length > 0 && (
                <div className="mt-4 border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] shadow-xl">
                    <div className="bg-white/[0.05] border-b border-white/10 py-2.5 px-3 flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-indigo-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Class Transition Timeline</h3>
                    </div>
                    <div className="p-4 flex flex-row items-center gap-4 overflow-x-auto custom-scrollbar">
                        {classHistory.map((h, i) => (
                            <React.Fragment key={i}>
                                <div className="flex flex-col items-center min-w-[120px] text-center p-3 bg-white/5 border border-white/5 rounded-2xl relative shadow-md">
                                    <span className="text-[10px] text-[#8892B0] font-mono leading-none mb-1">{h.year}</span>
                                    <span className="text-xs font-black text-white">{h.className}</span>
                                </div>
                                {i < classHistory.length - 1 && (
                                    <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoField({ 
    label, 
    value, 
    isEditing, 
    editValue, 
    onChange, 
    icon,
    type = "text",
    isSelect = false,
    selectOptions = []
}: { 
    label: string, 
    value: React.ReactNode, 
    isEditing?: boolean,
    editValue?: string,
    onChange?: (val: string) => void,
    icon?: React.ReactNode,
    type?: string,
    isSelect?: boolean,
    selectOptions?: {label: string, value: string}[]
}) {
    return (
        <div className="flex items-center min-h-[32px] py-1 px-3 bg-transparent hover:bg-white/[0.02] transition-colors">
            <div className="w-[85px] shrink-0 text-[10px] text-[#8892B0] font-medium flex items-center gap-1.5">
                {label}
            </div>
            <div className="flex-1 min-w-0 pl-2">
                {isEditing && onChange ? (
                    isSelect ? (
                        <Select value={editValue} onValueChange={onChange}>
                            <SelectTrigger className="h-8 bg-white/5 border-white/10 text-[12px] font-medium text-white px-2.5 rounded-md">
                                <SelectValue placeholder={`Select ${label}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B1120]/95 backdrop-blur-2xl shadow-2xl text-white rounded-md border-white/10">
                                {selectOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-[12px]">{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input 
                            type={type}
                            className="h-8 bg-white/5 border-white/10 text-[12px] font-medium text-white px-2.5 rounded-md" 
                            value={editValue || ""} 
                            onChange={(e) => onChange(e.target.value)} 
                        />
                    )
                ) : (
                    <span className="text-[12px] font-semibold text-white/90 truncate block">{value}</span>
                )}
            </div>
        </div>
    );
}
