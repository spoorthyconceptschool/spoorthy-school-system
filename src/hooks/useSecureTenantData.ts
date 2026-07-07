import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export function useSecureTenantData<T>(collectionName: string) {
    const { userData } = useAuth();
    const [data, setData] = useState<T[]>([]);

    useEffect(() => {
        setData([]); // Absolute wipe before new subscription
        if (!userData?.schoolId) return;

        const tenantQuery = query(
            collection(db, collectionName),
            where('schoolId', '==', userData.schoolId)
        );

        const unsubscribe = onSnapshot(tenantQuery, (snapshot) => {
            setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T));
        });

        return () => unsubscribe(); // Force cleanup
    }, [userData?.schoolId, collectionName]);

    return data;
}
