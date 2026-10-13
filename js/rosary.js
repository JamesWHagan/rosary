/*
 * Rosary2U: the prayer page.
 *
 * How it works, in three parts:
 *  1. draw()        draws the rosary as an SVG picture and remembers each bead.
 *  2. buildSteps()  makes the ordered list of every prayer, each tied to a bead.
 *  3. show(i)       shows prayer number i: lights up its bead, writes its text.
 * The Next and Back buttons just call show() with i + 1 or i - 1.
 */
(function () {
  "use strict";

  var T = window.ROSARY_TEXT;
  var NS = "http://www.w3.org/2000/svg";
  var STORE_KEY = "rosary2u.progress.v1";

  // ---------- 1. Drawing the rosary ----------
  // The loop is a circle; the medal sits at its bottom and the pendant hangs below.
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

    // the cord
    el("circle", { cx: CX, cy: CY, r: R, class: "cord" }, svg);
    el("line", { x1: CX, y1: CY + R, x2: CX, y2: 362, class: "cord" }, svg);

    // loop: 5 decades of 10 small beads, with 4 large beads between them.
    // Loop bead i: decade d uses i = d*11 .. d*11+9, large beads are i = 10, 21, 32, 43.
    for (var i = 0; i < 54; i++) {
      var large = i % 11 === 10;
      var a = ((90 + (i + 1) * 360 / SLOTS) * Math.PI) / 180;
      beads["S" + i] = el("circle", {
        cx: (CX + R * Math.cos(a)).toFixed(2),
        cy: (CY + R * Math.sin(a)).toFixed(2),
        r: large ? 6.5 : 4.3,
        class: "bead" + (large ? " large" : "")
      }, svg);
    }

    // centre medal
    beads.medal = el("ellipse", { cx: CX, cy: CY + R, rx: 8, ry: 10, class: "bead medal" }, svg);

    // pendant, from the medal down: P5 (large), P4, P3, P2, P1 (large)
    var pendant = [["P5", 282, 6.5], ["P4", 300, 4.3], ["P3", 314, 4.3], ["P2", 328, 4.3], ["P1", 346, 6.5]];
    pendant.forEach(function (p) {
      beads[p[0]] = el("circle", { cx: CX, cy: p[1], r: p[2], class: "bead" + (p[2] > 5 ? " large" : "") }, svg);
    });

    // crucifix
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

  function buildSteps() {
    var s = [];
    s.push({ id: "sign", bead: "cross", part: "opening" });
    s.push({ id: "creed", bead: "cross", part: "opening" });
    s.push({ id: "our", bead: "P1", part: "opening" });
    for (var n = 0; n < 3; n++) {
      s.push({ id: "hail", bead: "P" + (2 + n), part: "opening", count: [n + 1, 3], note: T.openingNotes[n] });
    }
    s.push({ id: "glory", bead: "P5", part: "opening" });

    for (var d = 0; d < 5; d++) {
      var L = largeBeadFor(d);
      var after = d < 4 ? largeBeadFor(d + 1) : "medal";
      s.push({ mystery: true, bead: L, part: "decade", d: d });
      s.push({ id: "our", bead: L, part: "decade", d: d });
      for (var j = 0; j < 10; j++) {
        s.push({ id: "hail", bead: "S" + (d * 11 + j), part: "decade", d: d, count: [j + 1, 10] });
      }
      s.push({ id: "glory", bead: after, part: "decade", d: d });
      s.push({ id: "fatima", bead: after, part: "decade", d: d });
    }

    s.push({ id: "hhq", bead: "medal", part: "closing" });
    s.push({ id: "closing", bead: "medal", part: "closing" });
    s.push({ id: "sign", bead: "cross", part: "closing" });
    return s;
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
  var steps = buildSteps();
  var setKey = todaysSet();
  var set = T.mysteries[setKey];
  var current = 0;

  var $ = function (id) { return document.getElementById(id); };
  var ui = {};

  function writeText(container, text) {
    container.innerHTML = "";
    text.split("\n").forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      container.appendChild(p);
    });
  }

  function show(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    var step = steps[current];

    // beads: earlier ones softly lit, current one glowing
    var prayed = {};
    for (var k = 0; k < current; k++) prayed[steps[k].bead] = true;
    for (var id in beads) {
      beads[id].classList.toggle("active", id === step.bead);
      beads[id].classList.toggle("prayed", !!prayed[id] && id !== step.bead);
    }

    // where we are
    if (step.part === "opening") ui.where.textContent = T.ui.opening;
    else if (step.part === "closing") ui.where.textContent = T.ui.closing;
    else ui.where.textContent = fill(T.ui.decade, { n: step.d + 1 }) + " · " + fill(T.ui.mysteriesToday, { set: set.name });

    // the card
    ui.card.classList.toggle("is-mystery", !!step.mystery);
    if (step.mystery) {
      ui.kicker.textContent = fill(T.ui.mysteryTitle, { ordinal: T.ordinals[step.d], set: set.name });
      ui.title.textContent = set.list[step.d];
      writeText(ui.text, T.ui.mysteryHint);
    } else {
      var p = T.prayers[step.id];
      ui.kicker.textContent = step.note || "";
      ui.title.textContent = p.title + (step.count ? " · " + step.count[0] + " of " + step.count[1] : "");
      writeText(ui.text, p.text);
    }
    ui.card.scrollTop = 0;

    // progress and buttons
    ui.bar.style.width = ((current / (steps.length - 1)) * 100).toFixed(1) + "%";
    ui.back.disabled = current === 0;
    ui.next.textContent = current === steps.length - 1 ? T.ui.finish : T.ui.next;

    save();
  }

  // ---------- Remembering progress on this device ----------
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ step: current, set: setKey, at: Date.now() }));
    } catch (e) { /* storage unavailable: progress just isn't remembered */ }
  }
  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }
  function loadSaved() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      var twelveHours = 12 * 60 * 60 * 1000;
      if (s && s.set === setKey && Date.now() - s.at < twelveHours && s.step > 0 && s.step < steps.length) return s.step;
    } catch (e) {}
    return 0;
  }

  // ---------- Finish ----------
  function finish() {
    clearSaved();
    ui.main.hidden = true;
    ui.done.hidden = false;
    ui.done.querySelector("h2").focus();
  }
  function restart() {
    clearSaved();
    ui.done.hidden = true;
    ui.main.hidden = false;
    show(0);
  }

  // ---------- Start ----------
  document.addEventListener("DOMContentLoaded", function () {
    ui = {
      main: $("prayer"), done: $("done"), where: $("where"), card: $("card"),
      kicker: $("kicker"), title: $("prayer-title"), text: $("prayer-text"),
      bar: $("bar"), back: $("back"), next: $("next"), toast: $("toast")
    };
    draw($("rosary"));

    ui.next.addEventListener("click", function () {
      if (current === steps.length - 1) finish(); else show(current + 1);
    });
    ui.back.addEventListener("click", function () { show(current - 1); });
    $("restart").addEventListener("click", function () {
      if (current === 0 || window.confirm(T.ui.restartConfirm)) restart();
    });
    $("again").addEventListener("click", restart);

    document.addEventListener("keydown", function (e) {
      if (ui.main.hidden) return;
      if (e.key === "ArrowRight") ui.next.click();
      if (e.key === "ArrowLeft" && !ui.back.disabled) ui.back.click();
    });

    var start = loadSaved();
    show(start);
    if (start > 0) {
      ui.toast.textContent = T.ui.resumed;
      ui.toast.hidden = false;
      setTimeout(function () { ui.toast.hidden = true; }, 3500);
    }
  });

  // exposed only for testing
  window.__rosary = { steps: steps };
})();
