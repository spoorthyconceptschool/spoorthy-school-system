"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

// Form Steps
const STEPS = [
    { id: 1, title: "Student Details" },
    { id: 2, title: "Parent Details" },
    { id: 3, title: "Address" },
    { id: 4, title: "Review" }
];

export default function ApplyPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        // Student
        studentName: "",
        dateOfBirth: "",
        gender: "select",
        grade: "select",

        // Parent
        fatherName: "",
        motherName: "",
        email: "",
        phone: "",

        // Address
        street: "",
        city: "",
        state: "",
        zipCode: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "applications"), {
                ...formData,
                status: "submitted",
                submittedAt: serverTimestamp()
            });
            setIsSuccess(true);
        } catch (error) {
            console.error("Error submitting application:", error);
            alert("Failed to submit application. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-6"
                >
                    <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="font-display text-3xl font-bold">Application Submitted!</h1>
                    <p className="text-muted-foreground">
                        Thank you for applying to Spoorthy Concept School. We have received your details and will contact you shortly regarding the next steps.
                    </p>
                    <Link href="/">
                        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                            Return to Home
                        </Button>
                    </Link>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background p-4 md:p-8 flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-0 pointer-events-none" />

            <div className="relative z-10 w-full max-w-3xl space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/admissions">
                        <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-4 h-4" /> Exit
                        </Button>
                    </Link>
                    <h1 className="font-display text-xl md:text-2xl font-bold">Admissions Application</h1>
                    <div className="w-20" /> {/* Spacer */}
                </div>

                {/* Progress Steps */}
                <div className="flex justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-10 -translate-y-1/2" />
                    {STEPS.map((step) => (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300
                                ${currentStep >= step.id ? "bg-accent text-accent-foreground" : "bg-white/5 border border-white/10 text-muted-foreground"}
                            `}>
                                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium hidden md:block ${currentStep >= step.id ? "text-accent" : "text-muted-foreground"}`}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="glass-panel p-6 md:p-8 rounded-2xl min-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Step 1: Student Details */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold border-b border-white/10 pb-2">Student Information</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="studentName">Full Name</Label>
                                            <Input id="studentName" name="studentName" value={formData.studentName} onChange={handleChange} placeholder="First Last" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                            <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} className="block" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gender">Gender</Label>
                                            <select
                                                id="gender"
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="select">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="grade">Applying For Grade</Label>
                                            <select
                                                id="grade"
                                                name="grade"
                                                value={formData.grade}
                                                onChange={handleChange}
                                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="select">Select Grade</option>
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Parent Details */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold border-b border-white/10 pb-2">Parent / Guardian Information</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fatherName">Father's Name</Label>
                                            <Input id="fatherName" name="fatherName" value={formData.fatherName} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="motherName">Mother's Name</Label>
                                            <Input id="motherName" name="motherName" value={formData.motherName} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Address */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold border-b border-white/10 pb-2">Residential Address</h2>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="street">Street Address</Label>
                                            <Input id="street" name="street" value={formData.street} onChange={handleChange} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City</Label>
                                                <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="state">State</Label>
                                                <Input id="state" name="state" value={formData.state} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="zipCode">Zip Code</Label>
                                            <Input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {currentStep === 4 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold border-b border-white/10 pb-2">Review Application</h2>
                                    <div className="space-y-4">
                                        <div className="bg-white/5 p-4 rounded-lg space-y-2">
                                            <h3 className="font-bold text-accent">Student</h3>
                                            <p className="text-sm text-muted-foreground">Name: <span className="text-foreground">{formData.studentName}</span></p>
                                            <p className="text-sm text-muted-foreground">Grade: <span className="text-foreground">{formData.grade}</span></p>
                                            <p className="text-sm text-muted-foreground">DOB: <span className="text-foreground">{formData.dateOfBirth}</span></p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg space-y-2">
                                            <h3 className="font-bold text-accent">Contact</h3>
                                            <p className="text-sm text-muted-foreground">Parent: <span className="text-foreground">{formData.fatherName} / {formData.motherName}</span></p>
                                            <p className="text-sm text-muted-foreground">Email: <span className="text-foreground">{formData.email}</span></p>
                                            <p className="text-sm text-muted-foreground">Phone: <span className="text-foreground">{formData.phone}</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-8 mt-8 border-t border-white/10">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className="w-32"
                        >
                            Previous
                        </Button>

                        {currentStep < STEPS.length ? (
                            <Button onClick={nextStep} className="w-32">
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-40 bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Application"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
