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

  // Prayed for when there aren't enough people's intentions (common in the first days).
  // A different random selection each time.
  var GENERAL = [
    "For someone who has asked for prayer on Decade4U",
    "For the Holy Father, the Pope",
    "For a priest who is tired, lonely or tempted",
    "For a young person discerning a call to the priesthood or religious life",
    "For a soul in Purgatory, especially someone who struggled with pride",
    "For a soul in Purgatory, especially someone who struggled with greed",
    "For a soul in Purgatory, especially someone who struggled with lust",
    "For a soul in Purgatory, especially someone who struggled with envy",
    "For a soul in Purgatory, especially someone who struggled with gluttony",
    "For a soul in Purgatory, especially someone who struggled with anger",
    "For a soul in Purgatory, especially someone who struggled with sloth",
    "For a soul in Purgatory who has no one to pray for them",
    "For someone who is lukewarm in their faith, that their love for God may be rekindled",
    "For someone who does not yet believe in God, that they may come to know His love",
    "For someone who has left the Church, that they may find their way home",
    "For someone suffering because of war, and for peace in their land",
    "For a refugee who has been forced to leave their home",
    "For a newborn baby and their family",
    "For a mother who is expecting a child, and for her unborn baby",
    "For a young person struggling with sexual temptation and impurity, that they may find freedom and grace",
    "For a young person searching for meaning, that they may meet Christ",
    "For a married couple going through a difficult time",
    "For a Christian who is persecuted for their faith",
    "For someone who is sick and lonely",
    "For someone who will die today, that they may die in God's grace",
    "For someone fighting an addiction, and for their family",
    "For someone in despair, that they may find hope and help",
    "For someone who is poor or hungry, and for those who help them",
    "For a sinner far from God, that they may return to Him",
    "For a family without peace, that Christ may bring it to them",
    "For someone who has no one to pray for them"
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
    // general intentions asked for by id (from the home page) come first, in that order
    var chosen = (forIds || []).map(function (id) { return GENERAL.find(function (g) { return g.id === id; }); }).filter(Boolean);
    forIds = (forIds || []).filter(function (id) { return String(id).indexOf("general-") !== 0; });
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
      list = chosen.concat(list);
      var general = shuffle(GENERAL.filter(function (g) { return chosen.indexOf(g) === -1; }));
      for (var i = 0; list.length < n && i < general.length; i++) list.push(general[i]);
      return list.slice(0, n);
    });
  }

  // k general intentions at random, for the home page when nobody is waiting
  function general(k) {
    return shuffle(GENERAL.slice(1)).slice(0, k); // (the first one, "everyone on Decade4U", reads oddly on its own)
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

  return { device: device, featured: featured, assign: assign, general: general, prayed: prayed, report: report,
           submit: submit, mine: mine, isAnonymous: isAnonymous, offline: offline };
})();
