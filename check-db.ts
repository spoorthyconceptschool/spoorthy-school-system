import { GET } from "./src/app/api/admin/dashboard/stats/route";
import { NextRequest } from "next/server";
import { getAdminAuth } from "./src/lib/firebase-admin";

async function testApi() {
    console.log("Mocking ID token verification on the auth service...");
    const authService = getAdminAuth();
    const originalVerify = authService.verifyIdToken;
    authService.verifyIdToken = async (t: string) => {
        return {
            uid: "NPB29wWog2e1heHbNf52Xx3qP123",
            schoolId: "vcQw0kUZsylrL3GtDdEp",
            role: "ADMIN"
        } as any;
    };

    const req = new NextRequest("http://localhost:3000/api/admin/dashboard/stats?year=2026-2027", {
        headers: {
            "Authorization": "Bearer mock-token"
        }
    });

    console.log("Calling GET handler...");
    const response = await GET(req);
    const json = await response.json();
    console.log("API Response Status:", response.status);
    console.log("API Response JSON:", JSON.stringify(json, null, 2));

    authService.verifyIdToken = originalVerify;
}

testApi().catch(console.error);
