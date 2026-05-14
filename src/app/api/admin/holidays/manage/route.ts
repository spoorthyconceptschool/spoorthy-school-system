import { NextRequest, NextResponse } from "next/server";
import { withEnterpriseGuard } from "@/lib/enterprise/auth-middleware";
import { adminDb, Timestamp } from "@/lib/firebase-admin";

/**
 * Enterprise Holiday Management API
 * 
 * - POST: Creates a Holiday and SWEEPS (deletes) any existing attendance records that were marked for those dates.
 * - DELETE: Reverts a Holiday back to a working day by deleting the notice.
 */
export async function POST(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN'], async (req, user) => {
        try {
            const body = await req.json();
            const { title, description, startDate, endDate, target } = body;

            if (!title || !startDate || !endDate) {
                return NextResponse.json({ success: false, error: "Validation Failed: Missing dates or title" }, { status: 400 });
            }

            // 1. Create the Holiday Notice
            const noticeRef = adminDb.collection("notices").doc();
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const datesToClear: string[] = [];
            let current = new Date(start);
            while (current <= end) {
                const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                datesToClear.push(dateKey);
                current.setDate(current.getDate() + 1);
            }

            const batch = adminDb.batch();

            batch.set(noticeRef, {
                title,
                description: description || "",
                type: "HOLIDAY",
                target: target || "ALL",
                startDate: Timestamp.fromDate(start),
                endDate: Timestamp.fromDate(end),
                authorId: user.uid,
                authorName: "Administrator",
                createdAt: Timestamp.now(),
                status: "PUBLISHED"
            });

            // 2. SWEEP EXISTING ATTENDANCE
            // If any teachers or admins previously marked attendance for these newly designated holidays,
            // we actively delete them to prevent phantom 'Present/Absent' statistics.
            if (datesToClear.length > 0) {
                // Firestore 'in' queries are limited to 10 chunks, so we batch fetch and delete iteratively
                for (let i = 0; i < datesToClear.length; i += 10) {
                    const chunk = datesToClear.slice(i, i + 10);
                    const attSnap = await adminDb.collection("attendance_daily")
                        .where("date", "in", chunk)
                        .get();
                    
                    attSnap.docs.forEach((doc: any) => {
                        batch.delete(doc.ref);
                    });
                }
            }

            await batch.commit();

            return NextResponse.json({
                success: true,
                message: "Holiday beautifully created and active attendance swept.",
                data: { noticeId: noticeRef.id, daysSwept: datesToClear.length }
            });

        } catch (error: any) {
            console.error("[Enterprise Holiday] Failed to create:", error);
            return NextResponse.json({ success: false, error: `System Error: ${error.message}` }, { status: 500 });
        }
    });
}

export async function DELETE(req: NextRequest) {
    return withEnterpriseGuard(req, ['ADMIN'], async (req) => {
        try {
            const url = new URL(req.url);
            const id = url.searchParams.get("id");

            if (!id) {
                return NextResponse.json({ success: false, error: "Missing notice ID" }, { status: 400 });
            }

            // Revert Holiday (just delete the notice so the system dynamically recognizes it as a Working Day again)
            await adminDb.collection("notices").doc(id).delete();

            return NextResponse.json({ success: true, message: "Holiday reverted into Working Day successfully." });

        } catch (error: any) {
            console.error("[Enterprise Holiday] Failed to revert:", error);
            return NextResponse.json({ success: false, error: `System Error: ${error.message}` }, { status: 500 });
        }
    });
}
