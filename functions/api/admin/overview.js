// GET /api/admin/overview - everything the admin page shows:
// the balance, the queue (waiting for the maintainer), reported intentions,
// and what the AI approved in the last 2 days (to double-check it).
import { json } from "../../../lib/server.js";

export async function onRequestGet({ env }) {
  const now = Date.now();
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const DB = env.DB;
  const [counts, decadesToday, queue, reported, recent] = await Promise.all([
    DB.prepare(`SELECT
        SUM(status = 'pending') AS pending,
        SUM(status = 'pending' AND care = 1) AS care,
        SUM(status = 'hidden') AS hidden,
        SUM(status = 'approved') AS approved,
        SUM(status = 'approved' AND prayed = 0) AS waiting,
        MIN(CASE WHEN status = 'approved' AND prayed = 0 THEN approved_at END) AS oldest_waiting,
        SUM(status = 'approved' AND approved_at >= ?) AS approved_today,
        SUM(created_at >= ?) AS shared_today,
        SUM(prayed) AS prayed_total
      FROM intentions`).bind(dayStart.getTime(), dayStart.getTime()).first(),
    DB.prepare(`SELECT COUNT(*) AS n FROM prayers WHERE created_at >= ?`).bind(dayStart.getTime()).first(),
    DB.prepare(`SELECT id, name, intention, thanks, care, moderation, created_at FROM intentions
                 WHERE status = 'pending' ORDER BY care DESC, created_at ASC LIMIT 100`).all(),
    DB.prepare(`SELECT i.id, i.name, i.intention, i.thanks, i.prayed, i.moderation, i.created_at,
                       COUNT(r.device) AS reports, GROUP_CONCAT(NULLIF(r.reason, ''), ' · ') AS reasons
                  FROM intentions i LEFT JOIN reports r ON r.intention_id = i.id
                 WHERE i.status = 'hidden' GROUP BY i.id ORDER BY MAX(r.created_at) DESC LIMIT 100`).all(),
    DB.prepare(`SELECT id, name, intention, thanks, prayed, moderation, approved_at, created_at FROM intentions
                 WHERE status = 'approved' AND approved_at >= ? ORDER BY approved_at DESC LIMIT 100`).bind(now - 2 * 24 * 3600 * 1000).all()
  ]);
  return json({
    ok: true,
    now,
    stats: { ...counts, decades_today: decadesToday ? decadesToday.n : 0 },
    queue: queue.results,
    reported: reported.results,
    recent: recent.results
  });
}
