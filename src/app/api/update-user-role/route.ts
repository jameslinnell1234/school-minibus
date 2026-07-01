import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const allowedRoles = ["basic", "superior", "uber"] as const;

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
    const { uid, role } = body;

    if (!uid || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid uid or role" }, { status: 400 });
    }

    await adminDb.collection("users").doc(uid).update({ role });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}