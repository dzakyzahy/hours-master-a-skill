import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  const users = [
    { email: 'dzakyzr3@gmail.com', password: 'zahy123hours', username: 'zahy' },
    { email: 'dikydwi442@gmail.com', password: 'diky123hours', username: 'diky' }
  ];

  for (const u of users) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password
    });
    console.log('Signup:', u.email, error ? error.message : 'Success');
    
    if (data.user) {
      // Update the profile username since the trigger sets it to email prefix
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: u.username })
        .eq('id', data.user.id);
      
      console.log('Update profile:', u.username, profileError ? profileError.message : 'Success');
    }
  }
}
setup();
