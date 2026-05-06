import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
  const { data, error } = await supabase.rpc('inspect_table_constraints', { table_name: 'interview_messages' });
  console.log(data || error);
}

// But I don't have this RPC. I'll use a raw query if I can.
// Actually, I'll just try to fetch one message to see the columns.
async function getOneMessage() {
  const { data } = await supabase.from('interview_messages').select('*').limit(1);
  console.log(data);
}
