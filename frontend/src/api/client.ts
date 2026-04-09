import { Project, TeamMember, Task, Dependency, Gate } from '../types'

const BASE = '/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Projects
  getProjects:   ()                            => req<Array<{id:string;title:string;createdAt:string;updatedAt:string;_count:{members:number;tasks:number}}>>('GET', '/projects'),
  getProject:    (id: string)                => req<Project>('GET',   `/projects/${id}`),
  createProject: (title: string)             => req<Project>('POST',  '/projects', { title }),
  updateProject: (id: string, title: string) => req<Project>('PATCH', `/projects/${id}`, { title }),
  deleteProject: (id: string)                => req<void>('DELETE', `/projects/${id}`),

  // Members
  createMember: (projectId: string, data: { name: string; role?: string; color?: string }) =>
    req<TeamMember>('POST', `/projects/${projectId}/members`, data),
  updateMember: (id: string, data: Partial<Pick<TeamMember, 'name' | 'role' | 'color' | 'order'>>) =>
    req<TeamMember>('PATCH', `/members/${id}`, data),
  deleteMember: (id: string) => req<void>('DELETE', `/members/${id}`),

  // Tasks
  createTask: (projectId: string, data: { memberId: string; title: string; startTime: number; duration: number }) =>
    req<Task>('POST', `/projects/${projectId}/tasks`, data),
  updateTask: (id: string, data: Partial<Pick<Task, 'title' | 'description' | 'startTime' | 'duration' | 'done' | 'memberId' | 'laneRow'>>) =>
    req<Task>('PATCH', `/tasks/${id}`, data),
  batchUpdateTasks: (updates: Array<{ id: string; startTime: number }>) =>
    req<Task[]>('PATCH', '/tasks/batch', { updates }),
  deleteTask: (id: string) => req<void>('DELETE', `/tasks/${id}`),

  // Dependencies
  createDependency: (fromTaskId: string, toTaskId: string) =>
    req<Dependency>('POST', `/tasks/${fromTaskId}/dependencies`, { toTaskId }),
  deleteDependency: (id: string) => req<void>('DELETE', `/dependencies/${id}`),

  // Gates
  createGate: (projectId: string, data: { position: number; label?: string; color?: string }) =>
    req<Gate>('POST', `/projects/${projectId}/gates`, data),
  updateGate: (id: string, data: Partial<Pick<Gate, 'label' | 'description' | 'color' | 'position'>>) =>
    req<Gate>('PATCH', `/gates/${id}`, data),
  deleteGate: (id: string) => req<void>('DELETE', `/gates/${id}`),
}
