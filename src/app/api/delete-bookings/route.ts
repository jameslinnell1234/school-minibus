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
    const requesterRole = requesterDoc.data()?.role;

    if (!requesterDoc.exists || !["superior", "uber"].includes(requesterRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const bookingIds: string[] = body.bookingIds;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ error: "No bookings selected" }, { status: 400 });
    }

    if (bookingIds.length > 100) {
      return NextResponse.json({ error: "Too many bookings selected" }, { status: 400 });
    }

    const batch = adminDb.batch();

    bookingIds.forEach((id) => {
      const ref = adminDb.collection("bookings").doc(id);
      batch.delete(ref);
    });

    await batch.commit();

    return NextResponse.json({ success: true, deleted: bookingIds.length });
  } catch (err) {
    console.error("DELETE BOOKINGS ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}