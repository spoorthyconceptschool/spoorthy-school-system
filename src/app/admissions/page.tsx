"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Send, UserCheck, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function AdmissionsPage() {
    return (
        <main className="relative min-h-screen bg-background selection:bg-accent/50">
            {/* Background Ambience */}
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-0 pointer-events-none" />
            <div className="fixed inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background blur-3xl" />

            {/* Navigation Bar (Simple version for now) */}
            <nav className="relative z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
                <Link href="/" className="font-display text-2xl font-bold tracking-tighter">
                    Spoorthy
                </Link>
                <div className="flex gap-4">
                    <Link href="/login">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Portal Login</Button>
                    </Link>
                    <Link href="/admissions/apply">
                        <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">Apply Now</Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-20 pb-32 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-medium tracking-wide uppercase">
                            Academic Year 2026-27
                        </span>
                        <h1 className="mt-8 font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/50">
                            Begin Your Journey <br /> to Excellence
                        </h1>
                        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Join a community deemed to shape the leaders of tomorrow.
                            Our admissions process is designed to find students who demonstrate
                            character, curiosity, and capability.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <Link href="#process">
                            <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 h-14 px-8 rounded-full text-lg">
                                View Process
                            </Button>
                        </Link>
                        <Link href="/admissions/apply">
                            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 h-14 px-8 rounded-full text-lg shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)]">
                                Start Application <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Process Section */}
            <section id="process" className="relative z-10 py-24 px-6 border-t border-white/5 bg-black/20">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16 md:text-center max-w-3xl mx-auto">
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Admissions Process</h2>
                        <p className="text-muted-foreground text-lg">
                            A streamlined journey to joining the Spoorthy family.
                        </p>
                    </div>

                    <motion.div
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {[
                            {
                                icon: FileText,
                                title: "1. Online Registration",
                                desc: "Fill out the preliminary enquiry form on our portal to express your interest."
                            },
                            {
                                icon: Calendar,
                                title: "2. Campus Visit",
                                desc: "Schedule a guided tour to experience our world-class facilities firsthand."
                            },
                            {
                                icon: UserCheck,
                                title: "3. Interaction",
                                desc: "An informal interaction with the student and parents to understand aspirations."
                            },
                            {
                                icon: Send,
                                title: "4. Confirmation",
                                desc: "Complete the admission formalities and secure your spot."
                            }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                variants={item}
                                className="glass-panel p-8 rounded-2xl md:min-h-[280px] flex flex-col items-start hover:bg-white/10 transition-colors group cursor-default"
                            >
                                <div className="p-3 rounded-xl bg-accent/10 text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <step.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Documents Section */}
            <section className="relative z-10 py-24 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h2 className="font-display text-4xl md:text-5xl font-bold">Required Documents</h2>
                        <p className="text-muted-foreground text-lg">
                            Please ensure you have the following documents ready when proceeding with the admission.
                        </p>

                        <ul className="space-y-4">
                            {[
                                "Birth Certificate (Original + Copy)",
                                "Previous School Transfer Certificate",
                                "Report Card of last 2 years",
                                "Passport size photographs (4)",
                                "Aadhar Card / ID Proof of parents and child"
                            ].map((doc, i) => (
                                <li key={i} className="flex items-center gap-3 text-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    {doc}
                                </li>
                            ))}
                        </ul>

                        <Button variant="outline" className="mt-8 border-white/10 gap-2">
                            <Download className="w-4 h-4" /> Download Brochure
                        </Button>
                    </div>

                    <div className="glass-panel rounded-3xl p-2 h-[400px] lg:h-[500px] relative overflow-hidden flex items-center justify-center">
                        {/* Placeholder for an image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-20" />
                        <span className="text-white/20 font-display text-xl">Illustrated Asset / Campus Photo</span>
                    </div>
                </div>
            </section>
        </main>
    );
}
