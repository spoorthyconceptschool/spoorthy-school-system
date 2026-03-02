"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ClientPage = dynamic(() => import("./client-page"), {
    ssr: false,
    loading: () => <div className="p-8 space-y-4 max-w-7xl mx-auto"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>
});

export default function StaffDetailsDynamicPage() {
    return <ClientPage />;
}
