const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedAllUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const testAccounts = [
    { email: 'admin@skyld.com', password: 'password123', role: 'admin', full_name: 'System Admin' },
    { email: 'mentor1@skyld.com', password: 'password123', role: 'mentor', full_name: 'Dr. Sarah Connor' },
    { email: 'mentor2@skyld.com', password: 'password123', role: 'mentor', full_name: 'Prof. Charles Xavier' },
    { email: 'student1@skyld.com', password: 'password123', role: 'student', full_name: 'Alex Rivera' },
    { email: 'student2@skyld.com', password: 'password123', role: 'student', full_name: 'Jordan Lee' },
    { email: 'student3@skyld.com', password: 'password123', role: 'student', full_name: 'Taylor Swift' },
    { email: 'student4@skyld.com', password: 'password123', role: 'student', full_name: 'Morgan Freeman' },
    { email: 'student5@skyld.com', password: 'password123', role: 'student', full_name: 'Casey Neistat' },
    { email: 'student6@skyld.com', password: 'password123', role: 'student', full_name: 'Sam Altman' },
  ];

  console.log('Seeding and verifying all users in Supabase Auth & Users table...');

  for (const acc of testAccounts) {
    // 1. Check / Create Auth User
    let userId = null;

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        // Fetch existing user ID
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find(u => u.email === acc.email);
        if (existing) {
          userId = existing.id;
          // Update password to guarantee it matches 'password123'
          await supabase.auth.admin.updateUserById(userId, { password: acc.password, email_confirm: true });
          console.log(`[AUTH] Updated password for ${acc.email} -> 'password123'`);
        }
      } else {
        console.error(`[AUTH] Failed to create ${acc.email}:`, createError.message);
      }
    } else {
      userId = createData.user.id;
      console.log(`[AUTH] Created ${acc.email} -> 'password123'`);
    }

    // 2. Ensure profile exists in 'users' table
    if (userId) {
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from('users').insert({
          id: userId,
          email: acc.email,
          full_name: acc.full_name,
          role: acc.role,
          consent_given: true,
          consent_date: new Date().toISOString()
        });
        if (profileError) {
          console.error(`[PROFILE] Failed to insert profile for ${acc.email}:`, profileError.message);
        } else {
          console.log(`[PROFILE] Created profile for ${acc.email} with role '${acc.role}'`);
        }
      } else {
        // Ensure role is accurate
        await supabase.from('users').update({ role: acc.role, full_name: acc.full_name }).eq('id', userId);
        console.log(`[PROFILE] Profile exists for ${acc.email} (role: ${acc.role})`);
      }
    }
  }

  console.log('\n--- VERIFYING SIGN-IN TEST ---');
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  for (const acc of testAccounts) {
    const { data: signData, error: signError } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });
    if (signError) {
      console.error(`[SIGN-IN TEST FAILED] ${acc.email}:`, signError.message);
    } else {
      console.log(`[SIGN-IN TEST OK] ${acc.email} signed in successfully!`);
    }
  }
}

seedAllUsers();
