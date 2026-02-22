import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient" | "spotify"
    size?: "default" | "sm" | "lg" | "icon" | "xl"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-90 tracking-wide",
                    {
                        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:scale-105 active:scale-95 transition-transform": variant === "default",
                        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm": variant === "destructive",
                        "border border-white/20 bg-transparent hover:bg-white/10 hover:text-accent-foreground": variant === "outline",
                        "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
                        "hover:bg-white/10 hover:text-accent font-normal": variant === "ghost",
                        "text-primary underline-offset-4 hover:underline": variant === "link",
                        "bg-gradient-to-r from-accent to-accent/80 text-black font-bold hover:brightness-110 border-0 shadow-lg hover:shadow-accent/20": variant === "gradient",
                        "bg-accent text-black font-bold hover:bg-accent/90 hover:scale-105 active:scale-95 transition-transform shadow-lg": variant === "spotify",
                        "h-10 px-6 py-2": size === "default",
                        "h-9 px-4 text-xs": size === "sm",
                        "h-12 px-8 text-base": size === "lg",
                        "h-14 px-10 text-lg": size === "xl",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
