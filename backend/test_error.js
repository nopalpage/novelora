require('dotenv').config({ path: '.dev.vars' });
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.from('novels').update({ title: 'test' }).eq('id', 'nonexistent').select().single();
  console.log('Error message:', error?.message);
}
run();
