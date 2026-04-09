import { create } from 'zustand'
import { api } from '../api/client'
import {
  Project, TeamMember, Task, Gate, Dependency,
  Resolution, PanelState, ContextMenuState,
  DragState, ResizeState, DepDrawingState,
} from '../types'
import { computeGridStart, snapToGrid } from '../utils/time'
import { cascadeChildren, getHardStop, computeLaneRows, compactLaneRows, SWIMLANE_PADDING, ROW_HEIGHT } from '../utils/layout'
import { fetchHolidays, HolidaySet, snapToNextWorkday } from '../utils/workdays'

const MEMBER_COLORS = ['#2563EB','#16A34A','#DC2626','#9333EA','#EA580C','#0891B2','#65A30D','#DB2777']
const GATE_COLORS   = ['#D97706','#DC2626','#2563EB','#16A34A','#9333EA','#DB2777','#0891B2','#65A30D']

interface Store {
  project: Project | null
  loading: boolean
  error: string | null
  resolution: Resolution
  gridStart: number
  holidays: HolidaySet
  drag: DragState | null
  resize: ResizeState | null
  depDrawing: DepDrawingState | null
  panel: PanelState | null
  contextMenu: ContextMenuState | null

  loadProject: (id: string) => Promise<void>
  setResolution: (r: Resolution) => void

  startDrag: (taskId: string, offsetMs: number) => void
  updateDrag: (ghostStartTime: number, ghostMemberId: string, mouseYInSwimlane: number) => void
  commitDrag: () => Promise<void>
  cancelDrag: () => void

  startResize: (taskId: string, startX: number) => void
  commitResize: (newDuration: number) => Promise<void>
  cancelResize: () => void

  startDepDrawing: (fromTaskId: string) => void
  updateDepMouse: (x: number, y: number) => void
  connectDep: (toTaskId: string) => Promise<void>
  cancelDepDrawing: () => void
  removeDependency: (depId: string) => Promise<void>

  openPanel: (type: PanelState['type'], id: string) => void
  closePanel: () => void
  showContextMenu: (menu: ContextMenuState) => void
  hideContextMenu: () => void

