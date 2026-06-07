import { db } from "@/lib/firebase";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";

export interface Branch {
    id?: string;
    branchName: string;
    branchCode: string;
    schoolName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    principalName: string;
    status: 'ACTIVE' | 'SUSPENDED';
    logoUrl?: string;
    studentIdPrefix?: string;
    teacherIdPrefix?: string;
    studentIdSuffix?: number;
    teacherIdSuffix?: number;
    principalSignature?: string;
    createdAt?: any;
    updatedAt?: any;
}

const COLLECTION_NAME = "branches";

export const branchService = {
    getAllBranches: async (): Promise<Branch[]> => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("branchName"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
    },

    getActiveBranches: async (): Promise<Branch[]> => {
        const q = query(collection(db, COLLECTION_NAME), where("status", "==", "ACTIVE"), orderBy("branchName"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
    },

    getBranchById: async (id: string): Promise<Branch | null> => {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Branch;
        }
        return null;
    },

    createBranch: async (branchData: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...branchData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    },

    updateBranch: async (id: string, branchData: Partial<Branch>): Promise<void> => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...branchData,
            updatedAt: serverTimestamp()
        });
    },

    deleteBranch: async (id: string): Promise<void> => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }
};
