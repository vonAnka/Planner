import { useStore } from '../../store/projectStore'
import { generateTicks, RESOLUTION_CONFIG, getGridWidth, msToPixels, getWeekNumber } from '../../utils/time'
import { HEADER_HEIGHT, MEMBER_COLUMN_WIDTH } from '../../utils/layout'
import { isWeekend, isHoliday, DAY_MS, midnightUTC } from '../../utils/workdays'
import { Flag } from 'lucide-react'

export default function TimeGridHeader() {
  const { resolution, gridStart, project, openPanel, holidays } = useStore()
  const gridWidth = getGridWidth(resolution)
  const ticks = generateTicks(gridStart, gridWidth, resolution)
  const { pixelsPerUnit, tickFormat, unitMs } = RESOLUTION_CONFIG[resolution]
  const now = Date.now()
  const nowX = msToPixels(now - gridStart, resolution)
  const showWorkdayShading = resolution === 'day' || resolution === 'week'

  return (
    <div className="relative border-b border-border flex-shrink-0 overflow-hidden"
      style={{ width: gridWidth, height: HEADER_HEIGHT, background: 'rgba(237,240,244,0.95)' }}>

      {/* Weekend/holiday background shading in header */}
      {showWorkdayShading && (() => {
        const gridEnd = gridStart + gridWidth / pixelsPerUnit * unitMs
        const days: React.ReactNode[] = []
        let d = midnightUTC(gridStart)
        while (d < gridEnd) {
          const x = msToPixels(d - gridStart, resolution)
          const w = msToPixels(DAY_MS, resolution)
          const weekend = isWeekend(d)
          const holiday = isHoliday(d, holidays)
          if (weekend || holiday) {
            days.push(
              <div key={d} className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: x, width: w, background: holiday ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.06)' }} />
            )
          }
          d += DAY_MS
        }
        return days
      })()}

      {ticks.map(tick => {
        const x = msToPixels(tick - gridStart, resolution);
        const date = new Date(tick);
        
        const isWknd = showWorkdayShading && isWeekend(tick);
        const isHday = showWorkdayShading && isHoliday(tick, holidays);
        const isRed = isWknd || isHday;

        const isMonday = date.getUTCDay() === 1;
        const weekNum = (resolution === 'day' && isMonday) ? getWeekNumber(date) : null;

        return (
          <div key={tick} className="absolute top-0 h-full" style={{ left: x }}>
            {/* Vertikal linje */}
            <div className="w-px h-full" style={{ background: isRed ? 'rgba(220,38,38,0.25)' : 'rgba(196,203,214,0.5)' }} />
            
            {/* Behållare för text längst ner till vänster om linjen */}
            <div className="absolute bottom-1 left-1.5 flex flex-col items-start leading-none">
              
              {/* Veckonummer - Nu större och tydligare */}
              {weekNum && (
                <span className="font-bold tracking-tighter text-slate-500 mb-0.5"
                  style={{ 
                    fontSize: 11,       // Ökat från 9-10
                    lineHeight: '11px', // Samma som font för att eliminera extra space i botten
                    textTransform: 'uppercase'
                  }}>
                  v.{weekNum}
                </span>
              )}
              
              {/* Datum - Större storlek */}
              <span className="whitespace-nowrap font-semibold select-none"
                style={{ 
                  fontSize: 13,        // Ökat från 10-12
                  lineHeight: '13px',  // Samma som font
                  color: isRed ? '#b91c1c' : '#1f2937' // Något mörkare för bättre kontrast
                }}>
                {tickFormat(date)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Now indicator */}
      {nowX > 0 && nowX < gridWidth && (
        <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: nowX }}>
          <div className="w-0.5 h-full bg-accent/70" />
          <div className="absolute top-2 -translate-x-1/2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            NOW
          </div>
        </div>
      )}

      {/* Gate flags */}
      {project?.gates.map(gate => {
        const x = msToPixels(gate.position - gridStart, resolution)
        if (x < 0 || x > gridWidth) return null
        return (
          <div key={gate.id} className="absolute top-0 flex flex-col items-center" style={{ left: x, zIndex: 10 }}>
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mt-1 shadow cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{ background: gate.color, color: '#fff' }}
              onClick={() => openPanel('gate', gate.id)}>
              <Flag size={9} />
              {gate.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}
