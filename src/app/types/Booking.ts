// src/app/types/Booking.ts
import type { Timestamp } from "firebase/firestore";

export interface Booking {
  id: string;
  vanSize: "Light" | "Heavy";
  /** Always stored and retrieved from Firestore as a Timestamp */
  date: Timestamp;
  userInitials: string;
  timeSlots: string[]; // e.g., ["08:00 - 10:00", "10:00 - 12:00"]
  userId: string;
  createdAt?: Timestamp;
  comment?: string;          // ← NEW (optional)
}
