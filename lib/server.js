/*
 * Decade4U: shared helpers for the server code in /functions.
 * The browser never talks to the database directly; it calls /api/... and
 * these small functions (running on Cloudflare) read and write the D1 database.
 */

export const LIMITS = { intention: 300, thanks: 200, name: 30, activePerDevice: 3, perDevicePerDay: 5 };

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export function fail(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

// Each browser keeps a random key. We only ever store a one-way hash of it,
// so the database never holds anything that could identify a phone.
export async function hashKey(key) {
  if (typeof key !== "string" || key.length < 16 || key.length > 100) return null;
  const data = new TextEncoder().encode("decade4u:" + key);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newId() {
  const b = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_");
}

export async function body(request) {
  try { return await request.json(); } catch (e) { return null; }
}

export function clean(text, max) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

// What people praying are allowed to see about an intention.
export function publicView(row) {
  return { id: row.id, name: row.name, intention: row.intention, thanks: row.thanks, prayed: row.prayed };
}
