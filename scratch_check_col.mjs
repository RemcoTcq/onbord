import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('candidates')
    .select('credits_charged_tests')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success, data:", data);
  }
}
run();
