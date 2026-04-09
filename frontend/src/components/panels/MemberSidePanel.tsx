import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store/projectStore'
import { X, Trash2 } from 'lucide-react'

interface Props { memberId: string }

export default function MemberSidePanel({ memberId }: Props) {
  const { project, closePanel, updateMember, deleteMember } = useStore()
  const member = project?.members.find(m => m.id === memberId)
  const [name, setName] = useState(member?.name ?? '')
  const [role, setRole] = useState(member?.role ?? '')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setName(member?.name ?? '')
    setRole(member?.role ?? '')
  }, [memberId])

  const savePending = useCallback(() => {
    if (!member) return
    if (name.trim() && name.trim() !== member.name) updateMember(memberId, { name: name.trim() })
    if (role !== member.role) updateMember(memberId, { role })
  }, [member, name, role, memberId])

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

  if (!member) return null

  const saveName = () => { if (name.trim()) updateMember(memberId, { name: name.trim() }) }
  const saveRole = () => updateMember(memberId, { role })
  const taskCount = project?.tasks.filter(t => t.memberId === memberId).length ?? 0
  const color = member.color

  return (
    <div ref={panelRef} onMouseDown={e => e.stopPropagation()}
      className="fixed top-0 right-0 h-full w-80 border-l border-border/60 z-40 flex flex-col animate-slide-in-right shadow-2xl"
      style={{ background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: color + '33', color, border: `1.5px solid ${color}55` }}>
          {member.avatarInitials}
        </div>
        <span className="text-xs text-text-muted uppercase tracking-widest font-semibold flex-1">Team Member</span>
        <button onClick={closePanel} className="text-text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex justify-center py-3">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold transition-all"
            style={{ background: color + '22', color, border: `2px solid ${color}55`, backdropFilter: 'blur(4px)' }}>
            {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-elevated/40 rounded-lg border border-border/30">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-xs text-text-muted">Auto-assigned color</span>
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors" />
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-widest font-semibold block mb-1.5">Role</label>
          <input value={role} onChange={e => setRole(e.target.value)} onBlur={saveRole}
            onKeyDown={e => e.key === 'Enter' && saveRole()}
            placeholder="e.g. Designer, Engineer…"
            className="w-full bg-elevated/60 border border-border/50 rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent transition-colors placeholder-text-muted" />
        </div>

        <div className="bg-elevated/40 rounded-lg px-3 py-2.5 flex items-center justify-between border border-border/30">
          <span className="text-xs text-text-muted">Assigned tasks</span>
          <span className="text-sm font-semibold text-text-primary">{taskCount}</span>
        </div>
      </div>

      <div className="p-4 border-t border-border/50 flex-shrink-0">
        <button onClick={() => deleteMember(memberId)}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg font-medium text-sm border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all">
          <Trash2 size={15} />Remove member
        </button>
      </div>
    </div>
  )
}
