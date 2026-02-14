import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal, ArrowUpDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Column<T> {
    key: string;
    header: string;
    render?: (item: T, index?: number) => React.ReactNode;
    headerClassName?: string;
    cellClassName?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    actions?: (item: T) => React.ReactNode; // Extra kebab menu actions
}

export function DataTable<T extends { id: string }>({ data, columns, isLoading, onRowClick, actions }: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className="w-full h-48 flex items-center justify-center bg-white/5 rounded-xl animate-pulse">
                <div className="h-4 w-4 bg-accent/50 rounded-full animate-ping" />
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            {/* Unified Table View - Optimized for Zero Scroll */}
            <div className="overflow-x-auto rounded-xl md:rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md custom-scrollbar">
                <Table className="w-full">
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            {columns.map((col) => (
                                <TableHead
                                    key={col.key}
                                    className={cn(
                                        "text-muted-foreground font-black uppercase text-[7px] md:text-[10px] tracking-widest h-8 md:h-12 whitespace-nowrap px-2 md:px-6 italic",
                                        col.headerClassName
                                    )}
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                            {actions && <TableHead className="w-[30px] md:w-[50px] whitespace-nowrap px-2 md:px-6"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-24 md:h-32 text-center text-muted-foreground border-white/10 whitespace-nowrap text-[10px] md:text-sm italic">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item, index) => (
                                <TableRow
                                    key={item.id || index}
                                    className={cn(
                                        "border-white/5 transition-all duration-300 hover:bg-[#64FFDA]/5 group cursor-default",
                                        onRowClick && "cursor-pointer"
                                    )}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {columns.map((col) => (
                                        <TableCell
                                            key={`${item.id}-${col.key}`}
                                            className={cn(
                                                "py-2 md:py-4 px-2 md:px-6 font-medium whitespace-nowrap text-[10px] md:text-sm",
                                                col.cellClassName
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                {col.render ? col.render(item, index) : (
                                                    <span className="text-white group-hover:text-accent transition-colors">
                                                        {(item as any)[col.key]}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    ))}
                                    {actions && (
                                        <TableCell className="px-2 md:px-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-white/10 text-muted-foreground hover:text-white">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#0A192F] border-white/10 backdrop-blur-xl rounded-xl">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 p-3 italic">Operations</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <div className="p-1">
                                                        {actions(item)}
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Simple Pagination - More compact on mobile */}
            <div className="flex items-center justify-between py-2 md:py-4 px-3 md:px-6 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl">
                <div className="text-[8px] md:text-xs font-black uppercase tracking-widest text-muted-foreground italic">
                    Scope: <span className="text-white ml-1">{data.length} items</span>
                </div>
                <div className="flex gap-1 md:gap-2">
                    <Button variant="ghost" size="sm" disabled className="h-6 md:h-8 px-2 md:px-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10 opacity-50">
                        Prev
                    </Button>
                    <Button variant="ghost" size="sm" disabled className="h-6 md:h-8 px-2 md:px-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10 opacity-50">
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
