/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const email = 'admin@skyld.com';
  const password = 'password123';

  console.log(`Checking if ${email} exists...`);
  
  // Create user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error && error.message.includes('already exists')) {
    console.log(`User ${email} already exists.`);
  } else if (error) {
    console.error('Failed to create user:', error);
    process.exit(1);
  } else {
    console.log(`Successfully created user: ${email}`);
    
    // Create profile
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      full_name: 'System Admin',
      role: 'admin',
      consent_given: true,
      consent_date: new Date().toISOString()
    });
    
    if (profileError) {
      console.error('Failed to create admin profile:', profileError);
    } else {
      console.log('Admin profile created successfully!');
    }
  }
}

seedAdmin();
