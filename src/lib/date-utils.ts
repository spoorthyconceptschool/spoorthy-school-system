/**
 * Formats a raw date string (YYYY-MM-DD) or a JavaScript Date object into a DD/MM/YYYY string.
 * This is primarily used for display consistency in student reports and UI lists.
 * 
 * @param dateStr - A valid ISO date string (YYYY-MM-DD) or a Date object.
 * @returns A formatted string or the original input if invalid.
 */
export function formatDateToDDMMYYYY(dateStr: any): string {
    if (!dateStr) return '';

    // Handle both YYYY-MM-DD, Timestamp and Date objects
    let date: Date;
    if (typeof dateStr === 'object' && dateStr.seconds !== undefined) {
        date = new Date(dateStr.seconds * 1000);
    } else {
        date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    }

    // Check if valid date
    if (isNaN(date.getTime())) return String(dateStr);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());

    return `${day}/${month}/${year}`;
}

/**
 * Specifically converts a Firestore-style Timestamp object into dd-mm-yy format.
 * Provides fallback for standard string dates if the toDate method is missing.
 * 
 * @param timestamp - The Firestore timestamp or raw date reference.
 * @returns A localized date string.
 */
export function formatTimestampToDDMMYYYY(timestamp: any): string {
    if (!timestamp) return '';

    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return formatDateToDDMMYYYY(date);
}
