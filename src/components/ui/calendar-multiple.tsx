"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    getDay,
    isSameDay,
    isSameMonth,
    startOfMonth,
    subMonths,
    startOfToday
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MultipleCalendarProps {
    value?: string[]; // Array of YYYY-MM-DD strings
    onChange?: (dates: string[]) => void;
    minDate?: string; // YYYY-MM-DD
    className?: string;
}

export function MultipleCalendar({
    value = [],
    onChange,
    minDate,
    className
}: MultipleCalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    // Parse minDate if provided
    const minDateObj = minDate ? new Date(minDate) : startOfToday();

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Grid Padding (0=Sun, 1=Mon, ..., 6=Sat)
    const startDay = getDay(monthStart);
    const emptyDays = Array(startDay).fill(null);

    const toggleDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isSelected = value.includes(dateStr);

        let newValue;
        if (isSelected) {
            newValue = value.filter(d => d !== dateStr);
        } else {
            newValue = [...value, dateStr].sort();
        }

        onChange?.(newValue);
    };

    const isDateDisabled = (date: Date) => {
        if (!minDate) return false;
        // Compare properly by resetting time
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        const m = new Date(minDateObj); m.setHours(0, 0, 0, 0);
        return d < m;
    };

    return (
        <div className={cn("p-3 bg-black/40 border border-white/10 rounded-lg w-full max-w-[350px]", className)}>
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 hover:bg-white/10">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold text-sm">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 hover:bg-white/10">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 mb-2 text-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <div>Su</div>
                <div>Mo</div>
                <div>Tu</div>
                <div>We</div>
                <div>Th</div>
                <div>Fr</div>
                <div>Sa</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {emptyDays.map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {daysInMonth.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isSelected = value.includes(dateStr);
                    const disabled = isDateDisabled(date);
                    const isToday = isSameDay(date, new Date());

                    return (
                        <button
                            type="button"
                            key={dateStr}
                            disabled={disabled}
                            onClick={() => toggleDate(date)}
                            className={cn(
                                "h-8 w-full rounded-md flex items-center justify-center text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent",
                                isSelected
                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-900/20"
                                    : "hover:bg-white/10 text-foreground",
                                disabled && "opacity-90 cursor-not-allowed hover:bg-transparent",
                                isToday && !isSelected && "text-blue-400 font-bold bg-blue-400/10 border border-blue-400/20"
                            )}
                        >
                            {format(date, 'd')}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 text-[10px] text-center text-muted-foreground">
                {value.length > 0 ? `${value.length} date${value.length > 1 ? 's' : ''} selected` : 'Select dates'}
            </div>
        </div>
    );
}
