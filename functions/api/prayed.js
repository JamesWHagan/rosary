// POST /api/prayed {id, device} - a decade for this intention was finished.
// Counted once per device per intention.
import { json, fail, hashKey, body } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const b = await body(request);
  const device = await hashKey(b && b.device);
  if (!device || !b.id) return fail("Missing details.");
  const ins = await env.DB.prepare(
    `INSERT OR IGNORE INTO prayers (intention_id, device, created_at)
     SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM intentions WHERE id = ? AND status = 'approved')`
  ).bind(b.id, device, Date.now(), b.id).run();
  if (ins.meta && ins.meta.changes > 0) {
    await env.DB.prepare(`UPDATE intentions SET prayed = prayed + 1 WHERE id = ?`).bind(b.id).run();
    return json({ ok: true, counted: true });
  }
  return json({ ok: true, counted: false });
}
