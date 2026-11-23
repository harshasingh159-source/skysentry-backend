import { useApi } from '../lib/api'
import { AqiPill, ErrorBox, ForecastChart, PollutantGrid, Spinner, formatTime } from '../components/ui'

function Stat({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi('/api/cities?include_forecast=true')

  if (loading && !data) return <Spinner label="Loading province overview…" />
  if (error && !data) return <div className="mx-auto max-w-5xl p-6"><ErrorBox error={error} onRetry={reload} /></div>

  const withData = data.filter((c) => c.aqi != null)
  const sorted = [...withData].sort((a, b) => b.aqi - a.aqi)
  const worst = sorted[0]
  const best = sorted[sorted.length - 1]
  const avg = Math.round(withData.reduce((s, c) => s + c.aqi, 0) / (withData.length || 1))
  const unhealthy = withData.filter((c) => c.aqi > 100).length
  const ktm = data.find((c) => c.slug === 'kathmandu')

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white md:text-3xl">Bagmati Province overview</h1>
          <p className="text-sm text-slate-400">{data.length} cities · updated {formatTime(data[0]?.updated)} NPT · refreshes every 10 min</p>
        </div>
        <button onClick={reload} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Province average" value={avg} sub="US AQI" />
        <Stat label="Worst" value={worst?.aqi} sub={worst?.name} color={worst?.category.color} />
        <Stat label="Cleanest" value={best?.aqi} sub={best?.name} color={best?.category.color} />
        <Stat label="Above 100" value={unhealthy} sub={`of ${withData.length} cities`} color={unhealthy ? '#f97316' : '#10b981'} />
      </div>

      {ktm && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-white">Kathmandu</h2>
            <AqiPill aqi={ktm.aqi} category={ktm.category} size="lg" />
            <span className="text-sm font-semibold" style={{ color: ktm.category.color }}>{ktm.category.label}</span>
          </div>
          <p className="mb-4 text-slate-300">{ktm.category.advice}</p>
          <div className="grid gap-6 md:grid-cols-2">
            <PollutantGrid pollutants={ktm.pollutants} />
            <ForecastChart forecast={ktm.forecast} height={110} />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">AQI</th>
              <th className="hidden px-4 py-3 sm:table-cell">PM2.5</th>
              <th className="hidden px-4 py-3 sm:table-cell">PM10</th>
              <th className="hidden w-1/3 px-4 py-3 md:table-cell">Next 36h</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map((c) => {
              const pm = (k) => c.pollutants.find((p) => p.key === k)?.value
              return (
                <tr key={c.slug} className="text-slate-300">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="text-xs" style={{ color: c.category.color }}>{c.category.label}</p>
                  </td>
                  <td className="px-4 py-3"><AqiPill aqi={c.aqi} category={c.category} /></td>
                  <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{pm('pm2_5')?.toFixed(1) ?? '—'}</td>
                  <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{pm('pm10')?.toFixed(1) ?? '—'}</td>
                  <td className="hidden px-4 py-3 md:table-cell"><ForecastChart forecast={c.forecast} height={32} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
