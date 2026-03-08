"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Loader2, User, Key, MapPin, Phone, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMasterData } from "@/context/MasterDataContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";
import { EditStudentRequestModal } from "@/components/teacher/edit-student-request-modal";

export default function TeacherStudentClientPage({ id }: { id: string }) {
    const router = useRouter();
    const { user } = useAuth();
    const { classes, sections, villages, classSections, subjectTeachers } = useMasterData();
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isClassTeacher, setIsClassTeacher] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        const fetchStudentAndPermissions = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // 1. Fetch Student
                const docRef = doc(db, "students", id);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    toast({ title: "Error", description: "Student not found.", type: "error" });
                    router.push("/teacher/students");
                    return;
                }

                const sData: any = { id: docSnap.id, ...docSnap.data() };
                setStudent(sData);

                // 2. Fetch Teacher Profile to check permissions
                const tQuery = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
                const tSnap = await getDocs(tQuery);

                if (!tSnap.empty) {
                    const tProfile: any = { id: tSnap.docs[0].id, ...tSnap.docs[0].data() };
                    const tId = tProfile.schoolId || tProfile.id;

                    // Check if teacher is class teacher for this student's class
                    let isCT = false;
                    Object.values(classSections || {}).forEach((cs: any) => {
                        if (cs.classId === sData.classId && cs.sectionId === sData.sectionId && cs.classTeacherId === tId && (cs.active || cs.isActive)) {
                            isCT = true;
                        }
                    });

                    setIsClassTeacher(isCT);
                }

            } catch (err: any) {
                console.error("Error fetching student details:", err);
                toast({ title: "Error", description: "Failed to load student details.", type: "error" });
            } finally {
                setLoading(false);
            }
        };

        fetchStudentAndPermissions();
    }, [id, user, classes, classSections]);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
            </div>
        );
    }

    if (!student) return null;

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto pb-20 p-2 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-2 md:pt-4 gap-4 px-1 md:px-0 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-10 w-10 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight">
                            {student.studentName}
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm font-mono mt-1">ID: {student.schoolId} • Roll: {student.rollNumber || 'N/A'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isClassTeacher ? (
                        <Button
                            onClick={() => setIsEditModalOpen(true)}
                            className="bg-accent hover:bg-accent/80 text-black font-bold h-10 px-4 rounded-lg shadow-[0_0_15px_-5px_#64FFDA]"
                        >
                            <Edit className="w-4 h-4 mr-2" /> Request Edit
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-muted-foreground font-medium">
                            <Lock className="w-3 h-3" /> Read Only View
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Personal Information */}
                <Card className="bg-black/20 border-white/10 overflow-hidden shadow-xl">
                    <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-2">
                        <User className="w-4 h-4 text-accent" />
                        <h3 className="font-bold text-white text-sm">Personal Information</h3>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            <InfoRow label="Full Name" value={student.studentName} />
                            <InfoRow label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'} />
                            <InfoRow label="Gender" value={student.gender || 'N/A'} />
                            {student.aadhaarNumber && student.aadhaarNumber !== 'N/A' && <InfoRow label="Aadhaar Number" value={student.aadhaarNumber} />}
                            {student.bloodGroup && student.bloodGroup !== 'N/A' && <InfoRow label="Blood Group" value={student.bloodGroup} />}
                            {student.religion && student.religion !== 'N/A' && <InfoRow label="Religion" value={student.religion} />}
                            {student.caste && student.caste !== 'N/A' && <InfoRow label="Caste" value={student.caste} />}
                            {student.subCaste && student.subCaste !== 'N/A' && <InfoRow label="Sub-Caste" value={student.subCaste} />}
                        </div>
                    </CardContent>
                </Card>

                {/* Academic & Contact Information */}
                <div className="space-y-4 md:space-y-6">
                    <Card className="bg-black/20 border-white/10 overflow-hidden shadow-xl">
                        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            <h3 className="font-bold text-white text-sm">Academic Placement</h3>
                        </div>
                        <CardContent className="p-0">
                            <div className="divide-y divide-white/5">
                                <InfoRow label="Class" value={classes[student.classId]?.name || student.className || 'N/A'} />
                                <InfoRow label="Section" value={sections[student.sectionId]?.name || student.sectionName || 'N/A'} />
                                <InfoRow label="Admission No." value={student.admissionNumber || 'N/A'} />
                                <InfoRow label="Roll Number" value={student.rollNumber?.toString() || 'N/A'} />
                                <InfoRow label="Status" value={
                                    <span className={student.status === 'ACTIVE' ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                        {student.status}
                                    </span>
                                } />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/20 border-white/10 overflow-hidden shadow-xl">
                        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-400" />
                            <h3 className="font-bold text-white text-sm">Parent & Contact Details</h3>
                        </div>
                        <CardContent className="p-0">
                            <div className="divide-y divide-white/5">
                                <InfoRow label="Parent Name" value={student.parentName || 'N/A'} />
                                <InfoRow label="Mobile Number" value={student.parentMobile || 'N/A'} />
                                <InfoRow label="Alternative Mobile" value={student.alternativeMobile || 'N/A'} />
                                <InfoRow label="Village/Area" value={villages[student.villageId]?.name || student.villageName || 'N/A'} />
                                <InfoRow label="Address" value={student.address || 'N/A'} />
                                <InfoRow label="Transport Required" value={student.transportRequired ? 'Yes' : 'No'} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isEditModalOpen && (
                <EditStudentRequestModal
                    student={student}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-start md:items-center justify-between p-4 hover:bg-white/5 transition-colors group flex-col md:flex-row gap-1 md:gap-0">
            <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">{label}</span>
            <span className="text-sm font-medium text-white/90 group-hover:text-white text-right break-words w-full md:w-auto md:max-w-[60%]">{value}</span>
        </div>
    );
}
