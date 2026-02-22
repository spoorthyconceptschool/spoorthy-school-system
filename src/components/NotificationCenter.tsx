"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    status: "READ" | "UNREAD";
    createdAt: any;
}

export function NotificationCenter({ role }: { role: "ADMIN" | "MANAGER" | "TEACHER" | "STUDENT" }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        const unsubscribes: (() => void)[] = [];

        // 1. Core Logic to fetch profile and start listeners
        const startListeners = async () => {
            if (!user?.uid) return;

            // A. Always listen for UID-based personal notifications
            const qPersonal = query(collection(db, "notifications"), where("userId", "==", user.uid), limit(20));
            try {
                const unsubPersonal = onSnapshot(qPersonal, (snap) => {
                    if (!isMounted) return;
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
                    updateNotifications(list);
                }, (err) => {
                    console.error("Personal notification listener error:", err);
                });
                unsubscribes.push(unsubPersonal);
            } catch (e) {
                console.error("Failed to start personal notification listener", e);
            }

            // B. Role-based secondary listeners
            try {
                if (role === "ADMIN" || role === "MANAGER") {
                    const qAdmin = query(collection(db, "notifications"), where("target", "==", "ALL_ADMINS"), limit(20));
                    const unsubAdmin = onSnapshot(qAdmin, (snap) => {
                        if (!isMounted) return;
                        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
                        updateNotifications(list);
                    }, (err) => console.error("Admin notification listener error:", err));
                    unsubscribes.push(unsubAdmin);
                } else if (role === "TEACHER") {
                    const tQuery = query(collection(db, "teachers"), where("uid", "==", user.uid), limit(1));
                    const tSnap = await getDocs(tQuery);

                    if (!isMounted) return;

                    // A. Global Teacher Notifications
                    const qAllFaculty = query(collection(db, "notifications"), where("target", "in", ["ALL", "ALL_FACULTY"]), limit(20));
                    const unsubAllFaculty = onSnapshot(qAllFaculty, (snap) => {
                        if (!isMounted) return;
                        updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
                    }, (err) => console.error("Faculty notification listener error:", err));
                    unsubscribes.push(unsubAllFaculty);

                    if (!tSnap.empty) {
                        const teacherData = tSnap.docs[0].data();
                        const schoolId = teacherData.schoolId || tSnap.docs[0].id;
                        if (schoolId) {
                            const qSchool = query(collection(db, "notifications"), where("userId", "==", schoolId), limit(20));
                            const unsubSchool = onSnapshot(qSchool, (snap) => {
                                if (!isMounted) return;
                                updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
                            }, (err) => console.error("School notification listener error:", err));
                            unsubscribes.push(unsubSchool);
                        }
                    }
                } else if (role === "STUDENT") {
                    const sQuery = query(collection(db, "students"), where("uid", "==", user.uid), limit(1));
                    const sSnap = await getDocs(sQuery);

                    if (!isMounted) return;

                    // A. Global Student Notifications
                    const qAllStudents = query(collection(db, "notifications"), where("target", "in", ["ALL", "ALL_STUDENTS"]), limit(20));
                    const unsubAllStudents = onSnapshot(qAllStudents, (snap) => {
                        if (!isMounted) return;
                        updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
                    }, (err) => console.error("Global student notification listener error:", err));
                    unsubscribes.push(unsubAllStudents);

                    if (!sSnap.empty) {
                        const studentData = sSnap.docs[0].data();
                        const classId = studentData.classId;
                        const schoolId = studentData.schoolId || sSnap.docs[0].id;

                        // B. Class Notifications
                        if (classId) {
                            const qClass = query(collection(db, "notifications"), where("target", "==", `class_${classId}`), limit(20));
                            const unsubClass = onSnapshot(qClass, (snap) => {
                                if (!isMounted) return;
                                updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
                            }, (err) => console.error("Student notification listener error (class):", err));
                            unsubscribes.push(unsubClass);
                        }

                        // C. Village Notifications
                        const villageId = studentData.villageId;
                        if (villageId) {
                            const qVillage = query(collection(db, "notifications"), where("target", "==", `village_${villageId}`), limit(20));
                            const unsubVillage = onSnapshot(qVillage, (snap) => {
                                if (!isMounted) return;
                                updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
                            }, (err) => console.error("Student notification listener error (village):", err));
                            unsubscribes.push(unsubVillage);
                        }

                        // D. Personal Notifications (by School ID)
                        if (schoolId) {
                            const qPersonal = query(collection(db, "notifications"), where("userId", "==", schoolId), limit(20));
                            const unsubPersonal = onSnapshot(qPersonal, (snap) => {
                                if (!isMounted) return;
                                updateNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
                            }, (err) => console.error("Student notification listener error (personal):", err));
                            unsubscribes.push(unsubPersonal);
                        }
                    }
                }
            } catch (e) {
                console.error("Error setting up role-based listeners:", e);
            }
        };

        const updateNotifications = (newList: Notification[]) => {
            if (!isMounted) return;
            setNotifications(prev => {
                const combined = [...newList, ...prev.filter(p => !newList.find(l => l.id === p.id))];
                return combined.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                }).slice(0, 20);
            });
        };

        startListeners();

        return () => {
            isMounted = false;
            unsubscribes.forEach(f => f());
        };
    }, [user, role]);

    useEffect(() => {
        setUnreadCount(notifications.filter(n => n.status === "UNREAD").length);
    }, [notifications]);

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, "notifications", id), { status: "READ" });
        } catch (e) {
            console.error("Error marking notification as read:", e);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-white/5 rounded-full text-[#8892B0] hover:text-white transition-colors group">
                    <Bell size={20} className={cn(unreadCount > 0 && "animate-pulse")} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold border-2 border-[#0A192F]">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#112240] border-[#64FFDA]/20 text-[#E6F1FF] backdrop-blur-xl p-0 shadow-2xl rounded-xl">
                <DropdownMenuLabel className="p-4 flex justify-between items-center border-b border-[#64FFDA]/10">
                    <span className="font-bold">Notifications</span>
                    {unreadCount > 0 && <Badge variant="secondary" className="bg-[#64FFDA]/10 text-[#64FFDA]">{unreadCount} New</Badge>}
                </DropdownMenuLabel>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-sm italic">
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-[#3B82F6]/5",
                                    n.status === "UNREAD" ? "bg-[#3B82F6]/5 border-l-2 border-[#3B82F6]" : "opacity-70"
                                )}
                            >
                                <div className="font-bold text-sm flex justify-between w-full">
                                    <span>{n.title}</span>
                                    {n.status === "UNREAD" && <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                                <span className="text-[10px] text-muted-foreground/50 mt-1">
                                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                <DropdownMenuSeparator className="bg-[#64FFDA]/10" />
                <div className="p-2 text-center">
                    <Link
                        href={(role === "ADMIN" || role === "MANAGER") ? "/admin/notifications" : role === "TEACHER" ? "/teacher/notifications" : "/student/notifications"}
                        className="text-[10px] text-[#64FFDA] hover:underline font-bold tracking-widest uppercase block w-full py-1"
                    >
                        View All
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
