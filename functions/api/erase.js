// POST /api/erase {device} - "Erase my data": removes everything linked to this browser.
// - the intentions it shared (and the prayers and reports recorded on them)
// - which intentions it prayed for, and the reports it sent
// Decades it prayed for other people's intentions still count on those intentions.
import { json, fail, hashKey, body } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const b = await body(request);
  const device = await hashKey(b && b.device);
  if (!device) return fail("Missing device.");
  const mine = `SELECT id FROM intentions WHERE owner = ?`;
  const res = await env.DB.batch([
    env.DB.prepare(`DELETE FROM prayers WHERE intention_id IN (${mine})`).bind(device),
    env.DB.prepare(`DELETE FROM reports WHERE intention_id IN (${mine})`).bind(device),
    env.DB.prepare(`DELETE FROM intentions WHERE owner = ?`).bind(device),
    env.DB.prepare(`DELETE FROM prayers WHERE device = ?`).bind(device),
    env.DB.prepare(`DELETE FROM reports WHERE device = ?`).bind(device)
  ]);
  return json({ ok: true, intentions: res[2].meta ? res[2].meta.changes : 0 });
}
