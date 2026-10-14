/*
 * Decade4U: where intentions come from.
 *
 * Everything else asks this file for intentions, so in Phase 4 only this file
 * changes: it will read from the database instead of the sample list.
 */
window.Intentions = (function () {
  "use strict";
  var LAST_KEY = "decade4u.featuredLast";

  function all() { return window.SAMPLE_INTENTIONS || []; }

  function byId(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Up to k intentions that nobody has prayed for yet, chosen at random,
  // avoiding the ones featured last time when there are enough others.
  function featured(k) {
    var waiting = all().filter(function (it) { return !it.prayed; });
    var last = [];
    try { last = JSON.parse(localStorage.getItem(LAST_KEY) || "[]"); } catch (e) {}
    var fresh = shuffle(waiting.filter(function (it) { return last.indexOf(it.id) === -1; }));
    var seen = shuffle(waiting.filter(function (it) { return last.indexOf(it.id) !== -1; }));
    var pick = fresh.concat(seen).slice(0, k);
    try { localStorage.setItem(LAST_KEY, JSON.stringify(pick.map(function (it) { return it.id; }))); } catch (e) {}
    return pick;
  }

  // The order intentions are handed out in: least prayed for first, random among equals.
  function queue() {
    return shuffle(all()).sort(function (a, b) { return (a.prayed || 0) - (b.prayed || 0); });
  }

  function isAnonymous(it) { return !it.name || it.name === "Anonymous"; }

  return { all: all, byId: byId, featured: featured, queue: queue, isAnonymous: isAnonymous };
})();
