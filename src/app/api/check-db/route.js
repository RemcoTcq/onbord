import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: cData, error: cErr } = await supabase.from('candidates').select('credits_charged_tests').limit(1);
  return NextResponse.json({ candidates: cData, cErr });
}
