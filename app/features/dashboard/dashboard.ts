// Shared by the Home page (client) and stats.server.ts.
export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export function parseRange(value: string | null): RangeDays {
  const days = Number(value);
  return (RANGES as readonly number[]).includes(days)
    ? (days as RangeDays)
    : 30;
}
