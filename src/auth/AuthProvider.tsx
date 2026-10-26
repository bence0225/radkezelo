import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { T } from '../lib/tables'
import type { Location, Profile } from '../lib/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  /** A felhasználó számára elérhető (aktív) lerakatok. */
  locations: Location[]
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  /** Újratölti a lerakat-listát (pl. Törzsadatokban felvett/módosított lerakat után). */
  reloadLocations: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setLocations([])
        setLoading(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  // Lerakatok lekérdezése a szerepkör szerint (Admin: minden aktív; Felhasználó: csak a
  // hozzárendelt). Külön függvényként, hogy Törzsadatok-módosítás után is újra lehessen
  // hívni, nem csak bejelentkezéskor.
  const fetchLocations = useCallback(async (uid: string, prof: Profile | null): Promise<Location[]> => {
    if (!prof?.aktiv) return []
    if (prof.szerepkor === 'ADMIN') {
      const { data } = await supabase.from(T.locations).select('*').eq('aktiv', true).order('nev')
      return (data as Location[]) ?? []
    }
    const { data: links } = await supabase.from(T.userLocations).select('location_id').eq('user_id', uid)
    const ids = (links ?? []).map((l) => l.location_id as number)
    if (!ids.length) return []
    const { data } = await supabase.from(T.locations).select('*').in('id', ids).eq('aktiv', true).order('nev')
    return (data as Location[]) ?? []
  }, [])

  const reloadLocations = useCallback(async () => {
    if (!userId) return
    setLocations(await fetchLocations(userId, profile))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile, fetchLocations])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      // A users tábla profil-tábla: id = auth.users.id
      const { data: p } = await supabase.from(T.users).select('*').eq('id', userId).maybeSingle()
      const prof = p as Profile | null
      const locs = await fetchLocations(userId, prof)
      if (cancelled) return
      setProfile(prof)
      setLocations(locs)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [userId, fetchLocations])

  const value: AuthState = {
    session,
    profile,
    locations,
    loading,
    isAdmin: profile?.szerepkor === 'ADMIN',
    signOut: async () => {
      await supabase.auth.signOut()
    },
    reloadLocations,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth csak AuthProvider-en belül használható')
  return ctx
}
