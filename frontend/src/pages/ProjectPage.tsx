import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/projectStore'
import PlannerShell from '../components/planner/PlannerShell'
import { addToRecent } from './LandingPage'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { project, loading, error, loadProject } = useStore()

  useEffect(() => {
    if (id) loadProject(id)
  }, [id])

  useEffect(() => {
    if (project) addToRecent(project.id, project.title)
  }, [project?.id])

  if (loading) {
    return (
      <div className="h-screen bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading project…</span>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? 'Project not found'}</p>
          <button onClick={() => navigate('/')} className="text-accent underline text-sm">
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  return <PlannerShell />
}
