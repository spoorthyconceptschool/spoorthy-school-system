"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TeacherDashboardPage() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut();
            router.push("/auth/teacher/login");
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b border-white/10">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Teacher Dashboard</h1>
                        <p className="text-muted-foreground">Welcome back</p>
                    </div>
                    <Button onClick={handleLogout} variant="destructive">
                        Sign Out
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <h3 className="font-bold text-blue-400 mb-2">My Classes</h3>
                        <p className="text-2xl font-bold">0</p>
                    </div>
                    <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <h3 className="font-bold text-purple-400 mb-2">Today's Schedule</h3>
                        <p className="text-2xl font-bold">--</p>
                    </div>
                    <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20">
                        <h3 className="font-bold text-green-400 mb-2">Next Salary Data</h3>
                        <p className="text-sm text-green-300/70">Contact Admin for slip</p>
                    </div>

                    {/* New Card for Groups */}
                    <div
                        onClick={() => router.push("/teacher/groups")}
                        className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-colors group"
                    >
                        <h3 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
                            Student Groups
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </h3>
                        <p className="text-sm text-orange-200/70">Assign students to Houses/Teams</p>
                    </div>
                </div>

                <div className="p-12 text-center border border-dashed border-white/10 rounded-xl text-muted-foreground">
                    Teacher features coming soon...
                </div>
            </div>
        </div>
    );
}
