// Supabase Edge Function: e-mail az új értesítésekről.
//
// Egy Database Webhook hívja meg minden új `ertesitesek` sornál (INSERT), és a Resend
// szolgáltatással elküldi az értesítést a címzett bejelentkezési e-mail-címére.
//
// Beállítás (Supabase Dashboard):
//   1. Edge Functions → Deploy a new function → Via Editor, név: ertesites-email,
//      tartalom: ez a fájl. A függvény beállításainál a "Verify JWT" legyen KIKAPCSOLVA —
//      a hívót a lenti titkos fejléc azonosítja.
//   2. Edge Functions → Secrets:
//        RESEND_API_KEY   – a Resend API-kulcsa (resend.com → API Keys)
//        ERTESITES_FROM   – feladó, pl. "Raktárkezelő <raktar@sajatdomain.hu>"
//                           (a domaint a Resendben hitelesíteni kell)
//        WEBHOOK_SECRET   – egy hosszú, véletlen szöveg
//        APP_URL          – opcionális, az alkalmazás címe a levél aljára
//   3. Database → Webhooks → Create: tábla public.ertesitesek, esemény Insert,
//      típus Supabase Edge Functions → ertesites-email, HTTP header:
//      x-webhook-secret = ugyanaz, mint a WEBHOOK_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const TARGY: Record<string, string> = {
  NEGATIV: 'Negatív készlet',
  ELFOGYOTT: 'Elfogyott a készlet',
  ALACSONY: 'Alacsony készlet',
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { type, record } = await req.json()
  if (type !== 'INSERT' || !record) return new Response('ignored')

  const { data: user, error } = await supabase.from('users').select('email, nev, aktiv').eq('id', record.user_id).single()
  if (error) return new Response(error.message, { status: 500 })
  if (!user.aktiv) return new Response('skipped: inactive user')

  const appUrl = Deno.env.get('APP_URL')
  const text = [
    `Kedves ${user.nev}!`,
    '',
    record.uzenet,
    '',
    appUrl ? `Részletek a Raktárkezelőben: ${appUrl}` : 'Részletek a Raktárkezelőben, a csengő ikonnál.',
    '',
    '— Raktárkezelő, SZTE Radiológiai Klinika (automatikus értesítés)',
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('ERTESITES_FROM'),
      to: user.email,
      subject: `Raktárkezelő: ${TARGY[record.tipus] ?? 'Értesítés'}`,
      text,
    }),
  })
  if (!res.ok) return new Response(`Resend hiba: ${await res.text()}`, { status: 502 })
  return new Response('ok')
})
