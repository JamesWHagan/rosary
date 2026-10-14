// Every /api/admin/... request passes through here first.
// Only someone who knows the admin password (a Cloudflare secret called ADMIN_PASSWORD,
// set in the Cloudflare dashboard, never written in the code) gets through.
// Wrong passwords are counted per network address: after 10 in an hour, that address must wait.
import { fail } from "../../../lib/server.js";

async function sha(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequest(context) {
  const { request, env } = context;
  const secret = env.ADMIN_PASSWORD;
  if (!secret || secret.length < 12) return fail("The admin password has not been set up in Cloudflare yet.", 503);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ipKey = (await sha("decade4u-ip:" + ip)).slice(0, 32); // never store the raw address
  const hourAgo = Date.now() - 3600 * 1000;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_attempts (ip TEXT NOT NULL, created_at INTEGER NOT NULL)`).run();
  const tries = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_attempts WHERE ip = ? AND created_at > ?`).bind(ipKey, hourAgo).first();
  if (tries && tries.n >= 10) return fail("Too many wrong passwords. Please wait an hour and try again.", 429);

  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  // Compare hashes, so the time taken doesn't reveal how much of the password was right.
  if (!given || (await sha(given)) !== (await sha(secret))) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO admin_attempts (ip, created_at) VALUES (?, ?)`).bind(ipKey, Date.now()),
      env.DB.prepare(`DELETE FROM admin_attempts WHERE created_at < ?`).bind(hourAgo)
    ]);
    return fail("Wrong password.", 401);
  }
  return context.next();
}
