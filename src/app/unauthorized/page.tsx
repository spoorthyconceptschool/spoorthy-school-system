"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
    const { signOut } = useAuth();
    const router = useRouter();

    const handleBackToLogin = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />
            
            <Card className="w-full max-w-md bg-[#050D1A]/60 border-red-500/20 backdrop-blur-2xl shadow-2xl rounded-3xl text-center">
                <CardHeader className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-display italic font-bold text-white uppercase tracking-tight">
                            Access Denied
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium uppercase tracking-widest text-xs">
                            Unauthorized Role
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <p className="text-sm text-white/70">
                        You do not have permission to view this page. If you believe this is an error, please contact your administrator.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pb-8">
                    <Button
                        onClick={handleBackToLogin}
                        className="w-full h-14 bg-red-500 text-white hover:bg-red-600 rounded-2xl font-black text-lg transition-all transform active:scale-[0.98] shadow-lg shadow-red-500/20"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        RETURN TO LOGIN
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
