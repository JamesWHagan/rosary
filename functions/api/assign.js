// GET /api/assign?n=3 (up to 20)&device=KEY&for=id1,id2
// Intentions to pray for: the ones asked for first (from the home page), then the
// least-prayed approved intentions, never your own, never one you already prayed for.
import { json, fail, hashKey, publicView } from "../../lib/server.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const device = await hashKey(url.searchParams.get("device"));
  if (!device) return fail("Missing device.");
  const n = Math.max(1, Math.min(20, Number(url.searchParams.get("n")) || 1));
  const wanted = (url.searchParams.get("for") || "").split(",").filter(Boolean).slice(0, 5);

  let picked = [];
  if (wanted.length) {
    const marks = wanted.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT * FROM intentions WHERE id IN (${marks}) AND status = 'approved' AND owner != ?`
    ).bind(...wanted, device).all();
    picked = wanted.map((id) => results.find((r) => r.id === id)).filter(Boolean);
  }

  if (picked.length < n) {
    const skip = picked.map((r) => r.id);
    const marks = skip.length ? `AND i.id NOT IN (${skip.map(() => "?").join(",")})` : "";
    const { results } = await env.DB.prepare(
      `SELECT i.* FROM intentions i
        WHERE i.status = 'approved' AND i.owner != ? ${marks}
          AND NOT EXISTS (SELECT 1 FROM prayers p WHERE p.intention_id = i.id AND p.device = ?)
        ORDER BY i.prayed ASC, RANDOM() LIMIT ?`
    ).bind(device, ...skip, device, n - picked.length).all();
    picked = picked.concat(results);
  }
  return json({ ok: true, intentions: picked.slice(0, n).map(publicView) });
}
