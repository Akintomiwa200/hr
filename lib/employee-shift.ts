export function parseEmployeeShiftFields(body: {
  isShiftWorker?: boolean;
  shiftStartTime?: string;
}) {
  const isShiftWorker = Boolean(body.isShiftWorker);
  if (!isShiftWorker) {
    return {
      isShiftWorker: false,
      shiftStartHour: null as number | null,
      shiftStartMinute: null as number | null,
    };
  }
  const [hourRaw, minuteRaw] = String(body.shiftStartTime || "09:00").split(":");
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);
  return {
    isShiftWorker: true,
    shiftStartHour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 9,
    shiftStartMinute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}
