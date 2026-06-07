/** ISO → "9:38 pm" or "21:38" */
export function clockTime(iso: string, use12: boolean): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: use12,
  });
}

/**
 * ISO → smart label:
 *   same day  → "Today · 9:38 pm"
 *   yesterday → "Yesterday · 9:38 pm"
 *   older     → "Mon, 2 Jun · 9:38 pm"
 */
export function smartTime(iso: string, use12: boolean): string {
  const d = new Date(iso);
  const now = new Date();
  const time = clockTime(iso, use12);

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return `Today · ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday · ${time}`;

  const label = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${label} · ${time}`;
}
