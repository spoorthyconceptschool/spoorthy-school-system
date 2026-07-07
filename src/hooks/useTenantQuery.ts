import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface UseTenantQueryOptions {
    /** The Firestore collection name */
    collectionName: string;
    /** Additional constraints to apply to the query */
    additionalConstraints?: QueryConstraint[];
    /** An optional function to process or sort the fetched documents */
    processor?: (docs: any[]) => any[];
    /** Optional dependencies to re-trigger the listener (e.g. selectedYear) */
    dependencies?: any[];
}

/**
 * A specialized hook designed to replace monolithic global data fetching.
 * It strictly enforces tenant boundaries and silently catches permission-denied errors.
 */
export function useTenantQuery<T = any>({
    collectionName,
    additionalConstraints = [],
    processor,
    dependencies = []
}: UseTenantQueryOptions) {
    const { user, userData, role, loading: authLoading, branchId } = useAuth();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isDataQuarantined = React.useRef(false);

    // Resolve tenant ID safely from verified authenticated user profile context
    const activeBranchId = branchId || userData?.schoolId || (role === "SUPER_ADMIN" ? "global" : null);
    
    // Primitive dependency triggers to avoid infinite loops
    const userId = user?.uid;

    useEffect(() => {
        // CIRCUIT BREAKER: Stop execution if auth is transitioning, missing, or if quarantined
        if (authLoading || !userId || activeBranchId === undefined || isDataQuarantined.current) return;

        setLoading(true);
        setError(null);

        // ALWAYS synchronous cache purge on tenant change before listening
        setData([]);

        try {
            const baseConstraints: QueryConstraint[] = [];
            
            // Enforce tenant isolation securely
            if (activeBranchId && activeBranchId !== "global") {
                baseConstraints.push(where("schoolId", "==", activeBranchId));
            }

            const q = query(
                collection(db, collectionName),
                ...baseConstraints,
                ...additionalConstraints
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const finalData = processor ? processor(docs) : docs;
                setData(finalData as unknown as T[]);
                setLoading(false);
            }, (err) => {
                console.warn(`[useTenantQuery] Listener rejected for ${collectionName}:`, err.message);
                setError(err);
                isDataQuarantined.current = true; // TRIPS THE CIRCUIT BREAKER SILENTLY
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err: any) {
            console.error(`[useTenantQuery] Setup error for ${collectionName}:`, err.message);
            setError(err);
            isDataQuarantined.current = true; // TRIPS THE CIRCUIT BREAKER SILENTLY
            setLoading(false);
        }
    }, [userId, activeBranchId, collectionName, authLoading]); // strictly primitive dependencies

    return { data, loading, error };
}
