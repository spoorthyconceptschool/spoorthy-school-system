/**
 * Utility functions for managing browser cache and strict tenant isolation.
 */

export function clearTenantCache(branchId: string | null) {
    if (typeof window === 'undefined') return;

    // We do NOT wipe essential auth state, academic year config, or branding cache (unless it's a full logout)
    const essentialKeys = [
        "local_session_id", 
        "spoorthy_user_cache", 
        "spoorthy_academic_year", 
        "spoorthy_superadmin_branch", 
        "spoorthy_logging_out",
        "spoorthy_last_branch_id"
    ];

    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !essentialKeys.includes(key) && !key.startsWith("spoorthy_cached_branding_")) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(k => {
            if (k) localStorage.removeItem(k);
        });

        console.log(`[CacheUtils] Wiped ${keysToRemove.length} cached entities for tenant isolation.`);
    } catch (e) {
        console.warn("[CacheUtils] Failed to clear tenant cache:", e);
    }
}

export function fullSystemWipe() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.clear();
        sessionStorage.clear();
        console.log("[CacheUtils] Executed full system hard wipe.");
    } catch (e) {}
}
