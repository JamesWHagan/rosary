/*
 * Decade4U admin page.
 * Shows the balance, the intentions waiting for the maintainer, reported ones,
 * and what the AI approved recently, with buttons to approve, reject or hide.
 * The password is sent with every request and checked on the server
 * (functions/api/admin/_middleware.js); it is kept only for this browser tab.
 */
(function () {
  "use strict";
  var KEY = "decade4u.admin";
  var $ = function (id) { return document.getElementById(id); };
  var data = null;
  var tab = "queue";

  var HELP = {
    queue: "Intentions the AI wasn't sure about, or that may come from someone in crisis (shown first, with an orange border). Nobody sees them until you approve. Rejecting is silent: the person is not told.",
    reported: "Someone praying reported these, so they were hidden at once. Put back the ones that are fine; remove the ones that aren't.",
    recent: "Approved in the last 2 days, mostly by the AI. A quick look once a day catches anything it got wrong."
  };

  function password() { try { return sessionStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function setPassword(p) { try { p ? sessionStorage.setItem(KEY, p) : sessionStorage.removeItem(KEY); } catch (e) {} }

  function api(path, payload) {
    var opts = { headers: { authorization: "Bearer " + password() } };
    if (payload) { opts.method = "POST"; opts.headers["content-type"] = "application/json"; opts.body = JSON.stringify(payload); }
    return fetch("/api/admin/" + path, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "The server didn't answer properly (" + r.status + ")." }; })
        .then(function (j) { j.status = r.status; return j; });
    }, function () { return { ok: false, error: "Couldn't reach the server. Check your connection." }; });
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- sign in ----------
  function showLogin(err) {
    $("main").hidden = true;
    $("login").hidden = false;
    $("login-error").hidden = !err;
    $("login-error").textContent = err || "";
    $("password").focus();
  }

  $("login").addEventListener("submit", function (e) {
    e.preventDefault();
    setPassword($("password").value.trim());
    load();
  });
  $("signout").addEventListener("click", function () { setPassword(""); $("password").value = ""; showLogin(); });
  $("refresh").addEventListener("click", function () { load(); });

  function load() {
    if (!password()) return showLogin();
    return api("overview").then(function (r) {
      if (!r.ok) {
        if (r.status === 401) setPassword("");
        return showLogin(r.error);
      }
      data = r;
      $("login").hidden = true;
      $("main").hidden = false;
      render();
    });
  }

  // ---------- balance ----------
  function ago(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 48) return h + " h ago";
    return Math.round(h / 24) + " days ago";
  }

  function renderBalance() {
    var s = data.stats, box = $("balance");
    box.innerHTML = "";
    var oldest = s.oldest_waiting ? ago(s.oldest_waiting).replace(" ago", "") : "—";
    var oldHours = s.oldest_waiting ? (Date.now() - s.oldest_waiting) / 3600000 : 0;
    [
      [s.pending || 0, "waiting for you", (s.pending || 0) > 0],
      [s.care || 0, "may be in crisis", (s.care || 0) > 0],
      [s.waiting || 0, "approved, not prayed for yet", false],
      [oldest, "longest wait for a prayer", oldHours > 48],
      [s.decades_today || 0, "decades prayed today", false],
      [s.shared_today || 0, "shared today", false],
      [s.approved || 0, "approved in total", false],
      [s.prayed_total || 0, "decades prayed in total", false],
      [s.completed || 0, "completed (33 decades or 30 days)", false]
    ].forEach(function (c) {
      var d = document.createElement("div");
      if (c[2]) d.className = "warn";
      var strong = document.createElement("strong"); strong.textContent = c[0];
      var span = document.createElement("span"); span.textContent = c[1];
      d.appendChild(strong); d.appendChild(span);
      box.appendChild(d);
    });
  }

  // ---------- why the AI sent it here, in plain words ----------
  function why(reason) {
    reason = String(reason || "");
    var out = [];
    var parts = reason.split(" | admin:");
    var auto = parts[0];
    if (/^AI not connected/.test(auto)) out.push("AI check not available here");
    if (/^AI unavailable/.test(auto)) out.push("AI check was unavailable (free daily allowance used up, or an error)");
    if (/^AI answer unreadable/.test(auto)) out.push("AI gave an unclear answer");
    if (/^sensitive words/.test(auto)) out.push("contains a sensitive word (e.g. abuse, sex)");
    if (/guard:unsafe/.test(auto)) out.push("safety check flagged it");
    var m = auto.match(/ai:(\{.*\})/);
    if (m) {
      try {
        var a = JSON.parse(m[1]);
        if (a.crisis) out.push("may be in crisis");
        if (a.identifying_details) out.push("may identify someone (full name, place…)");
        if (a.prayer_intention === false) out.push("AI wasn't sure it's a prayer intention");
        if (a.advertising_or_spam) out.push("looks like advertising or spam");
        if (a.hateful_or_mocking) out.push("may be disrespectful");
        if (!out.length && a.prayer_intention) out.push("AI: a sincere prayer intention");
      } catch (e) {}
    }
    if (!out.length && auto) out.push(auto.slice(0, 120));
    var WORD = { approve: "approved", reject: "rejected", hide: "hidden" };
    var history = parts.slice(1).map(function (h) { var w = h.split(" ")[0]; return "you " + (WORD[w] || w); });
    return out.concat(history).join(" · ");
  }

  // ---------- lists ----------
  var ACTIONS = {
    queue: [["approve", "Approve", "primary"], ["reject", "Reject", "danger"]],
    reported: [["approve", "Put back", "primary"], ["reject", "Remove", "danger"]],
    recent: [["hide", "Hide", "danger"]]
  };

  function render() {
    renderBalance();
    $("n-queue").textContent = data.queue.length || "";
    $("n-reported").textContent = data.reported.length || "";
    $("n-recent").textContent = data.recent.length || "";
    Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function (b) {
      b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    });
    $("help").textContent = HELP[tab];
    var list = $("items");
    list.innerHTML = "";
    var rows = data[tab];
    if (!rows.length) {
      var e = document.createElement("li");
      e.className = "empty";
      e.textContent = tab === "queue" ? "Nothing waiting. 🙏" : "Nothing here.";
      list.appendChild(e);
      return;
    }
    rows.forEach(function (it) { list.appendChild(card(it)); });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(it) {
    var li = el("li", "item" + (it.care ? " care" : ""));
    var meta = el("div", "meta");
    if (it.care) meta.appendChild(el("span", "badge care", "May be in crisis"));
    meta.appendChild(el("span", "badge", it.name || "Someone"));
    meta.appendChild(el("span", "", "shared " + ago(it.created_at)));
    if (tab !== "queue") meta.appendChild(el("span", "", "prayed for " + (it.prayed || 0) + "×"));
    if (tab === "reported") meta.appendChild(el("span", "", it.reports + (it.reports === 1 ? " report" : " reports")));
    li.appendChild(meta);
    li.appendChild(el("div", "text", it.intention));
    if (it.thanks) li.appendChild(el("div", "thanks-msg", "Thank-you: “" + it.thanks + "”"));
    if (tab === "reported" && it.reasons) li.appendChild(el("div", "why", "Reason given: " + it.reasons));
    li.appendChild(el("div", "why", why(it.moderation)));
    if (it.care) {
      li.appendChild(el("div", "care-note",
        "The person already saw crisis resources (112 and findahelpline.com) when they shared this. " +
        "Approve it if it is a sincere request for prayer and is fine for strangers to read; reject it if it is too explicit or detailed."));
    }
    var acts = el("div", "acts");
    ACTIONS[tab].forEach(function (a) {
      var b = el("button", "btn " + a[2], a[1]);
      b.type = "button";
      b.addEventListener("click", function () { decide(it, a[0], li); });
      acts.appendChild(b);
    });
    li.appendChild(acts);
    return li;
  }

  var DONE = { approve: "Approved", reject: "Rejected", hide: "Hidden" };

  function decide(it, action, li) {
    li.classList.add("leaving");
    api("decide", { id: it.id, action: action }).then(function (r) {
      if (!r.ok) {
        li.classList.remove("leaving");
        if (r.status === 401) return showLogin(r.error);
        return toast(r.error || "That didn't work. Please try again.");
      }
      toast(DONE[action] + (tab === "reported" && action === "approve" ? " (put back)" : ""));
      load();
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function (b) {
    b.addEventListener("click", function () { tab = b.dataset.tab; if (data) render(); });
  });

  load();
})();
