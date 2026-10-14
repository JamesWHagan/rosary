// GET /api/featured?device=KEY - up to 3 approved intentions nobody has prayed for yet,
// plus how many are waiting in total (for "N intentions are waiting for a prayer").
import { json, hashKey, publicView } from "../../lib/server.js";

export async function onRequestGet({ request, env }) {
  const device = (await hashKey(new URL(request.url).searchParams.get("device"))) || "";
  const { results } = await env.DB.prepare(
    `SELECT * FROM intentions WHERE status = 'approved' AND prayed = 0 AND owner != ?
      ORDER BY RANDOM() LIMIT 3`
  ).bind(device).all();
  const waiting = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM intentions WHERE status = 'approved' AND prayed = 0`
  ).first();
  return json({ ok: true, intentions: results.map(publicView), waiting: waiting ? waiting.n : 0 });
}
