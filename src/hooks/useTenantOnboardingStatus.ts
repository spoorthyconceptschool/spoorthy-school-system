import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function useTenantOnboardingStatus(
    requiredCollections: string[] = ['classes', 'fee_structures', 'academic_years']
) {
    const { userData } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    const [isFullyOnboarded, setIsFullyOnboarded] = useState<boolean | null>(null);
    const [isSyncing, setIsSyncing] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        
        async function verifyTenantSkeleton() {
            // Guard: Short-circuit if session or context is missing
            if (!userData?.schoolId || !auth.currentUser || pathname.includes('/admin/onboarding')) {
                if (isMounted) setIsSyncing(false);
                return;
            }

            try {
                if (isMounted) setIsSyncing(true);

                // Ensure custom claims are freshly synced before executing backend query
                await auth.currentUser.getIdToken(true);

                // Parallelize counts with tight limit(1) boundaries
                const baselineChecks = await Promise.all(
                    requiredCollections.map(async (collectionName) => {
                        const boundaryQuery = query(
                            collection(db, collectionName),
                            where('schoolId', '==', userData.schoolId),
                            limit(1)
                        );
                        const snapshot = await getDocs(boundaryQuery);
                        return !snapshot.empty;
                    })
                );

                const validSkeleton = baselineChecks.every(Boolean);
                
                if (isMounted) {
                    setIsFullyOnboarded(validSkeleton);
                    setIsSyncing(false);
                    if (!validSkeleton) {
                        router.replace('/admin/onboarding');
                    }
                }
            } catch (error: any) {
                // Intercept the exception to prevent global UI cascade failures
                if (isMounted) {
                    if (error.code === 'permission-denied') {
                        // Defer execution and hold UI state while claims refresh
                        setIsSyncing(true);
                    } else {
                        setIsFullyOnboarded(false);
                        setIsSyncing(false);
                    }
                }
            }
        }

        verifyTenantSkeleton();

        return () => { isMounted = false; };
    }, [userData?.schoolId, router, pathname, requiredCollections]);

    return { isFullyOnboarded, isSyncing };
}
