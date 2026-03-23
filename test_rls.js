import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aplwijcwczwmsaifbjud.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbHdpamN3Y3p3bXNhaWZianVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyNTk1NiwiZXhwIjoyMDg5NjAxOTU2fQ.EKNotQ_dbzTM0Vk6gy5kISOkAZLru4EsxrOWJOUgq40';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  const userId = 'a627a4d9-2954-420d-a0fc-84f24ad93f1c'; // user ID
  
  // Call RPC to simulate request as user
  const { data, error } = await supabase.rpc('run_sql', { sql_query: `
    set local role authenticated;
    set local request.jwt.claim.sub = '${userId}';
    select id, title from trips;
  ` });
  console.log(data, error);
}
test();