import * as React from "react"
import { cn } from "@/lib/utils"

export interface DatePickerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const DatePickerInput = React.forwardRef<HTMLInputElement, DatePickerInputProps>(
    ({ className, ...props }, ref) => {
        const inputRef = React.useRef<HTMLInputElement>(null)

        // Combine refs
        React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

        const openPicker = (e: React.MouseEvent) => {
            e.stopPropagation();
            try {
                inputRef.current?.showPicker();
            } catch (err) {
                // Fallback
                inputRef.current?.focus();
            }
        };

        return (
            <div
                className={cn(
                    "flex h-12 w-full items-center rounded-full border border-white/10 bg-[#282828] px-1 transition-all focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ring-offset-background hover:bg-[#333] cursor-pointer",
                    className
                )}
                onClick={openPicker}
            >
                <input
                    type="date"
                    ref={inputRef}
                    className="flex-1 w-full bg-transparent border-0 px-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-90 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden cursor-pointer h-full"
                    onClick={openPicker}
                    {...props}
                />
            </div>
        )
    }
)
DatePickerInput.displayName = "DatePickerInput"
