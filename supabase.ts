const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Supabase Error: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`Supabase Error: ${response.status} ${errorBody}`);
  }

  // Se a requisição for DELETE ou não tiver corpo, não tenta fazer parse JSON
  if (response.status === 204) return null;

  return response.json();
};
