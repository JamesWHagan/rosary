/*
 * Decade4U: personal prayer count, kept on this phone only.
 *
 * Every finished decade is one person prayed for. A decade counts only when it
 * is actually finished (its last prayer is passed), never when it is assigned.
 *
 * DecadeStats.ring(element, number, label) draws the golden counter ring.
 * Later (Phase 4) the same ring will show "people prayed for you".
 */
window.DecadeStats = (function () {
  "use strict";
  var KEY = "decade4u.stats.v1";

  function read() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s.prayedFor === "number") return s;
    } catch (e) {}
    return { prayedFor: 0 };
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function prayedFor() { return read().prayedFor; }

  function addDecade() {
    var s = read();
    s.prayedFor += 1;
    s.last = Date.now();
    write(s);
    return s.prayedFor;
  }

  var uid = 0;
  function ring(host, n, label, from) {
    uid += 1;
    var g = "gold" + uid;
    host.classList.add("stat");
    host.innerHTML =
      '<div class="stat-ring">' +
        '<svg viewBox="0 0 120 120" aria-hidden="true">' +
          '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#f5c542"/>' +
            '<stop offset="1" stop-color="#b8860b"/></linearGradient></defs>' +
          '<circle class="track" cx="60" cy="60" r="52"/>' +
          '<g class="spin"><circle class="arc" cx="60" cy="60" r="52" stroke="url(#' + g + ')"/>' +
          '<circle class="spark" cx="25.2" cy="98.6" r="3.4"/></g>' +
        '</svg>' +
        '<div class="stat-num">0</div>' +
      '</div>' +
      '<div class="stat-label"></div>';
    host.querySelector(".stat-label").textContent = label;
    countUp(host.querySelector(".stat-num"), from || 0, n);
  }

  function countUp(el, from, to) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || to <= from) { el.textContent = to; return; }
    var start = null, dur = Math.min(1600, 500 + (to - from) * 60);
    function tick(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  return { prayedFor: prayedFor, addDecade: addDecade, ring: ring };
})();
