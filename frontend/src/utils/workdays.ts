// All times are Unix timestamps in ms. A "day" = 24h midnight-to-midnight UTC.

export type HolidaySet = Set<string>  // "YYYY-MM-DD"

function toDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function midnightUTC(ms: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function isWeekend(ms: number): boolean {
  const day = new Date(midnightUTC(ms)).getUTCDay()
  return day === 0 || day === 6
}

export function isHoliday(ms: number, holidays: HolidaySet): boolean {
  return holidays.has(toDateStr(ms))
}

export function isWorkday(ms: number, holidays: HolidaySet): boolean {
  return !isWeekend(ms) && !isHoliday(ms, holidays)
}

export const DAY_MS = 24 * 60 * 60 * 1000

/** Snap to midnight of same day if workday, otherwise forward to next workday */
export function snapToNextWorkday(ms: number, holidays: HolidaySet): number {
  let d = midnightUTC(ms)
  while (!isWorkday(d, holidays)) d += DAY_MS
  return d
}

/** Add N workdays to startMs. Returns midnight UTC of the result day. */
export function addWorkdays(startMs: number, days: number, holidays: HolidaySet): number {
  let d = midnightUTC(startMs)
  let remaining = days
  while (remaining > 0) {
    d += DAY_MS
    if (isWorkday(d, holidays)) remaining--
  }
  return d
}

/**
 * Compute the visual end timestamp of a task for rendering.
 * durationDays = task.duration / (24*60)
 */
export function workdayEndTime(startMs: number, durationDays: number, holidays: HolidaySet): number {
  return addWorkdays(midnightUTC(startMs), durationDays, holidays)
}

/** How many workdays fit between two timestamps (start inclusive, end exclusive) */
export function getWorkdaysBetween(startMs: number, endMs: number, holidays: HolidaySet): number {
  let d = midnightUTC(startMs)
  const end = midnightUTC(endMs)
  let count = 0
  while (d < end) {
    if (isWorkday(d, holidays)) count++
    d += DAY_MS
  }
  return count
}

/** Fetch public holidays from Nager.Date for given years and country */
export async function fetchHolidays(years: number[], countryCode = 'SE'): Promise<HolidaySet> {
  const set: HolidaySet = new Set()
  await Promise.all(years.map(async year => {
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`)
      if (!res.ok) return
      const data: Array<{ date: string }> = await res.json()
      data.forEach(h => set.add(h.date))
    } catch { /* silently ignore */ }
  }))
  return set
}

export interface TaskSegment {
  leftMs: number    // offset from gridStart in ms
  widthMs: number   // width in ms
  isGap: boolean    // true = weekend/holiday gap
}

/**
 * Break a task into visual segments — alternating workday blocks and weekend/holiday gaps.
 * Returns segments in order from left to right.
 */
export function buildTaskSegments(
  startMs: number,
  durationDays: number,
  holidays: HolidaySet,
  gridStart: number,
): TaskSegment[] {
  const segments: TaskSegment[] = []
  let d = midnightUTC(startMs)
  let workdaysLeft = durationDays
  let segStart = d

  while (workdaysLeft > 0) {
    if (isWorkday(d, holidays)) {
      const nextD = d + DAY_MS
      workdaysLeft--
      if (workdaysLeft === 0) {
        // Last workday — close segment
        segments.push({ leftMs: segStart - gridStart, widthMs: d + DAY_MS - segStart, isGap: false })
        break
      }
      if (!isWorkday(nextD, holidays)) {
        // Next day is a gap — close current workday segment
        segments.push({ leftMs: segStart - gridStart, widthMs: d + DAY_MS - segStart, isGap: false })
        // Find end of gap
        const gapStart = nextD
        let gapD = nextD
        while (!isWorkday(gapD, holidays)) gapD += DAY_MS
        segments.push({ leftMs: gapStart - gridStart, widthMs: gapD - gapStart, isGap: true })
        segStart = gapD
        d = gapD
        continue
      }
    }
    d += DAY_MS
  }

  return segments.length > 0
    ? segments
    : [{ leftMs: startMs - gridStart, widthMs: DAY_MS, isGap: false }]
}