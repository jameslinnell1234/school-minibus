// src/app/api/create-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
export const runtime = "nodejs";
type Role = "basic" | "superior" | "uber";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];

    const decoded = await adminAuth.verifyIdToken(token);

    const requesterDoc = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!requesterDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const requesterRole = requesterDoc.data()?.role;

    if (requesterRole !== "uber") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body: { email?: string; role?: Role } = await req.json();

    if (!body.email || !body.role) {
      return NextResponse.json(
        { error: "Email and role required" },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // ✅ check duplicate safely
    try {
      await adminAuth.getUserByEmail(email);

      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    } catch (err: unknown) {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code !== "auth/user-not-found"
  ) {
    throw err;
  }

}
    const DEFAULT_PASSWORD = "TempPass123!Secure";

    const userRecord = await adminAuth.createUser({
      email,
      password: DEFAULT_PASSWORD,
    });
    
    await adminDb.collection("users").doc(userRecord.uid).set({
      email,
      role: body.role,
    });

    return NextResponse.json({ success: true });
  } 
  catch (err: unknown) {
    console.error("CREATE USER ERROR:", err);

    let message = "Internal Server Error";

    if (err instanceof Error) {
      message = err.message;
  }

  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
}