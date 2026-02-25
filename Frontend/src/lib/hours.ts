export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  const sign = value < 0 ? "-" : "";
  const totalMinutes = Math.round(Math.abs(value) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${sign}${minutes}min`;
  }

  if (minutes === 0) {
    return `${sign}${hours}h`;
  }

  return `${sign}${hours}h ${String(minutes).padStart(2, "0")}min`;
}
