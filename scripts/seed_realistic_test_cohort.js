/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedRealisticCohort() {
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
    { email: 'nikhil@skyld.com', password: 'password123', role: 'student', full_name: 'Nikhil' },
    { email: 'yuvraj@skyld.com', password: 'password123', role: 'student', full_name: 'Yuvraj' },
    { email: 'srikar@skyld.com', password: 'password123', role: 'student', full_name: 'Srikar' },
    { email: 'ananya@skyld.com', password: 'password123', role: 'student', full_name: 'Ananya' },
    { email: 'rahul@skyld.com', password: 'password123', role: 'student', full_name: 'Rahul' },
    { email: 'priya@skyld.com', password: 'password123', role: 'student', full_name: 'Priya' },
  ];

  console.log('=== 1. SEEDING AUTH USERS & PROFILES ===');
  const userMap = {};

  for (const acc of testAccounts) {
    let userId = null;

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find(u => u.email.toLowerCase() === acc.email.toLowerCase());
        if (existing) {
          userId = existing.id;
          await supabase.auth.admin.updateUserById(userId, { password: acc.password, email_confirm: true });
          console.log(`[AUTH] Updated password for ${acc.email}`);
        }
      } else {
        console.error(`[AUTH] Error creating ${acc.email}:`, createError.message);
      }
    } else {
      userId = createData.user.id;
      console.log(`[AUTH] Created ${acc.email}`);
    }

    if (userId) {
      userMap[acc.email] = userId;
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from('users').insert({
          id: userId,
          email: acc.email,
          full_name: acc.full_name,
          role: acc.role,
          consent_given: true,
          consent_date: new Date().toISOString()
        });
        console.log(`[PROFILE] Created profile for ${acc.full_name} (${acc.role})`);
      } else {
        await supabase.from('users').update({
          full_name: acc.full_name,
          role: acc.role
        }).eq('id', userId);
        console.log(`[PROFILE] Synced profile for ${acc.full_name}`);
      }
    }
  }

  console.log('\n=== 2. SEEDING ORGANIZATIONAL HIERARCHY ===');
  // 1. Batch 2027
  let batchId = null;
  const { data: existingBatch } = await supabase.from('batches').select('id').eq('name', 'Batch 2027').maybeSingle();
  if (existingBatch) {
    batchId = existingBatch.id;
  } else {
    const { data: newBatch } = await supabase.from('batches').insert({
      name: 'Batch 2027',
      start_date: new Date().toISOString().split('T')[0],
      active: true
    }).select().single();
    batchId = newBatch?.id;
  }
  console.log(`[BATCH] Batch 2027 ID: ${batchId}`);

  // 2. Unit A
  let unitId = null;
  const { data: existingUnit } = await supabase.from('units').select('id').eq('name', 'Unit A').eq('batch_id', batchId).maybeSingle();
  if (existingUnit) {
    unitId = existingUnit.id;
  } else {
    const { data: newUnit } = await supabase.from('units').insert({
      name: 'Unit A',
      batch_id: batchId,
      active: true
    }).select().single();
    unitId = newUnit?.id;
  }
  console.log(`[UNIT] Unit A ID: ${unitId}`);

  // 3. Pod Alpha & Pod Beta
  let podAlphaId = null;
  let podBetaId = null;

  const { data: existingAlpha } = await supabase.from('pods').select('id').eq('name', 'Pod Alpha').maybeSingle();
  if (existingAlpha) {
    podAlphaId = existingAlpha.id;
    await supabase.from('pods').update({ unit_id: unitId }).eq('id', podAlphaId);
  } else {
    const { data: newAlpha } = await supabase.from('pods').insert({
      name: 'Pod Alpha',
      unit_id: unitId
    }).select().single();
    podAlphaId = newAlpha?.id;
  }

  const { data: existingBeta } = await supabase.from('pods').select('id').eq('name', 'Pod Beta').maybeSingle();
  if (existingBeta) {
    podBetaId = existingBeta.id;
    await supabase.from('pods').update({ unit_id: unitId }).eq('id', podBetaId);
  } else {
    const { data: newBeta } = await supabase.from('pods').insert({
      name: 'Pod Beta',
      unit_id: unitId
    }).select().single();
    podBetaId = newBeta?.id;
  }
  console.log(`[PODS] Pod Alpha: ${podAlphaId}, Pod Beta: ${podBetaId}`);

  console.log('\n=== 3. ASSIGNING STUDENTS TO HIERARCHY ===');
  const alphaStudents = ['nikhil@skyld.com', 'yuvraj@skyld.com', 'srikar@skyld.com', 'ananya@skyld.com'];
  for (const email of alphaStudents) {
    if (userMap[email]) {
      await supabase.from('users').update({
        batch_id: batchId,
        unit_id: unitId,
        pod_id: podAlphaId
      }).eq('id', userMap[email]);
      console.log(`[ASSIGN] ${email} -> Pod Alpha`);
    }
  }

  const betaStudents = ['rahul@skyld.com', 'priya@skyld.com'];
  for (const email of betaStudents) {
    if (userMap[email]) {
      await supabase.from('users').update({
        batch_id: batchId,
        unit_id: unitId,
        pod_id: podBetaId
      }).eq('id', userMap[email]);
      console.log(`[ASSIGN] ${email} -> Pod Beta`);
    }
  }

  console.log('\n=== 4. ESTABLISHING BUDDY PAIRS ===');
  // Nikhil <-> Yuvraj
  const nikhilId = userMap['nikhil@skyld.com'];
  const yuvrajId = userMap['yuvraj@skyld.com'];
  if (nikhilId && yuvrajId) {
    const u1 = nikhilId < yuvrajId ? nikhilId : yuvrajId;
    const u2 = nikhilId < yuvrajId ? yuvrajId : nikhilId;
    
    // Clear old active buddy pairs for these two to avoid unique constraint violations
    await supabase.from('buddy_pairs').delete().or(`user1_id.in.(${nikhilId},${yuvrajId}),user2_id.in.(${nikhilId},${yuvrajId})`);
    
    await supabase.from('buddy_pairs').insert({
      pod_id: podAlphaId,
      user1_id: u1,
      user2_id: u2,
      active: true,
      created_by: userMap['admin@skyld.com']
    });
    console.log(`[BUDDY] Created pair: Nikhil <-> Yuvraj in Pod Alpha`);
  }

  // Rahul <-> Priya
  const rahulId = userMap['rahul@skyld.com'];
  const priyaId = userMap['priya@skyld.com'];
  if (rahulId && priyaId) {
    const u1 = rahulId < priyaId ? rahulId : priyaId;
    const u2 = rahulId < priyaId ? priyaId : rahulId;
    
    await supabase.from('buddy_pairs').delete().or(`user1_id.in.(${rahulId},${priyaId}),user2_id.in.(${rahulId},${priyaId})`);
    
    await supabase.from('buddy_pairs').insert({
      pod_id: podBetaId,
      user1_id: u1,
      user2_id: u2,
      active: true,
      created_by: userMap['admin@skyld.com']
    });
    console.log(`[BUDDY] Created pair: Rahul <-> Priya in Pod Beta`);
  }

  console.log('\n=== 5. VERIFYING SIGN-IN TEST ===');
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  for (const acc of testAccounts) {
    const { data: signData, error: signError } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });
    if (signError) {
      console.error(`[SIGN-IN FAILED] ${acc.email}: ${signError.message}`);
    } else {
      console.log(`[SIGN-IN OK] ${acc.email} (${acc.full_name}) authenticated successfully!`);
    }
  }

  console.log('\n✅ Real test cohort successfully seeded!');
}

seedRealisticCohort();
