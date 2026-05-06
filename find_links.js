import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findCandidateLink() {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, interview_token')
    .not('interview_token', 'is', null)
    .limit(5);
  
  if (error) console.error(error);
  else {
    console.log("CANDIDATE LINKS:");
    data.forEach(c => {
      console.log(`${c.first_name} ${c.last_name}: http://localhost:3000/interview/${c.interview_token}`);
    });
  }
}

findCandidateLink();
