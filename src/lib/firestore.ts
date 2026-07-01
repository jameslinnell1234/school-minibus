// src/lib/firestore.ts
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import type { Booking } from "@/app/types/Booking";

/** Clamp and tidy comment (max 15 chars) */
function sanitizeComment(input?: string) {
  if (!input) return undefined;
  const trimmed = input.trim().slice(0, 15);
  return trimmed.length ? trimmed : undefined;
}

/**
 * Create a booking in Firestore.
 * Converts JS Date to Firestore Timestamp.
 * Supports optional `comment` (max 15 chars).
 */
export async function createBooking(
  bookingData: Omit<Booking, "id" | "date"> & { date: Date; comment?: string }
): Promise<string> {
  const bookingsRef = collection(db, "bookings");

  const newBooking = {
    ...bookingData,
    comment: sanitizeComment(bookingData.comment), // ← NEW
    date: Timestamp.fromDate(bookingData.date),
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(bookingsRef, newBooking);
  return docRef.id;
}

/**
 * Get bookings for a single date.
 * Always returns `date` as a Firestore Timestamp.
 */
export async function getBookingsForDate(date: Date): Promise<Booking[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookingsRef = collection(db, "bookings");

  const q = query(
    bookingsRef,
    where("date", ">=", Timestamp.fromDate(startOfDay)),
    where("date", "<=", Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      vanSize: data.vanSize,
      date: data.date as Timestamp,
      userInitials: data.userInitials,
      timeSlots: data.timeSlots,
      userId: data.userId,
      createdAt: data.createdAt,
      comment: data.comment ?? undefined, // ← already included
    } satisfies Booking;
  });
}

/**
 * Get bookings for a range of months (used in calendar).
 */
export async function getBookingsForMonthRange(
  start: Date,
  end: Date
): Promise<Booking[]> {
  const bookingsRef = collection(db, "bookings");

  const q = query(
    bookingsRef,
    where("date", ">=", Timestamp.fromDate(start)),
    where("date", "<=", Timestamp.fromDate(end))
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      vanSize: data.vanSize,
      date: data.date as Timestamp,
      userInitials: data.userInitials,
      timeSlots: data.timeSlots,
      userId: data.userId,
      createdAt: data.createdAt,
      comment: data.comment ?? undefined, // ← already included
    } satisfies Booking;
  });
}

/**
 * Delete a booking by its document ID.
 */
export async function deleteBooking(id: string) {
  const bookingRef = doc(db, "bookings", id);
  await deleteDoc(bookingRef);
}
