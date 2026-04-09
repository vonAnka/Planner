import { useStore } from '../../store/projectStore'
import { Gate } from '../../types'
import { msToPixels } from '../../utils/time'
import { MEMBER_COLUMN_WIDTH } from '../../utils/layout'

interface Props { gate: Gate }

export default function GateLine({ gate }: Props) {
  const { resolution, gridStart } = useStore()
  const x = MEMBER_COLUMN_WIDTH + msToPixels(gate.position - gridStart, resolution)

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
      style={{
        left: x,
        background: gate.color,
        opacity: 0.45,
        zIndex: 5,
      }}
    />
  )
}
