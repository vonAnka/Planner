export type HolidaySet = Set<string>

export function midnightUTC(ms: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function isWeekend(ms: number): boolean {
  const day = new Date(midnightUTC(ms)).getUTCDay()
  return day === 0 || day === 6
}

export function isHoliday(ms: number, holidays: HolidaySet): boolean {
  return holidays.has(new Date(ms).toISOString().slice(0, 10))
}

export function isWorkday(ms: number, holidays: HolidaySet): boolean {
  return !isWeekend(ms) && !isHoliday(ms, holidays)
}

export const DAY_MS = 24 * 60 * 60 * 1000

export function snapToNextWorkday(ms: number, holidays: HolidaySet): number {
  let d = midnightUTC(ms)
  while (!isWorkday(d, holidays)) d += DAY_MS
  return d
}

export function addWorkdays(startMs: number, days: number, holidays: HolidaySet): number {
  let d = midnightUTC(startMs)
  let remaining = days
  while (remaining > 0) {
    d += DAY_MS
    if (isWorkday(d, holidays)) remaining--
  }
  return d
}

export function workdayEndTime(startMs: number, durationDays: number, holidays: HolidaySet): number {
  return addWorkdays(midnightUTC(startMs), durationDays, holidays)
}

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
