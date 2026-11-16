import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { T } from './tables'
import type { Ertesites } from './types'

const LIMIT = 30

// A bejelentkezett felhasználó értesítései: a legutóbbi 30 a listához, és az összes
// olvasatlan száma a csengőhöz. Új értesítés Realtime-on érkezik, és ha a lap a háttérből
// visszakerül előtérbe, újratöltjük (ha közben megszakadt volna a kapcsolat).
// Az onNew akkor hívódik, amikor bejelentkezve, élőben érkezik egy új értesítés.
export function useNotifications(userId: string | undefined, onNew?: (n: Ertesites) => void) {
  const onNewRef = useRef(onNew)
  useEffect(() => { onNewRef.current = onNew })
  const [items, setItems] = useState<Ertesites[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    const [list, count] = await Promise.all([
      supabase.from(T.notifications).select('*').eq('user_id', userId)
        .order('letrehozva', { ascending: false }).limit(LIMIT).returns<Ertesites[]>(),
      supabase.from(T.notifications).select('id', { count: 'exact', head: true })
        .eq('user_id', userId).is('olvasva', null),
    ])
    setItems(list.data ?? [])
    setUnread(count.count ?? 0)
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    load()
    const channel = supabase
      .channel(`ertesitesek-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: T.notifications, filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Ertesites
          setItems((prev) => [n, ...prev].slice(0, LIMIT))
          setUnread((c) => c + 1)
          onNewRef.current?.(n)
        })
      .subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, load])

  async function markRead(id: number) {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.id === id && !n.olvasva ? { ...n, olvasva: now } : n)))
    if (items.some((n) => n.id === id && !n.olvasva)) setUnread((c) => Math.max(0, c - 1))
    await supabase.from(T.notifications).update({ olvasva: now }).eq('id', id).is('olvasva', null)
  }

  async function markAllRead() {
    if (!userId) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.olvasva ? n : { ...n, olvasva: now })))
    setUnread(0)
    await supabase.from(T.notifications).update({ olvasva: now }).eq('user_id', userId).is('olvasva', null)
  }

  return { items, unread, loaded, markRead, markAllRead }
}
