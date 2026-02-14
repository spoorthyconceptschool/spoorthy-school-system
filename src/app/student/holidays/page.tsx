"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentHolidaysPage() {
    // Shared Mock Data
    const holidays = [
        { date: "26 Jan 2026", name: "Republic Day", type: "National" },
        { date: "12 Feb 2026", name: "Local Festival", type: "Regional" },
        { date: "08 Mar 2026", name: "Holi", type: "Festival" },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <h1 className="text-3xl font-display font-bold">Upcoming Holidays</h1>
            <div className="grid gap-4">
                {holidays.map((h, i) => (
                    <Card key={i} className="bg-black/20 border-white/10">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-lg">{h.name}</h4>
                                <p className="text-sm text-muted-foreground">{h.date}</p>
                            </div>
                            <Badge variant="secondary">{h.type}</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
