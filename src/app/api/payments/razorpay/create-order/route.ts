import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
    try {
        const { amount, currency = "INR" } = await req.json();

        if (!amount) {
            return NextResponse.json({ error: "Amount is required" }, { status: 400 });
        }

        const instance = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
            key_secret: process.env.RAZORPAY_KEY_SECRET || "",
        });

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit
            currency,
            receipt: `receipt_${Date.now()}`,
        };

        const order = await instance.orders.create(options);

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Error creating Razorpay order:", error);
        return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
    }
}
