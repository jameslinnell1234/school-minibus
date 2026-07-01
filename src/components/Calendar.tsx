// src/components/Calendar.tsx
"use client";

import { useEffect, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfDay,
} from "date-fns";
import { getBookingsForMonthRange, deleteBooking } from "@/lib/firestore";
import type { Booking } from "@/app/types/Booking";
import { Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const COLORS: Record<string, string> = {
  Heavy: "bg-blue-200",
  Light: "bg-green-200",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTimeTo12Hour(time: string) {
  if (!time) return "";
  const [hourStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  return `${hour}${ampm}`;
}

export default function Calendar({
  currentUserId,
  currentUserRole,
}: {
  currentUserId: string | null;
  currentUserRole: string | null;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [manageMode, setManageMode] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(addMonths(currentMonth, 2));
      const data = await getBookingsForMonthRange(start, end);
      setBookings(data);
    };

    fetchBookings();
  }, [currentMonth]);

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this booking?");
    if (!confirmDelete) return;

    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete booking:", error);
      alert("Delete failed. You may not have permission to delete this booking.");
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedBookingIds.length === 0) {
      alert("No bookings selected.");
      return;
    }

    const confirmed = confirm(`Delete ${selectedBookingIds.length} booking(s)?`);
    if (!confirmed) return;

    try {
      setDeletingSelected(true);

      const deleteBookings = httpsCallable(functions, "deleteBookings");

      await deleteBookings({
        bookingIds: selectedBookingIds,
      });

      setBookings((prev) =>
        prev.filter((b) => b.id && !selectedBookingIds.includes(b.id))
      );

      setSelectedBookingIds([]);
      setManageMode(false);

      alert("Bookings deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete bookings.");
    } finally {
      setDeletingSelected(false);
    }
  };

  const groupedBookings = bookings.reduce<Record<string, Booking[]>>(
    (acc, booking) => {
      const dateKey = format(
        (booking.date as unknown as Timestamp).toDate(),
        "yyyy-MM-dd"
      );

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(booking);

      return acc;
    },
    {}
  );

  const monFirstIndex = (jsDay: number) => (jsDay + 6) % 7;

  return (
    <div className="space-y-8">
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 3))}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          -3 Months
        </button>

        <button
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 3))}
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          +3 Months
        </button>

        {!manageMode ? (
          <button
            onClick={() => setManageMode(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Manage Bookings
          </button>
        ) : (
          <>
            <button
              onClick={handleBulkDelete}
              disabled={deletingSelected}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deletingSelected ? "Deleting..." : "Delete Selected"}
            </button>

            <button
              onClick={() => {
                setManageMode(false);
                setSelectedBookingIds([]);
              }}
              className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
        <strong>Booking Notes:</strong>
        <ul className="list-disc ml-5 mt-1">
          <li>PE have block-booked most slots for the year in advance.</li>
          <li>If you wish to book a mini-bus, but it already has a PE booking, please contact JAW to see if it is available.</li>
          
        </ul>
      </div>

      {[0, 1, 2].map((offset) => {
        const monthStart = startOfMonth(addMonths(currentMonth, offset));
        const monthEnd = endOfMonth(monthStart);
        const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const leadingPads = monFirstIndex(monthStart.getDay());

        return (
          <div key={offset}>
            <h2 className="text-xl font-bold mb-4">
              {format(monthStart, "MMMM yyyy")}
            </h2>

            <div className="grid grid-cols-7 gap-4 text-center font-medium text-gray-700 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: leadingPads }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {monthDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayBookings = groupedBookings[dateStr] || [];
                const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
                const isPast = day < startOfDay(new Date());

                return (
                  <div
                    key={dateStr}
                    className={`border p-2 rounded min-h-[100px] ${
                      isToday ? "bg-yellow-100 border-yellow-400" : ""
                    } ${isPast ? "opacity-25" : ""}`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {format(day, "dd MMM")}
                    </div>

                    <div className="space-y-1">
                      {[...dayBookings]
                        .sort((a, b) => {
                          const aStart = a.timeSlots[0]?.split(" - ")[0] || "00:00";
                          const bStart = b.timeSlots[0]?.split(" - ")[0] || "00:00";
                          return aStart.localeCompare(bStart);
                        })
                        .map((booking) => {
                          const isMine = booking.userId === currentUserId;
                          const canBulkSelect =
                            isMine ||
                            currentUserRole === "superior" ||
                            currentUserRole === "uber";

                          return (
                            <div
                              key={booking.id}
                              className={`flex justify-between items-start text-sm px-2 py-1 rounded ${
                                COLORS[booking.vanSize]
                              } ${isMine ? "border border-black shadow-sm" : ""}`}
                            >
                              <div>
                                {booking.vanSize.charAt(0).toUpperCase() +
                                  booking.vanSize.slice(1)}{" "}
                                – {booking.userInitials}

                                <div className="text-xs text-gray-700">
                                  {Array.isArray(booking.timeSlots) &&
                                  booking.timeSlots.length > 0
                                    ? (() => {
                                        const firstSlot = booking.timeSlots[0];
                                        const lastSlot =
                                          booking.timeSlots[
                                            booking.timeSlots.length - 1
                                          ];
                                        const startTime = firstSlot.split(" - ")[0];
                                        const endTime = lastSlot.split(" - ")[1];

                                        return `${formatTimeTo12Hour(
                                          startTime
                                        )} - ${formatTimeTo12Hour(endTime)}`;
                                      })()
                                    : ""}
                                </div>

                                {booking.comment && (
                                  <div className="text-xs text-gray-600 italic">
                                    {booking.comment}
                                  </div>
                                )}
                              </div>

                              <div className="ml-2">
                                {manageMode && booking.id && canBulkSelect && (
                                  <input
                                    type="checkbox"
                                    checked={selectedBookingIds.includes(booking.id)}
                                    onChange={() => toggleSelected(booking.id)}
                                  />
                                )}

                                {isMine && !manageMode && booking.id && (
                                  <button
                                    onClick={() => handleDelete(booking.id)}
                                    className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
                                    aria-label="Delete booking"
                                    type="button"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}