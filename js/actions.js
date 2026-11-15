// "What should I do?" Turns today's readings into an ordered plan, and a short report for Earth.
// The steps are examples by this team. Where a step rests on a published source, the source is named.
(function (root) {
  var HABIT_SRC = {
    sleep: { name: "NASA, Risk from Inadequate Sleep and Irregular Schedules", url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" },
    mood: { name: "NASA, Risk of Behavioral Conditions and Psychiatric Disorders", url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/" }
  };
  function name(RANGES, k) { return RANGES[k].label.replace(/ \(.*\)/, "").replace(" last night", "").toLowerCase(); }
  function list(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function show(k, v, RANGES) {
    if (v === null || v === undefined) return "no valid reading";
    if (k === "bp") return v.sys + "/" + v.dia + " mmHg";
    return ((k === "temp" || k === "sleep") ? v.toFixed(1) : v) + " " + RANGES[k].unit;
  }

  // ctx: { RANGES, RULES, SOURCES, flags: [ticked symptoms], notes: [insight notes] }
  function plan(keys, res, ctx) {
    var R = ctx.RANGES, U = ctx.RULES, S = ctx.SOURCES, out = [];
    var serious = keys.filter(function (k) { return res[k].status === "serious"; });
    var watch = keys.filter(function (k) { return res[k].status === "watch"; });
    var cannot = keys.filter(function (k) { return res[k].status === "cannot"; });
    var changed = keys.filter(function (k) { return res[k].status === "changed"; });
    var moved = serious.concat(watch, changed);
    function add(a) { a.n = out.length + 1; out.push(a); }

    if (ctx.flags && ctx.flags.length) add({ id: "redflag", when: "Now", level: "serious", team: true,
      text: "Tell the crew medical officer now.",
      why: "You ticked: " + ctx.flags.join(", ").toLowerCase() + ". A symptom like this goes to the crew medical officer whatever the readings say." });

    if (serious.length) add({ id: "serious", when: "Now", level: "serious", team: true, basis: [S.dist],
      text: "Tell the crew medical officer now, and send today's readings to Earth.",
      why: "Flagged for action now: " + list(serious.map(function (k) { return name(R, k) + " " + show(k, res[k].v, R); })) + ". On a Mars mission a reply can take up to 20 minutes one way, so do not wait for it." });

    var g = res.glucose;
    if (g && g.v !== null && g.v < 70) add({ id: "lowsugar", when: "Now", level: "watch", basis: [S.ada_low],
      text: "Take 15 g of fast-acting carbohydrate, then check your blood sugar again after 15 minutes.",
      why: "Blood sugar is " + show("glucose", g.v, R) + ". Below 70 mg/dL is low. This is the 15/15 rule of the American Diabetes Association." });

    var t = res.temp;
    // A rise in core temperature that the space shift does not explain is re-checked the same day.
    var tempUp = t && t.status === "changed" && t.dir === "up";
    var re = watch.filter(function (k) { return k !== "sleep" && !(k === "glucose" && res[k].v < 70); });
    if (tempUp) re.push("temp");
    if (re.length) add({ id: "recheck", when: "Within the hour", level: "watch", team: true,
      text: "Re-check " + list(re.map(function (k) { return name(R, k) + " in " + (U.recheckMinutes[k] || 30) + " minutes"; })) + ".",
      why: "One reading is not enough to act on. " + re.map(function (k) { return res[k].why || (k === "temp" ? "Core temperature is " + t.d.toFixed(1) + " °C above your baseline, more than the space shift explains on this flight day." : ""); }).join(" ").trim() });

    if (!serious.length && !(ctx.flags && ctx.flags.length)) {
      var two = watch.some(function (k) { return res[k].score === 2; });
      if (moved.length >= U.togetherCount || two) add({ id: "tell", when: "Today", level: "watch", team: true,
        text: "Tell the crew medical officer today.",
        why: (moved.length >= U.togetherCount ? moved.length + " readings are flagged or changed on the same day. " : "A reading scored 2 on the clinical chart. ") + "Go sooner if you feel unwell." });
      else if (re.length) add({ id: "tell", when: "Today", level: "watch", team: true,
        text: "Tell the crew medical officer if the re-check shows the same.",
        why: "Go sooner if you feel unwell." });
    }

    var tempOff = t && t.v !== null && (t.status === "watch" || t.status === "serious" || tempUp);
    if (tempOff && U.tempTightensExertion) add({ id: "hold", when: "Today", level: "watch", team: true, basis: [S.stahn],
      text: "Hold exercise and spacewalks until the temperature re-check.",
      why: "Core temperature is " + show("temp", t.v, R) + (t.d !== null ? ", " + t.d.toFixed(1) + " °C above your baseline" : "") + ". In the study it rose higher and faster in exercise." });
    else if (t && t.status === "expected") add({ id: "heat", when: "Today", level: "expected", team: true, basis: [S.stahn],
      text: "Exercise as planned, and stop if you feel overheated.",
      why: "Your core temperature shows the shift measured in space crews. In the study it rose higher and faster in exercise, so the shift is a strain, not a comfort." });

    if (cannot.length && ctx.custom) add({ id: "sensor", when: "Today", level: "cannot", team: true,
      text: "Add your " + list(cannot.map(function (k) { return name(R, k); })) + " when you have " + (cannot.length === 1 ? "it" : "them") + ".",
      why: "An empty box is not a normal reading. Nothing is guessed." });
    else if (cannot.length) add({ id: "sensor", when: "Today", level: "cannot", team: true,
      text: "Check the " + list(cannot.map(function (k) { return R[k].sensor; }).filter(function (x, i, a) { return a.indexOf(x) === i; })) + ", then take " + list(cannot.map(function (k) { return name(R, k); })) + " by hand.",
      why: "A missing reading is not a normal reading. Nothing is guessed." });

    var sl = res.sleep;
    if (sl && sl.v !== null && sl.status === "watch") add({ id: "sleep", when: "Tonight", level: "changed", basis: [S.cdc, HABIT_SRC.sleep],
      text: "Protect tonight's sleep: plan for 7 hours or more.",
      why: "You slept " + show("sleep", sl.v, R) + ". Adults need 7 or more. On the station, lighting follows Earth's day and night, and crews get set relaxation time." });

    var m = res.mood;
    if (m && m.v !== null && (m.v <= U.lowMood || m.status === "changed")) add({ id: "mood", when: "Today", level: "changed", basis: [HABIT_SRC.mood],
      text: "Take your self-care time today, and write in your journal.",
      why: "Mood is " + m.v + " of 5" + (m.b !== null && m.b !== undefined ? ", against your usual " + m.b : "") + ". NASA encourages self-care, including keeping a regular journal. If low mood lasts, tell the crew medical officer." });

    var later = changed.filter(function (k) { return k !== "mood" && !(k === "temp" && tempUp); });
    if (later.length) add({ id: "tomorrow", when: "Tomorrow", level: "changed", team: true,
      text: "Re-check " + list(later.map(function (k) { return name(R, k); })) + " tomorrow.",
      why: "Not flagged by the clinical charts, but away from your own baseline. Mention it at the next crew health check." });

    if (!out.length) add({ id: "none", when: "Today", level: "ok", team: true,
      text: "No action from today's readings.",
      why: "Keep your daily routine below. If you feel unwell, tell the crew medical officer. Readings cannot see symptoms." });
    return out;
  }

  // A short plain-text report to send to Earth in one go.
  function report(keys, res, day, sum, steps, ctx) {
    var R = ctx.RANGES, L = [];
    L.push("CREW HEALTH REPORT (concept prototype, " + (ctx.custom ? "typed-in readings" : "simulated data") + ")");
    L.push("Flight day " + day.day + ". " + sum.headline + ".");
    if (ctx.flags && ctx.flags.length) L.push("Symptoms reported: " + ctx.flags.join(", ") + ".");
    L.push("");
    keys.forEach(function (k) {
      var a = res[k], st = root.INSIGHTS ? root.INSIGHTS.state(a) : a.status;
      L.push("- " + R[k].label + ": " + show(k, a.v, R) + " [" + st + "]" + (a.d !== null && a.d !== undefined && a.v !== null ? ", " + (a.d > 0 ? "+" : "") + a.d + " from pre-launch baseline" : "") + (a.why ? ". " + a.why : ""));
    });
    if (ctx.notes && ctx.notes.length) { L.push(""); L.push("What changed:"); ctx.notes.filter(function (n) { return n.kind !== "good"; }).forEach(function (n) { L.push("- " + n.text); }); }
    L.push(""); L.push("Steps being taken on board (this team's example steps):");
    steps.forEach(function (s) { L.push(s.n + ". " + s.when + ": " + s.text); });
    L.push(""); L.push("Sent without waiting for a reply. A reply can take up to 20 minutes one way.");
    return L.join("\n");
  }
  root.ACTIONS = { plan: plan, report: report };
})(typeof window !== "undefined" ? window : globalThis);
