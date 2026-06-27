import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// We need service_role key to bypass RLS or inspect schema, but let's try with what we have.
// Wait, we can't get process.env easily in a Node script unless we load .env.local

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log(error ? error : Object.keys(data[0] || {}));
}
run();
