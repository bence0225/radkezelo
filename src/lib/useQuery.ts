import { useCallback, useEffect, useState } from 'react'

interface Result<T> {
  data: T | null
  error: { message: string } | null
}

export function useQuery<T>(fetcher: () => PromiseLike<Result<T>>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.resolve(fetcher()).then((res) => {
      if (cancelled) return
      setData(res.data)
      setError(res.error?.message ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
