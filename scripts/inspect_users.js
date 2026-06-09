const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index > 0) {
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      envConfig[key] = val;
    }
  });
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function inspect() {
  try {
    console.log('--- FETCHING AUTH USERS ---');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error listing auth users:', authError);
    } else {
      console.log(`Found ${users.length} user(s) in auth.users:`);
      users.forEach(u => {
        console.log(`- ID: ${u.id}, Email: ${u.email}, Confirmed At: ${u.email_confirmed_at}, Created At: ${u.created_at}`);
      });
    }

    console.log('\n--- FETCHING CALLERS PROFILE TABLE ---');
    const { data: callers, error: callersError } = await supabase
      .from('callers')
      .select('*');
    
    if (callersError) {
      console.error('Error querying callers table:', callersError);
    } else {
      console.log(`Found ${callers.length} record(s) in public.callers:`);
      callers.forEach(c => {
        console.log(`- ID: ${c.id}, Email: ${c.email}, Name: ${c.name}, Role: ${c.role}`);
      });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspect();
