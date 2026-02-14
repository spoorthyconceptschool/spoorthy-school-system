"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Plus, User, MoreVertical, Key, Trash2, Archive, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AddSystemUserModal } from "./add-system-user-modal";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DeleteUserModal } from "./delete-user-modal";
import { AdminChangePasswordModal } from "./admin-change-password-modal";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast-store";

export function SystemUsersManager() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Action State
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [actionType, setActionType] = useState<"delete" | "password" | null>(null);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("role"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const systemUsers = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((u: any) => ["ADMIN", "MANAGER", "TIMETABLE_EDITOR"].includes(u.role));
            setUsers(systemUsers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDeactivate = async (reason: string) => {
        if (!selectedUser || !currentUser) return;
        const res = await fetch("/api/admin/user-actions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${await currentUser.getIdToken()}`
            },
            body: JSON.stringify({
                targetId: selectedUser.id,
                role: selectedUser.role,
                action: "DEACTIVATE",
                reason
            })
        });
        if (!res.ok) throw new Error("Failed to deactivate user");
    };

    const handleDelete = async (reason: string) => {
        if (!selectedUser || !currentUser) return;
        const res = await fetch("/api/admin/user-actions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${await currentUser.getIdToken()}`
            },
            body: JSON.stringify({
                targetId: selectedUser.id,
                role: selectedUser.role,
                action: "DELETE_HARD",
                reason
            })
        });
        if (!res.ok) throw new Error("Failed to permanently delete user");
    };

    return (
        <Card className="bg-black/20 border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-accent" size={20} />
                        System Access Control
                    </CardTitle>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Manage administrative accounts</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="bg-white text-black hover:bg-zinc-200">
                    <Plus size={16} className="mr-1" /> Add User
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-3">
                    {loading ? (
                        <div className="p-10 text-center animate-pulse text-muted-foreground">Syncing access matrix...</div>
                    ) : users.length === 0 ? (
                        <div className="p-10 text-center border border-dashed border-white/5 rounded-xl text-muted-foreground italic">
                            No secondary system users found.
                        </div>
                    ) : (
                        users.map((u) => (
                            <div key={u.id} className={cn(
                                "flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group",
                                u.status === "inactive" && "opacity-50 grayscale"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-accent/30 transition-colors">
                                        <User size={18} className="text-white/40 group-hover:text-accent transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            {u.name || u.email}
                                            {u.status === "inactive" && <span className="text-[9px] bg-red-500/10 text-red-500 px-1 rounded uppercase">Inactive</span>}
                                        </div>
                                        <div className="text-[10px] font-mono text-white/40">{u.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-none",
                                        u.role === "ADMIN" ? "bg-accent/10 text-accent" :
                                            u.role === "MANAGER" ? "bg-blue-500/10 text-blue-400" :
                                                "bg-purple-500/10 text-purple-400"
                                    )}>
                                        {u.role}
                                    </Badge>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                                            <DropdownMenuItem
                                                className="gap-2 text-xs font-bold text-amber-500"
                                                onClick={() => { setSelectedUser(u); setActionType("password"); }}
                                            >
                                                <Key size={14} /> Reset Password
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="gap-2 text-xs font-bold text-red-500"
                                                onClick={() => { setSelectedUser(u); setActionType("delete"); }}
                                            >
                                                <Trash2 size={14} /> Revoke Access
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>

            <AddSystemUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => { }}
            />

            {selectedUser && (
                <>
                    <DeleteUserModal
                        isOpen={actionType === "delete"}
                        onClose={() => { setActionType(null); setSelectedUser(null); }}
                        user={{
                            id: selectedUser.id,
                            schoolId: selectedUser.email,
                            name: selectedUser.name || "System User",
                            role: selectedUser.role
                        }}
                        checkEligibility={async () => ({ canDelete: true })}
                        onDeactivate={handleDeactivate}
                        onDelete={handleDelete}
                    />

                    <AdminChangePasswordModal
                        isOpen={actionType === "password"}
                        onClose={() => { setActionType(null); setSelectedUser(null); }}
                        user={{
                            uid: selectedUser.id,
                            schoolId: selectedUser.email, // Use email as fallback for schoolId
                            name: selectedUser.name || "System User",
                            role: selectedUser.role
                        }}
                    />
                </>
            )}
        </Card>
    );
}
