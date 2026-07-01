import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
export const runtime = "nodejs";
console.log("🔥 API HIT /all-auth-users NEW VERSION");

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const requester = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!requester.exists || requester.data()?.role !== "uber") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const list = await adminAuth.listUsers();

    return NextResponse.json({
      users: list.users.map((u) => ({
        uid: u.uid,
        email: u.email ?? "",
      })),
    });
  } catch (err) {
  console.error("🔥 FULL ERROR OBJECT:", err);

  return NextResponse.json({
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : null,
  }, { status: 500 });
}
}