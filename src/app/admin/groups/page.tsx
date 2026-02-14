"use client";

import { GroupsManager } from "@/components/admin/groups-manager";

export default function AdminGroupsPage() {
    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h1 className="text-3xl font-display font-bold text-white">Student Groups</h1>
                <p className="text-muted-foreground">Manage houses, teams, and student leadership roles.</p>
            </div>
            <GroupsManager />
        </div>
    );
}
