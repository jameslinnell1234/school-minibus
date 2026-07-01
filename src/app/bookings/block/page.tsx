// src/app/bookings/block/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, getBookingsForDate } from "@/lib/firestore";
import { generateTimeSlots } from "../create/utils";
import { getAuth } from "firebase/auth";
import AuthGate from "@/components/AuthGate";

const hourOptions = [
  "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CreateRecurringBookingForm() {
  const router = useRouter();
  const [vanSize, setVanSize] = useState<"Heavy" | "Light">("Light");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  const [comment, setComment] = useState(""); // ← NEW

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  useEffect(() => {
    const fetchBookings = async () => {
      if (!startDate || !endDate || !vanSize) return;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateCursor = new Date(start);

      const slotsByDate: Record<string, string[]> = {};

      while (dateCursor <= end) {
        const bookings = await getBookingsForDate(dateCursor);
        const relevant = bookings.filter((b) => b.vanSize === vanSize);
        slotsByDate[dateCursor.toISOString().split("T")[0]] = relevant.flatMap(
          (b) => b.timeSlots
        );
        dateCursor.setDate(dateCursor.getDate() + 1);
      }

      setBookedSlots(slotsByDate);
    };

    fetchBookings();
  }, [startDate, endDate, vanSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in to create bookings.");
      return;
    }

    if (!vanSize || !startDate || !endDate || !startTime || !endTime || selectedDays.length === 0) {
      alert("Please fill out all fields and select at least one day of the week.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeSlots = generateTimeSlots(startTime, endTime);
    const emailPrefix = currentUser.email?.split("@")[0] ?? "";
    const initials = emailPrefix.toUpperCase();

    const dateCursor = new Date(start);
    let createdCount = 0;
    let skippedCount = 0;

    while (dateCursor <= end) {
      const dayName = daysOfWeek[dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1];
      if (!selectedDays.includes(dayName)) {
        dateCursor.setDate(dateCursor.getDate() + 1);
        continue;
      }

      const dateKey = dateCursor.toISOString().split("T")[0];
      const takenSlots = bookedSlots[dateKey] || [];

      const newHours = timeSlots.map((slot) => slot.split(" - ")[0]);
      const takenHours = new Set(takenSlots.map((slot) => slot.split(" - ")[0]));
      const hasClash = newHours.some((hour) => takenHours.has(hour));

      if (!hasClash) {
        const bookingData = {
          vanSize,
          date: new Date(dateCursor),
          userInitials: initials,
          timeSlots,
          userId: currentUser.uid,
          comment: comment.trim().slice(0, 15) || undefined, // ← NEW
        };

        try {
          await createBooking(bookingData);
          createdCount++;
        } catch (err) {
          console.error("Failed to create booking on", dateCursor, err);
        }
      } else {
        skippedCount++;
      }

      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    alert(`Created ${createdCount} bookings. Skipped ${skippedCount} due to conflicts.`);
    router.push("/bookings");
  };

  return (
    <AuthGate>
      <main className="max-w-md mx-auto p-2">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">Create Recurring Bookings</h1>
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
            <label className="block mb-1">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-1">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-2 w-full"
            />
          </div>

          {/* Days of the Week Selection */}
          <div>
            <div className="flex gap-4 flex-wrap">
              {daysOfWeek.map((day) => (
                <label key={day} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="w-4 h-4"
                  />
                  {day}
                </label>
              ))}
            </div>
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
              {hourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
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
              {hourOptions
                .slice(hourOptions.indexOf(startTime) + 1)
                .map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
            </select>
          </div>

          {/* NEW: Short comment for all generated bookings */}
          <div>
            <label className="block mb-1">Comment (max 15 chars):</label>
            <input
              type="text"
              value={comment}
              maxLength={15}
              onChange={(e) => setComment(e.target.value)}
              className="border p-2 w-full"
              placeholder="e.g. Weekly club"
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Submit Recurring Bookings
          </button>
        </form>
      </main>
    </AuthGate>
  );
}
