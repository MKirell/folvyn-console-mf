import type { AnalyticsBreakdown } from '@/types/analytics'

export const OTHER_KEY = 'other'

export function foldOther(
  rows: readonly AnalyticsBreakdown[],
  limit: number,
): AnalyticsBreakdown[] {
  const ranked = [...rows].sort((a, b) => b.count - a.count)
  if (limit < 1 || ranked.length <= limit) return ranked

  const head = ranked.slice(0, limit - 1)
  const tail = ranked.slice(limit - 1)
  const rest = tail.reduce((sum, row) => sum + row.count, 0)

  return rest > 0 ? [...head, { key: OTHER_KEY, count: rest }] : head
}
