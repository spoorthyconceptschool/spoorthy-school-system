"use client";

import { useEffect, useState, useRef } from "react";
import { Search as SearchIcon, Loader2, X, ChevronRight, User, CreditCard, FileText, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { searchGlobal, SearchIndexItem } from "@/lib/search";

// Simple inline debounce hook to avoid extra files if not needed, 
// strictly following the user's "debounce 150-250ms" rule.
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function UniversalSearch() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchIndexItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounce the query input (200ms)
    const debouncedQuery = useDebounceValue(query, 200);

    // Keyboard Navigation
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Execute Search
    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.length < 2) {
                setResults([]);
                setOpen(false); // Close if query too short or cleared
                return;
            }

            setLoading(true);
            try {
                const hits = await searchGlobal(debouncedQuery);
                setResults(hits);
                setSelectedIndex(-1);
                setOpen(true); // Open only after results fetched
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // CMD+K to focus
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (!open || results.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0) {
                handleSelect(results[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelect = (item: SearchIndexItem) => {
        if (item.type === 'action' && item.url.includes('?')) {
            // Force reload for query params to take effect if components aren't reactive
            window.location.href = item.url;
        } else {
            router.push(item.url);
        }
        setOpen(false);
        setQuery("");
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    // Icon Helper
    const getIcon = (type: string) => {
        switch (type) {
            case 'student': return <User className="w-4 h-4 text-blue-400" />;
            case 'payment': return <CreditCard className="w-4 h-4 text-green-400" />;
            case 'teacher': return <User className="w-4 h-4 text-purple-400" />;
            case 'action': return <Zap className="w-4 h-4 text-amber-400" />;
            default: return <FileText className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-xl group">
            <div className="relative">
                <SearchIcon className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    open ? "text-accent" : "text-muted-foreground"
                )} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0 && query.length >= 2) setOpen(true); }}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                            e.preventDefault();
                            // Handle navigation via refs or separate logic if needed, 
                            // but simpler to keep focused on input and use state for index
                            if (!open && results.length > 0) setOpen(true);
                        }
                        handleInputKeyDown(e);
                    }}
                    placeholder="Search global..."
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-full pl-10 pr-10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50"
                />

                {/* CMD+K Hint or Loader or Clear */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : query ? (
                        <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="text-muted-foreground hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    ) : (
                        <kbd className="hidden md:flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            {open && query.length >= 2 && (
                <div className="absolute top-12 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {results.length === 0 && !loading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="py-2 max-h-[60vh] overflow-y-auto">
                            {results.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                                        index === selectedIndex ? "bg-accent/10" : "hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/5",
                                        index === selectedIndex ? "border-accent/20 bg-accent/20" : ""
                                    )}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm text-foreground truncate">{item.title}</span>
                                            {item.type === 'student' && <span className="text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-400 px-1.5 rounded">Student</span>}
                                            {item.type === 'payment' && <span className="text-[10px] uppercase tracking-wider bg-green-500/10 text-green-400 px-1.5 rounded">Fee</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                    </div>
                                    {index === selectedIndex && <ChevronRight className="w-4 h-4 text-accent" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
