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

const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  try {
    const { count, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error fetching count:', countError);
      return;
    }
    
    console.log(`Total members: ${count}`);

    const { data: assignedStats, error: statsError } = await supabase
      .from('members')
      .select('assigned_to');
    
    if (statsError) {
      console.error('Error fetching members:', statsError);
      return;
    }

    const stats = {};
    assignedStats.forEach(m => {
      const key = m.assigned_to || 'unassigned';
      stats[key] = (stats[key] || 0) + 1;
    });

    console.log('Assignment distribution:', stats);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspect();
