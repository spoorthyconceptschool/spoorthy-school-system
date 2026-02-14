/**
 * Format a date string (YYYY-MM-DD) to DD/MM/YYYY
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
 * Format a Firestore Timestamp to DD/MM/YYYY
 */
export function formatTimestampToDDMMYYYY(timestamp: any): string {
    if (!timestamp) return '';

    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return formatDateToDDMMYYYY(date.toISOString().split('T')[0]);
}
