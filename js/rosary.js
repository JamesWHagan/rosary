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
  var STORE_KEY = "decade4u.progress.v4";
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

  // ---------- 2. Which mysteries are prayed: the "plan" ----------
  // A plan is a list with one entry per decade: { s: set key, i: mystery 0-4 }.
  // 1 decade, Full rosary (5), Traditional (15), All the mysteries (20) or Custom (1-20).
  var SETS = ["joyful", "luminous", "sorrowful", "glorious"];   // the order of Christ's life
  var CHOICE_N = { one: 1, full: 5, trad: 15, all: 20 };

  function setForDay(day) {
    for (var key in T.mysteries) if (T.mysteries[key].days.indexOf(day) !== -1) return key;
    return "joyful";
  }
  function todaysSet() { return setForDay(new Date().getDay()); }

  // Today's set, then the following days' sets, skipping any already used
  // (Friday: Sorrowful, Joyful, Glorious, Luminous).
  function daySetOrder() {
    var out = [], day = new Date().getDay();
    for (var k = 0; k < 7; k++) {
      var key = setForDay((day + k) % 7);
      if (out.indexOf(key) === -1) out.push(key);
    }
    SETS.forEach(function (key) { if (out.indexOf(key) === -1) out.push(key); });
    return out;
  }
  function whole(keys) {
    var out = [];
    keys.forEach(function (key) { for (var i = 0; i < 5; i++) out.push({ s: key, i: i }); });
    return out;
  }
  function choiceN(c) { return CHOICE_N[c] || state.customN; }

  // The plan for the current choice, with any mysteries picked in the settings.
  function currentPlan() {
    var c = state.choice;
    if (c === "trad") return whole(["joyful", "sorrowful", "glorious"]);
    if (c === "all") return whole(SETS);
    if (c === "full") return whole([state.fullSet || todaysSet()]);
    var n = choiceN(c);
    var slots = slotsFor(c);
    var order = whole(daySetOrder());               // the usual order, for boxes left empty
    var used = {};
    slots.forEach(function (m) { if (m) used[m.s + m.i] = true; });
    var k = 0;
    return slots.map(function (m) {
      if (m) return m;
      while (used[order[k].s + order[k].i]) k++;
      used[order[k].s + order[k].i] = true;
      return order[k++];
    }).slice(0, n);
  }
  // Picked mysteries for "one" and "custom" (null = follow the usual order).
  function slotsFor(c) {
    var n = choiceN(c);
    var sl = (state.slots[c] || []).slice(0, n);
    while (sl.length < n) sl.push(null);
    state.slots[c] = sl;
    return sl;
  }
  function mysteryName(m) { return T.mysteries[m.s].list[m.i]; }

  // ---------- 3. The order of prayers ----------
  // The drawn rosary has 5 decades. Longer rosaries go round it again ("parts"):
  // decade d is in part floor(d / 5), on the loop's decade d % 5.
  // Opening prayers (with the Creed) only once at the start, closing prayers once at the end.
  function largeBead(p, part) {
    if (p === 0) return part === 0 ? "P5" : "medal";   // where the decade's Our Father is prayed
    return "S" + (p * 11 - 1);
  }
  function partTitle(plan, r) {
    var ds = plan.slice(r * 5, r * 5 + 5);
    var same = ds.every(function (m, j) { return m.s === ds[0].s && m.i === j; });
    if (same && ds.length === 5) return fill(T.ui.mysteriesOf, { set: T.mysteries[ds[0].s].name });
    return fill(T.ui.decadesRange, { a: r * 5 + 1, b: r * 5 + ds.length });
  }

  function buildSteps(mode, plan) {
    var n = plan.length, full = n >= 5, parts = Math.ceil(n / 5), last = parts - 1, s = [];
    var own = mode === "own";
    if (own) {
      s.push(full
        ? { group: true, part: "opening", round: 0, beads: ["cross", "P1", "P2", "P3", "P4"],
            items: [["sign", 1], ["creed", 1], ["our", 1], ["hail", 3], ["glory", 1], ["fatima", 1]] }
        : { group: true, part: "opening", round: 0, beads: ["cross"], items: [["sign", 1]] });
    } else {
      s.push({ id: "sign", beads: ["cross"], part: "opening", round: 0 });
      if (full) {
        s.push({ id: "creed", beads: ["cross"], part: "opening", round: 0 });
        s.push({ id: "our", beads: ["P1"], part: "opening", round: 0 });
        for (var k = 0; k < 3; k++) {
          s.push({ id: "hail", beads: ["P" + (2 + k)], part: "opening", round: 0, count: [k + 1, 3], note: T.openingNotes[k] });
        }
        s.push({ id: "glory", beads: ["P5"], part: "opening", round: 0 });
        s.push({ id: "fatima", beads: ["P5"], part: "opening", round: 0 });
      }
    }
    for (var d = 0; d < n; d++) {
      var r = Math.floor(d / 5), p = d % 5;
      var L = largeBead(p, r);
      if (parts > 1 && p === 0) s.push({ intro: true, part: "intro", round: r, d: d, beads: [L] });
      if (own) {
        var list = [L];
        for (var j = 0; j < 10; j++) list.push("S" + (p * 11 + j));
        s.push({ group: true, mystery: true, part: "decade", round: r, d: d, beads: list, endsDecade: true,
                 items: [["our", 1], ["hail", 10], ["glory", 1], ["fatima", 1]] });
        continue;
      }
      var after = p < 4 ? largeBead(p + 1, r) : "medal";
      s.push({ mystery: true, beads: [L], part: "decade", round: r, d: d });
      s.push({ id: "our", beads: [L], part: "decade", round: r, d: d });
      for (var h = 0; h < 10; h++) {
        s.push({ id: "hail", beads: ["S" + (p * 11 + h)], part: "decade", round: r, d: d, count: [h + 1, 10] });
      }
      s.push({ id: "glory", beads: [after], part: "decade", round: r, d: d });
      s.push({ id: "fatima", beads: [after], part: "decade", round: r, d: d, endsDecade: true });
    }
    if (own) {
      s.push(full
        ? { group: true, part: "closing", round: last, beads: ["medal", "cross"], items: [["hhq", 1], ["closing", 1], ["sign", 1]] }
        : { group: true, part: "closing", round: last, beads: ["cross"], items: [["sign", 1]] });
    } else {
      if (full) {
        s.push({ id: "hhq", beads: ["medal"], part: "closing", round: last });
        s.push({ id: "closing", beads: ["medal"], part: "closing", round: last });
      }
      s.push({ id: "sign", beads: ["cross"], part: "closing", round: last });
    }
    return s;
  }

  function fill(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
  }

  // ---------- Intentions (see js/intentions.js) ----------
  // state.list holds up to 5 intentions (fetched from the server), one per decade.
  function who(it) {
    if (it.general) return T.ui.general;
    return Intentions.isAnonymous(it) ? T.ui.anonymous : it.name;
  }

  // ---------- State ----------
  // choice: "one" | "full" | "trad" | "all" | "custom"; plan: the mysteries, one per decade
  var state = { mode: "beads", choice: "full", customN: 3, slots: {}, fullSet: null, plan: [], n: 5,
                list: [], forIds: [], hide: false, done: [] };
  var MAX_DECADES = 20;
  var steps = [];
  var current = 0;

  function assigned() { return state.list.slice(0, state.n); }

  // Ask the server for intentions (20, so changing the number of decades needs no new request).
  var loading = 0;
  function loadList() {
    var mine = ++loading;
    state.list = [];
    renderSetup();
    return Intentions.assign(MAX_DECADES, state.forIds).then(function (list) {
      if (mine !== loading) return;
      state.list = list;
      renderSetup();
    });
  }

  var $ = function (id) { return document.getElementById(id); };
  var ui = {};

  // ---------- Storage (this device only) ----------
  function storeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function storeDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  // A rosary in progress is kept for 2 days, so a long one can be finished the next day.
  function save() {
    storeSet(STORE_KEY, JSON.stringify({ step: current, plan: state.plan, choice: state.choice, mode: state.mode,
      list: state.list, done: state.done, at: Date.now() }));
  }
  function validPlan(plan) {
    return Array.isArray(plan) && plan.length >= 1 && plan.length <= MAX_DECADES && plan.every(function (m) {
      return m && T.mysteries[m.s] && m.i >= 0 && m.i <= 4;
    });
  }
  function loadSaved() {
    try {
      var s = JSON.parse(storeGet(STORE_KEY) || "null");
      if (s && validPlan(s.plan) && Date.now() - s.at < 48 * 3600 * 1000 && s.step > 0) return s;
    } catch (e) {}
    return null;
  }

  // ---------- Setup screen ----------
  function refreshPlan() {
    state.plan = currentPlan();
    state.n = state.plan.length;
  }

  // "the Sorrowful Mysteries · Joyful Mysteries 1–3", "The Assumption (Glorious)"
  function planSummary(plan) {
    var runs = [], cur = null;
    plan.forEach(function (m) {
      if (cur && cur.s === m.s && m.i === cur.b + 1) { cur.b = m.i; cur.n++; }
      else { cur = { s: m.s, a: m.i, b: m.i, n: 1 }; runs.push(cur); }
    });
    return runs.map(function (r) {
      var name = T.mysteries[r.s].name;
      if (r.n === 5) return fill(T.ui.mysteriesOf, { set: name });
      if (r.n === 1) return T.mysteries[r.s].list[r.a] + " (" + name + ")";
      return fill(T.ui.mysteriesRange, { set: name, a: r.a + 1, b: r.b + 1 });
    }).join(" · ");
  }

  function renderSetup() {
    refreshPlan();
    Array.prototype.forEach.call(ui.decades.querySelectorAll(".dc"), function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.c === state.choice));
    });
    $("custom-n").textContent = state.customN;
    $("custom-sub").textContent = fill(T.ui.choiceCustomSub, { n: state.customN });
    $("custom-minus").disabled = state.customN <= 1;
    $("custom-plus").disabled = state.customN >= MAX_DECADES;

    var summary = planSummary(state.plan);
    var fixed = state.choice === "trad" || state.choice === "all";
    if (!fixed && state.plan[0].s === todaysSet()) summary += " (" + fill(T.ui.planDay, { day: T.ui.days[new Date().getDay()] }) + ")";
    ui.planText.textContent = T.ui.planPrefix + " " + summary;
    ui.gear.hidden = fixed;
    if (fixed) state.pickerOpen = false;
    ui.gear.setAttribute("aria-expanded", String(!!state.pickerOpen));
    ui.picker.hidden = !state.pickerOpen;
    if (state.pickerOpen) renderPicker();

    Array.prototype.forEach.call(ui.modes.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode));
    });
    ui.setupNote.textContent = state.n >= 5 ? T.ui.fullNote : T.ui.shortNote;
    ui.assigned.innerHTML = "";
    ui.start.disabled = !state.list.length;
    if (!state.list.length) {
      var wait = document.createElement("li");
      wait.className = "loading";
      wait.textContent = T.ui.loading;
      ui.assigned.appendChild(wait);
    }
    assigned().forEach(function (it, d) {
      var li = document.createElement("li");
      var top = document.createElement("div");
      top.className = "who";
      top.textContent = fill(T.ui.decadeFor, { n: d + 1, name: who(it) });
      var p = document.createElement("p");
      p.textContent = it.intention;
      li.appendChild(top); li.appendChild(p);
      if (!it.general) addReport(li, it, function () {
        // a reported intention is hidden on the server; fetch a replacement
        state.forIds = state.forIds.filter(function (id) { return id !== it.id; });
        loadList();
      });
      ui.assigned.appendChild(li);
    });
    ui.start.textContent = fill(state.n === 1 ? T.ui.startOne : T.ui.startMany, { n: state.n });
  }

  // ---------- Choosing the mysteries (behind the ⚙ button) ----------
  // Full rosary: choose the set; its five mysteries keep their order.
  // 1 decade and Custom: numbered boxes, one per decade. Tap a mystery to put it in the
  // next empty box, or drag it into any box; tap a filled box to empty it. Empty boxes
  // follow the usual order (today's mysteries, then the following days').
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function sameM(a, b) { return a && b && a.s === b.s && a.i === b.i; }

  function renderPicker() {
    var pk = ui.picker, today = todaysSet();
    pk.innerHTML = "";
    var head = h("div", "pick-head");
    head.appendChild(h("h3", "", T.ui.pickTitle));
    var done = h("button", "link pick-done", T.ui.pickDone);
    done.type = "button"; done.dataset.act = "close";
    head.appendChild(done);
    pk.appendChild(head);

    var tabsKey = state.choice === "full" ? (state.fullSet || today) : (state.pickTab || state.plan[0].s);
    var tabs = h("div", "pick-tabs");
    SETS.forEach(function (key) {
      var b = h("button", "", T.mysteries[key].name);
      b.type = "button";
      b.dataset.tab = key;
      b.setAttribute("aria-pressed", String(key === tabsKey));
      if (key === today) b.appendChild(h("small", "", T.ui.pickToday));
      tabs.appendChild(b);
    });

    if (state.choice === "full") {
      pk.appendChild(h("p", "pick-help", T.ui.pickWhichSet));
      pk.appendChild(tabs);
      var ol = h("ol", "pick-locked");
      T.mysteries[tabsKey].list.forEach(function (name) { ol.appendChild(h("li", "", name)); });
      pk.appendChild(ol);
      pk.appendChild(h("p", "pick-help", T.ui.pickLocked));
      return;
    }

    var slots = slotsFor(state.choice);
    pk.appendChild(h("p", "pick-help", T.ui.pickHelp));
    pk.appendChild(h("div", "pick-label", T.ui.pickSlots));
    var grid = h("div", "slots");
    state.plan.forEach(function (m, k) {
      var picked = !!slots[k];
      var box = h("button", "slot" + (picked ? " picked" : ""));
      box.type = "button";
      box.dataset.k = k;
      box.appendChild(h("span", "slot-n", String(k + 1)));
      box.appendChild(h("span", "slot-name", mysteryName(m)));
      box.appendChild(h("span", "slot-set", picked ? T.mysteries[m.s].name : T.ui.pickAuto));
      grid.appendChild(box);
    });
    pk.appendChild(grid);
    pk.appendChild(tabs);
    var cards = h("div", "mcards");
    T.mysteries[tabsKey].list.forEach(function (name, i) {
      var me = { s: tabsKey, i: i };
      var at = slots.findIndex(function (x) { return sameM(x, me); });
      var c = h("button", "mcard" + (at !== -1 ? " used" : ""));
      c.type = "button";
      c.dataset.s = tabsKey; c.dataset.i = i;
      c.appendChild(h("span", "mc-ord", T.ordinals[i]));
      c.appendChild(h("span", "mc-name", name));
      if (at !== -1) c.appendChild(h("span", "mc-badge", String(at + 1)));
      cards.appendChild(c);
    });
    pk.appendChild(cards);
    var reset = h("button", "link pick-reset", T.ui.pickReset);
    reset.type = "button"; reset.dataset.act = "reset";
    pk.appendChild(reset);
  }

  function placeCard(m, k) {           // put mystery m into box k (moving it if it was elsewhere)
    var slots = slotsFor(state.choice);
    var was = slots.findIndex(function (x) { return sameM(x, m); });
    if (was !== -1) slots[was] = null;
    slots[k] = m;
  }
  function tapCard(m) {
    var slots = slotsFor(state.choice);
    var was = slots.findIndex(function (x) { return sameM(x, m); });
    if (was !== -1) { slots[was] = null; return; }       // tapping a chosen mystery takes it out
    var free = slots.indexOf(null);
    if (free === -1 && slots.length === 1) free = 0;     // 1 decade: just replace it
    if (free === -1) { showToast(T.ui.pickFull); return; }
    slots[free] = m;
  }

  function setupPicker() {
    var pk = ui.picker, drag = null, lastDrag = 0;

    pk.addEventListener("click", function (e) {
      if (Date.now() - lastDrag < 120) return;   // the click that follows a drop
      var t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.act === "close") { state.pickerOpen = false; renderSetup(); ui.gear.focus(); return; }
      if (t.dataset.act === "reset") { state.slots[state.choice] = []; state.fullSet = null; renderSetup(); return; }
      if (t.dataset.tab) {
        if (state.choice === "full") state.fullSet = t.dataset.tab; else state.pickTab = t.dataset.tab;
        renderSetup(); return;
      }
      if (t.classList.contains("slot")) {
        if (t.classList.contains("picked")) slotsFor(state.choice)[Number(t.dataset.k)] = null;
        renderSetup(); return;
      }
      if (t.classList.contains("mcard")) {
        tapCard({ s: t.dataset.s, i: Number(t.dataset.i) });
        renderSetup();
      }
    });

    // Dragging: with a mouse it starts when you move; on a touch screen, after a short press
    // (so normal scrolling over the cards still works).
    pk.addEventListener("pointerdown", function (e) {
      var src = e.target.closest(".mcard, .slot.picked");
      if (!src || e.button > 0) return;
      drag = { src: src, x: e.clientX, y: e.clientY, ghost: null, ready: e.pointerType === "mouse" };
      if (!drag.ready) drag.timer = setTimeout(function () { if (drag) { drag.ready = true; startGhost(drag.x, drag.y); buzz(10); } }, 280);
    });
    function startGhost(x, y) {
      var g = drag.src.cloneNode(true);
      g.classList.add("drag-ghost");
      g.style.width = drag.src.offsetWidth + "px";
      document.body.appendChild(g);
      drag.ghost = g;
      drag.src.classList.add("dragging");
      moveGhost(x, y);
    }
    function moveGhost(x, y) {
      drag.ghost.style.transform = "translate(" + (x - drag.src.offsetWidth / 2) + "px," + (y - 24) + "px)";
      var over = document.elementFromPoint(x, y);
      over = over && over.closest(".slot");
      Array.prototype.forEach.call(pk.querySelectorAll(".slot.over"), function (o) { if (o !== over) o.classList.remove("over"); });
      if (over && pk.contains(over)) over.classList.add("over");
    }
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var moved = Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
      if (!drag.ready) { if (moved > 10) { clearTimeout(drag.timer); drag = null; } return; }   // it's a scroll
      if (!drag.ghost) { if (moved < 6) return; startGhost(e.clientX, e.clientY); }
      moveGhost(e.clientX, e.clientY);
    });
    // while dragging on a touch screen, stop the page from scrolling
    pk.addEventListener("touchmove", function (e) { if (drag && drag.ghost) e.preventDefault(); }, { passive: false });
    pk.addEventListener("contextmenu", function (e) { if (e.target.closest(".mcard, .slot")) e.preventDefault(); });
    function endDrag(e, cancel) {
      if (!drag) return;
      clearTimeout(drag.timer);
      if (drag.ghost) {
        drag.ghost.remove();
        drag.src.classList.remove("dragging");
        lastDrag = Date.now();
        var over = !cancel && document.elementFromPoint(e.clientX, e.clientY);
        over = over && over.closest(".slot");
        if (over && pk.contains(over)) {
          var k = Number(over.dataset.k), slots = slotsFor(state.choice);
          if (drag.src.classList.contains("mcard")) {
            placeCard({ s: drag.src.dataset.s, i: Number(drag.src.dataset.i) }, k);
          } else {                                   // box onto box: swap them
            var j = Number(drag.src.dataset.k), tmp = slots[k];
            slots[k] = slots[j]; slots[j] = tmp;
          }
        }
        drag = null;
        renderSetup();
        return;
      }
      drag = null;
    }
    window.addEventListener("pointerup", function (e) { endDrag(e, false); });
    window.addEventListener("pointercancel", function (e) { endDrag(e, true); });
  }

  // ---------- Report an intention ----------
  // A small "Report" link. Asking twice (Report → "Yes, hide it") prevents accidental taps.
  // The intention is hidden for everyone at once and goes to the maintainer's admin page.
  function addReport(li, it, after) {
    var row = document.createElement("div");
    row.className = "report-row";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "report-link"; btn.textContent = T.ui.report;
    row.appendChild(btn);
    btn.addEventListener("click", function () {
      row.innerHTML = "";
      var q = document.createElement("span"); q.textContent = T.ui.reportAsk;
      var yes = document.createElement("button"); yes.type = "button"; yes.className = "report-link strong"; yes.textContent = T.ui.reportYes;
      var no = document.createElement("button"); no.type = "button"; no.className = "report-link"; no.textContent = T.ui.reportNo;
      row.appendChild(q); row.appendChild(yes); row.appendChild(no);
      no.addEventListener("click", function () { row.innerHTML = ""; row.appendChild(btn); });
      yes.addEventListener("click", function () {
        yes.disabled = true;
        Intentions.report(it.id).then(function (r) {
          row.innerHTML = "";
          var done = document.createElement("span");
          done.textContent = (r && r.ok) ? T.ui.reportDone : ((r && r.error) || T.ui.reportFail);
          row.appendChild(done);
          if (r && r.ok) {
            li.classList.add("reported");
            showToast(T.ui.reportDone);
            if (after) setTimeout(after, 900);
          }
        });
      });
    });
    li.appendChild(row);
  }

  function showToast(msg) {
    ui.toast.textContent = msg;
    ui.toast.hidden = false;
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { ui.toast.hidden = true; }, 3000);
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

    // light up the beads already prayed in this round of the rosary
    var now = {}, prayed = {}, used = usedBeads[step.round] || {};
    step.beads.forEach(function (b) { now[b] = true; });
    for (var k = 0; k < current; k++) {
      if (steps[k].round === step.round) steps[k].beads.forEach(function (b) { prayed[b] = true; });
    }
    for (var id in beads) {
      beads[id].classList.toggle("active", !!now[id]);
      beads[id].classList.toggle("prayed", !!prayed[id] && !now[id]);
      beads[id].classList.toggle("unused", !used[id]);
    }

    var parts = Math.ceil(state.n / 5);
    if (step.part === "opening") ui.where.textContent = T.ui.opening;
    else if (step.part === "closing") ui.where.textContent = T.ui.closing;
    else if (step.intro) ui.where.textContent = fill(T.ui.partOf, { r: step.round + 1, total: parts });
    else ui.where.textContent = fill(T.ui.decade, { n: step.d + 1, total: state.n }) + " · " +
      fill(T.ui.mysteriesToday, { set: T.mysteries[state.plan[step.d].s].name });

    // small "for Maria" line on every prayer inside a decade
    ui.forLine.hidden = true; // the decade panel now shows who it's for

    ui.text.innerHTML = "";
    ui.card.classList.toggle("is-mystery", !!step.mystery || !!step.intro);
    ui.card.classList.toggle("is-group", !!step.group);
    if (step.intro) {
      ui.kicker.textContent = fill(T.ui.partOf, { r: step.round + 1, total: parts });
      ui.title.textContent = partTitle(state.plan, step.round);
      var ol = document.createElement("ol");
      ol.className = "part-list";
      state.plan.slice(step.round * 5, step.round * 5 + 5).forEach(function (m) {
        var li = document.createElement("li");
        li.textContent = mysteryName(m);
        ol.appendChild(li);
      });
      ui.text.appendChild(ol);
      para(ui.text, T.ui.introHint, "hint");
    } else if (step.mystery) {
      var m = state.plan[step.d], ms = T.mysteries[m.s];
      ui.kicker.textContent = fill(T.ui.mysteryTitle, { ordinal: T.ordinals[m.i], set: ms.name });
      ui.title.textContent = mysteryName(m);
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
    if (step.intro) {
      k = fill(T.ui.partOf, { r: step.round + 1, total: Math.ceil(state.n / 5) });
      t = partTitle(state.plan, step.round);
    } else if (step.mystery) {
      var m = state.plan[step.d];
      k = fill(T.ui.mysteryShort, { ordinal: T.ordinals[m.i], set: T.mysteries[m.s].name });
      t = mysteryName(m);
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
      ui.stripMyst.textContent = mysteryName(state.plan[step.d]);
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

  // Showing/hiding the prayers glides smoothly ("FLIP" animation):
  // we measure where things are, switch the layout at once, then slide/scale them
  // from the old place to the new one using only transform and opacity, which the
  // phone's graphics chip draws at the screen's full refresh rate (60, 90 or 120Hz).
  var animating = false;
  function applyHide(animate) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce || !Element.prototype.animate || animating) { applyHideNow(); return; }
    animating = true;
    var main = ui.main;
    main.classList.add("animating"); // pauses the bead glow while things move
    var fading = [main.querySelector(".card"), main.querySelector(".controls")];
    var EASE = "cubic-bezier(.22, .8, .24, 1)";

    function flip() {
      var moving = [document.getElementById("rosary"), document.getElementById("strip")];
      var before = moving.map(function (el) { return el.getBoundingClientRect(); });
      applyHideNow();
      var done = 0;
      moving.forEach(function (el, i) {
        var a = before[i], b = el.getBoundingClientRect();
        if (!b.width || !b.height) { done++; return; }
        var dx = a.left - b.left, dy = a.top - b.top, k = 1;
        if (i === 0) {
          // the beads are drawn centred inside the svg box, so match the beads, not the box
          var fa = Math.min(a.width / 300, a.height / 405), fb = Math.min(b.width / 300, b.height / 405);
          k = fa / fb;
          dx = a.left + (a.width - 300 * fa) / 2 - b.left - k * (b.width - 300 * fb) / 2;
          dy = a.top + (a.height - 405 * fa) / 2 - b.top - k * (b.height - 405 * fb) / 2;
        }
        var anim = el.animate([
          { transformOrigin: "0 0", transform: "translate(" + dx + "px," + dy + "px) scale(" + k + ")" },
          { transformOrigin: "0 0", transform: "none" }
        ], { duration: 450, easing: EASE });
        anim.onfinish = anim.oncancel = function () { if (++done === moving.length) finish(); };
      });
      if (done === moving.length) finish();
      if (!state.hide) {
        fading.forEach(function (el) {
          if (el) el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
            { duration: 320, delay: 140, easing: EASE, fill: "backwards" });
        });
      }
      if (!ui.hint.hidden) ui.hint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200, fill: "backwards" });
    }
    function finish() { animating = false; main.classList.remove("animating"); }

    if (state.hide) {
      // fade the prayer and buttons out first, then let the rosary grow
      var out = fading.filter(Boolean).map(function (el) {
        return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-out", fill: "forwards" });
      });
      out[0].onfinish = function () { flip(); out.forEach(function (a) { a.cancel(); }); };
    } else {
      flip();
    }
  }

  function applyHideNow() {
    ui.main.classList.toggle("hide-prayers", state.hide);
    updateHint();
    ui.hide.textContent = state.hide ? T.ui.showPrayersBtn : T.ui.hidePrayersBtn;
    ui.hide.setAttribute("aria-pressed", String(state.hide));
    savePrefs();
  }

  function savePrefs() {
    storeSet(PREFS_KEY, JSON.stringify({ mode: state.mode, choice: state.choice, customN: state.customN, hide: state.hide }));
  }

  // ---------- Finish screen ----------
  function renderDone() {
    ui.doneLead.textContent = fill(state.n === 1 ? T.ui.doneOne : T.ui.doneMany, { n: state.n });
    ui.thanks.innerHTML = "";
    assigned().forEach(function (it) {
      var li = document.createElement("li");
      para(li, it.general ? T.ui.generalShort : who(it), "who");
      para(li, it.intention, "what");
      if (!it.general) para(li, "“" + (it.thanks || T.ui.defaultThanks) + "”", "msg");
      if (!it.general) addReport(li, it);
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
    screen("setup");
    if (newIntentions || !state.list.length) loadList(); else renderSetup();
  }

  var usedBeads = {};   // round -> beads used in that round (the others are faded)
  function begin(at) {
    state.n = state.plan.length;
    steps = buildSteps(state.mode, state.plan);
    savePrefs();
    usedBeads = {};
    steps.forEach(function (st) {
      var u = usedBeads[st.round] = usedBeads[st.round] || {};
      st.beads.forEach(function (b) { u[b] = true; });
    });
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
      var it = assigned()[st.d];
      if (it) Intentions.prayed(it.id);
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
      planText: $("plan-text"), gear: $("plan-gear"), picker: $("picker"),
      hide: $("hide"), ring: $("ring"), hint: $("gesture-hint"), stripMyst: $("strip-myst"), strip: $("strip"), stripWho: $("strip-who"), stripWhat: $("strip-what")
    };
    draw($("rosary"));

    try {
      var prefs = JSON.parse(storeGet(PREFS_KEY) || "null");
      if (prefs && (prefs.mode === "beads" || prefs.mode === "own")) state.mode = prefs.mode;
      if (prefs && (prefs.choice in CHOICE_N || prefs.choice === "custom")) state.choice = prefs.choice;
      if (prefs && prefs.customN >= 1 && prefs.customN <= MAX_DECADES) state.customN = prefs.customN;
      if (prefs && !prefs.choice && prefs.n >= 1 && prefs.n <= 5) chooseCount(prefs.n);   // older saved settings
      if (prefs && typeof prefs.hide === "boolean") state.hide = prefs.hide;
    } catch (e) {}

    // the five choices
    [["one", "choiceOne", "choiceOneSub"], ["full", "choiceFull", "choiceFullSub"], ["trad", "choiceTrad", "choiceTradSub"],
     ["all", "choiceAll", "choiceAllSub"], ["custom", "choiceCustom", null]].forEach(function (c) {
      var box = ui.decades.querySelector('[data-c="' + c[0] + '"]');
      box.querySelector("strong").textContent = T.ui[c[1]];
      if (c[2]) box.querySelector("span").textContent = T.ui[c[2]];
    });
    $("custom-minus").setAttribute("aria-label", T.ui.fewer);
    $("custom-plus").setAttribute("aria-label", T.ui.more);
    $("gear-label").textContent = T.ui.gear;
    ui.decades.addEventListener("click", function (e) {
      var b = e.target.closest(".dc");
      if (!b) return;
      if (e.target.id === "custom-minus") state.customN = Math.max(1, state.customN - 1);
      if (e.target.id === "custom-plus") state.customN = Math.min(MAX_DECADES, state.customN + 1);
      state.choice = b.dataset.c;
      renderSetup();
    });
    ui.decades.querySelector(".custom").addEventListener("keydown", function (e) {
      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); state.choice = "custom"; renderSetup(); }
    });
    ui.gear.addEventListener("click", function () { state.pickerOpen = !state.pickerOpen; renderSetup(); });
    setupPicker();
    ui.modes.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) { state.mode = b.dataset.mode; renderSetup(); }
    });
    ui.start.addEventListener("click", function () { refreshPlan(); begin(0); });

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
        if (hide !== state.hide) { state.hide = hide; applyHide(true); }
      }
    });

    ui.hide.addEventListener("click", function () { state.hide = !state.hide; applyHide(true); });
    $("restart").addEventListener("click", function () {
      if (current === 0 || window.confirm(T.ui.restartConfirm)) openSetup(false);
    });
    $("again").addEventListener("click", function () { openSetup(true); });

    document.addEventListener("keydown", function (e) {
      if (ui.main.hidden) return;
      if (e.key === "ArrowRight" || (e.key === " " && e.target === document.body)) { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" && !ui.back.disabled) show(current - 1);
    });

    // Arriving with ?n=1 (the "pray one decade while you wait" invitation)
    // or ?for=id1,id2 ("Pray for them" on the home page).
    var params = new URLSearchParams(location.search);
    var askN = Number(params.get("n"));
    var forIds = (params.get("for") || "").split(",").filter(Boolean).slice(0, MAX_DECADES);
    if (forIds.length || (askN >= 1 && askN <= MAX_DECADES)) {
      history.replaceState(null, "", location.pathname); // so a reload doesn't restart it
      state.forIds = forIds;
      chooseCount(forIds.length ? forIds.length : askN);
      openSetup(true);
      return;
    }

    var saved = loadSaved();
    if (saved && (saved.mode === "beads" || saved.mode === "own") && saved.list && saved.list.length >= saved.plan.length) {
      state.mode = saved.mode; state.plan = saved.plan; state.list = saved.list;
      if (saved.choice) state.choice = saved.choice;
      state.done = Array.isArray(saved.done) ? saved.done : [];
      begin(Math.min(saved.step, buildSteps(state.mode, state.plan).length - 1));
      ui.toast.textContent = T.ui.resumed;
      ui.toast.hidden = false;
      setTimeout(function () { ui.toast.hidden = true; }, 3500);
    } else {
      openSetup(false);
    }
  });

  // a number of decades -> the matching choice (1 decade, Full rosary, ... or Custom)
  function chooseCount(n) {
    var map = { 1: "one", 5: "full", 15: "trad", 20: "all" };
    state.choice = map[n] || "custom";
    if (!map[n]) state.customN = n;
  }

  window.__rosary = { stepsFor: buildSteps, plan: function () { return state.plan; } };
})();
