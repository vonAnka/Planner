import { useCallback } from 'react'
import { Task } from '../../types'
import { useStore } from '../../store/projectStore'
import { msToPixels, pixelsToMs, taskGeometry, resizeEndToWorkdayDuration } from '../../utils/time'
import { ROW_HEIGHT, SWIMLANE_PADDING, MEMBER_COLUMN_WIDTH } from '../../utils/layout'
import { buildTaskSegments } from '../../utils/workdays'
import { CheckCircle2, GripVertical } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  task: Task
  row: number
}

export default function TaskBox({ task, row }: Props) {
  const {
    resolution, gridStart, drag, depDrawing,
    startDrag, startResize, openPanel, showContextMenu, connectDep,
    holidays,
  } = useStore()

  const member = useStore(s => s.project?.members.find(m => m.id === task.memberId))
  const isBeingDragged = drag?.taskId === task.id
  const isDone = task.done
  const useWorkdays = resolution === 'day' || resolution === 'week'

  const top = SWIMLANE_PADDING + row * ROW_HEIGHT + 4
  const height = ROW_HEIGHT - 8

  // Bounding box for hit detection and resize handle placement
  const { left, width } = taskGeometry(
    task.startTime, task.duration, gridStart, resolution,
    useWorkdays ? holidays : undefined
  )

  // Segments for visual rendering in day/week mode
  const segments = useWorkdays
    ? buildTaskSegments(
        task.startTime,
        Math.max(1, Math.round(task.duration / (24 * 60))),
        holidays,
        gridStart,
      )
    : null

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (depDrawing) {
      e.stopPropagation()
      connectDep(task.id)
      return
    }
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetPx = e.clientX - rect.left
    const offsetMs = pixelsToMs(offsetPx, resolution)
    let dragStarted = false

    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX
      const dy = mv.clientY - startY
      if (!dragStarted && Math.sqrt(dx * dx + dy * dy) > 5) {
        dragStarted = true
        startDrag(task.id, offsetMs)
      }
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (!dragStarted && !depDrawing) openPanel('task', task.id)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [depDrawing, resolution, task.id])

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startResize(task.id, e.clientX)
  }, [task.id])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    showContextMenu({ x: e.clientX, y: e.clientY, type: 'task', taskId: task.id })
  }, [task.id])

  const color = member?.color ?? '#2563EB'

  return (
    <div
      className={clsx(
        'absolute select-none group',
        isBeingDragged && 'opacity-0',
        depDrawing && 'cursor-crosshair',
        !depDrawing && !drag && 'cursor-pointer',
      )}
      style={{ left, width, top, height, position: 'absolute' }}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      data-task-id={task.id}
    >
      {/* Render segments (day/week mode) or single bar (hour mode) */}
      {segments ? (
        <>
          {segments.map((seg, i) => {
            const segLeft = msToPixels(seg.leftMs, resolution) - msToPixels(task.startTime - gridStart, resolution)
            const segWidth = msToPixels(seg.widthMs, resolution)

            if (seg.isGap) {
              return (
                <div key={i}
                  className="absolute top-0 pointer-events-none"
                  style={{
                    left: segLeft,
                    width: segWidth,
                    height,
                    background: `repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 3px,
                      ${color}22 3px,
                      ${color}22 6px
                    )`,
                    borderTop: `1.5px dashed ${color}44`,
                    borderBottom: `1.5px dashed ${color}44`,
                  }}
                />
              )
            }

            const isFirst = segments.slice(0, i).every(s => s.isGap)
            const isLast  = segments.slice(i + 1).every(s => s.isGap)

            return (
              <div key={i}
                className="absolute top-0 flex items-center overflow-hidden"
                style={{
                  left: segLeft,
                  width: segWidth,
                  height,
                  background: isDone ? '#C8D0DA' : color + '28',
                  border: `1.5px solid ${isDone ? '#9CA3AF' : color + '99'}`,
                  borderRadius: isFirst && isLast ? 6
                    : isFirst ? '6px 0 0 6px'
                    : isLast  ? '0 6px 6px 0'
                    : 0,
                  borderLeft:  !isFirst ? 'none' : undefined,
                  borderRight: !isLast  ? 'none' : undefined,
                  backdropFilter: 'blur(4px)',
                }}>
                {/* Left accent on first segment only */}
                {isFirst && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: color }} />
                )}
                {/* Title on first segment only */}
                {isFirst && (
                  <span className={clsx(
                    'text-xs font-medium truncate pointer-events-none',
                    isDone ? 'line-through text-text-muted' : 'text-text-primary',
                  )} style={{ paddingLeft: isDone ? 20 : 10, paddingRight: 4 }}>
                    {isDone && (
                      <CheckCircle2 size={10} style={{ color, display: 'inline', marginRight: 4 }} />
                    )}
                    {task.title}
                  </span>
                )}
              </div>
            )
          })}
        </>
      ) : (
        /* Hour mode — single bar */
        <div className="absolute top-0 left-0 flex items-center overflow-hidden"
          style={{
            width, height,
            background: isDone ? '#C8D0DA' : color + '28',
            border: `1.5px solid ${isDone ? '#9CA3AF' : color + '99'}`,
            borderRadius: 6,
            backdropFilter: 'blur(4px)',
          }}>
          <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
            style={{ background: color }} />
          <span className={clsx(
            'flex-1 text-xs font-medium truncate pointer-events-none',
            isDone ? 'line-through text-text-muted' : 'text-text-primary',
          )} style={{ paddingLeft: isDone ? 20 : 10, paddingRight: 18 }}>
            {isDone && (
              <CheckCircle2 size={10} style={{ color, display: 'inline', marginRight: 4 }} />
            )}
            {task.title}
          </span>
        </div>
      )}

      {/* Resize handle — on bounding box right edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 rounded-r-md z-10"
        onMouseDown={onResizeMouseDown}
      >
        <GripVertical size={10} className="text-text-muted" />
      </div>

      {/* Dep drawing block overlay */}
      {depDrawing && (() => {
        const state = useStore.getState()
        const fromTask = state.project?.tasks.find(t => t.id === depDrawing.fromTaskId)
        if (!fromTask) return null
        const fromEnd = fromTask.startTime + fromTask.duration * 60 * 1000
        const isInvalid = task.id === depDrawing.fromTaskId || task.startTime < fromEnd
        if (!isInvalid) return null
        return (
          <div className="absolute inset-0 rounded-md flex items-center justify-center pointer-events-none z-20"
            style={{ background: 'rgba(220,38,38,0.18)', border: '2px solid rgba(220,38,38,0.5)' }}>
            <span style={{ fontSize: 13 }}>🚫</span>
          </div>
        )
      })()}
    </div>
  )
}