(function () {
  var SAMPLE = window.SAMPLE, RANGES = window.RANGES, RULES = window.RULES, SOURCES = window.SOURCES;
  var ASSESS = window.ASSESS, TASKS = window.TASKS, FORECAST = window.FORECAST, INSIGHTS = window.INSIGHTS, ACTIONS = window.ACTIONS;
  var HAZARDS = window.HAZARDS, REGION_RISKS = window.REGION_RISKS, NOT_MEASURED_RISKS = window.NOT_MEASURED_RISKS, HABITS = window.HABITS;
  var KEYS = ["bp", "hr", "temp", "sleep", "glucose", "mood"];
  var REGIONS = { head: "Head: sleep and mood", chest: "Heart: blood pressure and heart rate", core: "Core: body temperature", arm: "Arm: blood sugar" };
  var STATUS = {
    ok: { word: "Close to your baseline", icon: "✓", rank: 0 },
    nobase: { word: "Inside the normal range", icon: "✓", rank: 0, cls: "ok" },
    expected: { word: "Expected in space", icon: "≈", rank: 1 },
    changed: { word: "Changed from your baseline", icon: "△", rank: 2 },
    cannot: { word: "Cannot assess", icon: "?", rank: 3 },
    watch: { word: "Flagged: re-check", icon: "!", rank: 4 },
    serious: { word: "Flagged: act now", icon: "‼", rank: 5 }
  };
  var TASK_CLASS = { clear: "expected", hold: "watch", cannot: "cannot", redflag: "serious" };
  var START = 2; // open on the day that shows the space shift
  var MINE = SAMPLE.days.length; // index of "my own readings"
  var EMPTY = { sys: null, dia: null, hr: null, temp: null, sleep: null, glucose: null, mood: null };
  var state = { day: START, key: "temp", task: RULES.tasks[0].id, flags: [], hazard: null, fday: SAMPLE.days[START].day };
  var mine = { day: 90, r: copy(EMPTY), baseline: copy(EMPTY) };
  var done = {};
  // Saved readings are read back as plain numbers only, never as text.
  function numOrNull(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  try {
    var saved = JSON.parse(localStorage.getItem("health-check-mine") || "null");
    if (saved && saved.r && saved.baseline) {
      mine.day = numOrNull(saved.day) || 0;
      Object.keys(EMPTY).forEach(function (k) { mine.r[k] = numOrNull(saved.r[k]); mine.baseline[k] = numOrNull(saved.baseline[k]); });
    }
  } catch (e) {}
  try {
    var savedDone = JSON.parse(localStorage.getItem("health-check-habits") || "{}") || {};
    var habitIds = HABITS.map(function (h) { return h.id; });
    Object.keys(savedDone).forEach(function (d) { if (Array.isArray(savedDone[d])) done[d] = savedDone[d].filter(function (x) { return habitIds.indexOf(x) !== -1; }); });
  } catch (e) { done = {}; }
  var last = {};

  function $(id) { return document.getElementById(id); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  // Only touch the page when the content really changed, so screen readers are not told the same thing twice.
  function setHTML(id, html) { if (last[id] !== html) { last[id] = html; $(id).innerHTML = html; } }
  function currentDay() {
    if (state.day !== MINE) return SAMPLE.days[state.day];
    return { id: "mine", day: mine.day || 0, custom: true, label: "My own readings", note: "Readings you typed in. They stay in this browser.", r: mine.r, week: null, trend: null };
  }
  function currentBaseline() { return state.day === MINE ? mine.baseline : SAMPLE.baseline; }
  function show(key, v) {
    if (v === null || v === undefined) return "No valid reading";
    if (key === "bp") return v.sys + " / " + v.dia + " mmHg";
    return ((key === "temp" || key === "sleep") ? v.toFixed(1) : v) + " " + RANGES[key].unit;
  }
  function signed(n) { return (n > 0 ? "+" : "") + n; }
  function word(a) {
    var s = a.status;
    if (s === "watch" || s === "serious") return (a.dir === "low" ? "Low" : "High") + (s === "serious" ? ": act now" : ": re-check") + (a.teamRule ? " (team line)" : "");
    if (s === "changed") return (a.dir === "down" ? "Down" : "Up") + " from your baseline";
    return STATUS[s].word;
  }
  function chip(a) {
    var s = typeof a === "string" ? { status: a } : a, st = STATUS[s.status];
    return '<span class="chip s-' + (st.cls || s.status) + '"><span aria-hidden="true">' + st.icon + '</span> ' + (typeof a === "string" ? st.word : word(a)) + '</span>';
  }
  function link(s) { return s ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : ""; }
  function spark(vals, base, label) {
    var pts = vals.map(function (v) { return v === null || v === undefined ? null : (typeof v === "object" ? v.sys : v); });
    var nums = pts.filter(function (v) { return v !== null; }).concat(base === null || base === undefined ? [] : [base]);
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums), span = (hi - lo) || 1, W = 240, H = 56, P = 6;
    function x(i) { return P + i * (W - 2 * P) / (pts.length - 1); }
    function y(v) { return H - P - (v - lo) * (H - 2 * P) / span; }
    var d = "", pen = false, dots = "";
    pts.forEach(function (v, i) { if (v === null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1) + " "; pen = true; });
    var end = pts.length - 1; while (end >= 0 && pts[end] === null) end--;
    if (end >= 0) dots = '<circle cx="' + x(end).toFixed(1) + '" cy="' + y(pts[end]).toFixed(1) + '" r="3.5"/>';
    return '<figure class="trend"><figcaption>Last 7 days (simulated). Dashed line: your pre-launch baseline.</figcaption>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + ' over the last 7 days: ' + pts.map(function (v) { return v === null ? "no reading" : v; }).join(", ") + '">' +
      (base === null || base === undefined ? "" : '<line class="base" x1="' + P + '" x2="' + (W - P) + '" y1="' + y(base).toFixed(1) + '" y2="' + y(base).toFixed(1) + '"/>') +
      '<path d="' + d + '"/>' + dots + '</svg></figure>';
  }
  // A plain sentence on what the status means for this reading.
  function verdict(k, a, cfg, day) {
    var unit = k === "bp" ? " mmHg on the top number" : " " + cfg.unit;
    if (a.status === "cannot") return "There is no valid reading today, so nothing can be said about it.";
    if (a.status === "watch" || a.status === "serious") {
      var side = k === "sleep" ? "below the recommended amount" : (a.dir === "low" ? "below the normal range" : "above the normal range");
      return "This reading is " + side + "." + (a.status === "serious" ? " It needs action now." : " It needs a re-check.");
    }
    if (a.status === "expected") return "Not flagged by the clinical chart. It is " + signed(a.d) + unit + " from your baseline, which matches the average shift a small study measured in crews at this stage. That is context, not an all-clear.";
    if (a.status === "changed") return "Not flagged by the clinical chart, but it is " + signed(a.d) + unit + " from your own baseline" + (a.expectedShift ? ", more than the space shift explains on flight day " + day.day : "") + ".";
    if (a.status === "nobase") return "Not flagged by the clinical chart. Enter your baseline to compare it with your own normal.";
    return "Not flagged by the clinical chart, and close to your own pre-launch numbers.";
  }

  function render() {
    // Keep keyboard focus where it was: the lists below are rebuilt when their content changes.
    var ae = document.activeElement, refocus = null;
    if (ae && ae.getAttribute) {
      if (ae.classList && ae.classList.contains("sumchip")) refocus = '.sumchip[data-key="' + ae.getAttribute("data-key") + '"]';
      else if (ae.getAttribute("data-key")) refocus = '.tile[data-key="' + ae.getAttribute("data-key") + '"]';
      else if (ae.getAttribute("data-task")) refocus = '#taskBtns [data-task="' + ae.getAttribute("data-task") + '"]';
      else if (ae.getAttribute("data-hazard")) refocus = '#hazBtns [data-hazard="' + ae.getAttribute("data-hazard") + '"]';
      else if (ae.getAttribute("data-region") && ae.tagName === "BUTTON") refocus = '#regionList [data-region="' + ae.getAttribute("data-region") + '"]';
    }
    var day = currentDay(), baseline = currentBaseline();
    var res = ASSESS.assessAll(KEYS, day.r, baseline, day.day, RANGES, RULES);
    var sum = INSIGHTS.summary(KEYS, res, RANGES);
    var nts = INSIGHTS.notes(KEYS, day, res, baseline, RANGES, RULES, SOURCES);
    var ctx = { RANGES: RANGES, RULES: RULES, SOURCES: SOURCES, flags: state.flags, notes: nts, custom: !!day.custom };
    var steps = ACTIONS.plan(KEYS, res, ctx);
    $("dayNote").textContent = day.note + (day.custom ? "" : " (" + SAMPLE.person + ".)");
    $("mine").hidden = !day.custom;
    $("badge").textContent = day.custom ? "Typed by you, not a sensor" : "Simulated sample data";

    // Today: how you are doing
    var lvl = state.flags.length ? "serious" : sum.level;
    var head = state.flags.length ? "You ticked a symptom. Tell the crew medical officer now." : sum.headline + ".";
    setHTML("sumHead", '<span class="sumicon s-' + (STATUS[lvl].cls || lvl) + '" aria-hidden="true">' + STATUS[lvl].icon + '</span> ' + esc(head));
    $("sumHead").className = "sumhead s-" + (STATUS[lvl].cls || lvl);
    setHTML("sumSub", esc(state.flags.length ? sum.headline + ". " + sum.sub : sum.sub));
    setHTML("sumChips", sum.chips.map(function (c) {
      var st = STATUS[c.status];
      return '<button class="sumchip s-' + (st.cls || c.status) + '" data-key="' + c.key + '" aria-pressed="' + (c.key === state.key) + '">' +
        '<span class="lab">' + c.label + '</span><span class="st"><span aria-hidden="true">' + st.icon + '</span> ' + c.state + '</span></button>';
    }).join(""));
    $("sumCaveat").textContent = sum.caveat;
    setHTML("notes", nts.length ? nts.map(function (n) {
      return '<li class="n-' + n.kind + '"><strong>' + esc(n.text) + '</strong>' + (n.more ? " " + esc(n.more) : "") + (n.source ? " " + link(n.source) : "") + '</li>';
    }).join("") : '<li class="n-info">' + (day.trend ? "Nothing stood out in the last 7 days." : "Typed-in readings have no history yet, so there is nothing to compare over time.") + '</li>');

    // What to do now
    setHTML("steps", steps.map(function (s) {
      var basis = (s.basis || []).map(link).join("; ");
      return '<li class="step l-' + s.level + '"><span class="when">' + s.when + '</span><span class="what">' + esc(s.text) + '</span>' +
        '<span class="whyline">' + esc(s.why) + '</span>' +
        '<span class="basis">' + (s.team ? "This team's example step." : "") + (basis ? (s.team ? " Rests on: " : "Source: ") + basis + "." : "") + '</span></li>';
    }).join(""));

    // Tiles
    setHTML("tiles", KEYS.map(function (k) {
      var hz = state.hazard && RANGES[k].hazard === state.hazard ? " hz" : "";
      return '<button class="tile' + hz + '" data-key="' + k + '" aria-pressed="' + (k === state.key) + '">' +
        '<span class="name">' + RANGES[k].label + '</span><span class="val">' + show(k, res[k].v) + '</span>' + chip(res[k]) + '</button>';
    }).join(""));

    // Regions take the most serious status of their readings
    var worst = {};
    KEYS.forEach(function (k) {
      var reg = RANGES[k].region, s = res[k].status;
      if (!worst[reg] || STATUS[s].rank > STATUS[worst[reg]].rank) worst[reg] = s;
    });
    var selReg = RANGES[state.key].region;
    Array.prototype.forEach.call(document.querySelectorAll(".region"), function (g) {
      var reg = g.getAttribute("data-region"), st = STATUS[worst[reg]];
      g.setAttribute("class", "region s-" + (st.cls || worst[reg]) + (reg === selReg ? " sel" : ""));
      g.setAttribute("aria-label", REGIONS[reg] + ". " + st.word);
      g.setAttribute("aria-pressed", String(reg === selReg));
      var tx = g.querySelector("text");
      if (!tx.getAttribute("data-name")) tx.setAttribute("data-name", tx.textContent);
      tx.textContent = tx.getAttribute("data-name") + " " + st.icon;
    });
    setHTML("regionList", Object.keys(REGIONS).map(function (reg) {
      return '<li><button data-region="' + reg + '" aria-pressed="' + (reg === selReg) + '"><span>' + REGIONS[reg] + '</span>' + chip(worst[reg]) + '</button></li>';
    }).join(""));

    // Panel
    var k = state.key, cfg = RANGES[k], a = res[k], who = RULES.whoToTell(a.status === "nobase" ? "ok" : a.status, k, k === "bp" ? null : a.v, a.score);
    var risk = REGION_RISKS[cfg.region], hz = HAZARDS[cfg.hazard];
    var base = '<h3>Your pre-launch baseline</h3>' + (a.b === null || a.b === undefined
      ? '<p>No baseline entered.</p><p>Without it, this reading is judged by the clinical chart only.</p>'
      : '<p>' + show(k, a.b) + '</p><p>' + (a.v === null ? "No reading to compare today." : "Today is " + signed(a.d) + (k === "bp" ? " mmHg on the top number" : " " + cfg.unit) + " from your own start.") + '</p>');
    var dayLine = (cfg.space.rampDays && a.expectedShift !== null) ?
      '<p>On flight day ' + day.day + ' that build-up would be about ' + signed(a.expectedShift) + ' ' + cfg.unit + '.</p>' :
      (cfg.space.fromDay && day.day < cfg.space.fromDay ? '<p>Flight day ' + day.day + ' is earlier than the study measured, so no shift is applied today.</p>' : "");
    var space = '<h3>Measured in space</h3><p>' + cfg.space.text + '</p>' + dayLine +
      (cfg.space.study ? '<p class="src">How it was measured: ' + cfg.space.study + '</p>' : "") +
      (cfg.space.source ? '<p class="src">Source: ' + link(cfg.space.source) + '</p>' : "");
    var clin = '<h3>Clinical range</h3><p>' + cfg.clinicalText + '</p>' +
      (cfg.clinicalSources.length ? '<p class="src">Source: ' + cfg.clinicalSources.map(link).join("; ") + '</p>' : "");
    setHTML("panel",
      '<h2>' + cfg.label + '</h2><p><span class="big">' + show(k, a.v) + '</span>' + chip(a) + '</p>' +
      '<p class="verdict">' + verdict(k, a, cfg, day) + '</p>' +
      (a.why ? '<p class="why"><strong>Why it is flagged:</strong> ' + a.why + '</p>' : "") +
      (day.trend && day.trend[k] ? spark(day.trend[k], a.b === null || a.b === undefined ? null : (k === "bp" ? a.b.sys : a.b), cfg.label + (k === "bp" ? " (top number)" : "")) : "") +
      '<div class="cmp"><div>' + base + '</div><div>' + space + '</div><div>' + clin + '</div></div>' +
      '<div class="act"><span class="tag">For this reading: what to do and who to tell. Example escalation by this team.</span>' +
      '<p><strong>Who: ' + who.who + '.</strong> ' + who.text + '</p></div>' +
      '<div class="nasa"><span class="tag">Why check this: NASA on this part of the body</span>' +
      '<p>' + risk.fact + ' <a href="' + risk.url + '" target="_blank" rel="noopener">' + risk.name + '</a></p>' +
      '<p><strong>What helps, from the same NASA page:</strong> ' + risk.helps + '</p>' +
      '<p><strong>Can it be measured in space?</strong> ' + cfg.inSpace + ' ' + link(cfg.inSpaceSource) + '</p>' +
      '<p class="src">Hazard behind this reading: <a href="' + hz.url + '" target="_blank" rel="noopener">' + hz.name + '</a>.</p></div>' +
      '<p class="src">How this tool gets the reading: ' + (day.custom ? "Typed by you." : cfg.feed + (cfg.feedSource ? " " + link(cfg.feedSource) + "." : "")) + '</p>');

    renderTask(res);
    renderForecast(day);
    renderHazard();
    renderHabits(day);
    $("report").value = ACTIONS.report(KEYS, res, day, sum, steps, ctx);
    if (refocus) { var el = document.querySelector(refocus); if (el && el !== document.activeElement) el.focus(); }
  }

  function renderTask(res) {
    setHTML("taskBtns", RULES.tasks.map(function (t) {
      return '<button data-task="' + t.id + '" aria-pressed="' + (t.id === state.task) + '">' + t.name + '</button>';
    }).join(""));
    var task = RULES.tasks.filter(function (t) { return t.id === state.task; })[0];
    var out = TASKS.checkTask(task, res, RULES, RANGES, state.flags);
    setHTML("taskOut", '<p><span class="chip s-' + TASK_CLASS[out.answer] + '">' + out.word + '</span> <span class="src">for: ' + task.name + '</span></p>' +
      '<ul>' + out.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") + '</ul>' +
      '<p class="src">Readings this task looks at: ' + task.needs.map(function (k) { return RANGES[k].label; }).join(", ") + '. Which readings a task looks at, and the lines that hold it, are this team\'s example.</p>' +
      '<p class="src">This check does not measure: ' + out.notMeasured.join(", ") + '. It is not a medical clearance.</p>');
  }

  function renderForecast(day) {
    var f = $("fday"); f.max = SAMPLE.missionDays; f.value = state.fday;
    var months = Math.round(state.fday / 30 * 10) / 10;
    f.setAttribute("aria-valuetext", state.fday + " days, about " + months + " months");
    $("fdayOut").textContent = state.fday + " (about " + months + " months)" + (day.custom && mine.day > SAMPLE.missionDays ? ". The forecast stops at day " + SAMPLE.missionDays + "." : "");
    var b = FORECAST.bone(months), t = RANGES.temp.space, base = currentBaseline();
    var sd = day.week ? FORECAST.sleepDebt(day.week, 7) : null;
    var boneRisk = NOT_MEASURED_RISKS[0], lo = Math.round(b.low), hi = Math.round(b.high);
    setHTML("forecast",
      '<div><h3>Bone density</h3><p class="big2">' + (lo === hi ? lo + "%" : lo + "% to " + hi + "%") + '</p><p>of the pre-mission value by this day, for weight-bearing bones. A NASA average, not a measurement.</p>' +
      '<div class="bar" role="img" aria-label="Bone density range ' + lo + ' to ' + hi + ' percent"><span class="hi" style="width:' + b.high + '%"></span><span class="lo" style="width:' + b.low + '%"></span></div>' +
      '<p class="src">NASA\'s average of 1% to 1.5% a month, measured on four-to-six-month missions, for everyone. <a href="' + boneRisk.url + '" target="_blank" rel="noopener">NASA bone risk page</a></p></div>' +
      '<div><h3>Core temperature</h3>' + (base.temp === null || base.temp === undefined ? '<p>Needs your baseline temperature.</p>'
        : '<p class="big2">about ' + FORECAST.tempRamp(state.fday, base.temp, t.shift, t.rampDays).toFixed(1) + ' °C</p><p>is a baseline of ' + base.temp.toFixed(1) + ' °C plus the study\'s average shift, built up in a straight line to day 75.</p>') +
      '<p class="src">Context, never a threshold. The straight line is this team\'s assumption; the study says gradual. ' + link(t.source) + ', 11 astronauts.</p></div>' +
      '<div><h3>Sleep</h3>' + (sd ?
        '<p class="big2">' + sd.debt.toFixed(1) + ' h short</p><p>of 7 hours a night over the last ' + sd.nights + ' nights of sample data. A second week like it would add the same again.</p>'
        : '<p>Needs seven nights of readings. Not available for typed-in readings yet.</p>') +
      '<p class="src">For reference, NASA says seven days of six hours of sleep performs like 24 to 36 hours awake. ' + link(SOURCES.tb041) + '; ' + link(SOURCES.cdc) + '.</p></div>');
  }

  function renderHazard() {
    setHTML("hazBtns", Object.keys(HAZARDS).map(function (h) {
      return '<button data-hazard="' + h + '" aria-pressed="' + (h === state.hazard) + '">' + HAZARDS[h].name + '</button>';
    }).join(""));
    if (!state.hazard) { setHTML("hazOut", ""); return; }
    var h = HAZARDS[state.hazard];
    var ks = KEYS.filter(function (k) { return RANGES[k].hazard === state.hazard; });
    setHTML("hazOut", '<p>' + h.line + ' <a href="' + h.url + '" target="_blank" rel="noopener">NASA: ' + h.name + '</a></p>' +
      '<p class="src">' + (ks.length ? "Readings linked to this hazard in this prototype (outlined above): " + ks.map(function (k) { return RANGES[k].label; }).join(", ") + ". The link is this team's grouping."
        : (h.note || "No reading in this prototype is linked to this hazard.")) + '</p>');
  }

  function renderHabits(day) {
    var mineDone = done[day.id] || [];
    setHTML("habits", HABITS.map(function (h) {
      return '<li><label><input type="checkbox" data-habit="' + h.id + '"' + (mineDone.indexOf(h.id) !== -1 ? " checked" : "") + '> <span><strong>' + h.text + '</strong><br><span class="src">' + h.why + ' ' + link(h.source) + '</span></span></label></li>';
    }).join(""));
    $("habitCount").textContent = mineDone.length + " of " + HABITS.length + " done today.";
  }

  function pickRegion(reg) {
    var first = KEYS.filter(function (k) { return RANGES[k].region === reg; })[0];
    if (first) { state.key = first; render(); }
  }

  // Wiring
  var sel = $("day");
  sel.innerHTML = SAMPLE.days.map(function (d, i) { return '<option value="' + i + '">' + d.label + '</option>'; }).join("") +
    '<option value="' + MINE + '">Enter my own readings</option>';
  sel.value = String(START);
  function clampDay(n) { return Math.max(0, Math.min(SAMPLE.missionDays, Math.round(n / 10) * 10)); }
  sel.addEventListener("change", function () { state.day = +sel.value; state.fday = clampDay(currentDay().day); render(); });

  var form = $("mine"), FIELDS = ["sys", "dia", "hr", "temp", "sleep", "glucose", "mood"];
  var NAMES = { day: "flight day", sys: "blood pressure, top", dia: "blood pressure, bottom", hr: "heart rate", temp: "core temperature", sleep: "sleep", glucose: "blood sugar", mood: "mood" };
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function fillForm() {
    form.elements.day.value = mine.day;
    FIELDS.forEach(function (k) {
      form.elements[k].value = mine.r[k] === null || mine.r[k] === undefined ? "" : mine.r[k];
      form.elements["b_" + k].value = mine.baseline[k] === null || mine.baseline[k] === undefined ? "" : mine.baseline[k];
    });
  }
  // Read one box. Returns the number, or null with a message when the value cannot be used.
  function read(name, label, msgs) {
    var el = form.elements[name], v = num(el.value), bad = el.value !== "" && (v === null || !el.validity.valid);
    el.setAttribute("aria-invalid", String(bad));
    if (bad) msgs.push(label + " is outside " + el.min + " to " + el.max + ", so it is not used.");
    return bad ? null : v;
  }
  function readForm() {
    var msgs = [];
    var d = read("day", "Flight day", msgs); mine.day = d === null ? 0 : d;
    FIELDS.forEach(function (k) {
      mine.r[k] = read(k, NAMES[k].charAt(0).toUpperCase() + NAMES[k].slice(1), msgs);
      mine.baseline[k] = read("b_" + k, "Baseline " + NAMES[k], msgs);
    });
    [[mine.r, ""], [mine.baseline, "Baseline "]].forEach(function (p) {
      var o = p[0];
      var bpName = p[1] ? "Baseline blood pressure" : "Blood pressure";
      if ((o.sys === null) !== (o.dia === null)) { msgs.push(bpName + " needs both numbers, so it is not used."); o.sys = null; o.dia = null; }
      else if (o.sys !== null && o.dia >= o.sys) { msgs.push(bpName + ": the bottom number must be lower than the top, so it is not used."); o.sys = null; o.dia = null; }
    });
    $("mineMsg").textContent = msgs.join(" ");
    try { localStorage.setItem("health-check-mine", JSON.stringify(mine)); } catch (e) {}
  }
  fillForm();
  form.addEventListener("input", function () { readForm(); state.fday = clampDay(mine.day); render(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  $("useSample").addEventListener("click", function () {
    FIELDS.forEach(function (k) { form.elements["b_" + k].value = SAMPLE.baseline[k]; });
    readForm(); render();
    $("mineMsg").textContent = "Baseline boxes now hold the made-up sample crew member's numbers. Replace them with your own. " + $("mineMsg").textContent;
  });
  $("missionNote").textContent = SAMPLE.mission;

  function keyClick(e) { var t = e.target.closest("[data-key]"); if (t) { state.key = t.getAttribute("data-key"); render(); } }
  $("tiles").addEventListener("click", keyClick);
  $("sumChips").addEventListener("click", keyClick);
  $("regionList").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) pickRegion(b.getAttribute("data-region")); });
  var fig = $("figure");
  fig.addEventListener("click", function (e) { var g = e.target.closest(".region"); if (g) pickRegion(g.getAttribute("data-region")); });
  fig.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { var g = e.target.closest(".region"); if (g) { e.preventDefault(); pickRegion(g.getAttribute("data-region")); } }
  });
  $("taskBtns").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { state.task = b.getAttribute("data-task"); render(); } });
  $("hazBtns").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (b) { var h = b.getAttribute("data-hazard"); state.hazard = state.hazard === h ? null : h; render(); }
  });
  $("fday").addEventListener("input", function (e) { state.fday = +e.target.value; renderForecast(currentDay()); });
  $("flagBoxes").innerHTML = RULES.redFlags.map(function (f, i) {
    return '<label><input type="checkbox" value="' + i + '"> ' + f + '</label>';
  }).join("");
  $("flagBoxes").addEventListener("change", function () {
    state.flags = Array.prototype.filter.call($("flagBoxes").querySelectorAll("input"), function (c) { return c.checked; })
      .map(function (c) { return RULES.redFlags[+c.value]; });
    render();
  });
  $("habits").addEventListener("change", function (e) {
    var id = e.target.getAttribute("data-habit"); if (!id) return;
    var d = currentDay().id, arr = (done[d] || []).filter(function (x) { return x !== id; });
    if (e.target.checked) arr.push(id);
    done[d] = arr;
    try { localStorage.setItem("health-check-habits", JSON.stringify(done)); } catch (err) {}
    last.habits = null; renderHabits(currentDay());
    var again = document.querySelector('#habits [data-habit="' + id + '"]'); if (again) again.focus();
  });
  $("copyReport").addEventListener("click", function () {
    var ta = $("report"), ok = function () { $("copyMsg").textContent = "Copied."; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(ok, function () { ta.select(); $("copyMsg").textContent = "Select the text and copy it."; });
    else { ta.select(); $("copyMsg").textContent = "Select the text and copy it."; }
  });
  $("notMeasured").innerHTML = NOT_MEASURED_RISKS.map(function (r) {
    return '<li><strong>' + r.name + ':</strong> ' + r.fact + ' <a href="' + r.url + '" target="_blank" rel="noopener">NASA</a></li>';
  }).join("");
  $("legend").innerHTML = [
    [{ status: "ok" }, "not flagged by the clinical charts and near your own pre-launch numbers."],
    [{ status: "expected" }, "not flagged, and the change from your baseline matches a small-study average measured in crews for this flight day. How close counts as a match is this team's choice. Context, not an all-clear."],
    [{ status: "changed", dir: "up" }, "not flagged, but away from your own baseline. Up or down says which way."],
    [{ status: "watch", dir: "high" }, "a published clinical chart puts this value outside its normal range. High or low says which side. A space shift never clears it. The panel says which chart and why."],
    [{ status: "serious", dir: "high" }, "the chart gives this value its top score of 3 or puts it in its crisis band, or it is past one of this team's own act-now lines. A team line is marked on the label."],
    [{ status: "cannot" }, "the reading is missing. Nothing is guessed."]
  ].map(function (x) { return "<li>" + chip(x[0]) + " " + x[1] + "</li>"; }).join("");
  $("sources").innerHTML = Object.keys(SOURCES).map(function (k) { return "<li>" + link(SOURCES[k]) + "</li>"; }).join("") +
    Object.keys(HAZARDS).map(function (k) { return '<li><a href="' + HAZARDS[k].url + '" target="_blank" rel="noopener">NASA, Hazard: ' + HAZARDS[k].name + '</a></li>'; }).join("") +
    Object.keys(REGION_RISKS).map(function (k) { return '<li><a href="' + REGION_RISKS[k].url + '" target="_blank" rel="noopener">NASA, ' + REGION_RISKS[k].name + '</a></li>'; }).join("") +
    NOT_MEASURED_RISKS.map(function (r) { return '<li><a href="' + r.url + '" target="_blank" rel="noopener">NASA risk page: ' + r.name + '</a></li>'; }).join("") +
    HABITS.filter(function (h, i, a) { return a.findIndex(function (x) { return x.source.url === h.source.url; }) === i; })
      .map(function (h) { return "<li>" + link(h.source) + "</li>"; }).join("");
  state.fday = clampDay(SAMPLE.days[START].day);
  render();
})();
