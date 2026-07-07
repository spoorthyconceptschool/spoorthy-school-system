"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

interface BranchContextType {
    selectedBranchId: string | null;
    setSelectedBranchId: (id: string | null) => void;
}

const BranchContext = createContext<BranchContextType>({
    selectedBranchId: null,
    setSelectedBranchId: () => {}
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const { isSuperAdmin, branchId } = useAuth();
    
    // For SUPER_ADMIN, it reads from localStorage, default null (All Branches).
    // For normal ADMIN, it is strictly tied to their assigned branchId.
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

    useEffect(() => {
        if (isSuperAdmin) {
            const saved = localStorage.getItem("spoorthy_superadmin_branch");
            if (saved) {
                setSelectedBranchId(saved);
            } else {
                setSelectedBranchId(null);
            }
        } else if (branchId) {
            setSelectedBranchId(branchId);
        }
    }, [isSuperAdmin, branchId]);

    const handleSetSelectedBranchId = (id: string | null) => {
        if (isSuperAdmin) {
            setSelectedBranchId(id);
            if (id) {
                localStorage.setItem("spoorthy_superadmin_branch", id);
            } else {
                localStorage.removeItem("spoorthy_superadmin_branch");
            }
            // Trigger state reset across the app to prevent data leakage
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("branch_changed"));
            }
        }
        // If not super admin, we ignore requests to change branch.
    };

    return (
        <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId: handleSetSelectedBranchId }}>
            {children}
        </BranchContext.Provider>
    );
}

export const useBranch = () => useContext(BranchContext);
