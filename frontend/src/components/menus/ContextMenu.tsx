import { useEffect, useRef } from 'react'
import { useStore } from '../../store/projectStore'
import { Trash2, ArrowRight, Plus, Flag } from 'lucide-react'

export default function ContextMenu() {
  const {
    contextMenu, hideContextMenu,
    deleteTask, startDepDrawing,
    addTask, addGate,
  } = useStore()

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        hideContextMenu()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!contextMenu) return null

  // Clamp position to viewport
  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuW = 200
  const menuH = contextMenu.type === 'task' ? 96 : 96
  const x = Math.min(contextMenu.x, vw - menuW - 8)
  const y = Math.min(contextMenu.y, vh - menuH - 8)

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      key={label}
      onClick={() => { onClick(); hideContextMenu() }}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md transition-colors text-left ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-text-muted'}>{icon}</span>
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl p-1.5 min-w-[180px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      {contextMenu.type === 'task' && contextMenu.taskId && (
        <>
          {item(<ArrowRight size={13} />, 'Add dependency', () => startDepDrawing(contextMenu.taskId!))}
          <div className="my-1 border-t border-border" />
          {item(<Trash2 size={13} />, 'Remove task', () => deleteTask(contextMenu.taskId!), true)}
        </>
      )}

      {contextMenu.type === 'grid' && contextMenu.memberId && contextMenu.time !== undefined && (
        <>
          {item(<Plus size={13} />, 'Add task here', () => addTask(contextMenu.memberId!, contextMenu.time!))}
          {item(<Flag size={13} />, 'Add gate here', () => addGate(contextMenu.time!))}
        </>
      )}
    </div>
  )
}
