/*
 * Decade4U: the prayer page.
 *
 * There are two ways to pray:
 *  - "beads": every prayer is its own screen and Next moves one bead (80 steps).
 *  - "own":   for people holding their own rosary; one screen per decade,
 *             plus the opening and closing prayers (7 steps).
 *
 * How the code works, in three parts:
 *  1. draw()            draws the rosary as an SVG picture and remembers each bead.
 *  2. buildSteps(mode)  makes the ordered list of steps; each step lights up one or more beads.
 *  3. show(i)           shows step number i: lights up its beads, writes its text.
 */
(function () {
  "use strict";

  var T = window.ROSARY_TEXT;
  var NS = "http://www.w3.org/2000/svg";
  var STORE_KEY = "decade4u.progress.v1";
  var MODE_KEY = "decade4u.mode";

  // ---------- 1. Drawing the rosary ----------
  // The loop is a circle; the medal sits at its bottom and the pendant hangs below.
  // Beads are counted clockwise: from the medal up the right-hand side.
  var CX = 150, CY = 138, R = 118, SLOTS = 55;
  var beads = {}; // bead id -> SVG element

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

    // loop: 5 decades of 10 small beads, with 4 large beads between them.
    // Loop bead i: decade d uses i = d*11 .. d*11+9, large beads are i = 10, 21, 32, 43.
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

    // pendant, from the medal down: P5 (large), P4, P3, P2, P1 (large)
    [["P5", 282, 6.5], ["P4", 300, 4.3], ["P3", 314, 4.3], ["P2", 328, 4.3], ["P1", 346, 6.5]].forEach(function (p) {
      beads[p[0]] = el("circle", { cx: CX, cy: p[1], r: p[2], class: "bead" + (p[2] > 5 ? " large" : "") }, svg);
    });

    var cross = el("g", { class: "bead cross" }, svg);
    el("rect", { x: CX - 2.5, y: 360, width: 5, height: 40, rx: 1.5 }, cross);
    el("rect", { x: CX - 13, y: 370, width: 26, height: 5, rx: 1.5 }, cross);
    beads.cross = cross;
  }

  // ---------- 2. The order of prayers ----------
  function largeBeadFor(d) {
    // the bead the Our Father of decade d (0..4) is prayed on
    return d === 0 ? "P5" : "S" + (d * 11 - 1);
  }

  function buildBeadSteps() {
    var s = [];
    s.push({ id: "sign", beads: ["cross"], part: "opening" });
    s.push({ id: "creed", beads: ["cross"], part: "opening" });
    s.push({ id: "our", beads: ["P1"], part: "opening" });
    for (var n = 0; n < 3; n++) {
      s.push({ id: "hail", beads: ["P" + (2 + n)], part: "opening", count: [n + 1, 3], note: T.openingNotes[n] });
    }
    s.push({ id: "glory", beads: ["P5"], part: "opening" });

    for (var d = 0; d < 5; d++) {
      var L = largeBeadFor(d);
      var after = d < 4 ? largeBeadFor(d + 1) : "medal";
      s.push({ mystery: true, beads: [L], part: "decade", d: d });
      s.push({ id: "our", beads: [L], part: "decade", d: d });
      for (var j = 0; j < 10; j++) {
        s.push({ id: "hail", beads: ["S" + (d * 11 + j)], part: "decade", d: d, count: [j + 1, 10] });
      }
      s.push({ id: "glory", beads: [after], part: "decade", d: d });
      s.push({ id: "fatima", beads: [after], part: "decade", d: d });
    }

    s.push({ id: "hhq", beads: ["medal"], part: "closing" });
    s.push({ id: "closing", beads: ["medal"], part: "closing" });
    s.push({ id: "sign", beads: ["cross"], part: "closing" });
    return s;
  }

  function buildOwnRosarySteps() {
    var s = [];
    s.push({
      group: true, part: "opening",
      beads: ["cross", "P1", "P2", "P3", "P4"],
      items: [["sign", 1], ["creed", 1], ["our", 1], ["hail", 3], ["glory", 1]]
    });
    for (var d = 0; d < 5; d++) {
      var list = [largeBeadFor(d)];
      for (var j = 0; j < 10; j++) list.push("S" + (d * 11 + j));
      s.push({
        group: true, mystery: true, part: "decade", d: d, beads: list,
        items: [["our", 1], ["hail", 10], ["glory", 1], ["fatima", 1]]
      });
    }
    s.push({
      group: true, part: "closing",
      beads: ["medal", "cross"],
      items: [["hhq", 1], ["closing", 1], ["sign", 1]]
    });
    return s;
  }

  function buildSteps(mode) {
    return mode === "own" ? buildOwnRosarySteps() : buildBeadSteps();
  }

  function todaysSet() {
    var day = new Date().getDay();
    for (var key in T.mysteries) {
      if (T.mysteries[key].days.indexOf(day) !== -1) return key;
    }
    return "joyful";
  }

  function fill(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
  }

  // ---------- 3. Showing a step ----------
  var setKey = todaysSet();
  var set = T.mysteries[setKey];
  var mode = null;
  var steps = [];
  var current = 0;

  var $ = function (id) { return document.getElementById(id); };
  var ui = {};

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

  function writeGroup(container, step) {
    var ul = document.createElement("ul");
    ul.className = "checklist";
    step.items.forEach(function (it) {
      var li = document.createElement("li");
      li.textContent = T.prayers[it[0]].title + (it[1] > 1 ? " × " + it[1] : "");
      ul.appendChild(li);
    });
    container.appendChild(ul);

    var details = document.createElement("details");
    var summary = document.createElement("summary");
    summary.textContent = T.ui.showPrayers;
    details.appendChild(summary);
    var seen = {};
    step.items.forEach(function (it) {
      if (seen[it[0]]) return;
      seen[it[0]] = true;
      var p = T.prayers[it[0]];
      var h = document.createElement("h3");
      h.textContent = p.title;
      details.appendChild(h);
      writeText(details, p.text);
    });
    container.appendChild(details);

    para(container, step.part === "decade" ? T.ui.ownDecadeHint : T.ui.ownHint, "hint");
  }

  function show(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    var step = steps[current];

    // beads: earlier ones softly lit, current ones glowing
    var now = {}, prayed = {};
    step.beads.forEach(function (b) { now[b] = true; });
    for (var k = 0; k < current; k++) steps[k].beads.forEach(function (b) { prayed[b] = true; });
    for (var id in beads) {
      beads[id].classList.toggle("active", !!now[id]);
      beads[id].classList.toggle("prayed", !!prayed[id] && !now[id]);
    }

    // where we are
    if (step.part === "opening") ui.where.textContent = T.ui.opening;
    else if (step.part === "closing") ui.where.textContent = T.ui.closing;
    else ui.where.textContent = fill(T.ui.decade, { n: step.d + 1 }) + " · " + fill(T.ui.mysteriesToday, { set: set.name });

    // the card
    ui.text.innerHTML = "";
    ui.card.classList.toggle("is-mystery", !!step.mystery && !step.group);
    ui.card.classList.toggle("is-group", !!step.group);
    if (step.mystery) {
      ui.kicker.textContent = fill(T.ui.mysteryTitle, { ordinal: T.ordinals[step.d], set: set.name });
      ui.title.textContent = set.list[step.d];
    } else if (step.group) {
      ui.kicker.textContent = "";
      ui.title.textContent = step.part === "opening" ? T.ui.opening : T.ui.closing;
    } else {
      var p = T.prayers[step.id];
      ui.kicker.textContent = step.note || "";
      ui.title.textContent = p.title + (step.count ? " · " + step.count[0] + " of " + step.count[1] : "");
    }
    if (step.group) writeGroup(ui.text, step);
    else if (step.mystery) writeText(ui.text, T.ui.mysteryHint);
    else writeText(ui.text, T.prayers[step.id].text);
    ui.card.scrollTop = 0;

    ui.bar.style.width = ((current / (steps.length - 1)) * 100).toFixed(1) + "%";
    ui.back.disabled = current === 0;
    ui.next.textContent = current === steps.length - 1 ? T.ui.finish : T.ui.next;

    save();
  }

  // ---------- Remembering progress and mode on this device ----------
  function storeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function storeDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function save() {
    storeSet(STORE_KEY, JSON.stringify({ step: current, set: setKey, mode: mode, at: Date.now() }));
  }
  function loadSaved() {
    try {
      var s = JSON.parse(storeGet(STORE_KEY) || "null");
      var twelveHours = 12 * 60 * 60 * 1000;
      if (s && s.set === setKey && s.mode === mode && Date.now() - s.at < twelveHours && s.step > 0 && s.step < steps.length) return s.step;
    } catch (e) {}
    return 0;
  }

  // ---------- Screens ----------
  function screen(name) {
    ui.choose.hidden = name !== "choose";
    ui.main.hidden = name !== "pray";
    ui.done.hidden = name !== "done";
  }

  function start(newMode, resume) {
    mode = newMode;
    storeSet(MODE_KEY, mode);
    steps = buildSteps(mode);
    ui.modeLabel.textContent = mode === "own" ? T.ui.modeOwnShort : T.ui.modeBeadsShort;
    ui.card.classList.toggle("tap-next", mode === "beads");
    screen("pray");
    var at = resume ? loadSaved() : 0;
    show(at);
    if (at > 0) {
      ui.toast.textContent = T.ui.resumed;
      ui.toast.hidden = false;
      setTimeout(function () { ui.toast.hidden = true; }, 3500);
    }
  }

  function next() {
    if (current === steps.length - 1) {
      storeDel(STORE_KEY);
      screen("done");
      ui.done.querySelector("h2").focus();
    } else {
      show(current + 1);
    }
  }

  // ---------- Start ----------
  document.addEventListener("DOMContentLoaded", function () {
    ui = {
      choose: $("choose"), main: $("prayer"), done: $("done"), where: $("where"), card: $("card"),
      kicker: $("kicker"), title: $("prayer-title"), text: $("prayer-text"),
      bar: $("bar"), back: $("back"), next: $("next"), toast: $("toast"), modeLabel: $("mode-label")
    };
    draw($("rosary"));

    $("mode-beads").addEventListener("click", function () { start("beads", true); });
    $("mode-own").addEventListener("click", function () { start("own", true); });

    ui.next.addEventListener("click", next);
    ui.back.addEventListener("click", function () { show(current - 1); });

    // In bead-by-bead mode, tapping the prayer card also moves on (easier than aiming for the button).
    ui.card.addEventListener("click", function (e) {
      if (mode !== "beads") return;
      if (window.getSelection && String(window.getSelection())) return; // they were selecting text
      next();
    });

    $("restart").addEventListener("click", function () {
      if (current === 0 || window.confirm(T.ui.restartConfirm)) start(mode, false);
    });
    $("change-mode").addEventListener("click", function () {
      if (current === 0 || window.confirm(T.ui.changeModeConfirm)) {
        storeDel(STORE_KEY);
        screen("choose");
      }
    });
    $("again").addEventListener("click", function () { start(mode, false); });

    document.addEventListener("keydown", function (e) {
      if (ui.main.hidden) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft" && !ui.back.disabled) show(current - 1);
    });

    var savedMode = storeGet(MODE_KEY);
    if (savedMode === "beads" || savedMode === "own") start(savedMode, true);
    else screen("choose");
  });

  // exposed only for testing
  window.__rosary = { stepsFor: buildSteps };
})();
