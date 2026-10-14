// POST /api/admin/decide {id, action}
//   approve - people can pray for it
//   reject  - never shown (the person who shared it sees it is no longer active)
//   hide    - take an approved intention down
// Every decision is noted in the moderation column, so the history stays visible.
import { json, fail, body } from "../../../lib/server.js";

const TO = { approve: "approved", reject: "rejected", hide: "hidden" };

export async function onRequestPost({ request, env }) {
  const b = await body(request);
  const status = b && TO[b.action];
  if (!status || typeof b.id !== "string") return fail("Unknown action.");
  const now = Date.now();
  const note = ` | admin:${b.action} ${new Date(now).toISOString().slice(0, 16)}`;
  const res = await env.DB.prepare(
    `UPDATE intentions SET status = ?, moderation = substr(moderation || ?, -2000),
            approved_at = CASE WHEN ? = 'approved' THEN COALESCE(approved_at, ?) ELSE approved_at END
      WHERE id = ?`
  ).bind(status, note, status, now, b.id).run();
  if (!res.meta || !res.meta.changes) return fail("That intention no longer exists.", 404);
  // An intention put back after reports starts clean, so one new report can hide it again.
  if (status === "approved") await env.DB.prepare(`DELETE FROM reports WHERE intention_id = ?`).bind(b.id).run();
  return json({ ok: true, id: b.id, status });
}
