// src/app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Error sending reset email");
      } else {
        setError("Error sending reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto p-4 space-y-4">
      {/* Back to login */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-blue-500 text-sm hover:underline"
      >
        ← Back to Login
      </button>

      <h1 className="text-xl font-semibold">Reset Your Password</h1>

      <form onSubmit={handlePasswordReset} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full border p-2"
          required
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </main>
  );
}
