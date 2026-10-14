// POST /api/report {id, device, reason} - hide an intention at once and send it for review.
// A device can report up to 10 intentions a day, so one person can't hide everything.
import { json, fail, hashKey, body, clean } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const b = await body(request);
  const device = await hashKey(b && b.device);
  if (!device || typeof b.id !== "string") return fail("Missing details.");
  const today = await env.DB.prepare(`SELECT COUNT(*) AS n FROM reports WHERE device = ? AND created_at > ?`)
    .bind(device, Date.now() - 24 * 3600 * 1000).first();
  if (today && today.n >= 10) return fail("Thank you. You've sent several reports today; we'll look at them soon.", 429);
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO reports (intention_id, device, reason, created_at) VALUES (?, ?, ?, ?)`)
      .bind(b.id, device, clean(b.reason, 200), Date.now()),
    env.DB.prepare(`UPDATE intentions SET status = 'hidden' WHERE id = ? AND status = 'approved'`).bind(b.id)
  ]);
  return json({ ok: true });
}
