import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://piagucmxxsimuububnyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWd1Y214eHNpbXV1YnVibnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzkzMTMsImV4cCI6MjEwNjkxNTMxM30.1lhfafp1xa_JKw6EHK6kilg5fZTMs1_d-hNA0ZKljWE'
);

async function test() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users:', data);
  }
}

test();
