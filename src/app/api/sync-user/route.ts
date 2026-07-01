import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    const requesterDoc = await adminDb.collection("users").doc(decoded.uid).get();

    if (!requesterDoc.exists || requesterDoc.data()?.role !== "uber") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { uid, email } = body;

    if (!uid || !email) {
      return NextResponse.json({ error: "uid and email required" }, { status: 400 });
    }

    await adminDb.collection("users").doc(uid).set(
      {
        email: String(email).trim().toLowerCase(),
        role: "basic",
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SYNC USER ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}