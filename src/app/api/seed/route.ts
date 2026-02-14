
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // Ensure you have firebase-admin initialized for server-side if possible, OR use client SDK in a reliable way.
// NOTE: Since this is likely a client-side SDK usage environment unless you have Admin SDK setup with service account, 
// using client SDK in API routes might have auth issues if not careful.
// HOWEVER, for a "seed" script in a dev environment, we can often get away with using the client SDK 
// provided the rules allow write from the server IP or we have admin privileges.
// Actually, `src/lib/firebase.ts` exports client SDK instances.
// Next.js API routes run on the server. Client SDKs *can* work there but they don't have a plugged-in user session by default.
// The best way to seed is to use a Client-side component that the logged-in Admin clicks.

export async function POST(req: Request) {
    return NextResponse.json({ error: "Please use the client-side seeder for authentication reasons." }, { status: 400 });
}
