/*
 * Decade4U: where intentions come from.
 *
 * On the live site everything goes through the small server API (/api/...),
 * which reads and writes the Cloudflare D1 database.
 *
 * When there aren't enough people's intentions for every decade, the extra
 * decades are prayed for general intentions (the sick, the souls in Purgatory...).
 * We never show invented people on the live site.
 *
 * The sample list (js/samples.js) is used only when the page is opened from a
 * file on a computer, for testing without the server.
 */
window.Intentions = (function () {
  "use strict";
  var DEVICE_KEY = "decade4u.device";
  var LAST_KEY = "decade4u.featuredLast";

  var GENERAL = [
    "For everyone who has asked for prayer on Decade4U",
    "For the sick, the lonely and the dying",
    "For the souls in Purgatory",
    "For peace in the world and in our families",
    "For those who have no one to pray for them"
  ].map(function (t, i) { return { id: "general-" + i, general: true, name: "", intention: t, thanks: "", prayed: 0 }; });

  var offline = location.protocol === "file:";

  function device() {
    try {
      var k = localStorage.getItem(DEVICE_KEY);
      if (!k) {
        var b = new Uint8Array(18);
        crypto.getRandomValues(b);
        k = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
        localStorage.setItem(DEVICE_KEY, k);
      }
      return k;
    } catch (e) {
      return "nostorage-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
  }

  function api(path, data) {
    var opts = data ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {};
    return fetch("/api/" + path, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "Something went wrong. Please try again." }; });
    });
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function samples() { return (window.SAMPLE_INTENTIONS || []).slice(); }

  // Up to 3 approved intentions nobody has prayed for yet, avoiding last time's.
  function featured() {
    if (offline) {
      var w = samples().filter(function (it) { return !it.prayed; });
      return Promise.resolve({ intentions: pickFresh(w, 3), waiting: w.length });
    }
    return api("featured?device=" + device()).then(function (r) {
      if (!r.ok) return { intentions: [], waiting: 0 };
      return { intentions: pickFresh(r.intentions, 3), waiting: r.waiting };
    }).catch(function () { return { intentions: [], waiting: 0 }; });
  }

  function pickFresh(list, k) {
    var last = [];
    try { last = JSON.parse(localStorage.getItem(LAST_KEY) || "[]"); } catch (e) {}
    var fresh = shuffle(list.filter(function (it) { return last.indexOf(it.id) === -1; }));
    var seen = shuffle(list.filter(function (it) { return last.indexOf(it.id) !== -1; }));
    var pick = fresh.concat(seen).slice(0, k);
    try { localStorage.setItem(LAST_KEY, JSON.stringify(pick.map(function (it) { return it.id; }))); } catch (e) {}
    return pick;
  }

  // Intentions for n decades: the ones asked for first, then the least prayed for,
  // then general intentions if there aren't enough.
  function assign(n, forIds) {
    var got;
    if (offline) {
      var s = samples().sort(function (a, b) { return (a.prayed || 0) - (b.prayed || 0); });
      var wanted = (forIds || []).map(function (id) { return s.find(function (x) { return x.id === id; }); }).filter(Boolean);
      got = Promise.resolve(wanted.concat(s.filter(function (x) { return wanted.indexOf(x) === -1; })).slice(0, n));
    } else {
      got = api("assign?n=" + n + "&device=" + device() + (forIds && forIds.length ? "&for=" + forIds.join(",") : ""))
        .then(function (r) { return r.ok ? r.intentions : []; })
        .catch(function () { return []; });
    }
    return got.then(function (list) {
      var general = shuffle(GENERAL);
      while (list.length < n) list.push(general[list.length % general.length]);
      return list.slice(0, n);
    });
  }

  function prayed(id) {
    if (offline || !id || String(id).indexOf("general-") === 0) return Promise.resolve();
    return api("prayed", { id: id, device: device() }).catch(function () {});
  }

  function report(id, reason) {
    if (offline || String(id).indexOf("general-") === 0) return Promise.resolve({ ok: true });
    return api("report", { id: id, device: device(), reason: reason || "" }).catch(function () { return { ok: false }; });
  }

  function submit(data) {
    if (offline) return Promise.resolve({ ok: true, status: "pending", test: true });
    data.device = device();
    return api("intentions", data).catch(function () {
      return { ok: false, error: "We couldn't reach Decade4U. Please check your connection and try again." };
    });
  }

  function mine() {
    if (offline) return Promise.resolve([]);
    return api("intentions?device=" + device()).then(function (r) { return r.ok ? r.intentions : []; }).catch(function () { return []; });
  }

  function isAnonymous(it) { return !it.general && (!it.name || it.name === "Anonymous" || it.name === "Someone"); }

  return { device: device, featured: featured, assign: assign, prayed: prayed, report: report,
           submit: submit, mine: mine, isAnonymous: isAnonymous, offline: offline };
})();
