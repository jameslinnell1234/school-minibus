// src/app/bookings/create/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, getBookingsForDate } from "@/lib/firestore";
import { generateTimeSlots } from "./utils";
import { getAuth } from "firebase/auth";
import AuthGate from "@/components/AuthGate";

const hourOptions = [
    "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
  ];


export default function CreateBookingForm() {
  const router = useRouter();
  const [vanSize, setVanSize] = useState<"Heavy" | "Light">("Light");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [comment, setComment] = useState(""); // ← NEW

  useEffect(() => {
    const fetchBookings = async () => {
      if (!date || !vanSize) return;

      const selectedDate = new Date(date);
      const bookings = await getBookingsForDate(selectedDate);

      const relevant = bookings.filter((b) => b.vanSize === vanSize);
      const taken = relevant.flatMap((b) => b.timeSlots);
      setBookedSlots(taken);
    };
    fetchBookings();
  }, [date, vanSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to create a booking.");
      return;
    }

    if (!vanSize || !date || !startTime || !endTime) {
      alert("Please fill out all fields");
      return;
    }

    const timeSlots = generateTimeSlots(startTime, endTime);
    const newHours = timeSlots.map((slot) => slot.split(" - ")[0]);

    const selectedDate = new Date(date);
    const bookings = await getBookingsForDate(selectedDate);
    const relevant = bookings.filter((b) => b.vanSize === vanSize);
    const takenHours = new Set(
      relevant.flatMap((b) =>
        b.timeSlots.map((slot) => slot.split(" - ")[0])
      )
    );

    const hasClash = newHours.some((hour) => takenHours.has(hour));
    if (hasClash) {
      alert(
        "This time slot overlaps with an existing booking. Please choose a different time."
      );
      return;
    }

    const emailPrefix = currentUser.email?.split("@")[0] ?? "";
    const initials = emailPrefix.toUpperCase();

    const newBooking = {
      vanSize,
      date: selectedDate, // Pass JS Date — createBooking will handle Timestamp
      userInitials: initials,
      timeSlots,
      userId: currentUser.uid,
      comment: comment.trim().slice(0, 15) || undefined, // ← NEW
    };

    try {
      await createBooking(newBooking);
      alert("Booking created!");
      router.push("/bookings");
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking.");
    }
  };

  const getAvailableEndTimes = () => {
    if (!startTime) return [];

    const startIndex = hourOptions.indexOf(startTime);
    if (startIndex === -1) return [];

    const blockedHours = new Set(
      bookedSlots.flatMap((slot) => {
        const [start, end] = slot.split(" - ");
        const startIdx = hourOptions.indexOf(start);
        const endIdx = hourOptions.indexOf(end);
        return hourOptions.slice(startIdx, endIdx);
      })
    );

    const availableEndTimes: string[] = [];
    for (let i = startIndex + 1; i < hourOptions.length; i++) {
      const range = hourOptions.slice(startIndex, i);
      const hasConflict = range.some((hour) => blockedHours.has(hour));
      if (hasConflict) break;
      availableEndTimes.push(hourOptions[i]);
    }

    return availableEndTimes;
  };

  return (
    <AuthGate>
      <main className="max-w-md mx-auto p-2">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">Create Booking</h1>
          <button
            onClick={() => router.push("/bookings")}
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 whitespace-nowrap"
          >
            Calendar View 
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block mb-1">Van Size:</label>
            <select
              value={vanSize}
              onChange={(e) => setVanSize(e.target.value as "Light" | "Heavy")}
              className="border p-2 w-full"
            >
              <option value="Light">Light</option>
              <option value="Heavy">Heavy</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Start Time:</label>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setEndTime("");
              }}
              className="border p-2 w-full"
            >
              <option value="">Select...</option>
              {hourOptions.map((hour) => {
                const isBooked = bookedSlots.some((slot) =>
                  slot.startsWith(hour)
                );
                return (
                  <option
                    key={hour}
                    value={hour}
                    disabled={isBooked}
                    className={isBooked ? "text-red-500" : ""}
                  >
                    {hour} {isBooked ? "(Booked)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block mb-1">End Time:</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border p-2 w-full"
            >
              <option value="">Select...</option>
              {getAvailableEndTimes().map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </div>

          {/* NEW comment input */}
          <div>
            <label className="block mb-1">Comment (max 15 chars):</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={15}
              className="border p-2 w-full"
              placeholder="e.g. DofE Expedition"
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Submit Booking
          </button>
        </form>
      </main>
    </AuthGate>
  );
}
