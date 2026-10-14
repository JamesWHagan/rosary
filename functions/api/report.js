// POST /api/report {id, device, reason} - hide an intention at once and send it for review.
import { json, fail, hashKey, body, clean } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const b = await body(request);
  const device = await hashKey(b && b.device);
  if (!device || !b.id) return fail("Missing details.");
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO reports (intention_id, device, reason, created_at) VALUES (?, ?, ?, ?)`)
      .bind(b.id, device, clean(b.reason, 200), Date.now()),
    env.DB.prepare(`UPDATE intentions SET status = 'hidden' WHERE id = ? AND status = 'approved'`).bind(b.id)
  ]);
  return json({ ok: true });
}