  addTask: (memberId: string, startTime: number) => Promise<void>
  updateTask: (id: string, data: Partial<Pick<Task, 'title' | 'description' | 'done'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  addMember: () => Promise<void>
  updateMember: (id: string, data: Partial<Pick<TeamMember, 'name' | 'role' | 'color'>>) => Promise<void>
  deleteMember: (id: string) => Promise<void>

  addGate: (position: number) => Promise<void>
  updateGate: (id: string, data: Partial<Pick<Gate, 'label' | 'description' | 'color' | 'position'>>) => Promise<void>
  deleteGate: (id: string) => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  project: null,
  loading: false,
  error: null,
  resolution: 'day',
  gridStart: computeGridStart([], 'day'),
  holidays: new Set(),
  drag: null,
  resize: null,
  depDrawing: null,
  panel: null,
  contextMenu: null,

  loadProject: async (id) => {
    set({ loading: true, error: null })
    try {
      const [project, holidays] = await Promise.all([
        api.getProject(id),
        fetchHolidays([new Date().getFullYear(), new Date().getFullYear() + 1]),
      ])
      const resolution: Resolution = 'day'
      const gridStart = computeGridStart(project.tasks, resolution)
      set({ project, loading: false, resolution, gridStart, holidays })
    } catch (e: unknown) {
      set({ error: String(e), loading: false })
    }
  },

  setResolution: (resolution) => {
    const { project, holidays } = get()
    const gridStart = computeGridStart(project?.tasks ?? [], resolution)
    set({ resolution, gridStart })
  },

  // ── Drag ──────────────────────────────────────────────────────────────────
  startDrag: (taskId, offsetMs) => {
    const task = get().project?.tasks.find(t => t.id === taskId)
    if (!task) return
    set({
      drag: {
        taskId, offsetMs,
        ghostStartTime: task.startTime,
        ghostMemberId: task.memberId,
        originalStartTime: task.startTime,
        originalMemberId: task.memberId,
        ghostRow: task.laneRow,
        dropValid: true,
        isBlocked: false,
      },
    })
  },

  updateDrag: (ghostStartTime, ghostMemberId, mouseYInSwimlane) => {
    const { drag, project, resolution, holidays } = get()
    if (!drag || !project) return

    const hardStop = getHardStop(drag.taskId, project.tasks)
    const snapped = snapToGrid(ghostStartTime, resolution, holidays)
    const isBlockedByHardStop = snapped < hardStop
    const clamped = Math.max(snapped, isBlockedByHardStop ? hardStop : snapped)

    const movedTask = project.tasks.find(t => t.id === drag.taskId)
    const memberTasks = project.tasks.filter(t => t.memberId === ghostMemberId && t.id !== drag.taskId)

    const targetRow = Math.max(0, Math.floor((mouseYInSwimlane - SWIMLANE_PADDING) / ROW_HEIGHT))
    const existingRows = new Set(memberTasks.map(t => t.laneRow))
    const rowExists = targetRow === 0 || existingRows.has(targetRow)

    const ghostStart = clamped
    const ghostEnd = ghostStart + (movedTask?.duration ?? 480) * 60 * 1000
    const overTask = memberTasks.some(t => {
      if (t.laneRow !== targetRow) return false
      const tEnd = t.startTime + t.duration * 60 * 1000
      return ghostStart < tEnd && ghostEnd > t.startTime
    })

    const isBlocked = overTask || isBlockedByHardStop
    const dropValid = rowExists && !isBlocked

    set({ drag: { ...drag, ghostStartTime: clamped, ghostMemberId, ghostRow: targetRow, dropValid, isBlocked } })
  },

  commitDrag: async () => {
    const { drag, project, resolution, holidays } = get()
    if (!drag || !project) return

    if (!drag.dropValid) {
      set({ drag: null })
      return
    }

    // Snap start to workday in day/week mode
    const finalStart = (resolution === 'day' || resolution === 'week')
      ? snapToNextWorkday(drag.ghostStartTime, holidays)
      : drag.ghostStartTime

    const cascadeMap = cascadeChildren(drag.taskId, finalStart, project.tasks, resolution, holidays)

    const updatedTasks = project.tasks.map(t => {
      if (t.id === drag.taskId) return { ...t, startTime: finalStart, memberId: drag.ghostMemberId, laneRow: drag.ghostRow }
      if (cascadeMap.has(t.id)) return { ...t, startTime: cascadeMap.get(t.id)! }
      return t
    })

    const targetMemberTasks = updatedTasks.filter(t => t.memberId === drag.ghostMemberId)
    const compactMap = compactLaneRows(targetMemberTasks)
    const finalTasks = updatedTasks.map(t =>
      compactMap.has(t.id) ? { ...t, laneRow: compactMap.get(t.id)! } : t
    )
    const finalGhostRow = compactMap.get(drag.taskId) ?? drag.ghostRow

    set({ project: { ...project, tasks: finalTasks }, drag: null })

    try {
      await api.updateTask(drag.taskId, { startTime: finalStart, memberId: drag.ghostMemberId, laneRow: finalGhostRow })
      if (cascadeMap.size > 0) {
        await api.batchUpdateTasks(Array.from(cascadeMap.entries()).map(([id, startTime]) => ({ id, startTime })))
      }
      if (compactMap.size > 0) {
        await api.batchUpdateTasks(
          Array.from(compactMap.entries())
            .filter(([id]) => id !== drag.taskId)
            .map(([id, laneRow]) => ({ id, startTime: finalTasks.find(t => t.id === id)?.startTime ?? 0, laneRow }))
        )
      }
    } catch (e) {
      console.error('Failed to save task move:', e)
      await get().loadProject(project.id)
    }
  },

  cancelDrag: () => set({ drag: null }),

  // ── Resize ────────────────────────────────────────────────────────────────
  startResize: (taskId, startX) => {
    const task = get().project?.tasks.find(t => t.id === taskId)
    if (!task) return
    set({ resize: { taskId, originalDuration: task.duration, startX } })
  },

  commitResize: async (newDuration) => {
    const { resize, project } = get()
    if (!resize || !project) return
    const updatedTasks = project.tasks.map(t => t.id === resize.taskId ? { ...t, duration: newDuration } : t)
    set({ project: { ...project, tasks: updatedTasks }, resize: null })
    try {
      await api.updateTask(resize.taskId, { duration: newDuration })
    } catch (e) {
      console.error('Failed to save resize:', e)
      await get().loadProject(project.id)
    }
  },

  cancelResize: () => set({ resize: null }),

  // ── Dependency drawing ────────────────────────────────────────────────────
  startDepDrawing: (fromTaskId) => {
    set({ depDrawing: { fromTaskId, mouseX: 0, mouseY: 0 }, contextMenu: null })
  },

  updateDepMouse: (x, y) => {
    const { depDrawing } = get()
    if (!depDrawing) return
    set({ depDrawing: { ...depDrawing, mouseX: x, mouseY: y } })
  },

  connectDep: async (toTaskId) => {
    const { depDrawing, project, resolution, holidays } = get()
    if (!depDrawing || !project) return
    if (depDrawing.fromTaskId === toTaskId) { set({ depDrawing: null }); return }
    try {
      const dep: Dependency = await api.createDependency(depDrawing.fromTaskId, toTaskId)
      // Cascade children after new dependency
      const updatedTasksWithDep = project.tasks.map(t => {
        if (t.id === depDrawing.fromTaskId) return { ...t, children: [...t.children, dep] }
        if (t.id === toTaskId) return { ...t, parents: [...t.parents, dep] }
        return t
      })
      const fromTask = updatedTasksWithDep.find(t => t.id === depDrawing.fromTaskId)
      if (fromTask) {
        const cascadeMap = cascadeChildren(depDrawing.fromTaskId, fromTask.startTime, updatedTasksWithDep, resolution, holidays)
        const finalTasks = updatedTasksWithDep.map(t =>
          cascadeMap.has(t.id) ? { ...t, startTime: cascadeMap.get(t.id)! } : t
        )
        set({ project: { ...project, tasks: finalTasks }, depDrawing: null })
        if (cascadeMap.size > 0) {
          await api.batchUpdateTasks(Array.from(cascadeMap.entries()).map(([id, startTime]) => ({ id, startTime })))
        }
      } else {
        set({ project: { ...project, tasks: updatedTasksWithDep }, depDrawing: null })
      }
    } catch (e) {
      console.error('Failed to create dependency:', e)
      set({ depDrawing: null })
    }
  },

  cancelDepDrawing: () => set({ depDrawing: null }),

  removeDependency: async (depId: string) => {
    const { project } = get()
    if (!project) return
    const updatedTasks = project.tasks.map(t => ({
      ...t,
      parents: t.parents.filter(d => d.id !== depId),
      children: t.children.filter(d => d.id !== depId),
    }))
    set({ project: { ...project, tasks: updatedTasks } })
    try {
      await api.deleteDependency(depId)
    } catch (e) {
      console.error('Failed to remove dependency:', e)
      await get().loadProject(project.id)
    }
  },

  openPanel: (type, id) => set({ panel: { type, id }, contextMenu: null }),
  closePanel: () => set({ panel: null }),
  showContextMenu: (menu) => set({ contextMenu: menu, panel: null }),
  hideContextMenu: () => set({ contextMenu: null }),

  addTask: async (memberId, startTime) => {
    const { project, resolution, holidays } = get()
    if (!project) return
    const snappedStart = snapToGrid(startTime, resolution, holidays)
    const task = await api.createTask(project.id, {
      memberId, title: 'New Task', startTime: snappedStart,
      duration: resolution === 'hour' ? 60 : resolution === 'day' ? 480 : 2880,
    })
    set({ project: { ...project, tasks: [...project.tasks, task] } })
    get().openPanel('task', task.id)
  },

  updateTask: async (id, data) => {
    const { project } = get()
    if (!project) return
    const updatedTasks = project.tasks.map(t => t.id === id ? { ...t, ...data } : t)
    set({ project: { ...project, tasks: updatedTasks } })
    try {
      await api.updateTask(id, data)
    } catch (e) {
      console.error('Failed to update task:', e)
      await get().loadProject(project.id)
    }
  },

  deleteTask: async (id) => {
    const { project } = get()
    if (!project) return
    const updatedTasks = project.tasks
      .filter(t => t.id !== id)
      .map(t => ({
        ...t,
        parents: t.parents.filter(d => d.fromTaskId !== id && d.toTaskId !== id),
        children: t.children.filter(d => d.fromTaskId !== id && d.toTaskId !== id),
      }))
    set({ project: { ...project, tasks: updatedTasks }, panel: null })
    try {
      await api.deleteTask(id)
    } catch (e) {
      console.error('Failed to delete task:', e)
      await get().loadProject(project.id)
    }
  },

  addMember: async () => {
    const { project } = get()
    if (!project) return
    const color = MEMBER_COLORS[project.members.length % MEMBER_COLORS.length]
    const member = await api.createMember(project.id, { name: 'New Member', role: '', color })
    set({ project: { ...project, members: [...project.members, member] } })
    get().openPanel('member', member.id)
  },

  updateMember: async (id, data) => {
    const { project } = get()
    if (!project) return
    const updatedMembers = project.members.map(m => {
      if (m.id !== id) return m
      const updated = { ...m, ...data }
      if (data.name) updated.avatarInitials = data.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
      return updated
    })
    set({ project: { ...project, members: updatedMembers } })
    try {
      await api.updateMember(id, data)
    } catch (e) {
      console.error('Failed to update member:', e)
      await get().loadProject(project.id)
    }
  },

  deleteMember: async (id) => {
    const { project } = get()
    if (!project) return
    const updatedMembers = project.members.filter(m => m.id !== id)
    const updatedTasks = project.tasks.filter(t => t.memberId !== id)
    set({ project: { ...project, members: updatedMembers, tasks: updatedTasks }, panel: null })
    try {
      await api.deleteMember(id)
    } catch (e) {
      console.error('Failed to delete member:', e)
      await get().loadProject(project.id)
    }
  },

  addGate: async (position) => {
    const { project, resolution, holidays } = get()
    if (!project) return
    const snapped = snapToGrid(position, resolution, holidays)
    const color = GATE_COLORS[project.gates.length % GATE_COLORS.length]
    const gate = await api.createGate(project.id, { position: snapped, label: 'Milestone', color })
    set({ project: { ...project, gates: [...project.gates, gate] } })
    get().openPanel('gate', gate.id)
  },

  updateGate: async (id, data) => {
    const { project } = get()
    if (!project) return
    const updatedGates = project.gates.map(g => g.id === id ? { ...g, ...data } : g)
    set({ project: { ...project, gates: updatedGates } })
    try {
      await api.updateGate(id, data)
    } catch (e) {
      console.error('Failed to update gate:', e)
      await get().loadProject(project.id)
    }
  },

  deleteGate: async (id) => {
    const { project } = get()
    if (!project) return
    const updatedGates = project.gates.filter(g => g.id !== id)
    set({ project: { ...project, gates: updatedGates }, panel: null })
    try {
      await api.deleteGate(id)
    } catch (e) {
      console.error('Failed to delete gate:', e)
      await get().loadProject(project.id)
    }
  },
}))
