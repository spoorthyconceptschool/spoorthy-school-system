import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const snap = await db.collection("exams").get();
        const exams = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        const sSnap = await db.collection("students").get();
        const students = sSnap.docs.map(d => ({id: d.id, name: d.data().studentName, classId: d.data().classId, className: d.data().className}));

        return NextResponse.json({ exams, students });
    } catch(e: any) {
        return NextResponse.json({error: e.message}, {status: 500});
    }
}
