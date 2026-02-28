import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for intelligently merging Tailwind CSS classes with support for conditional logic.
 * Combines clsx for conditional class resolution and tailwind-merge for conflict resolution.
 * 
 * @param inputs - List of class names or conditional objects to merge.
 * @returns Optimized class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
