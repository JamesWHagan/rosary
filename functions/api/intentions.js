// POST /api/intentions  - share a new intention
// GET  /api/intentions?device=KEY - the intentions this device shared ("My intentions")
import { json, fail, hashKey, newId, body, clean, LIMITS, completeDue } from "../../lib/server.js";
import { moderate } from "../../lib/moderate.js";

export async function onRequestPost({ request, env }) {
  const b = await body(request);
  if (!b) return fail("Something went wrong. Please try again.");
  const owner = await hashKey(b.device);
  if (!owner) return fail("Something went wrong. Please reload the page and try again.");

  const intention = clean(b.intention, LIMITS.intention);
  const thanks = clean(b.thanks, LIMITS.thanks);
  let name = clean(b.name, LIMITS.name) || "Someone";
  if (intention.length < 5) return fail("Please write a few words about what you'd like prayed for.");

  await completeDue(env.DB); // so finished intentions free their place first

  // Limits per device: a few active intentions, and a few new ones per day.
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const counts = await env.DB.prepare(
    `SELECT SUM(CASE WHEN status IN ('pending','approved') THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS today
       FROM intentions WHERE owner = ?`
  ).bind(dayAgo, owner).first();
  if ((counts && counts.today) >= LIMITS.perDevicePerDay)
    return fail("You've shared several intentions today. Please try again tomorrow.", 429);
  if ((counts && counts.active) >= LIMITS.activePerDevice)
    return fail(`You already have ${LIMITS.activePerDevice} active intentions. You can share a new one when one of them is complete (after 33 decades, or 30 days).`, 429);

  const m = await moderate(env, intention, thanks);
  if (m.decision === "rejected") return fail(m.message || "This intention can't be accepted.");

  const id = newId();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO intentions (id, name, intention, thanks, status, care, owner, moderation, created_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, intention, thanks, m.decision, m.care ? 1 : 0, owner, m.reason || "", now,
         m.decision === "approved" ? now : null).run();

  return json({ ok: true, id, status: m.decision, care: !!m.care });
}

export async function onRequestGet({ request, env }) {
  const owner = await hashKey(new URL(request.url).searchParams.get("device"));
  if (!owner) return fail("Missing device.");
  await completeDue(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT id, name, intention, thanks, status, prayed, created_at, approved_at FROM intentions
      WHERE owner = ? AND status != 'rejected' ORDER BY created_at DESC LIMIT 50`
  ).bind(owner).all();
  return json({ ok: true, intentions: results, limits: { active: LIMITS.activePerDevice, prayers: LIMITS.completeAfterPrayers, days: LIMITS.completeAfterDays } });
}
