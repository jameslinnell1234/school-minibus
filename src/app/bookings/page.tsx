// src/app/bookings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "@/components/Calendar";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";

export default function BookingsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setCurrentUserId(null);
          setCurrentUserRole(null);
          router.replace("/");
          return;
        }

        const uid = user.uid;
        setCurrentUserId(uid);

        const userDocRef = doc(db, "users", uid);
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          await setDoc(
            userDocRef,
            { email: user.email, role: "basic" },
            { merge: true }
          );
          setCurrentUserRole("basic");
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCurrentUserRole((snap.data() as any).role ?? "basic");
        }
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCreateBooking = () => router.push("/bookings/create");
  const handleRecurringBooking = () => router.push("/bookings/block");
  const handleManageUsers = () => router.push("/settings");

  if (checkingAuth) {
    return (
      <main className="p-8">
        <p>Checking your sign-in…</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Calendar View</h1>
        {currentUserRole && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCreateBooking}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Booking
            </button>

            {["superior", "uber"].includes(currentUserRole) && (
              <button
                onClick={handleRecurringBooking}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Create Recurring Booking
              </button>
            )}

            {currentUserRole === "uber" && (
              <button
                onClick={handleManageUsers}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Manage Users
              </button>
            )}

            <button
              onClick={() => signOut(auth)}
              className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <Calendar currentUserId={currentUserId} currentUserRole={currentUserRole} />
    </main>
  );
}
