import { useRef, useEffect, useState, RefObject } from 'react'
import { useStore } from '../../store/projectStore'
import { msToPixels } from '../../utils/time'
import { SWIMLANE_PADDING, ROW_HEIGHT, MEMBER_COLUMN_WIDTH, computeLaneRows, swimlaneHeight } from '../../utils/layout'
import { workdayEndTime, DAY_MS } from '../../utils/workdays'
import { Task } from '../../types'
import { Resolution } from '../../types'

interface Props { scrollRef: RefObject<HTMLDivElement> }
interface ArrowCoords { x1: number; y1: number; x2: number; y2: number; depId: string; color: string }

function getTaskRightEdge(task: Task, resolution: Resolution, holidays: ReturnType<typeof useStore>['holidays'] extends infer H ? H : never, gridStart: number): number {
  const useWorkdays = resolution === 'day' || resolution === 'week'
  if (useWorkdays) {
    const durationDays = Math.max(1, Math.round(task.duration / (24 * 60)))
    const endMs = workdayEndTime(task.startTime, durationDays, holidays)
    return MEMBER_COLUMN_WIDTH + msToPixels(endMs - gridStart, resolution)
  }
  return MEMBER_COLUMN_WIDTH + msToPixels(task.startTime + task.duration * 60 * 1000 - gridStart, resolution)
}

export default function DependencyLayer({ scrollRef }: Props) {
  const { project, resolution, gridStart, depDrawing, drag, holidays } = useStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    setSvgSize({ w: el.scrollWidth, h: el.scrollHeight })
  }, [project, resolution, gridStart])

  if (!project) return null

  // Build effective task list — replace dragged task with ghost position
  const effectiveTasks: Task[] = project.tasks.map(t => {
    if (drag && t.id === drag.taskId) {
      return { ...t, startTime: drag.ghostStartTime, memberId: drag.ghostMemberId, laneRow: drag.ghostRow }
    }
    return t
  })

  // Cumulative Y offsets per member
  const memberYOffsets = new Map<string, number>()
  let y = 0
  for (const member of project.members) {
    memberYOffsets.set(member.id, y)
    y += swimlaneHeight(effectiveTasks.filter(t => t.memberId === member.id))
  }

  // Compute arrows
  const arrows: ArrowCoords[] = []
  for (const task of effectiveTasks) {
    for (const dep of task.children) {
      const fromTask = effectiveTasks.find(t => t.id === dep.fromTaskId)
      const toTask   = effectiveTasks.find(t => t.id === dep.toTaskId)
      if (!fromTask || !toTask) continue

      const fromMember = project.members.find(m => m.id === fromTask.memberId)
      const color = fromMember?.color ?? '#2563EB'

      const fromMemberY = memberYOffsets.get(fromTask.memberId) ?? 0
      const toMemberY   = memberYOffsets.get(toTask.memberId)   ?? 0
      const fromRows = computeLaneRows(effectiveTasks.filter(t => t.memberId === fromTask.memberId))
      const toRows   = computeLaneRows(effectiveTasks.filter(t => t.memberId === toTask.memberId))
      const fromRow  = fromRows.get(fromTask.id) ?? 0
      const toRow    = toRows.get(toTask.id)     ?? 0

      // Use workday-aware right edge for x1
      const x1 = getTaskRightEdge(fromTask, resolution, holidays, gridStart)
      const y1 = fromMemberY + SWIMLANE_PADDING + fromRow * ROW_HEIGHT + ROW_HEIGHT / 2
      const x2 = MEMBER_COLUMN_WIDTH + msToPixels(toTask.startTime - gridStart, resolution)
      const y2 = toMemberY + SWIMLANE_PADDING + toRow * ROW_HEIGHT + ROW_HEIGHT / 2

      arrows.push({ x1, y1, x2, y2, depId: dep.id, color })
    }
  }

  // Live arrow while drawing
  const getLiveArrow = () => {
    if (!depDrawing || !svgRef.current) return null
    const fromTask = effectiveTasks.find(t => t.id === depDrawing.fromTaskId)
    if (!fromTask) return null

    const fromMemberY = memberYOffsets.get(fromTask.memberId) ?? 0
    const fromRows = computeLaneRows(effectiveTasks.filter(t => t.memberId === fromTask.memberId))
    const fromRow  = fromRows.get(fromTask.id) ?? 0
    const fromMember = project.members.find(m => m.id === fromTask.memberId)
    const color = fromMember?.color ?? '#2563EB'

    const x1 = getTaskRightEdge(fromTask, resolution, holidays, gridStart)
    const y1 = fromMemberY + SWIMLANE_PADDING + fromRow * ROW_HEIGHT + ROW_HEIGHT / 2

    const svgRect = svgRef.current.getBoundingClientRect()
    const x2 = depDrawing.mouseX - svgRect.left
    const y2 = depDrawing.mouseY - svgRect.top

    return { x1, y1, x2, y2, color }
  }

  const liveArrow = getLiveArrow()

  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1)
    const cx1 = x1 + Math.max(40, dx * 0.5)
    const cx2 = x2 - Math.max(40, dx * 0.5)
    return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
  }

  const uniqueColors = [...new Set([...arrows.map(a => a.color), liveArrow?.color].filter(Boolean))] as string[]

  return (
    <svg ref={svgRef} className="absolute top-0 left-0 pointer-events-none z-10"
      width={svgSize.w} height={svgSize.h} style={{ overflow: 'visible' }}>
      <defs>
        {uniqueColors.map(color => (
          <marker key={color} id={`arrow-${color.replace('#', '')}`}
            markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={color} opacity="0.9" />
          </marker>
        ))}
      </defs>

      {arrows.map(({ x1, y1, x2, y2, depId, color }) => (
        <path key={depId} d={curve(x1, y1, x2, y2)} fill="none"
          stroke={color} strokeWidth={2} strokeOpacity={0.75}
          markerEnd={`url(#arrow-${color.replace('#', '')})`} />
      ))}

      {liveArrow && (
        <path d={curve(liveArrow.x1, liveArrow.y1, liveArrow.x2, liveArrow.y2)}
          fill="none" stroke={liveArrow.color} strokeWidth={2} strokeDasharray="6 3"
          markerEnd={`url(#arrow-${liveArrow.color.replace('#', '')})`} />
      )}
    </svg>
  )
}