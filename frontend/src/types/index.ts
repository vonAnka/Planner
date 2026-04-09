export type Resolution = 'hour' | 'day' | 'week'

export interface Project {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  members: TeamMember[]
  tasks: Task[]
  gates: Gate[]
}

export interface TeamMember {
  id: string
  projectId: string
  name: string
  role: string
  color: string
  avatarInitials: string
  order: number
}

export interface Task {
  id: string
  projectId: string
  memberId: string
  title: string
  description: string
  startTime: number
  duration: number
  done: boolean
  laneRow: number
  parents: Dependency[]
  children: Dependency[]
}

export interface Dependency {
  id: string
  fromTaskId: string
  toTaskId: string
}

export interface Gate {
  id: string
  projectId: string
  position: number
  label: string
  description: string
  color: string
}

export type PanelType = 'task' | 'gate' | 'member'
export interface PanelState { type: PanelType; id: string }
export type ContextMenuType = 'task' | 'grid'
export interface ContextMenuState {
  x: number; y: number; type: ContextMenuType
  taskId?: string; time?: number; memberId?: string
}

export interface DragState {
  taskId: string
  offsetMs: number
  ghostStartTime: number
  ghostMemberId: string
  originalStartTime: number
  originalMemberId: string
  ghostRow: number
  dropValid: boolean    // true = can drop here, show ghost
  isBlocked: boolean    // true = show block cursor (over task or before hard stop)
}

export interface ResizeState {
  taskId: string
  originalDuration: number
  startX: number
}

export interface DepDrawingState {
  fromTaskId: string
  mouseX: number
  mouseY: number
}
