"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, setPersistence, browserSessionPersistence, getAuth } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Optional: auto-logout after X minutes idle
function useIdleLogout(minutes = 30) {
  useEffect(() => {
    const ms = minutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // sign out quietly on idle
        signOut(getAuth()).catch(() => {});
      }, ms);
    };

    const events = ["mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Optional: make sessions end when the browser is closed
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {});
  }, []);

  useEffect(() => {
    const off = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/");
      }
      setChecking(false);
    });
    return () => off();
  }, [router]);

  // Enable idle auto-logout (set minutes to taste, or remove this line to disable)
  useIdleLogout(30);

  if (checking) {
    return (
      <main className="p-8">
        <p>Checking your sign-in…</p>
      </main>
    );
  }
  return <>{children}</>;
}
