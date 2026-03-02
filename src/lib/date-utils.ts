/**
 * Formats a raw date string (YYYY-MM-DD) or a JavaScript Date object into a DD/MM/YYYY string.
 * This is primarily used for display consistency in student reports and UI lists.
 * 
 * @param dateStr - A valid ISO date string (YYYY-MM-DD) or a Date object.
 * @returns A formatted string or the original input if invalid.
 */
export function formatDateToDDMMYYYY(dateStr: string): string {
    if (!dateStr) return '';

    // Handle both YYYY-MM-DD and Date objects
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

    // Check if valid date
    if (isNaN(date.getTime())) return dateStr;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Specifically converts a Firestore-style Timestamp object into DD/MM/YYYY format.
 * Provides fallback for standard string dates if the toDate method is missing.
 * 
 * @param timestamp - The Firestore timestamp or raw date reference.
 * @returns A localized date string.
 */
export function formatTimestampToDDMMYYYY(timestamp: any): string {
    if (!timestamp) return '';

    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return formatDateToDDMMYYYY(date.toISOString().split('T')[0]);
}
