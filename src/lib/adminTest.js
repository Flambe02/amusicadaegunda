import { supabase, TABLES } from '@/lib/supabase'

export async function testAdminCrud() {
  // 1) Check session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session) throw new Error('No session - please sign in as admin')

  // 2) Check admin membership
  const { data: adminRow, error: adminError } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .single()
  if (adminError || !adminRow) throw new Error('User is not admin or cannot read admins row')

  // 3) Create song (draft)
  const testSong = {
    title: `Test Admin CRUD ${Date.now()}`,
    artist: 'A Música da Segunda',
    description: 'CRUD test',
    lyrics: 'Test',
    release_date: new Date().toISOString().slice(0,10),
    status: 'draft',
    hashtags: ['test']
  }
  const { data: created, error: createError } = await supabase
    .from(TABLES.SONGS)
    .insert([testSong])
    .select()
    .single()
  if (createError) throw createError

  // 4) Update song
  const { data: _updated, error: updateError } = await supabase
    .from(TABLES.SONGS)
    .update({ description: 'CRUD test updated' })
    .eq('id', created.id)
    .select()
    .single()
  if (updateError) throw updateError

  // 5) Delete song
  const { error: deleteError } = await supabase
    .from(TABLES.SONGS)
    .delete()
    .eq('id', created.id)
  if (deleteError) throw deleteError

  return { ok: true, createdId: created.id }
}


