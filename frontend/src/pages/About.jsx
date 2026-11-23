import { useApi } from '../lib/api'
import { Spinner } from '../components/ui'

export default function About() {
  const { data: scale } = useApi('/api/scale', 0)
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 text-slate-300 md:p-8">
      <section>
        <h1 className="mb-3 text-2xl font-black text-white">About SkySentry</h1>
        <p>
          SkySentry tracks air quality across Bagmati Province, Nepal. City readings and the 36-hour forecast
          come from the CAMS atmospheric model via <a className="text-blue-400 hover:underline" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo</a>,
          so every city and any point you click has its own local estimate. When a WAQI token is configured,
          real ground sensors from <a className="text-blue-400 hover:underline" href="https://aqicn.org" target="_blank" rel="noreferrer">aqicn.org</a> are
          shown as white-ringed dots on the map.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Model values are estimates on a ~10&nbsp;km grid and can differ from a nearby sensor. Not for medical decisions.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">US AQI scale</h2>
        {!scale ? <Spinner /> : (
          <div className="space-y-2">
            {scale.map((c, i) => (
              <div key={c.key} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="w-20 shrink-0 rounded-lg py-2 text-center text-sm font-bold text-white" style={{ background: c.color }}>
                  {i === 0 ? 0 : scale[i - 1].max + 1}{i === scale.length - 1 ? '+' : `–${c.max}`}
                </div>
                <div>
                  <p className="font-semibold text-white">{c.label}</p>
                  <p className="text-sm text-slate-400">{c.advice}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
