// Option 1 display adapter. Reads the existing rendered assessment; owns no health rules.
// Original controls and listeners stay in place. All figures, labels and actions remain live.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var q = function (sel, at) { return (at || document).querySelector(sel); };
  var all = function (sel, at) { return Array.prototype.slice.call((at || document).querySelectorAll(sel)); };
  var text = function (el) { return el ? el.textContent.trim() : ""; };
  var esc = function (v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  if (!$("panel") || !$("tiles") || !q(".hero")) return;
  var originalHero = q(".hero"), days = q(".days"), intro = q(".intro");
  var layout = document.createElement("div");
  layout.className = "overview";
  layout.innerHTML =
    '<div class="ov-toolbar"><div class="ov-day"><label for="day">Sample day</label></div>' +
      '<div class="ov-tools"><button type="button" id="ovEnter">Enter readings</button>' +
      '<details id="ovSymptoms"><summary>How do you feel?</summary><div class="ov-symptom-content"></div></details></div></div>' +
    '<a class="ov-priority" href="#ovPlanHeading" id="ovPriority"></a><p class="ov-sr" role="status" id="ovAnnounce"></p>' +
    '<main class="ov-grid" id="overview"><section class="ov-left" aria-label="Today and your readings">' +
      '<h2 id="ovHeadline"></h2><p id="ovSummary"></p><p id="ovSub" class="ov-muted"></p><div id="ovReadingSlot"></div>' +
      '<article class="ov-selected" aria-label="Selected reading"><h3 id="ovMetric"></h3>' +
      '<div class="ov-value-row"><strong id="ovValue"></strong><span id="ovStatus"></span></div>' +
      '<dl id="ovCompare"></dl><p id="ovVerdict"></p><p id="ovClinicalNote"></p><a class="ov-source-link" href="#fullReading">Why this reading? View sources</a>' +
      '<div id="ovTrend"></div><p id="ovInsight"></p></article></section>' +
    '<section class="ov-body" aria-label="Interactive body"><div class="ov-body-switch" role="group" aria-label="Body display">' +
      '<button type="button" id="ovIllustration" aria-pressed="true">Body view</button><button type="button" id="ov3d" aria-pressed="false">Rotate in 3D</button></div>' +
      '<div class="ov-figure" id="ovFigure"><img src="assets/body-neutral.png" alt="AI-generated faceless body illustration; use the region buttons to explore readings." width="887" height="1774">' +
      '<button type="button" class="body-hotspot" data-body-region="head" style="--x:55%;--y:12%"><i></i><span>Head</span></button>' +
      '<button type="button" class="body-hotspot" data-body-region="chest" style="--x:57%;--y:26%"><i></i><span>Chest</span></button>' +
      '<button type="button" class="body-hotspot" data-body-region="core" style="--x:53%;--y:39%"><i></i><span>Core</span></button>' +
      '<button type="button" class="body-hotspot" data-body-region="arm" style="--x:75%;--y:49%"><i></i><span>Arm</span></button></div>' +
      '<div id="ovThree" hidden></div><p id="ovBodyCaption">Select a region to explore its readings.</p>' +
      '<p class="ov-art-credit" id="ovArtCredit">AI-generated body illustration · OpenAI</p></section>' +
    '<section class="ov-plan" aria-labelledby="ovPlanHeading"><h2 id="ovPlanHeading">What to do now</h2>' +
      '<p class="ov-team">Team example steps · not NASA rules</p><p id="ovReason"></p>' +
      '<ol id="ovActions"></ol><a href="#fullPlan" class="ov-source-link">Why these steps? View evidence</a>' +
      '<button type="button" id="ovReport">Review report draft</button><p class="ov-report-note">Prepared locally. Nothing sent.</p></section></main>' +
    '<div class="ov-disclosure"><p>Concept prototype · <span id="ovDataLabel">Simulated data</span> · Not a medical device.<br>Does not diagnose or clear anyone for a task.</p>' +
      '<a href="#moreTools">Measurements, habits &amp; forecast</a></div>';
  originalHero.before(layout);
  q(".ov-day", layout).appendChild($("day"));
  q(".ov-symptom-content", layout).appendChild(q(".flags"));
  q(".ov-symptom-content", layout).appendChild($("sumCaveat"));
  $("ovReadingSlot").appendChild($("tiles"));
  $("ovThree").appendChild($("twinStage"));
  originalHero.hidden = true;
  document.body.classList.add("overview-ready");
  var support = document.createElement("div");
  support.id = "moreTools"; support.className = "ov-support";
  support.innerHTML = '<h2 class="ov-support-title">Your health toolkit</h2><nav class="ov-jumps" aria-label="Health tools">' +
    '<a href="#fullReading">Reading details</a><a href="#placeH">Environment</a><a href="#checkH">Measurement checks</a>' +
    '<a href="#habitH">Daily habits</a><a href="#forecast">Looking ahead</a><a href="#reportH">Earth report</a><a href="#sources">Sources</a></nav>';
  layout.after(support);
  support.after(intro);
  intro.after(days);
  var place = q(".xplace"); if (place) days.after(place);
  var readingDetails = document.createElement("details");
  readingDetails.id = "fullReading"; readingDetails.className = "ov-details";
  readingDetails.innerHTML = '<summary>Selected reading: comparisons, trend and sources</summary>';
  support.appendChild(readingDetails);
  readingDetails.appendChild($("panel"));
  var oldReadings = q("main.grid"); if (oldReadings) oldReadings.hidden = true;
  var planDetails = document.createElement("details");
  planDetails.id = "fullPlan"; planDetails.className = "ov-details";
  planDetails.innerHTML = '<summary>Full action plan and evidence</summary>';
  planDetails.appendChild(q(".plan", originalHero)); support.appendChild(planDetails);
  var bodyDetails = document.createElement("details");
  bodyDetails.className = "ov-details"; bodyDetails.innerHTML = '<summary>Body regions and what is not measured</summary>';
  bodyDetails.appendChild($("regionList")); bodyDetails.appendChild($("notMeasured")); support.appendChild(bodyDetails);
  var changes = document.createElement("details");
  changes.className = "ov-details"; changes.innerHTML = '<summary>All changes in the last seven days</summary>';
  changes.appendChild($("notes")); support.appendChild(changes);

  function reveal(id) {
    var el = $(id); if (!el) return;
    var parent = el;
    while (parent) { if (parent.tagName === "DETAILS") parent.open = true; parent = parent.parentElement; }
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  layout.addEventListener("click", function (e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (anchor) { e.preventDefault(); reveal(anchor.getAttribute("href").slice(1)); }
    var hotspot = e.target.closest("[data-body-region]");
    if (hotspot) {
      var old = q('#regionList button[data-region="' + hotspot.dataset.bodyRegion + '"]');
      if (old) { old.click(); hotspot.focus(); }
    }
  });
  support.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (a) { e.preventDefault(); reveal(a.hash.slice(1)); }
  });
  $("ovEnter").addEventListener("click", function () {
    $("day").value = String(window.SAMPLE.days.length); $("day").dispatchEvent(new Event("change", { bubbles: true }));
    sync(); days.scrollIntoView({ block: "start" }); q('input[name="day"]', days).focus();
  });
  $("ovReport").addEventListener("click", function () { reveal("reportH"); $("report").focus({ preventScroll: true }); });
  function bodyMode(live) {
    var ready = window.TWIN3D && window.TWIN3D.state();
    if (live && (!ready || !ready.running)) live = false;
    $("ovFigure").hidden = live; $("ovThree").hidden = !live;
    $("ovIllustration").setAttribute("aria-pressed", String(!live)); $("ov3d").setAttribute("aria-pressed", String(live));
    $("ovBodyCaption").textContent = live ? "Drag to rotate. Select a region to explore." : "Select a region to explore its readings.";
    $("ovArtCredit").textContent = live ? "Interactive 3D · CC0 model / three.js" : "AI-generated body illustration · OpenAI";
    window.dispatchEvent(new Event("resize"));
  }
  function check3d() {
    var state = window.TWIN3D && window.TWIN3D.state(), ready = state && state.running;
    $("ov3d").disabled = !ready;
    $("ov3d").textContent = ready ? "Rotate in 3D" : "3D unavailable";
    if (!ready && !$("ovThree").hidden) bodyMode(false);
  }
  new MutationObserver(check3d).observe($("twinStage"), { attributes: true, attributeFilter: ["class"] });
  check3d();
  $("ovIllustration").addEventListener("click", function () { bodyMode(false); });
  $("ov3d").addEventListener("click", function () { bodyMode(true); });
  q("img", $("ovFigure")).addEventListener("error", function () { bodyMode(true); $("ovIllustration").disabled = true; });

  var names = { bp: "Pressure", hr: "Pulse", temp: "Temperature", sleep: "Sleep", glucose: "Blood sugar", mood: "Mood" };
  var last = {};
  function html(id, value) { if (last[id] !== value) { $(id).innerHTML = value; last[id] = value; } }
  function clean(s) { return s.replace(/^[^a-zA-Z0-9]+/, "").trim(); }
  // Plot the existing simulated values, with axes and gaps for missing readings.
  function trendChart(key, custom, original) {
    if (custom || !original) return '<p class="ov-muted">No history for typed readings.</p>';
    var day = window.SAMPLE.days[+$("day").value], cfg = window.RANGES[key];
    var vals = day.trend[key].map(function(v) { return v === null ? null : typeof v === "object" ? v.sys : v; });
    var base = window.SAMPLE.baseline[key === "bp" ? "sys" : key];
    var nums = vals.filter(function(v) { return v !== null; }).concat([base]);
    var low = Math.floor(Math.min.apply(null, nums)), high = Math.ceil(Math.max.apply(null, nums));
    if (high === low) high = low + 1;
    var left=52, right=416, top=20, bottom=91;
    function x(i) { return left + i * (right-left) / 6; }
    function y(v) { return bottom - (v-low)*(bottom-top)/(high-low); }
    function fmt(v) { return key === "temp" || key === "sleep" ? v.toFixed(1) : String(Math.round(v*10)/10); }
    var svg = '', path = '', pen = false;
    [low,(low+high)/2,high].forEach(function(v) { svg += '<line class="ov-gridline" x1="'+left+'" x2="'+right+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="30" y="'+(y(v)+4)+'" text-anchor="end">'+fmt(v)+'</text>'; });
    vals.forEach(function(v,i) {
      svg += '<text x="'+x(i)+'" y="112" text-anchor="middle">FD '+(day.day-6+i)+'</text>';
      if (v === null) { pen=false; svg += '<text x="'+x(i)+'" y="'+bottom+'" text-anchor="middle">N/A</text>'; return; }
      path += (pen?' L':' M')+x(i)+' '+y(v); pen=true;
      svg += '<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3"/><text class="ov-point-label" x="'+x(i)+'" y="'+(y(v)-9)+'" text-anchor="middle">'+fmt(v)+'</text>';
    });
    return '<figure class="trend"><figcaption>Simulated '+esc(names[key].toLowerCase())+(key==='bp'?' (top number)':'')+' · '+esc(cfg.unit)+'</figcaption><svg viewBox="0 0 445 128" role="img" aria-label="'+esc(q('svg',original).getAttribute('aria-label'))+'"><line class="base" x1="'+left+'" x2="'+right+'" y1="'+y(base)+'" y2="'+y(base)+'"/><path d="'+path+'"/>'+svg+'</svg><p class="ov-chart-key">Dashed line: your baseline, '+fmt(base)+' '+esc(cfg.unit)+'.</p></figure>';
  }
  function sync() {
    var panel = $("panel"), selected = q('#tiles [aria-pressed="true"]');
    if (!selected) return;
    var key = selected.dataset.key, cfg = window.RANGES[key];
    var header = clean(text($("sumHead"))), parts = header.split(": ");
    $("ovHeadline").textContent = parts[0].replace(/\.$/, "");
    $("ovHeadline").classList.toggle("urgent", text($("sumHead")).indexOf("symptom") !== -1);
    $("ovHeadline").classList.toggle("is-ok", $("sumHead").classList.contains("s-ok"));
    $("ovHeadline").classList.toggle("is-missing", $("sumHead").classList.contains("s-cannot"));
    $("ovSummary").textContent = parts.length > 1 ? parts.slice(1).join(": ").replace(/^./, function (s) { return s.toUpperCase(); }) : "";
    $("ovSub").textContent = text($("sumSub"));
    var custom = +$("day").value === window.SAMPLE.days.length;
    days.hidden = !custom;
    $("ovDataLabel").textContent = custom ? "Typed readings · stored locally" : "Simulated data";
    all("#tiles .tile").forEach(function (tile) {
      var k = tile.dataset.key, n = q(".name", tile), c = q(".chip", tile), sum = q('#sumChips [data-key="' + k + '"] .st');
      if (n.textContent !== names[k]) n.textContent = names[k];
      var short = clean(text(sum));
      if (c && short && c.textContent !== short) { c.title = clean(c.textContent); c.textContent = short; }
      tile.setAttribute("aria-label", names[k] + ": " + text(q(".val", tile)) + ", " + (c ? c.title || c.textContent : ""));
    });
    $("ovMetric").textContent = text(q("h2", panel));
    $("ovValue").textContent = text(q(".big", panel));
    q(".ov-selected").dataset.metric = key;
    var status = q(".chip", panel); html("ovStatus", status ? status.outerHTML : "");
    var announcement = text(q("h2", panel)) + ": " + text(q(".big", panel)) + ", " + clean(text(status));
    if ($("ovAnnounce").textContent !== announcement) $("ovAnnounce").textContent = announcement;
    var columns = all(".cmp > div", panel), baseP = columns[0] ? all("p", columns[0]) : [];
    var baseValue = text(baseP[0]), baseNote = text(baseP[1]).replace("Today is ", "").replace(" from your own start.", " today.");
    var spaceValue = cfg.space.text, spaceNote = cfg.space.study || "";
    if (key === "temp") {
      var m = text(columns[1]).match(/build-up would be about ([+\-]?[0-9.]+) °C/);
      spaceValue = m ? "About " + (+m[1] >= 0 ? "+" : "") + (+m[1]).toFixed(1) + " °C" : cfg.space.text;
      spaceNote = "Stahn 2017 · 11 astronauts";
    } else if (key === "bp") {
      spaceValue = /earlier than the study/.test(text(columns[1])) ? "No comparison this early" : "8–10 mmHg lower";
      spaceNote = "Norsk 2015 · 8 men";
    } else if (key === "hr") { spaceValue = "No mean shift measured"; spaceNote = "Norsk 2015 · 8 men"; }
    else if (key === "sleep") { spaceValue = "Crews report about 6 h"; spaceNote = "NASA · common does not mean harmless"; }
    var clinical = cfg.normalShort.replace(/^the chart's normal band is /, "").replace(/^normal at rest is /, "").replace(/^normal is /, "");
    if (key !== "mood") clinical += " " + cfg.unit;
    else clinical = "No clinical range";
    var clinicalNote = key === "temp" ? "NEWS2 score-0 band" : key === "mood" ? "Team scale, not a clinical chart" : Array.from(new Set(cfg.clinicalSources.map(function (s) { return s.name.split(",")[0]; }))).join(" / ");
    function row(label, value, note) { return '<div><dt>' + esc(label) + '</dt><dd><strong>' + esc(value) + '</strong><small>' + esc(note) + '</small></dd></div>'; }
    html("ovCompare", row("Your baseline", baseValue, baseNote) + row("Flight study", spaceValue, spaceNote) + row("Clinical reference", clinical, clinicalNote));
    var flagged = status && /s-watch|s-serious/.test(status.className);
    $("ovVerdict").textContent = key === "temp" && flagged ? "Nothing clears this clinical flag." : text(q(".verdict", panel));
    if (key === "mood") $("ovVerdict").textContent = $("ovVerdict").textContent.replace("Not flagged by the clinical chart, but it is", "On this team's scale, this is").replace("Not flagged by the clinical chart, and close to your own pre-launch numbers.", "Close to your own pre-launch numbers on this team's scale.");
    $("ovClinicalNote").textContent = key === "bp" ? text(q(".why", panel)) : key === "temp" ? "Hospital chart: a rough guide here." : "";
    $("ovClinicalNote").hidden = !$("ovClinicalNote").textContent;
    var trend = q(".trend", panel); html("ovTrend", trendChart(key, custom, trend));
    var insight = all("#notes strong").find(function (n) {
      var t = text(n).toLowerCase(); return t.indexOf(key === "temp" ? "temperature rose" : key === "hr" ? "heart rate rose" : key === "sleep" ? "sleep was" : cfg.label.toLowerCase()) !== -1;
    });
    $("ovInsight").textContent = text(insight); $("ovInsight").hidden = !insight;
    all("[data-body-region]", layout).forEach(function (b) {
      var original = q('#regionList button[data-region="' + b.dataset.bodyRegion + '"]'), ch = original && q(".chip", original);
      if (!original || !ch) return;
      var cls = ch.className.match(/s-[a-z]+/);
      b.className = "body-hotspot " + (cls ? cls[0] : "");
      b.setAttribute("aria-pressed", original.getAttribute("aria-pressed"));
      b.setAttribute("aria-label", text(original)); b.title = text(original);
    });
    var steps = all("#steps li.step");
    $("ovPriority").classList.toggle("is-urgent", !!steps[0] && steps[0].classList.contains("l-serious"));
    html("ovPriority", steps.length ? '<strong>'+esc(text(q('.when', steps[0])))+':</strong> '+esc(text(q('.what', steps[0])))+' <span>View plan ↓</span>' : 'View your action plan ↓');
    var firstReason = steps[0] && text(q(".whyline", steps[0]));
    $("ovReason").textContent = firstReason ? firstReason.split(". ")[0] + (firstReason.indexOf(". ") === -1 ? "" : ".") : "";
    html("ovActions", steps.map(function (step, i) {
      var when = text(q(".when", step)), what = text(q(".what", step));
      var cls = i === 0 ? "ov-first " : i > 2 ? "ov-later " : "";
      var source = text(q(".basis", step));
      var message = esc(what), split = what.indexOf(", and send");
      if (i === 0 && split !== -1) message = esc(what.slice(0, split))+'.<span class="ov-action-support">Send'+esc(what.slice(split+10))+'</span>';
      return '<li class="' + cls + (/l-serious/.test(step.className) ? "is-urgent" : "") + '"><span class="ov-step-num">' + (i+1) + '</span><div><span class="ov-when">' + esc(when) + '</span><p>' + message + '</p>' + (source ? '<span class="ov-step-source">' + esc(source) + '</span>' : "") + '</div></li>';
    }).join(""));
  }
  var scheduled = false;
  var observer = new MutationObserver(function () {
    if (!scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; sync(); }); }
  });
  ["sumHead", "sumSub", "sumChips", "tiles", "panel", "steps", "regionList", "notes"].forEach(function (id) {
    observer.observe($(id), { childList: true, subtree: true, characterData: true });
  });
  // The selected visual target is the fever example; a fresh load opens that scenario.
  $("day").value = "3"; $("day").dispatchEvent(new Event("change", { bubbles: true }));
  sync();
})();
