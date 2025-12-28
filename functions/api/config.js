export async function onRequestGet({ env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response("Missing SUPABASE env vars", { status: 500 });
  }

  return new Response(
    JSON.stringify({ SUPABASE_URL, SUPABASE_ANON_KEY }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}
