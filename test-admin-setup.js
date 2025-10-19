// Test script to verify admin setup and music creation
// Run this in the browser console on the admin page

console.log('🔍 Testing Admin Setup...');

// Test 1: Check if user is authenticated
async function testAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Auth error:', error);
      return false;
    }
    
    if (!session) {
      console.log('❌ No active session - user not logged in');
      return false;
    }
    
    console.log('✅ User is authenticated:', session.user.email);
    return true;
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return false;
  }
}

// Test 2: Check if user is admin
async function testAdminStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      console.error('❌ Admin check error:', error);
      return false;
    }
    
    if (!data) {
      console.log('❌ User is not an admin');
      return false;
    }
    
    console.log('✅ User is admin');
    return true;
  } catch (error) {
    console.error('❌ Admin test failed:', error);
    return false;
  }
}

// Test 3: Test reading songs (should work for admin)
async function testReadSongs() {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, status')
      .limit(5);
    
    if (error) {
      console.error('❌ Read songs error:', error);
      return false;
    }
    
    console.log('✅ Can read songs:', data?.length || 0, 'songs found');
    return true;
  } catch (error) {
    console.error('❌ Read songs test failed:', error);
    return false;
  }
}

// Test 4: Test creating a song (this is the main test)
async function testCreateSong() {
  try {
    const testSong = {
      title: 'Test Song - ' + new Date().toISOString(),
      artist: 'A Música da Segunda',
      description: 'Test song for admin verification',
      lyrics: 'Test lyrics...',
      release_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      hashtags: ['test', 'admin']
    };
    
    const { data, error } = await supabase
      .from('songs')
      .insert([testSong])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Create song error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log('✅ Successfully created test song:', data);
    
    // Clean up - delete the test song
    await supabase
      .from('songs')
      .delete()
      .eq('id', data.id);
    
    console.log('✅ Test song cleaned up');
    return true;
  } catch (error) {
    console.error('❌ Create song test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Admin Setup Tests...\n');
  
  const authOk = await testAuth();
  if (!authOk) {
    console.log('❌ Authentication failed - cannot proceed');
    return;
  }
  
  const adminOk = await testAdminStatus();
  if (!adminOk) {
    console.log('❌ Admin status failed - user is not admin');
    return;
  }
  
  const readOk = await testReadSongs();
  if (!readOk) {
    console.log('❌ Read songs failed - RLS policy issue');
    return;
  }
  
  const createOk = await testCreateSong();
  if (!createOk) {
    console.log('❌ Create song failed - this is the main issue');
    return;
  }
  
  console.log('\n🎉 All tests passed! Admin setup is working correctly.');
}

// Run the tests
runAllTests();
