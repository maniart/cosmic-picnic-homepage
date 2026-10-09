export const onRequestGet: PagesFunction = () =>
  new Response(JSON.stringify({ pong: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
