import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store/projectStore'
import { X, Trash2, Flag } from 'lucide-react'
import { snapToGrid } from '../../utils/time'

interface Props { gateId: string }

export default function GateSidePanel({ gateId }: Props) {
  const { project, resolution, closePanel, updateGate, deleteGate } = useStore()
  const gate = project?.gates.find(g => g.id === gateId)
  const [label, setLabel] = useState(gate?.label ?? '')
  const [description, setDescription] = useState(gate?.description ?? '')
  const [dateStr, setDateStr] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gate) return
    setLabel(gate.label)
    setDescription(gate.description)
    setDateStr(new Date(gate.position).toISOString().slice(0, 16))
  }, [gateId])

  const savePending = useCallback(() => {
    if (!gate) return
    if (label.trim() && label.trim() !== gate.label) updateGate(gateId, { label: label.trim() })
    if (description !== gate.description) updateGate(gateId, { description })
  }, [gate, label, description, gateId])

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

  if (!gate) return null

  const save = (patch: Parameters<typeof updateGate>[1]) => updateGate(gateId, patch)
  const handleDateChange = (val: string) => {
    setDateStr(val)
    const ms = new Date(val).getTime()
    if (!isNaN(ms)) save({ position: snapToGrid(ms, resolution) })
  }

  return (
    <div ref={panelRef} onMouseDown={e => e.stopPropagation()}
      className="fixed top-0 right-0 h-full w-80 border-l border-border/60 z-40 flex flex-col animate-slide-in-right shadow-2xl"
      style={{ background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 flex-shrink-0">
        <Flag size={13} style={{ color: gate.color }} />
        <span className="text-xs text-text-muted uppercase tracking-widest font-semibold flex-1">Gate / Milestone</span>
        <button onClick={closePanel} className="text-text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
      </div>

      <div className="px-4 pt-4 flex items-center gap-2">
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: gate.color }} />
        <span className="text-xs text-text-muted">Auto-assigned color</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            onBlur={() => label.trim() && save({ label: label.trim() })}
            onKeyDown={e => e.key === 'Enter' && save({ label: label.trim() })}
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Date &amp; Time</label>
          <input type="datetime-local" value={dateStr} onChange={e => handleDateChange(e.target.value)}
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors"
            style={{ colorScheme: 'dark' }} />
        </div>
        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            onBlur={() => save({ description })} rows={3} placeholder="Add a description…"
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors resize-none placeholder-text-muted" />
        </div>
      </div>

      <div className="p-4 border-t border-border/50 flex-shrink-0">
        <button onClick={() => deleteGate(gateId)}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg font-medium text-sm border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all">
          <Trash2 size={15} />Remove gate
        </button>
      </div>
    </div>
  )
}
