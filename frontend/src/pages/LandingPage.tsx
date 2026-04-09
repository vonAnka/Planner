import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Plus, Layers, ArrowRight, Users, CheckSquare, Trash2 } from 'lucide-react'

const RECENT_PROJECTS_KEY = 'recentProjects'
const RECENT_PROJECTS_LIMIT = 5

interface RecentProject {
  id: string
  title: string
}

export function addToRecent(projectId: string, projectTitle: string): void {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY)
    const recent: RecentProject[] = stored ? JSON.parse(stored) : []
    const filtered = recent.filter(p => p.id !== projectId)
    const updated = [{ id: projectId, title: projectTitle }, ...filtered].slice(0, RECENT_PROJECTS_LIMIT)
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated))
  } catch {
    // localStorage may be unavailable in some environments; fail silently
  }
}

interface ProjectSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  _count: { members: number; tasks: number }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await api.getProjects()
      setProjects(data)
    } catch {
      setError('Could not load projects.')
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (!title.trim()) return
    setCreating(true)
    setError('')
    try {
      const project = await api.createProject(title.trim())
      navigate(`/p/${project.id}`)
    } catch {
      setError('Failed to create project.')
      setCreating(false)
    }
  }

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await api.deleteProject(id)
      setProjects(p => p.filter(x => x.id !== id))
    } catch {
      alert('Failed to delete project.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-4 flex items-center gap-3"
        style={{ background: 'rgba(237,240,244,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Layers size={16} className="text-white" />
        </div>
        <span className="font-bold text-text-primary tracking-tight text-lg">ProjectPlanner</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm"
        >
          <Plus size={16} />
          New Project
        </button>
      </header>

      <main className="flex-1 px-8 py-10 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Projects</h1>

        {loading && (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading projects…
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Layers size={28} className="text-accent" />
            </div>
            <p className="text-text-secondary font-medium mb-1">No projects yet</p>
            <p className="text-text-muted text-sm mb-6">Create your first project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Create Project
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid gap-3">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/p/${p.id}`)}
                className="flex items-center gap-4 rounded-xl px-5 py-4 text-left border border-border hover:border-accent/40 transition-all group shadow-sm"
                style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Layers size={18} className="text-accent" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-primary truncate">{p.title}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Users size={10} />
                      {p._count.members} {p._count.members === 1 ? 'member' : 'members'}
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <CheckSquare size={10} />
                      {p._count.tasks} {p._count.tasks === 1 ? 'task' : 'tasks'}
                    </span>
                    <span className="text-xs text-text-muted">
                      Updated {formatDate(p.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={e => deleteProject(e, p.id)}
                    disabled={deletingId === p.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ArrowRight size={15} className="text-text-muted group-hover:text-accent transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* New project modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="rounded-xl p-6 w-full max-w-md shadow-2xl border border-border"
            style={{ background: 'rgba(244,246,248,0.97)' }}>
            <h2 className="text-lg font-bold text-text-primary mb-4">New Project</h2>
            <input
              autoFocus
              placeholder="Project name…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              className="w-full border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors text-sm"
              style={{ background: 'rgba(255,255,255,0.8)' }}
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowModal(false); setTitle('') }}
                className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!title.trim() || creating}
                className="flex-1 py-2.5 rounded-lg bg-accent text-white font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm shadow-sm"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
