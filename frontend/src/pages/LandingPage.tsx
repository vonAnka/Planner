import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Plus, FolderOpen, Clock, ArrowRight, Layers } from 'lucide-react'

interface RecentProject { id: string; title: string; openedAt: number }

const STORAGE_KEY = 'pp_recent_projects'

function getRecent(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function saveRecent(projects: RecentProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, 10)))
}

export function addToRecent(id: string, title: string) {
  const existing = getRecent().filter(p => p.id !== id)
  saveRecent([{ id, title, openedAt: Date.now() }, ...existing])
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [recent, setRecent] = useState<RecentProject[]>([])
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [openId, setOpenId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setRecent(getRecent()) }, [])

  const createProject = async () => {
    if (!title.trim()) return
    setCreating(true)
    setError('')
    try {
      const project = await api.createProject(title.trim())
      addToRecent(project.id, project.title)
      navigate(`/p/${project.id}`)
    } catch {
      setError('Failed to create project. Is the server running?')
      setCreating(false)
    }
  }

  const openProject = () => {
    const id = openId.trim().replace(/.*\/p\//, '')
    if (id) navigate(`/p/${id}`)
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Layers size={16} className="text-base" />
        </div>
        <span className="font-semibold text-text-primary tracking-tight">ProjectPlanner</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16 max-w-lg">
          <h1 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">
            Plan together,<br />
            <span className="text-accent">ship on time.</span>
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            A visual project planner with swimlanes, dependencies, and milestones.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-16">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-accent text-base font-semibold px-5 py-3 rounded-lg hover:bg-blue-400 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>

          <div className="flex items-center gap-2 bg-elevated border border-border rounded-lg px-4 py-3">
            <FolderOpen size={16} className="text-text-muted" />
            <input
              placeholder="Paste project URL or ID..."
              value={openId}
              onChange={e => setOpenId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && openProject()}
              className="bg-transparent text-text-primary placeholder-text-muted outline-none w-56 text-sm"
            />
            <button
              onClick={openProject}
              disabled={!openId.trim()}
              className="text-accent hover:text-blue-300 disabled:opacity-30 transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent projects */}
        {recent.length > 0 && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
              Recent Projects
            </h2>
            <div className="grid gap-2">
              {recent.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/p/${p.id}`)}
                  className="flex items-center gap-4 bg-surface border border-border rounded-lg px-5 py-4 hover:border-accent/40 hover:bg-elevated transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-md bg-accent-dim flex items-center justify-center flex-shrink-0">
                    <Layers size={15} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-medium truncate">{p.title}</div>
                    <div className="text-text-muted text-xs flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(p.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-text-muted group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* New project modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-slide-in-right">
            <h2 className="text-lg font-semibold text-text-primary mb-4">New Project</h2>
            <input
              autoFocus
              placeholder="Project name..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              className="w-full bg-elevated border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors text-sm"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary hover:border-text-muted hover:text-text-primary transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!title.trim() || creating}
                className="flex-1 py-2.5 rounded-lg bg-accent text-base font-semibold hover:bg-blue-400 disabled:opacity-40 transition-colors text-sm"
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
