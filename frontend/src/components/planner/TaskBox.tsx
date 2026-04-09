import { useCallback } from 'react'
import { Task } from '../../types'
import { useStore } from '../../store/projectStore'
import { msToPixels, pixelsToMs } from '../../utils/time'
import { ROW_HEIGHT, SWIMLANE_PADDING } from '../../utils/layout'
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
  } = useStore()

  const member = useStore(s => s.project?.members.find(m => m.id === task.memberId))
  const isBeingDragged = drag?.taskId === task.id
  const isDone = task.done

  const left = msToPixels(task.startTime - gridStart, resolution)
  const width = Math.max(24, msToPixels(task.duration * 60 * 1000, resolution))
  const top = SWIMLANE_PADDING + row * ROW_HEIGHT + 4
  const height = ROW_HEIGHT - 8

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
      if (!dragStarted) {
        // No movement — treat as click
        if (!depDrawing) openPanel('task', task.id)
      }
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

  const color = member?.color ?? '#58A6FF'

  return (
    <div
      className={clsx(
        'absolute flex items-center rounded-md select-none group transition-opacity',
        isBeingDragged && 'opacity-0',
        depDrawing && 'cursor-crosshair',
        !depDrawing && !drag && 'cursor-pointer hover:brightness-110',
      )}
      style={{
        left, width, top, height,
        background: isDone ? '#5f5f5f7e' : color + '22',
        border: `1.5px solid ${isDone ? '#30363D' : color + '88'}`,
        backdropFilter: 'blur(4px)',
      }}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      data-task-id={task.id}
    >
      <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: color }} />

      {isDone && (
        <div className="absolute left-1.5 opacity-60">
          <CheckCircle2 size={10} style={{ color }} />
        </div>
      )}

      <span
        className={clsx(
          'flex-1 text-xs font-medium truncate pointer-events-none',
          isDone ? 'line-through text-text-muted' : 'text-text-primary',
        )}
        style={{ paddingLeft: isDone ? 20 : 10, paddingRight: 18 }}
      >
        {task.title}
      </span>

      <div
        className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5 rounded-r-md"
        onMouseDown={onResizeMouseDown}
      >
        <GripVertical size={10} className="text-text-muted" />
      </div>
    </div>
  )
}
