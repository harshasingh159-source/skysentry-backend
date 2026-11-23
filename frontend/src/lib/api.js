import { useCallback, useEffect, useRef, useState } from 'react'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json()).detail || detail } catch { /* not JSON */ }
    throw new Error(detail)
  }
  return res.json()
}

/** Fetch `path`, re-fetching every `refreshMs` (default 10 min). Pass null to skip. */
export function useApi(path, refreshMs = 10 * 60 * 1000) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path })
  const live = useRef(true)

  const load = useCallback(async () => {
    if (!path) return
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await api(path)
      if (live.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (live.current) setState((s) => ({ ...s, error, loading: false }))
    }
  }, [path])

  useEffect(() => {
    live.current = true
    load()
    const id = refreshMs ? setInterval(load, refreshMs) : null
    return () => { live.current = false; if (id) clearInterval(id) }
  }, [load, refreshMs])

  return { ...state, reload: load }
}
