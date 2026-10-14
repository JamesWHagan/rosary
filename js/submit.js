/*
 * Decade4U: the "Share your intention" form.
 *
 * Test version: until the database exists (Phase 4), a shared intention is
 * only kept on this device (in "My intentions"), never sent anywhere.
 */
(function () {
  "use strict";

  var MINE_KEY = "decade4u.myIntentions.v1";
  var LIMITS = { intention: 300, thanks: 200, name: 30 };

  // Words that suggest someone may be in crisis (English and Italian).
  // Seeing one only shows a caring message with places to get help.
  var CRISIS = [
    "suicide", "suicidal", "kill myself", "end my life", "take my own life", "want to die",
    "don't want to live", "dont want to live", "do not want to live", "don't want to be alive", "do not want to be alive",
    "no reason to live", "end it all", "better off dead", "better off without me", "self harm", "self-harm", "hurt myself", "cut myself", "overdose",
    "suicidio", "suicidarmi", "uccidermi", "togliermi la vita", "farla finita", "voglio morire",
    "non voglio più vivere", "non voglio piu vivere", "non ce la faccio più a vivere", "meglio morto", "meglio morta", "farmi del male", "autolesion"
  ];

  var EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
  var PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
  var LINK = /(https?:\/\/|www\.)\S+/i;

  var $ = function (id) { return document.getElementById(id); };
  var nameMode = "anon", label = "";

  function counter(field, out, max) {
    out.textContent = field.value.length + " / " + max;
    out.classList.toggle("near", field.value.length > max * 0.9);
  }

  function shownName() {
    if (nameMode === "first") {
      var n = $("first-name").value.trim().split(/\s+/)[0] || "";
      return n ? n.charAt(0).toUpperCase() + n.slice(1) : "Someone";
    }
    if (nameMode === "label") return label || "Someone";
    return "Someone";
  }

  function updateName() {
    Array.prototype.forEach.call($("name-modes").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === nameMode));
    });
    $("first-name").hidden = nameMode !== "first";
    $("labels").hidden = nameMode !== "label";
    Array.prototype.forEach.call($("labels").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(b.textContent === label));
    });
    $("name-preview").innerHTML = "";
    $("name-preview").appendChild(document.createTextNode("People praying will see: "));
    var s = document.createElement("strong");
    s.textContent = shownName();
    $("name-preview").appendChild(s);
  }

  function checkCare() {
    var t = ($("intention").value + " " + $("thanks").value).toLowerCase();
    var hit = CRISIS.some(function (w) { return t.indexOf(w) !== -1; });
    $("care").hidden = !hit;
    return hit;
  }

  function problem(text) {
    var t = text.trim();
    if (t.length < 5) return "Please write a few words about what you'd like prayed for.";
    if (EMAIL.test(t)) return "Please remove the email address. Intentions are shown to strangers, so keep them private.";
    if (PHONE.test(t)) return "Please remove the phone number. Intentions are shown to strangers, so keep them private.";
    if (LINK.test(t)) return "Please remove the web link. Intentions can't contain links.";
    return "";
  }

  function saveMine(entry) {
    try {
      var list = JSON.parse(localStorage.getItem(MINE_KEY) || "[]");
      list.unshift(entry);
      localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    var intention = $("intention"), thanks = $("thanks"), err = $("intention-error");

    intention.addEventListener("input", function () {
      counter(intention, $("intention-count"), LIMITS.intention);
      if (!err.hidden && !problem(intention.value)) err.hidden = true;
      checkCare();
    });
    thanks.addEventListener("input", function () {
      counter(thanks, $("thanks-count"), LIMITS.thanks);
      checkCare();
    });

    $("name-modes").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      nameMode = b.dataset.mode;
      if (nameMode === "label" && !label) label = "A mother";
      updateName();
      if (nameMode === "first") $("first-name").focus();
    });
    $("labels").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) { label = b.textContent; updateName(); }
    });
    $("first-name").addEventListener("input", updateName);

    $("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = problem(intention.value);
      if (!msg && thanks.value.trim() && (EMAIL.test(thanks.value) || PHONE.test(thanks.value) || LINK.test(thanks.value)))
        msg = "Please remove contact details or links from the thank-you message.";
      if (msg) {
        err.textContent = msg;
        err.hidden = false;
        intention.focus();
        return;
      }
      var send = $("send");
      send.disabled = true;
      send.textContent = "Sharing…";
      Intentions.submit({
        name: shownName(),
        intention: intention.value.trim().slice(0, LIMITS.intention),
        thanks: thanks.value.trim().slice(0, LIMITS.thanks)
      }).then(function (r) {
        send.disabled = false;
        send.textContent = "Share my intention";
        if (!r.ok) {
          err.textContent = r.error || "Something went wrong. Please try again.";
          err.hidden = false;
          intention.focus();
          return;
        }
        saveMine({ id: r.id, intention: intention.value.trim(), status: r.status, at: Date.now() });
        $("sent-lead").textContent = r.status === "approved"
          ? "Your intention has been received, and people can now pray a decade for you."
          : "Your intention has been received. Once it has been read, people will begin praying a decade for you.";
        $("sent-intention").textContent = intention.value.trim();
        $("form").hidden = true;
        $("sent").hidden = false;
        window.scrollTo(0, 0);
        $("sent").querySelector("h2").focus();
      });
    });

    updateName();
  });
})();
