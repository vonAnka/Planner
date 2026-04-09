import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store/projectStore'
import { X, CheckCircle2, Circle, Trash2, ChevronRight, Unlink } from 'lucide-react'

interface Props { taskId: string }

export default function TaskSidePanel({ taskId }: Props) {
  const { project, closePanel, updateTask, deleteTask, removeDependency } = useStore()
  const task = project?.tasks.find(t => t.id === taskId)
  const member = project?.members.find(m => m.id === task?.memberId)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
  }, [taskId])

  const savePending = useCallback(() => {
    if (!task) return
    if (title.trim() && title.trim() !== task.title) updateTask(taskId, { title: title.trim() })
    if (description !== task.description) updateTask(taskId, { description })
  }, [task, title, description, taskId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        savePending()
        closePanel()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [savePending])

  if (!task || !project) return null

  const handleBlurTitle = () => { if (title.trim() && title !== task.title) updateTask(taskId, { title: title.trim() }) }
  const handleBlurDesc = () => { if (description !== task.description) updateTask(taskId, { description }) }
  const toggleDone = () => updateTask(taskId, { done: !task.done })
  const handleDelete = () => { deleteTask(taskId) }
  const color = member?.color ?? '#58A6FF'

  return (
    <aside
      ref={panelRef as React.RefObject<HTMLDivElement>}
      className="fixed top-0 right-0 h-full w-80 border-l border-border/60 z-40 flex flex-col animate-slide-in-right shadow-2xl"
      style={{ background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(16px)' }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs text-text-muted uppercase tracking-widest font-semibold flex-1">Task</span>
        <button onClick={closePanel} className="text-text-muted hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {member && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: color + '33', color, border: `1.5px solid ${color}55` }}>
              {member.avatarInitials}
            </div>
            <span className="text-xs text-text-secondary">{member.name}</span>
            {member.role && (<><ChevronRight size={10} className="text-text-muted" /><span className="text-xs text-text-muted">{member.role}</span></>)}
          </div>
        )}

        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleBlurTitle}
            onKeyDown={e => e.key === 'Enter' && handleBlurTitle()}
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors" />
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={handleBlurDesc}
            rows={4} placeholder="Add a description…"
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors resize-none placeholder-text-muted" />
        </div>

        {(task.parents.length > 0 || task.children.length > 0) && (
          <div>
            <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-2">Dependencies</label>
            <div className="flex flex-col gap-1.5">
              {task.parents.map(dep => {
                const parent = project.tasks.find(t => t.id === dep.fromTaskId)
                if (!parent) return null
                return (
                  <div key={dep.id} className="flex items-center gap-2 text-xs bg-elevated/60 rounded-md px-2.5 py-1.5 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0" />
                    <span className="text-text-muted">After:</span>
                    <span className="truncate flex-1 text-text-secondary">{parent.title}</span>
                    <button onClick={() => removeDependency(dep.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all" title="Remove">
                      <Unlink size={11} />
                    </button>
                  </div>
                )
              })}
              {task.children.map(dep => {
                const child = project.tasks.find(t => t.id === dep.toTaskId)
                if (!child) return null
                return (
                  <div key={dep.id} className="flex items-center gap-2 text-xs bg-elevated/60 rounded-md px-2.5 py-1.5 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-text-muted">Before:</span>
                    <span className="truncate flex-1 text-text-secondary">{child.title}</span>
                    <button onClick={() => removeDependency(dep.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all" title="Remove">
                      <Unlink size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/50 flex flex-col gap-2 flex-shrink-0">
        <button onClick={toggleDone}
          className={`flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${task.done
            ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
            : 'bg-elevated/60 border border-border/50 text-text-secondary hover:border-accent/40 hover:text-text-primary'}`}>
          {task.done ? <CheckCircle2 size={15} className="text-green-400" /> : <Circle size={15} />}
          {task.done ? 'Mark as incomplete' : 'Mark as done'}
        </button>
        <button onClick={handleDelete}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg font-medium text-sm border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all">
          <Trash2 size={15} />Remove task
        </button>
      </div>
    </aside>
  )
}
