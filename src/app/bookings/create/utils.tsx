export function generateTimeSlots(start: string, end: string): string[] {
  const hourOptions = [
    "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  const startIndex = hourOptions.indexOf(start);
  const endIndex = hourOptions.indexOf(end);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) return [];

  const slots: string[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    slots.push(`${hourOptions[i]} - ${hourOptions[i + 1]}`);
  }

  return slots;
}