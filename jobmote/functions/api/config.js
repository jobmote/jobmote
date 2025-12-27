export async function onRequest({ env }) {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(
      JSON.stringify({
        error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY in Cloudflare Pages environment variables."
      }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }

  return new Response(JSON.stringify({ url, anonKey }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
