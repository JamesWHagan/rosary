/*
 * Decade4U: the prayer page.
 *
 * The core idea: every decade you pray is for one other person's intention.
 *
 * Flow: setup screen (how many decades, how to pray, who you'll pray for)
 *       → prayer screens → finish screen with the thank-you messages.
 *
 * Two ways to pray:
 *  - "beads": every prayer is its own screen and Next moves one bead.
 *  - "own":   for people holding their own rosary; one screen per decade.
 * Fewer than 5 decades uses the short version: just the Sign of the Cross
 * before and after. 5 decades uses the full opening and closing prayers.
 *
 * Code parts:
 *  1. draw()        draws the rosary as an SVG picture and remembers each bead.
 *  2. buildSteps()  makes the ordered list of steps; each step lights up beads.
 *  3. show(i)       shows step i: lights up its beads, writes its text.
 */
(function () {
  "use strict";

  var T = window.ROSARY_TEXT;
  var NS = "http://www.w3.org/2000/svg";
  var STORE_KEY = "decade4u.progress.v3";
  var PREFS_KEY = "decade4u.prefs";

  // ---------- 1. Drawing the rosary ----------
  // The loop is a circle; the medal sits at its bottom and the pendant hangs below.
  // Beads are counted clockwise: from the medal up the right-hand side.
  var CX = 150, CY = 138, R = 118, SLOTS = 55;
  var beads = {};
  var centre = {}, rippleLayer = null;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function draw(svg) {
    var defs = el("defs", {}, svg);
    var f = el("filter", { id: "glow", x: "-150%", y: "-150%", width: "400%", height: "400%" }, defs);
    el("feGaussianBlur", { stdDeviation: "3.2", result: "b" }, f);
    var merge = el("feMerge", {}, f);
    el("feMergeNode", { in: "b" }, merge);
    el("feMergeNode", { in: "SourceGraphic" }, merge);

    el("circle", { cx: CX, cy: CY, r: R, class: "cord" }, svg);
    el("line", { x1: CX, y1: CY + R, x2: CX, y2: 362, class: "cord" }, svg);

    // Loop bead i: decade d uses i = d*11 .. d*11+9; large beads are i = 10, 21, 32, 43.
    for (var i = 0; i < 54; i++) {
      var large = i % 11 === 10;
      var a = ((90 - (i + 1) * 360 / SLOTS) * Math.PI) / 180; // minus = clockwise on screen
      beads["S" + i] = el("circle", {
        cx: (CX + R * Math.cos(a)).toFixed(2),
        cy: (CY + R * Math.sin(a)).toFixed(2),
        r: large ? 6.5 : 4.3,
        class: "bead" + (large ? " large" : "")
      }, svg);
    }
    beads.medal = el("ellipse", { cx: CX, cy: CY + R, rx: 8, ry: 10, class: "bead medal" }, svg);
    [["P5", 282, 6.5], ["P4", 300, 4.3], ["P3", 314, 4.3], ["P2", 328, 4.3], ["P1", 346, 6.5]].forEach(function (p) {
      beads[p[0]] = el("circle", { cx: CX, cy: p[1], r: p[2], class: "bead" + (p[2] > 5 ? " large" : "") }, svg);
    });
    var cross = el("g", { class: "bead cross" }, svg);
    el("rect", { x: CX - 2.5, y: 360, width: 5, height: 40, rx: 1.5 }, cross);
    el("rect", { x: CX - 13, y: 370, width: 26, height: 5, rx: 1.5 }, cross);
    beads.cross = cross;

    // label in the middle of the loop, used when the prayers are hidden
    var fo = el("foreignObject", { x: CX - 80, y: CY - 74, width: 160, height: 148, class: "centre" }, svg);
    var div = document.createElement("div");
    div.className = "centre-box";
    div.innerHTML = '<div class="c-kicker"></div><div class="c-title"></div><div class="c-count"></div><div class="c-sub"></div>';
    fo.appendChild(div);
    centre = {
      kicker: div.querySelector(".c-kicker"), title: div.querySelector(".c-title"),
      count: div.querySelector(".c-count"), sub: div.querySelector(".c-sub")
    };
    rippleLayer = el("g", {}, svg);
  }

  // a soft ring that spreads out from a bead when you move on to it
  function ripple(id) {
    var b = beads[id];
    if (!b || !b.getBBox || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var box = b.getBBox();
    var c = el("circle", { cx: box.x + box.width / 2, cy: box.y + box.height / 2, r: Math.max(box.width, 9) / 2, class: "ripple" }, rippleLayer);
    setTimeout(function () { c.remove(); }, 700);
  }

  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  // ---------- 2. The order of prayers ----------
  function largeBeadFor(d) {
    return d === 0 ? "P5" : "S" + (d * 11 - 1); // where decade d's Our Father is prayed
  }

  function buildBeadSteps(n) {
    var full = n === 5, s = [];
    s.push({ id: "sign", beads: ["cross"], part: "opening" });
    if (full) {
      s.push({ id: "creed", beads: ["cross"], part: "opening" });
      s.push({ id: "our", beads: ["P1"], part: "opening" });
      for (var k = 0; k < 3; k++) {
        s.push({ id: "hail", beads: ["P" + (2 + k)], part: "opening", count: [k + 1, 3], note: T.openingNotes[k] });
      }
      s.push({ id: "glory", beads: ["P5"], part: "opening" });
      s.push({ id: "fatima", beads: ["P5"], part: "opening" });
    }
    for (var d = 0; d < n; d++) {
      var L = largeBeadFor(d);
      var after = d < 4 ? largeBeadFor(d + 1) : "medal";
      s.push({ mystery: true, beads: [L], part: "decade", d: d });
      s.push({ id: "our", beads: [L], part: "decade", d: d });
      for (var j = 0; j < 10; j++) {
        s.push({ id: "hail", beads: ["S" + (d * 11 + j)], part: "decade", d: d, count: [j + 1, 10] });
      }
      s.push({ id: "glory", beads: [after], part: "decade", d: d });
      s.push({ id: "fatima", beads: [after], part: "decade", d: d, endsDecade: true });
    }
    if (full) {
      s.push({ id: "hhq", beads: ["medal"], part: "closing" });
      s.push({ id: "closing", beads: ["medal"], part: "closing" });
    }
    s.push({ id: "sign", beads: ["cross"], part: "closing" });
    return s;
  }

  function buildOwnRosarySteps(n) {
    var full = n === 5, s = [];
    s.push(full
      ? { group: true, part: "opening", beads: ["cross", "P1", "P2", "P3", "P4"],
          items: [["sign", 1], ["creed", 1], ["our", 1], ["hail", 3], ["glory", 1], ["fatima", 1]] }
      : { group: true, part: "opening", beads: ["cross"], items: [["sign", 1]] });
    for (var d = 0; d < n; d++) {
      var list = [largeBeadFor(d)];
      for (var j = 0; j < 10; j++) list.push("S" + (d * 11 + j));
      s.push({ group: true, mystery: true, part: "decade", d: d, beads: list, endsDecade: true,
               items: [["our", 1], ["hail", 10], ["glory", 1], ["fatima", 1]] });
    }
    s.push(full
      ? { group: true, part: "closing", beads: ["medal", "cross"], items: [["hhq", 1], ["closing", 1], ["sign", 1]] }
      : { group: true, part: "closing", beads: ["cross"], items: [["sign", 1]] });
    return s;
  }

  function buildSteps(mode, n) {
    return mode === "own" ? buildOwnRosarySteps(n) : buildBeadSteps(n);
  }

  function todaysSet() {
    var day = new Date().getDay();
    for (var key in T.mysteries) if (T.mysteries[key].days.indexOf(day) !== -1) return key;
    return "joyful";
  }

  function fill(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
  }

  // ---------- Intentions (see js/intentions.js) ----------
  // state.order is a list of intention ids, least prayed for first.
  function freshOrder() { return Intentions.queue().map(function (it) { return it.id; }); }
  function who(it) { return Intentions.isAnonymous(it) ? T.ui.anonymous : it.name; }

  // ---------- State ----------
  var setKey = todaysSet();
  var set = T.mysteries[setKey];
  var state = { mode: "beads", n: 5, order: freshOrder(), hide: false, done: [] };
  var steps = [];
  var current = 0;

  function assigned() {
    return state.order.map(Intentions.byId).filter(Boolean).slice(0, state.n);
  }

  var $ = function (id) { return document.getElementById(id); };
  var ui = {};

  // ---------- Storage (this device only) ----------
  function storeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function storeDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function save() {
    storeSet(STORE_KEY, JSON.stringify({ step: current, set: setKey, mode: state.mode, n: state.n, order: state.order, done: state.done, at: Date.now() }));
  }
  function loadSaved() {
    try {
      var s = JSON.parse(storeGet(STORE_KEY) || "null");
      if (s && s.set === setKey && Date.now() - s.at < 12 * 3600 * 1000 && s.step > 0) return s;
    } catch (e) {}
    return null;
  }

  // ---------- Setup screen ----------
  function renderSetup() {
    Array.prototype.forEach.call(ui.decades.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.n) === state.n));
    });
    Array.prototype.forEach.call(ui.modes.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode));
    });
    ui.setupNote.textContent = state.n === 5 ? T.ui.fullNote : T.ui.shortNote;
    ui.assigned.innerHTML = "";
    assigned().forEach(function (it, d) {
      var li = document.createElement("li");
      var top = document.createElement("div");
      top.className = "who";
      top.textContent = fill(T.ui.decadeFor, { n: d + 1, name: who(it) });
      var p = document.createElement("p");
      p.textContent = it.intention;
      li.appendChild(top); li.appendChild(p);
      ui.assigned.appendChild(li);
    });
    ui.start.textContent = fill(state.n === 1 ? T.ui.startOne : T.ui.startMany, { n: state.n });
  }

  // ---------- Prayer screens ----------
  function para(parent, text, cls) {
    var p = document.createElement("p");
    if (cls) p.className = cls;
    p.textContent = text;
    parent.appendChild(p);
    return p;
  }
  function writeText(container, text) {
    text.split("\n").forEach(function (line) { para(container, line); });
  }
  function writeIntention(container, it) {
    var box = document.createElement("div");
    box.className = "intention";
    para(box, fill(T.ui.prayingFor, { name: who(it) }), "who");
    para(box, it.intention, "what");
    container.appendChild(box);
  }
  function writeGroup(container, step) {
    var ul = document.createElement("ul");
    ul.className = "checklist";
    step.items.forEach(function (it) {
      var li = document.createElement("li");
      li.textContent = T.prayers[it[0]].title + (it[1] > 1 ? " × " + it[1] : "");
      ul.appendChild(li);
    });
    container.appendChild(ul);
    if (step.items.length > 1 || step.part === "decade") {
      var details = document.createElement("details");
      var summary = document.createElement("summary");
      summary.textContent = T.ui.showPrayers;
      details.appendChild(summary);
      var seen = {};
      step.items.forEach(function (it) {
        if (seen[it[0]]) return;
        seen[it[0]] = true;
        var h = document.createElement("h3");
        h.textContent = T.prayers[it[0]].title;
        details.appendChild(h);
        writeText(details, T.prayers[it[0]].text);
      });
      container.appendChild(details);
    } else {
      writeText(container, T.prayers[step.items[0][0]].text);
    }
    para(container, step.part === "decade" ? T.ui.ownDecadeHint : T.ui.ownHint, "hint");
  }

  function show(i) {
    var forward = i === current + 1;
    current = Math.max(0, Math.min(steps.length - 1, i));
    var step = steps[current];
    var its = assigned();

    var now = {}, prayed = {};
    step.beads.forEach(function (b) { now[b] = true; });
    for (var k = 0; k < current; k++) steps[k].beads.forEach(function (b) { prayed[b] = true; });
    for (var id in beads) {
      beads[id].classList.toggle("active", !!now[id]);
      beads[id].classList.toggle("prayed", !!prayed[id] && !now[id]);
    }

    if (step.part === "opening") ui.where.textContent = T.ui.opening;
    else if (step.part === "closing") ui.where.textContent = T.ui.closing;
    else ui.where.textContent = fill(T.ui.decade, { n: step.d + 1, total: state.n }) + " · " + fill(T.ui.mysteriesToday, { set: set.name });

    // small "for Maria" line on every prayer inside a decade
    ui.forLine.hidden = true; // the decade panel now shows who it's for

    ui.text.innerHTML = "";
    ui.card.classList.toggle("is-mystery", !!step.mystery);
    ui.card.classList.toggle("is-group", !!step.group);
    if (step.mystery) {
      ui.kicker.textContent = fill(T.ui.mysteryTitle, { ordinal: T.ordinals[step.d], set: set.name });
      ui.title.textContent = set.list[step.d];
      writeIntention(ui.text, its[step.d]);
      if (step.group) writeGroup(ui.text, step);
      else para(ui.text, T.ui.mysteryHint, "hint");
    } else if (step.group) {
      ui.kicker.textContent = "";
      ui.title.textContent = step.part === "opening" ? T.ui.opening : T.ui.closing;
      writeGroup(ui.text, step);
    } else {
      var p = T.prayers[step.id];
      ui.kicker.textContent = step.note || "";
      ui.title.textContent = p.title + (step.count ? " · " + step.count[0] + " of " + step.count[1] : "");
      writeText(ui.text, p.text);
    }
    ui.card.scrollTop = 0;

    renderCentre(step, its);
    if (forward) {
      countMove();
      ripple(step.beads[step.beads.length - 1]);
      if (state.mode === "beads") buzz(step.endsDecade || step.mystery ? 30 : 8);
    }

    ui.bar.style.width = ((current / (steps.length - 1)) * 100).toFixed(1) + "%";
    ui.back.disabled = current === 0;
    ui.next.textContent = current === steps.length - 1 ? T.ui.finish : T.ui.next;
    save();
  }

  // What the middle of the rosary says when the prayers are hidden
  function renderCentre(step, its) {
    var k = "", t = "", c = "", sub = "";
    if (step.mystery) {
      k = fill(T.ui.mysteryShort, { ordinal: T.ordinals[step.d], set: set.name });
      t = set.list[step.d];
      if (step.group) sub = T.ui.decadeList;
    } else if (step.group) {
      t = step.part === "opening" ? T.ui.opening : T.ui.closing;
      sub = step.items.map(function (it) { return T.prayers[it[0]].title + (it[1] > 1 ? " × " + it[1] : ""); }).join(" · ");
    } else {
      k = step.note || "";
      t = T.prayers[step.id].title;
      c = step.count ? step.count[0] + " / " + step.count[1] : "";
    }
    centre.kicker.textContent = k;
    centre.title.textContent = t;
    centre.count.textContent = c;
    centre.sub.textContent = sub;

    // the decade panel under the rosary: the mystery and the intention, on every bead of the decade
    if (step.part === "decade") {
      var it = its[step.d];
      ui.stripMyst.textContent = set.list[step.d];
      ui.stripWho.textContent = fill(T.ui.forShort, { name: who(it) }) + ":";
      ui.stripWhat.textContent = it.intention;
      ui.strip.classList.remove("empty");
      ui.strip.classList.toggle("on-mystery", !!step.mystery);
    } else {
      ui.stripMyst.textContent = ui.stripWho.textContent = ui.stripWhat.textContent = "";
      ui.strip.classList.add("empty");
      ui.strip.classList.remove("on-mystery");
    }
  }

  // A short how-to line shown while the prayers are hidden, until someone has moved on a few times.
  var HINT_KEY = "decade4u.gestureHintSeen", moves = 0;
  function updateHint() {
    var seen = storeGet(HINT_KEY) === "1";
    var mouse = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    ui.hint.textContent = state.mode === "own"
      ? (mouse ? T.ui.hintOwnDesktop : T.ui.hintOwn)
      : (mouse ? T.ui.hintBeadsDesktop : T.ui.hintBeads);
    ui.hint.hidden = !state.hide || seen;
  }
  function countMove() {
    if (!state.hide || ++moves < 3) return;
    storeSet(HINT_KEY, "1");
    ui.hint.hidden = true;
  }

  function applyHide() {
    ui.main.classList.toggle("hide-prayers", state.hide);
    updateHint();
    ui.hide.textContent = state.hide ? T.ui.showPrayersBtn : T.ui.hidePrayersBtn;
    ui.hide.setAttribute("aria-pressed", String(state.hide));
    savePrefs();
  }

  function savePrefs() {
    storeSet(PREFS_KEY, JSON.stringify({ mode: state.mode, n: state.n, hide: state.hide }));
  }

  // ---------- Finish screen ----------
  function renderDone() {
    ui.doneLead.textContent = fill(state.n === 1 ? T.ui.doneOne : T.ui.doneMany, { n: state.n });
    ui.thanks.innerHTML = "";
    assigned().forEach(function (it) {
      var li = document.createElement("li");
      para(li, who(it), "who");
      para(li, it.intention, "what");
      para(li, "“" + (it.thanks || T.ui.defaultThanks) + "”", "msg");
      ui.thanks.appendChild(li);
    });
    if (window.DecadeStats) {
      var total = window.DecadeStats.prayedFor();
      window.DecadeStats.ring($("done-stat"), total, total === 1 ? T.ui.statOne : T.ui.statMany, Math.max(0, total - state.done.length));
    }
  }

  // ---------- Screens ----------
  function screen(name) {
    ui.setup.hidden = name !== "setup";
    ui.main.hidden = name !== "pray";
    ui.done.hidden = name !== "done";
    if (name !== "pray") ui.toast.hidden = true;
    window.scrollTo(0, 0);
  }

  function openSetup(newIntentions) {
    storeDel(STORE_KEY);
    state.done = [];
    if (newIntentions) state.order = freshOrder();
    renderSetup();
    screen("setup");
  }

  function begin(at) {
    steps = buildSteps(state.mode, state.n);
    savePrefs();
    var used = {};
    steps.forEach(function (st) { st.beads.forEach(function (b) { used[b] = true; }); });
    for (var id in beads) beads[id].classList.toggle("unused", !used[id]);
    ui.card.classList.toggle("tap-next", state.mode === "beads");
    ui.ring.classList.toggle("tap-next", state.mode === "beads");
    applyHide();
    screen("pray");
    show(at || 0);
  }

  function next() {
    // A decade counts as prayed only when its last prayer is passed.
    var st = steps[current];
    if (st.endsDecade && state.done.indexOf(st.d) === -1) {
      state.done.push(st.d);
      if (window.DecadeStats) window.DecadeStats.addDecade();
    }
    if (current === steps.length - 1) {
      storeDel(STORE_KEY);
      renderDone();
      screen("done");
      ui.done.querySelector("h2").focus();
    } else {
      show(current + 1);
    }
  }

  // ---------- Start ----------
  document.addEventListener("DOMContentLoaded", function () {
    ui = {
      setup: $("setup"), main: $("prayer"), done: $("done"),
      decades: $("decades"), modes: $("modes"), assigned: $("assigned"), setupNote: $("setup-note"), start: $("start"),
      where: $("where"), card: $("card"), forLine: $("for-line"),
      kicker: $("kicker"), title: $("prayer-title"), text: $("prayer-text"),
      bar: $("bar"), back: $("back"), next: $("next"), toast: $("toast"),
      doneLead: $("done-lead"), thanks: $("thanks"),
      hide: $("hide"), ring: $("ring"), hint: $("gesture-hint"), stripMyst: $("strip-myst"), strip: $("strip"), stripWho: $("strip-who"), stripWhat: $("strip-what")
    };
    draw($("rosary"));

    try {
      var prefs = JSON.parse(storeGet(PREFS_KEY) || "null");
      if (prefs && (prefs.mode === "beads" || prefs.mode === "own")) state.mode = prefs.mode;
      if (prefs && prefs.n >= 1 && prefs.n <= 5) state.n = prefs.n;
      if (prefs && typeof prefs.hide === "boolean") state.hide = prefs.hide;
    } catch (e) {}

    ui.decades.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) { state.n = Number(b.dataset.n); renderSetup(); }
    });
    ui.modes.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) { state.mode = b.dataset.mode; renderSetup(); }
    });
    ui.start.addEventListener("click", function () { begin(0); });

    ui.next.addEventListener("click", next);
    ui.back.addEventListener("click", function () { show(current - 1); });
    // Tapping the prayer card or the rosary moves on one bead (bead-by-bead mode only,
    // so a stray tap never skips a whole decade).
    var justSwiped = 0;
    function tapNext() {
      if (state.mode !== "beads" || Date.now() - justSwiped < 400) return;
      if (window.getSelection && String(window.getSelection())) return;
      next();
    }
    ui.card.addEventListener("click", tapNext);
    ui.ring.addEventListener("click", tapNext);

    // Swipe left = next, swipe right = back (both modes).
    // Swipe up = show the prayers, swipe down = hide them.
    // A vertical swipe that starts on the prayer text scrolls the text instead.
    var sx = null, sy = 0, onText = false;
    ui.main.addEventListener("pointerdown", function (e) {
      sx = e.clientX; sy = e.clientY;
      onText = !!(e.target.closest && e.target.closest(".card"));
    });
    ui.main.addEventListener("pointercancel", function () { sx = null; });
    ui.main.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        justSwiped = Date.now();
        if (dx < 0) next(); else if (current > 0) show(current - 1);
      } else if (!onText && Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        justSwiped = Date.now();
        var hide = dy > 0;            // finger moved down = hide, up = show
        if (hide !== state.hide) { state.hide = hide; applyHide(); }
      }
    });

    ui.hide.addEventListener("click", function () { state.hide = !state.hide; applyHide(); });
    $("restart").addEventListener("click", function () {
      if (current === 0 || window.confirm(T.ui.restartConfirm)) openSetup(false);
    });
    $("again").addEventListener("click", function () { openSetup(true); });

    document.addEventListener("keydown", function (e) {
      if (ui.main.hidden) return;
      if (e.key === "ArrowRight" || (e.key === " " && e.target === document.body)) { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" && !ui.back.disabled) show(current - 1);
    });

    // Arriving with ?n=1 (for example from the "pray one decade while you wait" invitation).
    var askN = Number(new URLSearchParams(location.search).get("n"));
    if (askN >= 1 && askN <= 5 && !new URLSearchParams(location.search).get("for")) {
      history.replaceState(null, "", location.pathname);
      state.n = askN;
      openSetup(true);
      return;
    }

    // Arriving from "Pray for them" on the home page: those people come first.
    var forIds = (new URLSearchParams(location.search).get("for") || "").split(",").filter(Intentions.byId);
    if (forIds.length) {
      history.replaceState(null, "", location.pathname); // so a reload doesn't restart it
      state.order = forIds.concat(freshOrder().filter(function (id) { return forIds.indexOf(id) === -1; }));
      state.n = Math.min(5, forIds.length);
      storeDel(STORE_KEY);
      state.done = [];
      renderSetup();
      screen("setup");
      return;
    }

    var saved = loadSaved();
    if (saved && (saved.mode === "beads" || saved.mode === "own") && saved.n >= 1 && saved.n <= 5 && saved.order) {
      state.mode = saved.mode; state.n = saved.n; state.order = saved.order;
      state.done = Array.isArray(saved.done) ? saved.done : [];
      begin(Math.min(saved.step, buildSteps(state.mode, state.n).length - 1));
      ui.toast.textContent = T.ui.resumed;
      ui.toast.hidden = false;
      setTimeout(function () { ui.toast.hidden = true; }, 3500);
    } else {
      openSetup(false);
    }
  });

  window.__rosary = { stepsFor: buildSteps };
})();
