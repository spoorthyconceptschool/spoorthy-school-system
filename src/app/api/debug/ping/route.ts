import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        ping: "pong",
        isolation: "TOTAL",
        note: "This route has 0 external imports. If this works, the problem is in our library initialization."
    });
}
