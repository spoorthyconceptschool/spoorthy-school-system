import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const branchesSnap = await adminDb.collection("branches").get();
        const branches = branchesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        const studentsSnap = await adminDb.collection("students").limit(3).get();
        const students = studentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        const teachersSnap = await adminDb.collection("teachers").limit(3).get();
        const teachers = teachersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        const staffSnap = await adminDb.collection("staff").limit(3).get();
        const staff = staffSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ branches, students, teachers, staff });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}

