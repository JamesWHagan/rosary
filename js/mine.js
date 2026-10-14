/*
 * Decade4U: "My intentions" - the intentions shared from this browser,
 * whether they are approved yet, and how many people have prayed for each.
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  function plural(n, one, many) { return n === 1 ? one : many.replace("{n}", n); }

  function status(it, limits) {
    var n = it.prayed || 0;
    var people = plural(n, "1 person has prayed for this", "{n} people have prayed for this");
    switch (it.status) {
      case "pending": return { cls: "pending", tag: "Being checked", text: "People will start praying once it has been read." };
      case "hidden": return { cls: "pending", tag: "Being reviewed", text: n ? people + ". It's paused while we take a look." : "It's paused while we take a look." };
      case "retired": return { cls: "complete", tag: "Complete", text: plural(n, "1 person prayed for this. 🙏", "{n} people prayed for this. 🙏") };
      default:
        return n
          ? { cls: "live", tag: "Being prayed for", text: people + "." }
          : { cls: "live", tag: "Waiting to be prayed for", text: "It will be offered to the next people who pray." };
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function when(ms) {
    return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  var myList = [];
  fetchMine();
  function afterLoad() {
    if (location.hash === "#erase") { openErase(); $("erase").scrollIntoView({ block: "center" }); }
  }

  // ---------- Erase my data (asks first, says exactly what goes) ----------
  function openErase() {
    var ul = $("erase-list");
    ul.innerHTML = "";
    var n = myList.length;
    var items = [];
    if (n) items.push(plural(n, "your 1 intention (people will no longer pray for it)", "your {n} intentions (people will no longer pray for them)"));
    if (n) items.push("the count of people who have prayed for you");
    items.push("the count of people you have prayed for (" + DecadeStats.prayedFor() + ")");
    items.push("any rosary in progress on this device");
    items.forEach(function (t) { ul.appendChild(el("li", "", t)); });
    $("erase-open").hidden = true;
    $("erase-box").hidden = false;
  }
  $("erase-open").addEventListener("click", openErase);
  $("erase-no").addEventListener("click", function () { $("erase-box").hidden = true; $("erase-open").hidden = false; });
  $("erase-yes").addEventListener("click", function () {
    var yes = $("erase-yes");
    yes.disabled = true; yes.textContent = "Erasing…";
    Intentions.erase().then(function (r) {
      if (!r || !r.ok) {
        yes.disabled = false; yes.textContent = "Yes, erase everything";
        $("erase-error").textContent = (r && r.error) || "Something went wrong. Please try again.";
        $("erase-error").hidden = false;
        return;
      }
      ["mine-stat", "list", "empty", "erase-box"].forEach(function (id) { $(id).hidden = true; });
      document.querySelector(".mine-actions").hidden = true;
      $("erase-done").hidden = false;
    });
  });

  function fetchMine() {
    if (Intentions.offline) { $("loading").hidden = true; $("empty").hidden = false; afterLoad(); return; }
    fetch("/api/intentions?device=" + Intentions.device())
      .then(function (r) { return r.json(); })
      .then(render, function () {
        $("loading").textContent = "We couldn't load your intentions. Please check your connection and try again.";
      });
  }

  function render(r) {
    $("loading").hidden = true;
    var list = (r && r.ok && r.intentions) || [];
    myList = list;
    var limits = (r && r.limits) || { active: 3, prayers: 33, days: 30 };
    if (!list.length) { $("empty").hidden = false; afterLoad(); return; }

    var total = list.reduce(function (s, it) { return s + (it.prayed || 0); }, 0);
    if (total > 0) {
      var host = $("mine-stat");
      host.hidden = false;
      DecadeStats.ring(host, total, total === 1 ? "person has prayed for you" : "people have prayed for you");
    }

    var ul = $("list");
    list.forEach(function (it) {
      var s = status(it, limits);
      var li = el("li", "mine-item " + s.cls);
      var top = el("div", "mine-top");
      top.appendChild(el("span", "mine-tag", s.tag));
      top.appendChild(el("span", "mine-date", when(it.created_at)));
      li.appendChild(top);
      li.appendChild(el("p", "mine-text", it.intention));
      if ((it.status === "approved" || it.status === "retired" || it.status === "hidden") && it.prayed > 0) {
        var count = el("div", "mine-count");
        count.appendChild(el("strong", "", String(it.prayed)));
        count.appendChild(el("span", "", it.prayed === 1 ? "prayer" : "prayers"));
        li.appendChild(count);
        li.classList.add("has-count");
      }
      li.appendChild(el("p", "mine-status", s.text));
      li.appendChild(el("p", "mine-shown", "Shown as: " + (it.name || "Someone")));
      ul.appendChild(li);
    });

    var active = list.filter(function (it) { return it.status === "pending" || it.status === "approved"; }).length;
    if (active >= limits.active) {
      $("share").hidden = true;
      $("limit-note").textContent = "You have " + active + " active intentions, the most at one time. You can share a new one when one is complete (after " + limits.prayers + " decades, or " + limits.days + " days).";
    } else {
      $("share").textContent = "Share another intention";
      $("limit-note").textContent = "Each intention is prayed for until " + limits.prayers + " people have prayed a decade for it, or for " + limits.days + " days.";
    }
    afterLoad();
  }
})();
