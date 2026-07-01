import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

setGlobalOptions({maxInstances: 10});

admin.initializeApp();

type Role = "basic" | "superior" | "uber";

const allowedRoles: Role[] = ["basic", "superior", "uber"];

async function requireUber(uid?: string) {
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const snap = await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .get();

  if (!snap.exists || snap.data()?.role !== "uber") {
    throw new HttpsError(
      "permission-denied",
      "Uber access required."
    );
  }
}

export const allAuthUsers = onCall(async (request) => {
  await requireUber(request.auth?.uid);

  const list = await admin.auth().listUsers();

  return {
    users: list.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
    })),
  };
});

export const updateUserRole = onCall(async (request) => {
  await requireUber(request.auth?.uid);

  const {uid, role} = request.data;

  if (!uid || !allowedRoles.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid uid or role."
    );
  }

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .update({role});

  return {success: true};
});

export const syncUser = onCall(async (request) => {
  await requireUber(request.auth?.uid);

  const {uid, email} = request.data;

  if (!uid || !email) {
    throw new HttpsError(
      "invalid-argument",
      "uid and email are required."
    );
  }

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .set(
      {
        email: String(email).trim().toLowerCase(),
        role: "basic",
      },
      {merge: true}
    );

  return {success: true};
});

export const createUser = onCall(async (request) => {
  await requireUber(request.auth?.uid);

  const {email, role} = request.data;

  if (!email || typeof email !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Email is required."
    );
  }

  if (!allowedRoles.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid role."
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    await admin.auth().getUserByEmail(cleanEmail);

    throw new HttpsError(
      "already-exists",
      "User already exists."
    );
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as {code?: string}).code !== "auth/user-not-found"
    ) {
      throw err;
    }
  }

  const userRecord = await admin.auth().createUser({
    email: cleanEmail,
  });

  await admin.firestore().collection("users").doc(userRecord.uid).set({
    email: cleanEmail,
    role,
  });

  const resetLink = await admin.auth().generatePasswordResetLink(cleanEmail);

  return {
    success: true,
    uid: userRecord.uid,
    email: cleanEmail,
    resetLink,
  };
});

export const deleteBookings = onCall(async (request) => {
  const requesterUid = request.auth?.uid;

  if (!requesterUid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const {bookingIds} = request.data as {bookingIds?: string[]};

  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw new HttpsError("invalid-argument", "No bookings selected.");
  }

  if (bookingIds.length > 100) {
    throw new HttpsError(
      "invalid-argument",
      "You can delete a maximum of 100 bookings at once."
    );
  }

  const requesterDoc = await admin
    .firestore()
    .collection("users")
    .doc(requesterUid)
    .get();

  const requesterRole = requesterDoc.data()?.role;
  const isAdmin = requesterRole === "superior" || requesterRole === "uber";

  const refs = bookingIds.map((id) =>
    admin.firestore().collection("bookings").doc(id)
  );

  const snaps = await admin.firestore().getAll(...refs);

  const missingIds: string[] = [];
  const forbiddenIds: string[] = [];

  snaps.forEach((snap, index) => {
    const id = bookingIds[index];

    if (!snap.exists) {
      missingIds.push(id);
      return;
    }

    const booking = snap.data();

    if (!isAdmin && booking?.userId !== requesterUid) {
      forbiddenIds.push(id);
    }
  });

  if (missingIds.length > 0) {
    throw new HttpsError(
      "not-found",
      `Some bookings were not found: ${missingIds.join(", ")}`
    );
  }

  if (forbiddenIds.length > 0) {
    throw new HttpsError(
      "permission-denied",
      "You do not have permission to delete one or more selected bookings."
    );
  }

  const batch = admin.firestore().batch();

  refs.forEach((ref) => {
    batch.delete(ref);
  });

  await batch.commit();

  return {
    success: true,
    deleted: bookingIds.length,
  };
});