import { Resolution } from '../types'
import { HolidaySet, workdayEndTime, snapToNextWorkday, DAY_MS, midnightUTC, isWorkday } from './workdays'

export const RESOLUTION_CONFIG: Record<Resolution, { unitMs: number; pixelsPerUnit: number; label: string; tickFormat: (d: Date) => string }> = {
  hour: {
    unitMs: 60 * 60 * 1000,
    pixelsPerUnit: 80,
    label: 'Hour',
    tickFormat: (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  day: {
    unitMs: 24 * 60 * 60 * 1000,
    pixelsPerUnit: 120,
    label: 'Day',
    tickFormat: (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  },
  week: {
    unitMs: 7 * 24 * 60 * 60 * 1000,
    pixelsPerUnit: 200,
    label: 'Week',
    tickFormat: (d) => `W${getWeekNumber(d)} · ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
  },
}

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function msToPixels(ms: number, resolution: Resolution): number {
  const { unitMs, pixelsPerUnit } = RESOLUTION_CONFIG[resolution]
  return (ms / unitMs) * pixelsPerUnit
}

export function pixelsToMs(px: number, resolution: Resolution): number {
  const { unitMs, pixelsPerUnit } = RESOLUTION_CONFIG[resolution]
  return (px / pixelsPerUnit) * unitMs
}

export function snapToGrid(ms: number, resolution: Resolution, holidays?: HolidaySet): number {
  const { unitMs } = RESOLUTION_CONFIG[resolution]
  const snapped = Math.round(ms / unitMs) * unitMs
  // In day/week mode snap to next workday if on a weekend/holiday
  if ((resolution === 'day' || resolution === 'week') && holidays) {
    return snapToNextWorkday(snapped, holidays)
  }
  return snapped
}

export function snapFloor(ms: number, resolution: Resolution): number {
  const { unitMs } = RESOLUTION_CONFIG[resolution]
  return Math.floor(ms / unitMs) * unitMs
}

export function computeGridStart(tasks: { startTime: number }[], resolution: Resolution): number {
  const now = Date.now()
  const earliest = tasks.length > 0 ? Math.min(...tasks.map(t => t.startTime)) : now
  const ref = Math.min(earliest, now)
  const { unitMs } = RESOLUTION_CONFIG[resolution]
  return Math.floor(ref / unitMs) * unitMs - unitMs * 3
}

export function getGridWidth(resolution: Resolution): number {
  const counts: Record<Resolution, number> = { hour: 168, day: 90, week: 52 }
  const { pixelsPerUnit } = RESOLUTION_CONFIG[resolution]
  return counts[resolution] * pixelsPerUnit
}

export function generateTicks(gridStart: number, gridWidth: number, resolution: Resolution): number[] {
  const { unitMs, pixelsPerUnit } = RESOLUTION_CONFIG[resolution]
  const count = Math.ceil(gridWidth / pixelsPerUnit) + 1
  return Array.from({ length: count }, (_, i) => gridStart + i * unitMs)
}

/**
 * Task visual geometry — in day/week mode the right edge is computed
 * by counting workdays so weekends are skipped visually.
 */
export function taskGeometry(
  startTime: number,
  duration: number,
  gridStart: number,
  resolution: Resolution,
  holidays?: HolidaySet,
) {
  const left = msToPixels(startTime - gridStart, resolution)
  let width: number

  if ((resolution === 'day' || resolution === 'week') && holidays) {
    const durationDays = duration / (24 * 60)
    const endMs = workdayEndTime(startTime, durationDays, holidays)
    width = Math.max(msToPixels(RESOLUTION_CONFIG[resolution].unitMs, resolution), msToPixels(endMs - startTime, resolution))
    // Clamp width: walk day by day and sum only workday pixels
    let w = 0
    let d = midnightUTC(startTime)
    let workdaysLeft = durationDays
    while (workdaysLeft > 0) {
      if (isWorkday(d, holidays)) {
        w += msToPixels(DAY_MS, resolution)
        workdaysLeft--
      } else {
        // Weekend/holiday: still advance the pixel position
        w += msToPixels(DAY_MS, resolution)
      }
      d += DAY_MS
    }
    width = Math.max(msToPixels(RESOLUTION_CONFIG[resolution].unitMs, resolution), w)
  } else {
    width = Math.max(24, msToPixels(duration * 60 * 1000, resolution))
  }

  return { left, width }
}

export function pixelToTime(px: number, gridStart: number, resolution: Resolution): number {
  return snapToGrid(gridStart + pixelsToMs(px, resolution), resolution)
}

export function formatDate(ms: number, resolution: Resolution): string {
  return RESOLUTION_CONFIG[resolution].tickFormat(new Date(ms))
}

/** Get week number and whether it's odd/even — used for zebra striping */
export function getWeekParity(ms: number): { week: number; odd: boolean } {
  const week = getWeekNumber(new Date(ms))
  return { week, odd: week % 2 === 1 }
}
