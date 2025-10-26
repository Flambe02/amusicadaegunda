// Node test: admin CRUD validation with RLS
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

if (!url || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
if (!adminEmail || !adminPassword) throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD')

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  console.log('🔐 Signing in admin...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
  if (signInError) throw signInError
  console.log('✅ Signed in as', signInData.user.email)

  console.log('🔎 Checking admin membership...')
  const { data: adminRow, error: adminErr } = await supabase.from('admins').select('user_id').eq('user_id', signInData.user.id).single()
  if (adminErr || !adminRow) {
    console.error('❌ Not an admin or cannot read admins row')
    console.error('➡️ Run this SQL in Supabase SQL editor to grant admin:')
    console.error(`INSERT INTO public.admins(user_id) VALUES ('${signInData.user.id}') ON CONFLICT (user_id) DO NOTHING;`)
    throw new Error('Not an admin or cannot read admins row')
  }
  console.log('✅ Admin membership confirmed')

  console.log('📦 Creating draft song...')
  const testSong = {
    title: `Node Test ${Date.now()}`,
    artist: 'A Música da Segunda',
    description: 'Node CRUD test',
    lyrics: 'Test',
    release_date: new Date().toISOString().slice(0,10),
    status: 'draft',
    hashtags: ['test']
  }
  const { data: created, error: createError } = await supabase.from('songs').insert([testSong]).select().single()
  if (createError) throw createError
  console.log('✅ Created song id', created.id)

  console.log('✏️ Updating song...')
  const { data: updated, error: updateError } = await supabase.from('songs').update({ description: 'Node CRUD test updated' }).eq('id', created.id).select().single()
  if (updateError) throw updateError
  console.log('✅ Updated song id', updated.id)

  console.log('🗑️ Deleting song...')
  const { error: deleteError } = await supabase.from('songs').delete().eq('id', created.id)
  if (deleteError) throw deleteError
  console.log('✅ Deleted song id', created.id)

  console.log('\n🎉 Admin CRUD test passed')
}

main().catch((e) => { console.error('❌ Test failed:', e); process.exit(1) })


