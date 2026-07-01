// src/app/page.tsx
"use client";

import LoginForm from "@/components/LoginForm";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setChecked(true);
    });
    return () => off();
  }, []);

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-sm p-6 bg-white shadow-md rounded space-y-4">
        <h1 className="text-3xl font-bold text-center">EduGo</h1>

        {/* If already signed in, show a button instead of auto-redirecting */}
        {checked && authed ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              You’re already signed in.
            </p>
            <button
              onClick={() => router.push("/bookings")}
              className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
            >
              Go to Bookings
            </button>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
