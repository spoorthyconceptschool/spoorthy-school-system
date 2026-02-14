"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Timestamp, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";

export function DeclareHolidayModal() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) return;
        setLoading(true);

        try {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            await addDoc(collection(db, "notices"), {
                title: `Holiday: ${title}`,
                content: description || "No classes due to holiday.",
                type: "HOLIDAY",
                target: "ALL",
                date: Timestamp.fromDate(start),
                createdAt: Timestamp.now(),
                expiresAt: Timestamp.fromDate(end),
                senderId: user?.uid,
                senderName: user?.displayName || "Admin",
                senderRole: "ADMIN",
                status: 'ACTIVE'
            });

            toast({ title: "Holiday Declared", description: `Holiday '${title}' on ${format(date, "PPP")} added.`, type: "success" });
            setOpen(false);
            setTitle("");
            setDescription("");
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="ml-2 gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Declare Holiday
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-black/90 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Declare Holiday</DialogTitle>
                    <DialogDescription>
                        Adding a holiday will block the timetable for the chosen date and notify all users.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Holiday Name</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Festival, Weather Alert"
                            className="bg-white/5 border-white/10"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                            type="date"
                            value={date ? format(date, "yyyy-MM-dd") : ""}
                            onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                            className="bg-white/5 border-white/10"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description / Note</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional details..."
                            className="bg-white/5 border-white/10"
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Declare Holiday"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
