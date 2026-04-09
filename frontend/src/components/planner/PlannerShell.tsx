import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/projectStore'
import { pixelsToMs, snapToGrid, getGridWidth, msToPixels } from '../../utils/time'
import { MEMBER_COLUMN_WIDTH, HEADER_HEIGHT, swimlaneHeight } from '../../utils/layout'
import TimeGridHeader from './TimeGridHeader'
import Swimlane from './Swimlane'
import DependencyLayer from './DependencyLayer'
import GateLine from './GateLine'
import TaskSidePanel from '../panels/TaskSidePanel'
import GateSidePanel from '../panels/GateSidePanel'
import MemberSidePanel from '../panels/MemberSidePanel'
import ContextMenu from '../menus/ContextMenu'
import { Layers, Clock, Calendar, CalendarDays, Link, Check, Plus, ChevronLeft } from 'lucide-react'

export default function PlannerShell() {
  const {
    project, resolution, gridStart, drag, resize, depDrawing,
    panel, contextMenu,
    setResolution, updateDrag, commitDrag, cancelDrag,
    commitResize, cancelResize, updateDepMouse, connectDep, cancelDepDrawing,
    hideContextMenu, showContextMenu, addTask, addGate, addMember, openPanel,
  } = useStore()

  const gridScrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const gridWidth = getGridWidth(resolution)
  const totalWidth = MEMBER_COLUMN_WIDTH + gridWidth

  // ── Mouse wheel scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = gridScrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const overMemberColumn = (e.clientX - rect.left) < MEMBER_COLUMN_WIDTH
      if (overMemberColumn) {
        el.scrollTop += e.deltaY
      } else {
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Global mouse handlers ──────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag) handleDragMove(e)
      if (resize) handleResizeMove(e)
      if (depDrawing) updateDepMouse(e.clientX, e.clientY)
    }
    const onUp = () => {
      if (drag) commitDrag()
      if (resize) handleResizeUp()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag(); cancelResize(); cancelDepDrawing(); hideContextMenu()
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('keydown', onKey)
    }
  }, [drag, resize, depDrawing])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!drag || !project) return
    const scrollEl = gridScrollRef.current
    if (!scrollEl) return
    const scrollRect = scrollEl.getBoundingClientRect()
    const gridX = e.clientX - scrollRect.left - MEMBER_COLUMN_WIDTH + scrollEl.scrollLeft
    const rawMs = gridStart + pixelsToMs(gridX, resolution) - drag.offsetMs
    const snapped = snapToGrid(rawMs, resolution)

    const el = document.elementFromPoint(e.clientX, e.clientY)
    const swimlaneEl = el?.closest('[data-member-id]')
    const ghostMemberId = swimlaneEl?.getAttribute('data-member-id') ?? drag.ghostMemberId

    // Mouse Y relative to top of target swimlane
    const mouseYInContent = e.clientY - scrollRect.top + scrollEl.scrollTop - HEADER_HEIGHT
    let cumulativeY = 0
    let mouseYInSwimlane = 0
    for (const member of project.members) {
      const memberTasks = project.tasks.filter(t => t.memberId === member.id)
      const h = swimlaneHeight(memberTasks)
      if (member.id === ghostMemberId) {
        mouseYInSwimlane = mouseYInContent - cumulativeY
        break
      }
      cumulativeY += h
    }

    updateDrag(snapped, ghostMemberId, mouseYInSwimlane)
  }, [drag, gridStart, resolution, project])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resize) return
    const { taskId, originalDuration, startX } = resize
    const deltaX = e.clientX - startX
    const deltaMs = pixelsToMs(deltaX, resolution)
    const deltaMin = deltaMs / 60000
    const minDuration = resolution === 'hour' ? 30 : resolution === 'day' ? 60 : 240
    const rawDuration = Math.max(minDuration, originalDuration + deltaMin)
    const unitMin = resolution === 'hour' ? 60 : resolution === 'day' ? 60 * 24 : 60 * 24 * 7
    const snappedDuration = Math.round(rawDuration / unitMin) * unitMin
    const { project: proj } = useStore.getState()
    if (proj) {
      const updatedTasks = proj.tasks.map(t => t.id === taskId ? { ...t, duration: snappedDuration } : t)
      useStore.setState({ project: { ...proj, tasks: updatedTasks } })
    }
  }, [resize, resolution])

  const handleResizeUp = useCallback(() => {
    const { project: proj, resize: r } = useStore.getState()
    if (!r || !proj) return
    const task = proj.tasks.find(t => t.id === r.taskId)
    if (task) commitResize(task.duration)
  }, [])

  const handleGridContextMenu = useCallback((e: React.MouseEvent, memberId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const scrollEl = gridScrollRef.current
    if (!scrollEl) return
    const scrollRect = scrollEl.getBoundingClientRect()
    const gridX = e.clientX - scrollRect.left - MEMBER_COLUMN_WIDTH + scrollEl.scrollLeft
    const time = snapToGrid(gridStart + pixelsToMs(gridX, resolution), resolution)
    showContextMenu({ x: e.clientX, y: e.clientY, type: 'grid', time, memberId })
  }, [gridStart, resolution])

  const handleGridClick = useCallback(() => {
    if (depDrawing) cancelDepDrawing()
    hideContextMenu()
  }, [depDrawing])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!project) return null

  return (
    <div
      className={`h-screen bg-base flex flex-col overflow-hidden ${drag ? 'dragging' : ''}`}
      style={{ cursor: depDrawing ? 'crosshair' : (drag && drag.isBlocked) ? 'not-allowed' : drag ? 'grabbing' : 'default' }}
    >
      {/* Top bar */}
      <header className="flex-shrink-0 h-12 border-b border-border flex items-center px-4 gap-4 z-30"
        style={{ background: 'rgba(237,240,244,0.85)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/')} className="text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-accent" />
          <span className="text-text-primary font-semibold text-sm">{project.title}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded-lg p-1 border border-border"
          style={{ background: 'rgba(255,255,255,0.6)' }}>
          {(['hour', 'day', 'week'] as const).map(r => (
            <button key={r} onClick={() => setResolution(r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                resolution === r
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/60'
              }`}>
              {r === 'hour' && <Clock size={11} />}
              {r === 'day'  && <Calendar size={11} />}
              {r === 'week' && <CalendarDays size={11} />}
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={copyLink}
          className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-accent/60 rounded-lg px-3 py-1.5 transition-all"
          style={{ background: 'rgba(255,255,255,0.6)' }}>
          {copied ? <Check size={13} className="text-green-600" /> : <Link size={13} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </header>

      {/* Scroll container */}
      <div ref={gridScrollRef} className="flex-1 overflow-auto" onClick={handleGridClick}>
        <div style={{ minWidth: totalWidth }}>

          {/* Sticky header */}
          <div className="sticky top-0 z-20 flex" style={{ height: HEADER_HEIGHT }}>
            <div
              className="flex-shrink-0 sticky left-0 z-30 border-b border-r border-border flex items-end pb-2 px-4"
              style={{ width: MEMBER_COLUMN_WIDTH, background: 'rgba(237,240,244,0.95)', backdropFilter: 'blur(8px)' }}
            >
              <button onClick={addMember}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors font-medium">
                <Plus size={12} />Add member
              </button>
            </div>
            <TimeGridHeader />
          </div>

          {/* Swimlane rows */}
          <div className="relative">
            {project.members.map(member => {
              const memberTasks = project.tasks.filter(t => t.memberId === member.id)
              return (
                <div key={member.id} className="flex" data-member-id={member.id}>
                  <div
                    className="flex-shrink-0 sticky left-0 z-20 border-b border-r border-border flex items-start pt-3 px-3 cursor-pointer transition-colors"
                    style={{ width: MEMBER_COLUMN_WIDTH, background: 'rgba(237,240,244,0.95)', backdropFilter: 'blur(8px)' }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => openPanel('member', member.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm"
                        style={{ background: member.color + '33', color: member.color, border: `2px solid ${member.color}66` }}
                      >
                        {member.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary truncate">{member.name}</div>
                        {member.role && <div className="text-xs text-text-muted truncate">{member.role}</div>}
                      </div>
                    </div>
                  </div>

                  <Swimlane member={member} tasks={memberTasks} onContextMenu={handleGridContextMenu} />
                </div>
              )
            })}

            <DependencyLayer scrollRef={gridScrollRef} />

            {project.gates.map(gate => (
              <GateLine key={gate.id} gate={gate} />
            ))}
          </div>
        </div>
      </div>

      {panel?.type === 'task'   && <TaskSidePanel   taskId={panel.id} />}
      {panel?.type === 'gate'   && <GateSidePanel   gateId={panel.id} />}
      {panel?.type === 'member' && <MemberSidePanel memberId={panel.id} />}
      {contextMenu && <ContextMenu />}
    </div>
  )
}
