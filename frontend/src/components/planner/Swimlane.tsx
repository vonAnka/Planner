import { useCallback } from 'react'
import { TeamMember, Task } from '../../types'
import { useStore } from '../../store/projectStore'
import { computeLaneRows, swimlaneHeight, ROW_HEIGHT, SWIMLANE_PADDING } from '../../utils/layout'
import { getGridWidth, msToPixels, RESOLUTION_CONFIG, generateTicks } from '../../utils/time'
import { isWeekend, isHoliday, DAY_MS, midnightUTC } from '../../utils/workdays'
import { getWeekNumber } from '../../utils/time'
import TaskBox from './TaskBox'

interface Props {
  member: TeamMember
  tasks: Task[]
  onContextMenu: (e: React.MouseEvent, memberId: string) => void
}

export default function Swimlane({ member, tasks, onContextMenu }: Props) {
  const { resolution, gridStart, drag, depDrawing, cancelDepDrawing, hideContextMenu, holidays } = useStore()
  const gridWidth = getGridWidth(resolution)
  const { pixelsPerUnit, unitMs } = RESOLUTION_CONFIG[resolution]

  const isGhostHere = drag && drag.ghostMemberId === member.id
  const draggedTask = drag ? useStore.getState().project?.tasks.find(t => t.id === drag.taskId) : null

  const layoutTasks = drag ? tasks.filter(t => t.id !== drag.taskId) : tasks
  const laneRows = computeLaneRows(layoutTasks)

  const ghostForHeight = isGhostHere && drag.dropValid && draggedTask
    ? [{ ...draggedTask, id: '__ghost__', laneRow: drag.ghostRow } as Task]
    : []
  const height = swimlaneHeight([...layoutTasks, ...ghostForHeight])

  // Generate day-level ticks for weekend/holiday shading (only in day/week mode)
  const showWorkdayShading = resolution === 'day' || resolution === 'week'
  const dayMs = DAY_MS

  // Build list of all days in visible range for shading
  const shadingDays: Array<{ x: number; width: number; type: 'weekend' | 'holiday' | 'weekEven' | 'weekOdd' }> = []
  if (showWorkdayShading) {
    const gridEnd = gridStart + gridWidth / pixelsPerUnit * unitMs
    let d = midnightUTC(gridStart)
    while (d < gridEnd) {
      const x = msToPixels(d - gridStart, resolution)
      const w = msToPixels(dayMs, resolution)
      if (isHoliday(d, holidays)) {
        shadingDays.push({ x, width: w, type: 'holiday' })
      } else if (isWeekend(d)) {
        shadingDays.push({ x, width: w, type: 'weekend' })
      } else {
        const week = getWeekNumber(new Date(d))
        shadingDays.push({ x, width: w, type: week % 2 === 0 ? 'weekEven' : 'weekOdd' })
      }
      d += dayMs
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    onContextMenu(e, member.id)
  }, [member.id, onContextMenu])

  const handleClick = useCallback(() => {
    if (depDrawing) cancelDepDrawing()
    hideContextMenu()
  }, [depDrawing])

  const ghostLeft  = draggedTask ? msToPixels(drag!.ghostStartTime - gridStart, resolution) : 0
  const ghostWidth = draggedTask ? Math.max(24, msToPixels(draggedTask.duration * 60 * 1000, resolution)) : 0
  const ghostTop   = SWIMLANE_PADDING + (isGhostHere ? drag!.ghostRow : 0) * ROW_HEIGHT + 4
  const ghostH     = ROW_HEIGHT - 8

  return (
    <div
      className="relative border-b border-border transition-all duration-150 overflow-hidden"
      style={{ width: gridWidth, height }}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      data-member-id={member.id}
    >
      {/* Workday shading — weekends red, zebra weeks */}
      {showWorkdayShading && shadingDays.map((day, i) => {
        let bg = 'transparent'
        if (day.type === 'weekend')   bg = 'rgba(220,38,38,0.07)'
        else if (day.type === 'holiday') bg = 'rgba(220,38,38,0.12)'
        else if (day.type === 'weekEven') bg = 'rgba(0,0,0,0.0)'
        else bg = 'rgba(0,0,0,0.03)'
        return (
          <div key={i} className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: day.x, width: day.width, background: bg }} />
        )
      })}

      {/* Vertical grid lines */}
      {generateTicks(gridStart, gridWidth, resolution).map(tick => (
        <div key={tick} className="absolute top-0 bottom-0 w-px pointer-events-none"
          style={{ left: msToPixels(tick - gridStart, resolution), background: 'rgba(180,188,200,0.4)' }} />
      ))}

      {/* Member color tint */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: member.color + '0A' }} />

      {layoutTasks.map(task => (
        <TaskBox key={task.id} task={task} row={laneRows.get(task.id) ?? 0} />
      ))}

      {/* Ghost */}
      {isGhostHere && drag.dropValid && draggedTask && (
        <div className="absolute rounded-md pointer-events-none"
          style={{ left: ghostLeft, width: ghostWidth, top: ghostTop, height: ghostH,
            border: `2px dashed ${member.color}`, background: member.color + '18' }} />
      )}

      {/* Block overlay */}
      {isGhostHere && drag.isBlocked && draggedTask && (
        <div className="absolute rounded-md pointer-events-none flex items-center justify-center"
          style={{ left: ghostLeft, width: ghostWidth, top: ghostTop, height: ghostH,
            background: 'rgba(220,38,38,0.12)', border: '2px dashed rgba(220,38,38,0.5)' }}>
          <span style={{ fontSize: 16 }}>🚫</span>
        </div>
      )}
    </div>
  )
}
