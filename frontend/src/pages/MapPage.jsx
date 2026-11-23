import { Fragment, useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Crosshair, MapPin, Radio, X } from 'lucide-react'
import { api, useApi } from '../lib/api'
import { AqiPill, ErrorBox, ForecastChart, PollutantGrid, Spinner, formatTime } from '../components/ui'

const CENTER = [27.7, 85.32]

function pillIcon(aqi, color, selected) {
  return L.divIcon({
    className: '',
    html: `<div class="aqi-marker${selected ? ' is-selected' : ''}" style="--c:${color}">${aqi ?? '–'}</div>`,
    iconSize: [44, 28],
    iconAnchor: [22, 14],
  })
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, Math.max(map.getZoom(), 11), { duration: 1 }) }, [target, map])
  return null
}

function ClickProbe({ onProbe }) {
  useMapEvents({ click: (e) => onProbe(e.latlng) })
  return null
}

function DetailCard({ title, subtitle, data, onClose }) {
  return (
    <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl text-white"
             style={{ background: data.category.color }}>
          <span className="text-2xl font-black leading-none tabular-nums">{data.aqi ?? '—'}</span>
          <span className="text-[9px] font-bold uppercase opacity-80">US AQI</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-white">{title}</h3>
          <p className="text-sm font-semibold" style={{ color: data.category.color }}>{data.category.label}</p>
          <p className="mt-1 text-sm text-slate-300">{data.category.advice}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        )}
      </div>
      {/* On phones keep the card short so the map stays visible; details live on the dashboard. */}
      <div className="hidden sm:block">
        <PollutantGrid pollutants={data.pollutants} />
        {data.forecast && <div className="mt-4"><ForecastChart forecast={data.forecast} height={64} /></div>}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">{subtitle} · Updated {formatTime(data.updated)}</p>
    </div>
  )
}

export default function MapPage() {
  const cities = useApi('/api/cities?include_forecast=true')
  const stations = useApi('/api/stations')
  const [selected, setSelected] = useState('kathmandu')
  const [probe, setProbe] = useState(null) // { lat, lng, data?, error?, label }
  const [showStations, setShowStations] = useState(true)

  const list = useMemo(() => cities.data ?? [], [cities.data])
  const active = list.find((c) => c.slug === selected)
  const flyTarget = useMemo(
    () => (probe ? [probe.lat, probe.lng] : active ? [active.lat, active.lng] : null),
    [probe?.lat, probe?.lng, active?.slug],
  )

  async function runProbe(lat, lng, label) {
    setProbe({ lat, lng, label })
    try {
      const data = await api(`/api/aqi?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`)
      setProbe({ lat, lng, label, data })
    } catch (error) {
      setProbe({ lat, lng, label, error })
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => runProbe(pos.coords.latitude, pos.coords.longitude, 'Your location'),
      (err) => setProbe({ lat: CENTER[0], lng: CENTER[1], label: 'Your location', error: new Error(err.message) }),
      { timeout: 10000 },
    )
  }

  const sorted = [...list].sort((a, b) => (b.aqi ?? -1) - (a.aqi ?? -1))
  const stationList = stations.data?.stations ?? []

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col md:flex-row">
      <aside className="flex max-h-[32dvh] flex-col border-b border-slate-800 bg-slate-950 md:max-h-none md:w-80 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Cities · worst first</h2>
          <button onClick={locateMe} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
            <Crosshair size={14} /> Near me
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {cities.loading && !list.length && <Spinner />}
          {cities.error && <div className="p-2"><ErrorBox error={cities.error} onRetry={cities.reload} /></div>}
          {sorted.map((c) => (
            <button key={c.slug}
              onClick={() => { setSelected(c.slug); setProbe(null) }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                c.slug === selected && !probe ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`}>
              <span>
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className="block text-[11px]" style={{ color: c.category.color }}>{c.category.label}</span>
              </span>
              <AqiPill aqi={c.aqi} category={c.category} />
            </button>
          ))}
        </div>
        {stations.data?.enabled && (
          <label className="flex cursor-pointer items-center gap-2 border-t border-slate-800 p-4 text-xs text-slate-400">
            <input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} className="accent-blue-500" />
            <Radio size={14} /> Show ground sensors ({stationList.length})
          </label>
        )}
      </aside>

      <div className="relative flex-1">
        <MapContainer center={CENTER} zoom={10} className="h-full w-full" zoomControl={false}>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-tiles"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FlyTo target={flyTarget} />
          <ClickProbe onProbe={({ lat, lng }) => runProbe(lat, lng, 'Selected point')} />

          {list.map((c) => {
            const isSel = c.slug === selected && !probe
            return (
              <Fragment key={c.slug}>
                <Circle center={[c.lat, c.lng]} radius={4000}
                  pathOptions={{ color: c.category.color, fillColor: c.category.color, fillOpacity: isSel ? 0.25 : 0.12, weight: isSel ? 2 : 1 }}
                  className={isSel ? 'pulse' : ''} interactive={false} />
                <Marker position={[c.lat, c.lng]} icon={pillIcon(c.aqi, c.category.color, isSel)}
                  eventHandlers={{ click: () => { setSelected(c.slug); setProbe(null) } }}>
                  <Tooltip direction="top" offset={[0, -14]}>{c.name}</Tooltip>
                </Marker>
              </Fragment>
            )
          })}

          {showStations && stationList.map((s) => (
            <CircleMarker key={s.uid} center={[s.lat, s.lng]} radius={6}
              pathOptions={{ color: '#fff', weight: 2, fillColor: s.category.color, fillOpacity: 1 }}>
              <Tooltip>{s.name} — sensor AQI {s.aqi}</Tooltip>
            </CircleMarker>
          ))}

          {probe && (
            <Marker position={[probe.lat, probe.lng]}
              icon={L.divIcon({ className: '', html: '<div class="probe-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })} />
          )}
        </MapContainer>

        <p className="pointer-events-none absolute top-3 left-1/2 z-[1000] hidden -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-400 md:block">
          <MapPin size={12} className="mr-1 inline" /> Click anywhere on the map to check its air quality
        </p>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000] flex justify-center md:inset-x-6 md:bottom-6">
          {probe ? (
            probe.data ? (
              <DetailCard title={probe.label} subtitle={`${probe.lat.toFixed(3)}, ${probe.lng.toFixed(3)} · modelled`} data={probe.data} onClose={() => setProbe(null)} />
            ) : probe.error ? (
              <div className="pointer-events-auto w-full max-w-xl"><ErrorBox error={probe.error} /></div>
            ) : (
              <div className="pointer-events-auto rounded-2xl bg-slate-900/90"><Spinner label="Checking this spot…" /></div>
            )
          ) : active ? (
            <DetailCard title={active.name} subtitle="Modelled by CAMS via Open-Meteo" data={active} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
