(function () {
  var SAMPLE = window.SAMPLE, RANGES = window.RANGES, RULES = window.RULES, SOURCES = window.SOURCES;
  var ASSESS = window.ASSESS, TASKS = window.TASKS, FORECAST = window.FORECAST;
  var HAZARDS = window.HAZARDS, REGION_RISKS = window.REGION_RISKS, NOT_MEASURED_RISKS = window.NOT_MEASURED_RISKS;
  var KEYS = ["bp", "hr", "temp", "sleep", "glucose", "mood"];
  var REGIONS = { head: "Head: sleep and mood", chest: "Heart: blood pressure and heart rate", core: "Core: body temperature", arm: "Arm: blood sugar" };
  var STATUS = {
    ok: { word: "Close to your baseline", icon: "✓", rank: 0 },
    expected: { word: "Expected in space", icon: "≈", rank: 1 },
    changed: { word: "Changed from your baseline", icon: "△", rank: 2 },
    cannot: { word: "Cannot assess", icon: "?", rank: 3 },
    watch: { word: "Flagged: re-check", icon: "!", rank: 4 },
    serious: { word: "Flagged: act now", icon: "‼", rank: 5 }
  };
  var TASK_CLASS = { clear: "ok", hold: "watch", cannot: "cannot", redflag: "serious" };
  var START = 2; // open on the day that shows the space shift
  var MINE = SAMPLE.days.length; // index of "my own readings"
  var state = { day: START, key: "temp", task: RULES.tasks[0].id, flags: [], hazard: null, fday: SAMPLE.days[START].day };
  var mine = { day: 90, r: { sys: null, dia: null, hr: null, temp: null, sleep: null, glucose: null, mood: null }, baseline: JSON.parse(JSON.stringify(SAMPLE.baseline)) };
  try { var saved = JSON.parse(localStorage.getItem("health-check-mine") || "null"); if (saved && saved.r && saved.baseline) mine = saved; } catch (e) {}
  function currentDay() {
    if (state.day !== MINE) return SAMPLE.days[state.day];
    return { id: "mine", day: mine.day || 0, custom: true, label: "My own readings", note: "Readings you typed in. They stay in this browser.", r: mine.r, week: null, trend: null };
  }
  function currentBaseline() { return state.day === MINE ? mine.baseline : SAMPLE.baseline; }
  function spark(vals, base, label) {
    var pts = vals.map(function (v) { return v === null || v === undefined ? null : (typeof v === "object" ? v.sys : v); });
    var nums = pts.filter(function (v) { return v !== null; }).concat([base]);
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums), span = (hi - lo) || 1, W = 240, H = 56, P = 6;
    function x(i) { return P + i * (W - 2 * P) / (pts.length - 1); }
    function y(v) { return H - P - (v - lo) * (H - 2 * P) / span; }
    var d = "", pen = false, dots = "";
    pts.forEach(function (v, i) { if (v === null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1) + " "; pen = true; });
    var last = pts.length - 1; while (last >= 0 && pts[last] === null) last--;
    if (last >= 0) dots = '<circle cx="' + x(last).toFixed(1) + '" cy="' + y(pts[last]).toFixed(1) + '" r="3.5"/>';
    return '<figure class="trend"><figcaption>Last 7 days (simulated). Dashed line: your pre-launch baseline.</figcaption>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + ' over the last 7 days: ' + pts.map(function (v) { return v === null ? "no reading" : v; }).join(", ") + '">' +
      '<line class="base" x1="' + P + '" x2="' + (W - P) + '" y1="' + y(base).toFixed(1) + '" y2="' + y(base).toFixed(1) + '"/>' +
      '<path d="' + d + '"/>' + dots + '</svg></figure>';
  }
  function $(id) { return document.getElementById(id); }

  function show(key, v) {
    if (v === null || v === undefined) return "No valid reading";
    if (key === "bp") return v.sys + " / " + v.dia + " mmHg";
    return ((key === "temp" || key === "sleep") ? v.toFixed(1) : v) + " " + RANGES[key].unit;
  }
  function signed(n) { return (n > 0 ? "+" : "") + n; }
  function chip(s, word) { return '<span class="chip s-' + s + '"><span aria-hidden="true">' + STATUS[s].icon + '</span> ' + (word || STATUS[s].word) + '</span>'; }
  function link(s) { return s ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.name + '</a>' : ""; }

  function render() {
    // Keep keyboard focus where it was: the lists below are rebuilt on every change.
    var ae = document.activeElement, refocus = null;
    if (ae && ae.getAttribute) {
      if (ae.getAttribute("data-key")) refocus = '.tile[data-key="' + ae.getAttribute("data-key") + '"]';
      else if (ae.getAttribute("data-task")) refocus = '#taskBtns [data-task="' + ae.getAttribute("data-task") + '"]';
      else if (ae.getAttribute("data-hazard")) refocus = '#hazBtns [data-hazard="' + ae.getAttribute("data-hazard") + '"]';
      else if (ae.getAttribute("data-region") && ae.tagName === "BUTTON") refocus = '#regionList [data-region="' + ae.getAttribute("data-region") + '"]';
    }
    var day = currentDay(), baseline = currentBaseline();
    var res = ASSESS.assessAll(KEYS, day.r, baseline, day.day, RANGES, RULES);
    $("dayNote").textContent = day.note + (day.custom ? "" : " (" + SAMPLE.person + ".)");
    $("mine").hidden = !day.custom;

    // Tiles
    $("tiles").innerHTML = KEYS.map(function (k) {
      var hz = state.hazard && RANGES[k].hazard === state.hazard ? " hz" : "";
      return '<button class="tile' + hz + '" data-key="' + k + '" aria-pressed="' + (k === state.key) + '">' +
        '<span class="name">' + RANGES[k].label + '</span><span class="val">' + show(k, res[k].v) + '</span>' + chip(res[k].status) + '</button>';
    }).join("");

    // Regions take the most serious status of their readings
    var worst = {};
    KEYS.forEach(function (k) {
      var reg = RANGES[k].region, s = res[k].status;
      if (!worst[reg] || STATUS[s].rank > STATUS[worst[reg]].rank) worst[reg] = s;
    });
    var selReg = RANGES[state.key].region;
    Array.prototype.forEach.call(document.querySelectorAll(".region"), function (g) {
      var reg = g.getAttribute("data-region");
      g.setAttribute("class", "region s-" + worst[reg] + (reg === selReg ? " sel" : ""));
      g.setAttribute("aria-label", REGIONS[reg] + ". " + STATUS[worst[reg]].word);
      var tx = g.querySelector("text");
      if (!tx.getAttribute("data-name")) tx.setAttribute("data-name", tx.textContent);
      tx.textContent = tx.getAttribute("data-name") + " " + STATUS[worst[reg]].icon;
    });
    $("regionList").innerHTML = Object.keys(REGIONS).map(function (reg) {
      return '<li><button data-region="' + reg + '" aria-pressed="' + (reg === selReg) + '"><span>' + REGIONS[reg] + '</span>' + chip(worst[reg]) + '</button></li>';
    }).join("");

    // Panel
    var k = state.key, cfg = RANGES[k], a = res[k], who = RULES.whoToTell(a.status, k, k === "bp" ? null : a.v, a.score);
    var risk = REGION_RISKS[cfg.region], hz = HAZARDS[cfg.hazard];
    var base = '<h3>Your pre-launch baseline</h3><p>' + show(k, a.b) + '</p><p>' +
      (a.v === null ? "No reading to compare today." : "Today is " + signed(a.d) + (k === "bp" ? " mmHg on the top number" : " " + cfg.unit) + " from your own start.") + '</p>';
    var dayLine = (cfg.space.rampDays && a.expectedShift !== null) ?
      '<p>On flight day ' + day.day + ' that build-up would be about ' + signed(a.expectedShift) + ' ' + cfg.unit + '.</p>' :
      (cfg.space.fromDay && day.day < cfg.space.fromDay ? '<p>Flight day ' + day.day + ' is earlier than the study measured, so no shift is applied today.</p>' : "");
    var space = '<h3>Measured in space</h3><p>' + cfg.space.text + '</p>' + dayLine +
      (cfg.space.study ? '<p class="src">How it was measured: ' + cfg.space.study + '</p>' : "") +
      (cfg.space.source ? '<p class="src">Source: ' + link(cfg.space.source) + '</p>' : "");
    var clin = '<h3>Clinical range</h3><p>' + cfg.clinicalText + '</p>' +
      (cfg.clinicalSources.length ? '<p class="src">Source: ' + cfg.clinicalSources.map(link).join("; ") + '</p>' : "");
    $("panel").innerHTML =
      '<h2>' + cfg.label + '</h2><p><span class="big">' + show(k, a.v) + '</span>' + chip(a.status) + '</p>' +
      (a.why ? '<p class="why"><strong>Why it is flagged:</strong> ' + a.why + '</p>' : "") +
      (day.trend && day.trend[k] ? spark(day.trend[k], k === "bp" ? a.b.sys : a.b, cfg.label + (k === "bp" ? " (top number)" : "")) : "") +
      '<div class="cmp"><div>' + base + '</div><div>' + space + '</div><div>' + clin + '</div></div>' +
      '<div class="act"><span class="tag">What to do and who to tell. Example escalation by this team.</span>' +
      '<p><strong>Who: ' + who.who + '.</strong> ' + who.text + '</p></div>' +
      '<div class="nasa"><span class="tag">Why check this: NASA on this part of the body</span>' +
      '<p>' + risk.fact + ' <a href="' + risk.url + '" target="_blank" rel="noopener">' + risk.name + '</a></p>' +
      '<p><strong>What helps, from the same NASA page:</strong> ' + risk.helps + '</p>' +
      '<p><strong>Can it be measured in space?</strong> ' + cfg.inSpace + ' ' + link(cfg.inSpaceSource) + '</p>' +
      '<p class="src">Hazard behind this reading: <a href="' + hz.url + '" target="_blank" rel="noopener">' + hz.name + '</a>.</p></div>' +
      '<p class="src">How this tool gets the reading: ' + cfg.feed + (cfg.feedSource ? " " + link(cfg.feedSource) + "." : "") + '</p>';

    renderTask(res);
    renderForecast(day);
    renderHazard();
    if (refocus) { var el = document.querySelector(refocus); if (el) el.focus(); }
  }

  function renderTask(res) {
    $("taskBtns").innerHTML = RULES.tasks.map(function (t) {
      return '<button data-task="' + t.id + '" aria-pressed="' + (t.id === state.task) + '">' + t.name + '</button>';
    }).join("");
    var task = RULES.tasks.filter(function (t) { return t.id === state.task; })[0];
    var out = TASKS.checkTask(task, res, RULES, RANGES, state.flags);
    var cls = TASK_CLASS[out.answer];
    $("taskOut").innerHTML = '<p><span class="chip s-' + cls + '">' + out.word + '</span> <span class="src">for: ' + task.name + '</span></p>' +
      '<ul>' + out.reasons.map(function (r) { return '<li>' + r + '</li>'; }).join("") + '</ul>' +
      '<p class="src">Readings this task looks at: ' + task.needs.map(function (k) { return RANGES[k].label; }).join(", ") + '.</p>' +
      '<p class="src">This check does not measure: ' + out.notMeasured.join(", ") + '. It is not a medical clearance.</p>';
  }

  function renderForecast(day) {
    var f = $("fday"); f.max = SAMPLE.missionDays; f.value = state.fday;
    var months = Math.round(state.fday / 30 * 10) / 10;
    $("fdayOut").textContent = state.fday + " (about " + months + " months)";
    var b = FORECAST.bone(months), t = RANGES.temp.space;
    var tr = FORECAST.tempRamp(state.fday, currentBaseline().temp, t.shift, t.rampDays);
    var sd = day.week ? FORECAST.sleepDebt(day.week, 7) : null;
    var base = currentBaseline();
    var boneRisk = NOT_MEASURED_RISKS[0];
    $("forecast").innerHTML =
      '<div><h3>Bone density</h3><p class="big2">' + b.low + '% to ' + b.high + '%</p><p>of the pre-mission value by this day, for weight-bearing bones.</p>' +
      '<div class="bar" role="img" aria-label="Bone density range ' + b.low + ' to ' + b.high + ' percent"><span style="width:' + b.high + '%"></span><span class="lo" style="width:' + b.low + '%"></span></div>' +
      '<p class="src">NASA\'s average of 1% to 1.5% a month on four-to-six-month missions, for everyone. Not a measurement of this person. <a href="' + boneRisk.url + '" target="_blank" rel="noopener">NASA bone risk page</a></p></div>' +
      '<div><h3>Core temperature</h3><p class="big2">about ' + tr.toFixed(1) + ' °C</p><p>is where the study\'s average shift would put a baseline of ' + SAMPLE.baseline.temp.toFixed(1) + ' °C on this day.</p>' +
      '<p class="src">Context, never a threshold. ' + link(t.source) + ', 11 astronauts.</p></div>' +
      '<div><h3>Sleep</h3>' + (sd ?
        '<p class="big2">' + sd.debt.toFixed(1) + ' h short</p><p>of 7 hours a night over the last ' + sd.nights + ' nights of sample data. A second week like it would add the same again.</p>'
        : '<p>Needs seven nights of readings. Not available for typed-in readings yet.</p>') +
      '<p class="src">For reference, NASA says seven days of six hours of sleep performs like 24 to 36 hours awake. ' + link(SOURCES.tb041) + '; ' + link(SOURCES.cdc) + '.</p></div>';
  }

  function renderHazard() {
    $("hazBtns").innerHTML = Object.keys(HAZARDS).map(function (h) {
      return '<button data-hazard="' + h + '" aria-pressed="' + (h === state.hazard) + '">' + HAZARDS[h].name + '</button>';
    }).join("");
    if (!state.hazard) { $("hazOut").innerHTML = ""; return; }
    var h = HAZARDS[state.hazard];
    var ks = KEYS.filter(function (k) { return RANGES[k].hazard === state.hazard; });
    $("hazOut").innerHTML = '<p>' + h.line + ' <a href="' + h.url + '" target="_blank" rel="noopener">NASA: ' + h.name + '</a></p>' +
      '<p class="src">' + (ks.length ? "Readings linked to this hazard in this prototype (outlined above): " + ks.map(function (k) { return RANGES[k].label; }).join(", ") + ". The link is this team's grouping."
        : (h.note || "No reading in this prototype is linked to this hazard.")) + '</p>';
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
  var form = $("mine");
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function fillForm() {
    form.elements.day.value = mine.day;
    ["sys", "dia", "hr", "temp", "sleep", "glucose", "mood"].forEach(function (k) {
      form.elements[k].value = mine.r[k] === null ? "" : mine.r[k];
      form.elements["b_" + k].value = mine.baseline[k];
    });
  }
  fillForm();
  form.addEventListener("input", function () {
    mine.day = num(form.elements.day.value) || 0;
    ["sys", "dia", "hr", "temp", "sleep", "glucose", "mood"].forEach(function (k) {
      var el = form.elements[k], v = num(el.value);
      mine.r[k] = (v !== null && el.validity.valid) ? v : null;
      var b = num(form.elements["b_" + k].value);
      if (b !== null && form.elements["b_" + k].validity.valid) mine.baseline[k] = b;
    });
    if (mine.r.sys === null || mine.r.dia === null) { mine.r.sys = mine.r.sys === null || mine.r.dia === null ? null : mine.r.sys; if (mine.r.sys === null) mine.r.dia = null; }
    try { localStorage.setItem("health-check-mine", JSON.stringify(mine)); } catch (e) {}
    state.fday = clampDay(mine.day);
    render();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  $("missionNote").textContent = SAMPLE.mission;
  $("tiles").addEventListener("click", function (e) { var t = e.target.closest(".tile"); if (t) { state.key = t.getAttribute("data-key"); render(); } });
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
  $("notMeasured").innerHTML = NOT_MEASURED_RISKS.map(function (r) {
    return '<li><strong>' + r.name + ':</strong> ' + r.fact + ' <a href="' + r.url + '" target="_blank" rel="noopener">NASA</a></li>';
  }).join("");
  $("legend").innerHTML = [
    ["ok", "not flagged by the clinical charts and near your own pre-launch numbers."],
    ["expected", "not flagged, and the change from your baseline matches a small-study average measured in crews for this flight day. How close counts as a match is this team's choice. Context, not an all-clear."],
    ["changed", "not flagged, but away from your own baseline."],
    ["watch", "a published clinical chart flags this value. A space shift never clears it. The panel says which chart and why."],
    ["serious", "the chart gives this value its top score of 3 or puts it in its crisis band, or it is past one of this team's own act-now lines. The panel says which."],
    ["cannot", "the reading is missing. Nothing is guessed."]
  ].map(function (x) { return "<li>" + chip(x[0]) + " " + x[1] + "</li>"; }).join("");
  $("sources").innerHTML = Object.keys(SOURCES).map(function (k) { return "<li>" + link(SOURCES[k]) + "</li>"; }).join("") +
    Object.keys(HAZARDS).map(function (k) { return '<li><a href="' + HAZARDS[k].url + '" target="_blank" rel="noopener">NASA, Hazard: ' + HAZARDS[k].name + '</a></li>'; }).join("") +
    Object.keys(REGION_RISKS).concat([]).map(function (k) { return '<li><a href="' + REGION_RISKS[k].url + '" target="_blank" rel="noopener">NASA, ' + REGION_RISKS[k].name + '</a></li>'; }).join("") +
    NOT_MEASURED_RISKS.map(function (r) { return '<li><a href="' + r.url + '" target="_blank" rel="noopener">NASA risk page: ' + r.name + '</a></li>'; }).join("");
  state.fday = clampDay(SAMPLE.days[START].day);
  render();
})();
