import { AlertTriangle, RefreshCw } from 'lucide-react'

export function AqiPill({ aqi, category, size = 'md' }) {
  const sizes = { sm: 'text-xs px-2 py-0.5 min-w-9', md: 'text-sm px-3 py-1 min-w-11', lg: 'text-base px-4 py-1.5' }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white tabular-nums ${sizes[size]}`}
      style={{ background: category?.color ?? '#64748b' }}
    >
      {aqi ?? '—'}
    </span>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
      <AlertTriangle size={18} className="shrink-0" />
      <span className="flex-1">Couldn't load air quality data: {error.message}</span>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 hover:bg-red-500/30">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-slate-400">
      <RefreshCw size={18} className="animate-spin" /> {label}
    </div>
  )
}

export function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function PollutantGrid({ pollutants }) {
  if (!pollutants?.length) return null
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {pollutants.map((p) => (
        <div key={p.key} className="rounded-lg bg-slate-900/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{p.label}</p>
          <p className="font-semibold text-slate-100 tabular-nums">
            {p.value < 10 ? p.value.toFixed(1) : Math.round(p.value)}
            <span className="ml-1 text-[10px] font-normal text-slate-500">{p.unit}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

const colorFor = (aqi) =>
  aqi <= 50 ? '#10b981' : aqi <= 100 ? '#eab308' : aqi <= 150 ? '#f97316' : aqi <= 200 ? '#ef4444' : aqi <= 300 ? '#a855f7' : '#7f1d1d'

/** Bar chart of hourly AQI. Highlights the current hour. */
export function ForecastChart({ forecast, height = 96 }) {
  if (!forecast?.length) return null
  const now = Date.now()
  // Keep the last 12h and the next 36h for context.
  const pts = forecast.filter((f) => {
    const t = new Date(f.time).getTime()
    return t > now - 12 * 3600e3 && t < now + 36 * 3600e3
  })
  if (!pts.length) return null
  const max = Math.max(100, ...pts.map((p) => p.aqi))
  const w = 100 / pts.length
  const nowIdx = pts.findIndex((p) => new Date(p.time).getTime() > now) - 1
  const peak = pts.reduce((a, b) => (b.aqi > a.aqi ? b : a))

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img"
           aria-label={`Hourly AQI forecast, peak ${peak.aqi}`}>
        {pts.map((p, i) => {
          const h = (p.aqi / max) * (height - 4)
          return (
            <rect key={p.time} x={i * w + w * 0.15} y={height - h} width={w * 0.7} height={h} rx={0.4}
                  fill={colorFor(p.aqi)} opacity={i === nowIdx ? 1 : i < nowIdx ? 0.35 : 0.75}>
              <title>{`${formatTime(p.time)} — AQI ${p.aqi}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>−12h</span><span>now</span><span>+36h · peak {peak.aqi}</span>
      </div>
    </div>
  )
}
