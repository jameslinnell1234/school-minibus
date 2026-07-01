"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

type Role = "basic" | "superior" | "uber";

type UserProfile = {
  id: string;
  email: string;
  role: Role;
};

type AuthUser = {
  uid: string;
  email: string;
};

type AuthUsersResponse = {
  users: AuthUser[];
};

export default function UserSettingsPage() {
  const [firestoreUsers, setFirestoreUsers] = useState<UserProfile[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("basic");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------- AUTH ----------------
  useEffect(() => {
  const auth = getAuth();

  const unsub = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);

    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));

    setCurrentUserRole(
      (userDoc.data()?.role as Role) ?? "basic"
    );
  });

  return () => unsub();
}, []);

  // ---------------- TOKEN SAFE ----------------
 

  // ---------------- FETCH AUTH USERS ----------------
 const fetchAuthUsers = useCallback(async () => {
  const allAuthUsers = httpsCallable<undefined, AuthUsersResponse>(
    functions,
    "allAuthUsers"
  );

  const result = await allAuthUsers(undefined);

  return result.data.users;
}, []);

  // ---------------- LOAD FIRESTORE USERS ----------------
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "users"));

      setFirestoreUsers(
        snap.docs.map((d) => ({
          id: d.id,
          email: String(d.data().email ?? ""),
          role: (d.data().role as Role) ?? "basic",
        }))
      );
    })();
  }, []);

  // ---------------- LOAD AUTH USERS ----------------
  useEffect(() => {
    (async () => {
      try {
        if (!currentUser || currentUserRole !== "uber") return;
        const users = await fetchAuthUsers();
        setAuthUsers(users);
      } catch (err) {
        console.error("AUTH USERS ERROR:", err);
      }
    })();
  }, [currentUser, fetchAuthUsers, currentUserRole]);

  // ---------------- ROLE UPDATE ----------------
  const handleRoleChange = async (uid: string, role: Role) => {
  try {
    setError(null);
    setMessage(null);

    const updateUserRole = httpsCallable(functions, "updateUserRole");

    await updateUserRole({ uid, role });

    setFirestoreUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, role } : u))
    );

    setMessage("Role updated");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to update role");
  }
};

  // ---------------- SYNC USER ----------------
  const syncUser = async (uid: string, email: string) => {
  try {
    setError(null);
    setMessage(null);

    const syncUserFunction = httpsCallable(functions, "syncUser");

    await syncUserFunction({ uid, email });

    setFirestoreUsers((p) => [...p, { id: uid, email, role: "basic" }]);

    setMessage("User synced");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to sync user");
  }
};

  // ---------------- CREATE USER ----------------
// ---------------- CREATE USER ----------------
const createUser = async () => {
  setError(null);
  setMessage(null);

  if (!newEmail) {
    setError("Email required");
    return;
  }

  try {
    setCreating(true);

    const createUserFunction = httpsCallable<
      { email: string; role: Role },
      { success: boolean; uid: string; email: string; resetLink: string }
    >(functions, "createUser");

    const result = await createUserFunction({
      email: newEmail.trim().toLowerCase(),
      role: newRole,
    });

    setMessage(`User created. Password reset link: ${result.data.resetLink}`);

    setNewEmail("");
    setNewRole("basic");

    const snap = await getDocs(collection(db, "users"));

    setFirestoreUsers(
      snap.docs.map((d) => ({
        id: d.id,
        email: String(d.data().email ?? ""),
        role: (d.data().role as Role) ?? "basic",
      }))
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : "Error creating user");
  } finally {
    setCreating(false);
  }
};

  const accessDenied =
    currentUserRole !== null && currentUserRole !== "uber";

  const unsynced = authUsers.filter(
    (a) => !firestoreUsers.some((f) => f.id === a.uid)
  );

  return (
  <AuthGate>
    {accessDenied ? (
      <main className="max-w-2xl mx-auto p-4 text-center">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="mt-2 text-gray-600">
          Only admin users can manage access settings.
        </p>
        <Link href="/bookings">
          <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            Back to Calendar
          </button>
        </Link>
      </main>
    ) : (
      <main className="space-y-8 max-w-4xl mx-auto p-4">

        {/* Header */}
        <div className="flex justify-between items-start">
          <h1 className="text-2xl font-bold">User Access Settings</h1>

          <Link href="/bookings">
            <button className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 whitespace-nowrap">
              Calendar View
            </button>
          </Link>
        </div>

        {/* CREATE USER */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Add User</h2>

          <div className="border rounded p-4 bg-gray-50 space-y-3">
            <input
              type="email"
              placeholder="Enter email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="basic">Basic</option>
              <option value="superior">Superior</option>
              <option value="uber">Uber</option>
            </select>

            {error && (
              <div className="text-red-700 text-sm">{error}</div>
            )}

            {message && (
              <div className="text-green-700 text-sm">{message}</div>
            )}

            <button
              onClick={createUser}
              disabled={creating}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Add User"}
            </button>
          </div>
        </section>

        {/* USERS */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Synced Users</h2>

          <div className="grid gap-4">
            {firestoreUsers.map((user) => (
              <div
                key={user.id}
                className="border rounded p-4 space-y-2 bg-gray-50"
              >
                <div className="font-semibold text-lg">
                  {user.email}
                </div>

                <select
                  value={user.role}
                  onChange={(e) =>
                    handleRoleChange(user.id, e.target.value as Role)
                  }
                  className="border rounded px-2 py-1"
                >
                  <option value="basic">basic</option>
                  <option value="superior">superior</option>
                  <option value="uber">uber</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* UNSYNCED */}
        {unsynced.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2 text-red-700">
              Unsynced Users
            </h2>

            <div className="grid gap-4">
              {unsynced.map((user) => (
                <div
                  key={user.uid}
                  className="border p-4 rounded bg-red-50 space-y-2"
                >
                  <div className="font-medium">{user.email}</div>

                  <button
                    className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    onClick={() =>
                      syncUser(user.uid, user.email)
                    }
                  >
                    Sync to Firestore
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    )}
  </AuthGate>
);
}