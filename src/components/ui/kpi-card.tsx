import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    icon?: any; // Allow LucideIcon or ReactNode
    trend?: number | string; // percentage or custom string
    trendLabel?: string;
    className?: string;
    delay?: number;
    onClick?: () => void;
}

export function KPICard({ title, value, icon: Icon, trend, trendLabel = "vs last month", className, delay = 0, onClick }: KPICardProps) {
    const isIconNode = typeof Icon !== 'function';
    const isTrendString = typeof trend === 'string';

    return (
        <div
            onClick={onClick}
            className={cn(
                "glass-panel p-3 md:p-6 rounded-xl md:rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300",
                onClick && "cursor-pointer active:scale-95",
                className
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-0 md:mb-4">
                <div className="space-y-0.5 md:space-y-1">
                    <p className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
                    <h3 className="text-xl md:text-3xl font-display font-medium text-foreground tracking-tight">{value}</h3>
                </div>
                {Icon && (
                    <div className="hidden md:block p-1.5 md:p-3 bg-white/5 rounded-lg md:rounded-xl text-accent border border-white/5 group-hover:scale-110 transition-transform duration-300">
                        {isIconNode ? Icon : <Icon strokeWidth={2} className="w-4 h-4 md:w-6 md:h-6" />}
                    </div>
                )}
            </div>

            {trend !== undefined && (
                <div className="hidden md:flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm mt-2 md:mt-0">
                    <span className={cn(
                        "flex items-center gap-0.5 font-medium px-1 md:px-1.5 py-0.5 rounded",
                        !isTrendString && (trend as number) > 0 ? "text-emerald-400 bg-emerald-400/10" :
                            !isTrendString && (trend as number) < 0 ? "text-red-400 bg-red-400/10" : "text-muted-foreground bg-white/5"
                    )}>
                        {isTrendString ? (
                            trend
                        ) : (
                            <>
                                {(trend as number) > 0 ? <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5" /> : (trend as number) < 0 ? <ArrowDownRight className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                                {Math.abs(trend as number)}%
                            </>
                        )}
                    </span>
                    <span className="text-muted-foreground/60 text-[9px] md:text-xs truncate">{trendLabel}</span>
                </div>
            )}
        </div>
    );
}
