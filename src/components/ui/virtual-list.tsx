import React, { useState, useEffect, useRef, UIEvent, ReactNode } from "react";

interface VirtualListProps<T> {
    /** The list of items to render */
    items: T[];
    /** Height of each row in pixels */
    itemHeight: number;
    /** Render function for each item */
    renderItem: (item: T, index: number) => ReactNode;
    /** Height of the scroll container (e.g., "400px", "100%") */
    containerHeight?: string;
    /** CSS class for the scroll container */
    className?: string;
    /** Number of extra rows to render above and below the visible viewport */
    overscan?: number;
    /** Custom tag for the scroll container */
    as?: React.ElementType;
    /** Custom tag for the viewport contents container */
    innerAs?: React.ElementType;
    /** Custom tag for the row container */
    itemAs?: React.ElementType;
    /** Tailwind or CSS classes for the row */
    itemClassName?: string;
    /** Callback triggered when the user scrolls near the bottom */
    onScrollEnd?: () => void;
    /** Threshold in pixels from the bottom to trigger onScrollEnd */
    onScrollEndThreshold?: number;
}

export function VirtualList<T>({
    items,
    itemHeight,
    renderItem,
    containerHeight = "500px",
    className = "",
    overscan = 5,
    as = "div",
    innerAs = "div",
    itemAs = "div",
    itemClassName = "",
    onScrollEnd,
    onScrollEndThreshold = 200
}: VirtualListProps<T>) {
    const ContainerTag = as as any;
    const InnerTag = innerAs as any;
    const ItemTag = itemAs as any;
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const isScrollingRef = useRef(false);

    // Measure viewport height on mount and resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        setViewportHeight(container.clientHeight);

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setViewportHeight(entry.target.clientHeight);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollTop(target.scrollTop);

        if (onScrollEnd) {
            const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < onScrollEndThreshold;
            if (isNearBottom) {
                onScrollEnd();
            }
        }
    };

    const totalHeight = items.length * itemHeight;

    // Calculate indices
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.floor((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    // Get slice of items to render
    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
        if (items[i] !== undefined) {
            visibleItems.push({
                item: items[i],
                index: i,
                offsetTop: i * itemHeight
            });
        }
    }

    return (
        <ContainerTag
            ref={containerRef}
            className={`overflow-y-auto relative scrollbar-thin ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <InnerTag 
                style={{ 
                    height: `${totalHeight}px`, 
                    position: "relative",
                    width: "100%"
                }}
            >
                {visibleItems.map(({ item, index, offsetTop }) => (
                    <ItemTag
                        key={index}
                        className={itemClassName}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: `${itemHeight}px`,
                            transform: `translate3d(0, ${offsetTop}px, 0)`,
                            willChange: "transform"
                        }}
                    >
                        {renderItem(item, index)}
                    </ItemTag>
                ))}
            </InnerTag>
        </ContainerTag>
    );
}
