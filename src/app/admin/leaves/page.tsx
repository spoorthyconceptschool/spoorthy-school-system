"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminLeavesPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/faculty?tab=leaves');
    }, [router]);

    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}
