import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        // Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        if (decodedToken.role !== "SUPER_ADMIN") {
            return NextResponse.json({ success: false, error: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const settingsRef = adminDb.collection("website_settings").doc("main");
        const docSnap = await settingsRef.get();
        
        if (docSnap.exists) {
            return NextResponse.json({ success: true, settings: docSnap.data() });
        } else {
            // Return default values
            return NextResponse.json({
                success: true,
                settings: {
                    website_school_name: "Spoorthy Concept School",
                    website_logo: "",
                    website_tagline: "Learn Today, Lead Tomorrow",
                    website_contact: "+91 9999999999",
                    website_address: "Miyapur, Hyderabad, Telangana",
                    website_email: "info@spoorthyconceptschool.com",
                    website_footer: "Spoorthy Concept School. All rights reserved.",
                    website_facebook: "",
                    website_twitter: "",
                    website_instagram: "",
                    website_branding_content: "",
                    website_favicon: "",
                    website_theme_branding: "emerald",
                    website_organization_name: ""
                }
            });
        }
    } catch (error: any) {
        console.error("[API Website Settings GET] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        if (decodedToken.role !== "SUPER_ADMIN") {
            return NextResponse.json({ success: false, error: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const {
            website_school_name,
            website_logo,
            website_tagline,
            website_contact,
            website_address,
            website_email,
            website_footer,
            website_facebook,
            website_twitter,
            website_instagram,
            website_branding_content,
            website_favicon,
            website_theme_branding,
            website_organization_name
        } = body;

        const settingsRef = adminDb.collection("website_settings").doc("main");
        const docSnap = await settingsRef.get();

        const updateData: any = {
            website_school_name: website_school_name || "",
            website_logo: website_logo || "",
            website_tagline: website_tagline || "",
            website_contact: website_contact || "",
            website_address: website_address || "",
            website_email: website_email || "",
            website_footer: website_footer || "",
            website_facebook: website_facebook || "",
            website_twitter: website_twitter || "",
            website_instagram: website_instagram || "",
            website_branding_content: website_branding_content || "",
            website_favicon: website_favicon || "",
            website_theme_branding: website_theme_branding || "emerald",
            website_organization_name: website_organization_name || "",
            updated_at: new Date().toISOString()
        };

        if (!docSnap.exists) {
            updateData.created_at = new Date().toISOString();
        }

        // Save to Firestore
        await settingsRef.set(updateData, { merge: true });

        // Mirror schoolName and schoolLogo to RTDB for backward compatibility and real-time client components
        const globalBrandingUpdate = {
            schoolName: website_school_name || "",
            schoolLogo: website_logo || "",
            address: website_address || "",
            favicon: website_favicon || "",
            themeBranding: website_theme_branding || "emerald",
            organizationName: website_organization_name || "",
            updatedAt: new Date().toISOString()
        };

        await Promise.all([
            adminRtdb.ref("siteContent/branding").update(globalBrandingUpdate),
            adminRtdb.ref("master/branding").update(globalBrandingUpdate),
            adminDb.collection("settings").doc("branding").set(globalBrandingUpdate, { merge: true })
        ]);

        return NextResponse.json({ success: true, message: "Website Settings updated successfully" });
    } catch (error: any) {
        console.error("[API Website Settings POST] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
