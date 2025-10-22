// Node test: push_subscriptions upsert (Option A - public insert)
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const endpoint = `https://example.push/${Date.now()}`
  const p256dh = 'BASE64P256DH'
  const auth = 'BASE64AUTH'

  console.log('📨 Inserting push subscription...')
  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert({ endpoint, p256dh, auth, topics: ['new-song'] })
    .select('endpoint')
    .single()
  if (error) throw error
  console.log('✅ Inserted:', data)

  console.log('🔁 Updating same endpoint topics...')
  const { data: data2, error: error2 } = await supabase
    .from('push_subscriptions')
    .update({ topics: ['new-song'] })
    .eq('endpoint', endpoint)
    .select('endpoint')
    .single()
  if (error2) throw error2
  console.log('✅ Update OK:', data2)

  console.log('\n🎉 Push upsert test passed')
}

main().catch((e) => { console.error('❌ Test failed:', e); process.exit(1) })


