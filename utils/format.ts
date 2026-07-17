import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";

/** Human-friendly timestamp for message lists and notifications. */
export function formatSmartDate(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `'Yesterday' ${format(d, "HH:mm")}`;
  if (isThisWeek(d)) return format(d, "EEEE HH:mm");
  if (isThisYear(d)) return format(d, "MMM d, HH:mm");
  return format(d, "MMM d, yyyy");
}

/** Truncate a string with an ellipsis, keeping whole words when possible. */
export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

/** Strip markdown syntax for plain-text previews. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " [image] ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
