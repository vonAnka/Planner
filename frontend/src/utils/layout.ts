import { Task } from '../types'
import { HolidaySet, snapToNextWorkday, addWorkdays, DAY_MS, midnightUTC } from './workdays'
import { Resolution } from '../types'

export const ROW_HEIGHT = 52
export const SWIMLANE_PADDING = 12
export const MIN_SWIMLANE_HEIGHT = ROW_HEIGHT + SWIMLANE_PADDING * 2
export const MEMBER_COLUMN_WIDTH = 200
export const HEADER_HEIGHT = 56

export function computeLaneRows(tasks: Task[]): Map<string, number> {
  const sorted = [...tasks].sort((a, b) => {
    if (a.laneRow !== b.laneRow) return a.laneRow - b.laneRow
    return a.startTime - b.startTime
  })
  const rowEndTimes: number[] = []
  const result = new Map<string, number>()
  for (const task of sorted) {
    const taskEnd = task.startTime + task.duration * 60 * 1000
    let placed = false
    for (let row = 0; row < rowEndTimes.length; row++) {
      if (task.startTime >= rowEndTimes[row]) {
        result.set(task.id, row)
        rowEndTimes[row] = taskEnd
        placed = true
        break
      }
    }
    if (!placed) {
      result.set(task.id, rowEndTimes.length)
      rowEndTimes.push(taskEnd)
    }
  }
  return result
}

export function swimlaneHeight(tasks: Task[]): number {
  if (tasks.length === 0) return MIN_SWIMLANE_HEIGHT
  const rows = computeLaneRows(tasks)
  const maxRow = Math.max(0, ...Array.from(rows.values()))
  return (maxRow + 1) * ROW_HEIGHT + SWIMLANE_PADDING * 2
}

export function getHardStop(taskId: string, allTasks: Task[]): number {
  const task = allTasks.find(t => t.id === taskId)
  if (!task || task.parents.length === 0) return -Infinity
  const parentEndTimes = task.parents.map(dep => {
    const parent = allTasks.find(t => t.id === dep.fromTaskId)
    if (!parent) return -Infinity
    return parent.startTime + parent.duration * 60 * 1000
  })
  return Math.max(...parentEndTimes)
}

/**
 * Cascade children when parent moves.
 * In day/week mode: child snaps to next workday after parent ends.
 * In hour mode: child moves to exact parent end.
 */
export function cascadeChildren(
  movedTaskId: string,
  newStartTime: number,
  allTasks: Task[],
  resolution?: Resolution,
  holidays?: HolidaySet,
): Map<string, number> {
  const updates = new Map<string, number>()
  const movedTask = allTasks.find(t => t.id === movedTaskId)
  if (!movedTask) return updates
  const visited = new Set<string>()
  const useWorkdays = (resolution === 'day' || resolution === 'week') && holidays

  function getEffectiveEnd(taskId: string, taskStart: number, taskDuration: number): number {
    if (useWorkdays && holidays) {
      const durationDays = taskDuration / (24 * 60)
      return addWorkdays(midnightUTC(taskStart), durationDays, holidays)
    }
    return taskStart + taskDuration * 60 * 1000
  }

  function visit(taskId: string, taskStart: number, taskDuration: number) {
    if (visited.has(taskId)) return
    visited.add(taskId)
    const task = allTasks.find(t => t.id === taskId)
    if (!task) return
    const parentEnd = getEffectiveEnd(taskId, taskStart, taskDuration)
    for (const dep of task.children) {
      const child = allTasks.find(t => t.id === dep.toTaskId)
      if (!child) continue
      const childStart = updates.has(child.id) ? updates.get(child.id)! : child.startTime
      if (parentEnd > childStart) {
        const newChildStart = useWorkdays && holidays
          ? snapToNextWorkday(parentEnd, holidays)
          : parentEnd
        updates.set(child.id, newChildStart)
        visit(child.id, newChildStart, child.duration)
      } else {
        visit(child.id, childStart, child.duration)
      }
    }
  }

  visit(movedTaskId, newStartTime, movedTask.duration)
  return updates
}

export function compactLaneRows(tasks: Task[]): Map<string, number> {
  if (tasks.length === 0) return new Map()
  const usedRows = [...new Set(tasks.map(t => t.laneRow))].sort((a, b) => a - b)
  const rowRemap = new Map<number, number>()
  usedRows.forEach((oldRow, idx) => rowRemap.set(oldRow, idx))
  const updates = new Map<string, number>()
  for (const task of tasks) {
    const newRow = rowRemap.get(task.laneRow) ?? task.laneRow
    if (newRow !== task.laneRow) updates.set(task.id, newRow)
  }
  return updates
}
