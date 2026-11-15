// Page code for the extras. Display only: it shows what extras.js derived from the plan and decides nothing.
(function () {
  var X = window.EXTRAS, RANGES = window.RANGES, RULES = window.RULES;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function link(s) { return s ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : ""; }
  var last = {};
  function setHTML(id, html) { if (last[id] !== html) { last[id] = html; $(id).innerHTML = html; } }

  // The place is read from the mission plan. placePick holds a place chosen by hand, or null for automatic.
  var placePick = null, photo = null, ctx = null, baseReport = "";
  try { placePick = localStorage.getItem("health-check-place") || null; } catch (e) {}
  // Reminders start by themselves. Demo speed: one minute of mission time passes each second.
  var MS_PER_MINUTE = 1000, sched = {};
  function nowPlace() { return X.currentPlace(ctx ? ctx.day.day : 0, placePick); }

  var STATE = {
    due: { cls: "watch", icon: "!", word: "Due now" },
    recheck: { cls: "watch", icon: "↻", word: "Re-check" },
    tomorrow: { cls: "changed", icon: "→", word: "Tomorrow" },
    done: { cls: "ok", icon: "✓", word: "Done today" }
  };

  function renderPlace() {
    var cur = nowPlace(), p = X.place(cur.id), S = window.SAMPLE;
    setHTML("placeBtns", X.PLACES.map(function (q) {
      return '<button data-place="' + q.id + '" aria-pressed="' + (q.id === cur.id) + '">' + esc(q.name) + '</button>';
    }).join("") + (cur.auto ? "" : '<button data-place="" class="xback">Back to automatic</button>'));
    setHTML("placeOut",
      '<p><span class="chip s-' + (cur.auto ? "ok" : "changed") + '">' + (cur.auto ? "Automatic" : "Set by you") + '</span> <strong class="xwhere">' + esc(p.name) + '.</strong> ' +
      (cur.auto ? "Read from the mission plan (simulated): flight day " + (ctx ? ctx.day.day : 0) + " of the " + S.missionDays + "-day sample trip towards Mars." : "You changed the place by hand. The mission plan says " + esc(X.place(X.autoPlace(ctx ? ctx.day.day : 0)).name.toLowerCase()) + ".") + '</p>' +
      '<p><strong>What is known here:</strong> ' + esc(p.evidence) + '</p>' +
      '<p><strong>Reaching Earth:</strong> ' + esc(p.reply) + ' ' + link(p.source) + '</p>' +
      (p.team ? '<p class="src">' + esc(p.team) + '</p>' : "") +
      '<p class="src">The rules on this page do not change with place. The place changes how much weight the space comparison deserves, and it is named in the report.</p>');
  }

  function habitCounts() {
    var done = 0, total = 0;
    Array.prototype.forEach.call(document.querySelectorAll('#habits input[type="checkbox"]'), function (b) {
      if (b.disabled) return;
      total++; if (b.checked) done++;
    });
    return { done: done, total: total };
  }

  function renderChecks() {
    if (!ctx) return;
    var raw = X.prompts(ctx.keys, ctx.res, ctx.steps, RANGES, RULES), hc = habitCounts(), now = Date.now();
    sched[ctx.day.id] = X.schedule(raw, sched[ctx.day.id], now, MS_PER_MINUTE);
    var ps = X.withReminders(raw, sched[ctx.day.id], now);
    var g = X.game(ctx.keys, ctx.res, hc.done, hc.total, ctx.day.trend);
    setHTML("checkList", ps.map(function (p) {
      var st = STATE[p.state];
      return '<li><span class="chip s-' + st.cls + '"><span aria-hidden="true">' + st.icon + '</span> ' + st.word + '</span> <strong>' + esc(RANGES[p.key].label) + '</strong><br><span class="src">' + esc(p.text) + (p.left ? " Reminder running: " + p.left + (p.left === 1 ? " minute" : " minutes") + " left." : "") + '</span></li>';
    }).join(""));
    var due = ps.filter(function (p) { return p.state === "due"; }).map(function (p) { return RANGES[p.key].label.replace(/ \(.*\)/, "").toLowerCase(); });
    var msg = due.length ? "Take now: " + due.join(", ") + "." : "";
    if ($("remindMsg").textContent !== msg) { $("remindMsg").textContent = msg; $("remindMsg").hidden = !msg; $("remindMsg").className = "xbanner" + (msg ? " on" : ""); }
    var streakLine = g.streak === null ? "No streak yet: typed-in readings have no history."
      : g.streak + (g.streak === 1 ? " day" : " days") + " in a row with every check logged (simulated history).";
    setHTML("gameOut",
      '<div class="xmeter" role="img" aria-label="' + g.logged + ' of ' + g.total + ' checks logged today"><span style="width:' + g.pct + '%"></span></div>' +
      '<p><strong>' + g.logged + ' of ' + g.total + ' checks logged today.</strong> ' + esc(streakLine) + '</p>' +
      '<ul class="xbadges">' + g.badges.map(function (b) {
        return '<li class="' + (b.earned ? "earned" : "open") + '"><span aria-hidden="true">' + (b.earned ? "★" : "☆") + '</span> ' + esc(b.name) + '<span class="src"> ' + (b.earned ? "Earned." : "Not yet.") + '</span></li>';
      }).join("") + '</ul>');
  }

  function renderTreat() {
    if (!ctx) return;
    var t = X.treatment(ctx.steps);
    function li(s) { return '<li><strong>' + esc(s.when) + ':</strong> ' + esc(s.text) + ((s.basis || []).length ? ' <span class="src">Source: ' + s.basis.map(link).join("; ") + '.</span>' : "") + '</li>'; }
    setHTML("treatOut",
      '<div class="xcols"><div><h3>What you can do yourself</h3>' + (t.self.length ? '<ul>' + t.self.map(li).join("") + '</ul>' : '<p>Nothing from today\'s readings. Keep your daily habits.</p>') + '</div>' +
      '<div><h3>What goes to the crew medical officer</h3>' + (t.officer.length ? '<ul>' + t.officer.map(li).join("") + '</ul>' : '<p>Nothing from today\'s readings. Tell them if you feel unwell: readings cannot see symptoms.</p>') +
      '<p class="src">Medicines and procedures are decided by the crew medical officer, with the flight surgeon on Earth. This tool never names a medicine.</p></div></div>');
  }

  function renderHow() {
    if (!ctx) return;
    var k = ctx.key, lines = X.howTo(k, RANGES, RULES);
    setHTML("howOut", '<h3>' + esc(RANGES[k].label) + '</h3><dl class="xhow">' + lines.map(function (l) {
      return '<dt>' + esc(l.head) + '</dt><dd>' + esc(l.text) + (l.source ? ' ' + link(l.source) : "") + '</dd>';
    }).join("") + '</dl><p class="src">Pick another reading above to see its steps. These lines repeat what the reading\'s own panel says, in one place.</p>');
  }

  function renderReport() { $("report").value = baseReport + "\n" + X.reportLines(X.place(nowPlace().id), photo).join("\n"); }

  function renderPhoto() {
    setHTML("photoOut", photo
      ? '<figure class="xphoto"><img src="' + photo.url + '" alt="Photo added by the crew member: ' + esc(photo.name) + '"><figcaption>' + esc(photo.name) + '. Listed in the report below. Not analysed and not sent.</figcaption></figure>' +
        '<p><button type="button" id="photoClear">Remove photo</button></p>'
      : '<p class="src">No photo added.</p>');
  }

  // Called by app.js at the end of every render.
  window.EXTRAS_UI = { render: function (c) {
    ctx = c; baseReport = $("report").value;
    renderPlace(); renderChecks(); renderTreat(); renderHow(); renderPhoto(); renderReport();
  } };

  $("placeBtns").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    placePick = b.getAttribute("data-place") || null;
    try { if (placePick) localStorage.setItem("health-check-place", placePick); else localStorage.removeItem("health-check-place"); } catch (err) {}
    renderPlace(); if (ctx) renderReport();
    var again = document.querySelector('#placeBtns [data-place="' + nowPlace().id + '"]'); if (again) again.focus();
  });
  // app.js redraws the habit list on a tick without a full render, so recount after it has run.
  $("habits").addEventListener("change", function () { setTimeout(renderChecks, 0); });
  // Keeps the reminder countdowns moving. It only redraws while a reminder is still running on the day shown.
  setInterval(function () {
    if (!ctx) return;
    var s = sched[ctx.day.id] || {}, now = Date.now();
    var running = Object.keys(s).some(function (k) { return s[k] > now - 1500; });
    if (running) renderChecks();
  }, 1000);
  $("photoIn").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (photo) URL.revokeObjectURL(photo.url);
    photo = f && /^image\//.test(f.type) ? { name: f.name, url: URL.createObjectURL(f) } : null;
    last.photoOut = null; renderPhoto(); if (ctx) renderReport();
  });
  $("photoOut").addEventListener("click", function (e) {
    if (e.target.id !== "photoClear") return;
    if (photo) URL.revokeObjectURL(photo.url);
    photo = null; $("photoIn").value = ""; renderPhoto(); if (ctx) renderReport(); $("photoIn").focus();
  });
})();
