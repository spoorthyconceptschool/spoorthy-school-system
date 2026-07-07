"use client";

import { TeachersDirectory } from "@/components/admin/teachers-directory";

export default function SuperAdminTeacherReports() {
    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <TeachersDirectory isReportMode={true} />
        </div>
    );
}
