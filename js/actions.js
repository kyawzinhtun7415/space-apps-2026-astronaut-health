// "What should I do?" Turns today's readings into an ordered plan, and a draft report for Earth.
// The steps and their order are examples by this team, not NASA's rules and not medical advice.
// Where a step rests on a published source, the source is named.
(function (root) {
  var HABIT_SRC = {
    sleep: { name: "NASA, Risk from Inadequate Sleep and Irregular Schedules", url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" },
    mood: { name: "NASA, Risk of Behavioral Conditions and Psychiatric Disorders", url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/" }
  };
  function name(RANGES, k) { return RANGES[k].label.replace(/ \(.*\)/, "").replace(" last night", "").toLowerCase(); }
  function list(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function hours(v) { return (Math.floor(v * 10 + 1e-9) / 10).toFixed(1); } // never rounds 6.99 up to 7.0
  function show(k, v, RANGES) {
    if (v === null || v === undefined) return "no valid reading";
    if (k === "bp") return v.sys + "/" + v.dia + " mmHg";
    if (k === "sleep") return hours(v) + " h";
    return (k === "temp" ? v.toFixed(1) : v) + " " + RANGES[k].unit;
  }
  function isFlag(a) { return a && (a.status === "watch" || a.status === "serious"); }

  // ctx: { RANGES, RULES, SOURCES, flags: [ticked symptoms], notes: [insight notes], custom: typed-in day }
  function plan(keys, res, ctx) {
    var R = ctx.RANGES, U = ctx.RULES, S = ctx.SOURCES, out = [], flags = ctx.flags || [];
    var serious = keys.filter(function (k) { return res[k].status === "serious"; });
    var watch = keys.filter(function (k) { return res[k].status === "watch"; });
    var cannot = keys.filter(function (k) { return res[k].status === "cannot"; });
    var changed = keys.filter(function (k) { return res[k].status === "changed"; });
    var flagged = serious.concat(watch), moved = flagged.concat(changed);
    var t = res.temp, g = res.glucose, sl = res.sleep, m = res.mood;
    var tempUp = !!(t && t.status === "changed" && t.dir === "up");      // a rise the space shift does not explain
    var fever = !!(isFlag(t) && t.dir === "high");
    var tempLow = !!(isFlag(t) && t.dir === "low");
    var lowSugar = !!(g && g.v !== null && g.v < 70);
    var heart = ["bp", "hr"].filter(function (k) { return res[k] && (isFlag(res[k]) || res[k].status === "changed"); });
    function add(a) { a.n = out.length + 1; out.push(a); }

    // When does the crew medical officer hear about it now? These rules are the team's example.
    var why = [], readingsNow = false;
    if (flags.length) why.push("You ticked: " + list(flags.map(function (f) { return f.toLowerCase(); })) + ". A symptom like this goes to the crew medical officer whatever the readings say.");
    if (serious.length) { readingsNow = true; why.push("At the act-now level: " + list(serious.map(function (k) { return name(R, k) + " " + show(k, res[k].v, R); })) + "."); }
    var two = watch.filter(function (k) { return res[k].score === 2; });
    if (two.length) { readingsNow = true; why.push(list(two.map(function (k) { return name(R, k) + " " + show(k, res[k].v, R); })) + (two.length === 1 ? " is" : " are") + " clearly outside the normal range."); }
    if (!serious.length && fever && heart.length) { readingsNow = true; why.push("Core temperature is flagged high, and " + list(heart.map(function (k) { return name(R, k); })) + (heart.length === 1 ? " has" : " have") + " moved with it."); }
    else if (!serious.length && !two.length && flagged.length >= 2 && moved.length >= U.togetherCount) { readingsNow = true; why.push(moved.length + " readings are flagged or changed on the same day."); }
    var urgent = why.length > 0;
    var tellNow = { id: "tellnow", when: "Now", level: "serious", team: true, basis: readingsNow ? [S.dist] : [],
      text: readingsNow ? "Tell the crew medical officer now, and send today's readings to the flight surgeon on Earth." : "Tell the crew medical officer now.",
      why: why.join(" ") + (readingsNow ? " On a Mars mission a reply can take up to 20 minutes one way, so do not wait for it." : "") };

    if (flags.length) add(tellNow);
    if (lowSugar) add({ id: "lowsugar", when: "Now", level: g.status === "serious" ? "serious" : "watch", team: true, basis: [S.ada_low],
      text: "Take 15 g of fast-acting carbohydrate, then check your blood sugar again after 15 minutes.",
      why: "Blood sugar is " + show("glucose", g.v, R) + ". Below 70 mg/dL is low. This is the 15/15 rule of the American Diabetes Association. If it is still under 70 after the second check, tell the crew medical officer." });
    if (urgent && !flags.length) add(tellNow);

    // Stop or hold hard physical work.
    var bodyFlag = flagged.filter(function (k) { return k === "bp" || k === "hr" || k === "temp"; });
    var holdNeeded = urgent || tempUp || bodyFlag.length > 0;
    if (holdNeeded && U.tempTightensExertion) {
      var gap = !t || t.v === null || t.d === null ? "" : ", " + Math.abs(t.d).toFixed(1) + " °C " + (t.d < 0 ? "below" : "above") + " your baseline";
      var tempWhy = fever || tempUp ? "Core temperature is " + show("temp", t.v, R) + gap + ". In the study it rose higher and faster in exercise. "
        : tempLow ? "Core temperature is " + show("temp", t.v, R) + gap + ". That is below the chart's normal band. " : "";
      add({ id: "hold", when: "Now", level: urgent ? "serious" : "watch", team: true, basis: fever || tempUp ? [S.stahn] : [],
        text: urgent ? "Stop exercise, and do not start a spacewalk, until the crew medical officer has seen you." : "Hold exercise and spacewalks for now.",
        why: tempWhy + (urgent ? "Wait for the crew medical officer before any hard physical work." : "If the re-check is still off, keep holding and tell the crew medical officer.") });
    }

    // Re-check what can be re-checked now. Changed heart readings join in when anything else is off.
    var re = flagged.filter(function (k) { return k !== "sleep" && k !== "mood" && !(k === "glucose" && lowSugar); });
    if (tempUp) re.push("temp");
    if (holdNeeded) changed.forEach(function (k) { if ((k === "bp" || k === "hr") && re.indexOf(k) === -1) re.push(k); });
    re = keys.filter(function (k) { return re.indexOf(k) !== -1; });
    if (re.length) add({ id: "recheck", when: "Within the hour", level: "watch", team: true,
      text: "Re-check " + list(re.map(function (k) { return name(R, k) + " in " + (U.recheckMinutes[k] || 30) + " minutes"; })) + ".",
      why: ("One reading is not enough to act on. " + re.map(function (k) {
        if (res[k].why) return res[k].why;
        if (k === "temp") return "Core temperature is " + Math.abs(t.d).toFixed(1) + " °C above your baseline, more than the space shift explains on this flight day.";
        return name(R, k).charAt(0).toUpperCase() + name(R, k).slice(1) + " has moved from your baseline.";
      }).join(" ")).trim() });
    if (!urgent && re.length) add({ id: "tell", when: "Today", level: "watch", team: true,
      text: "Tell the crew medical officer today if the re-check is still off.",
      why: "Go sooner if you feel unwell." });

    if (cannot.length && ctx.custom) add({ id: "sensor", when: "Today", level: "cannot", team: true,
      text: "Add your " + list(cannot.map(function (k) { return name(R, k); })) + " when you have " + (cannot.length === 1 ? "it" : "them") + ".",
      why: "An empty box is not a normal reading. Nothing is guessed." });
    else if (cannot.length) add({ id: "sensor", when: "Today", level: "cannot", team: true,
      text: "Check the " + list(cannot.map(function (k) { return R[k].sensor; }).filter(function (x, i, a) { return a.indexOf(x) === i; })) + ", then take " + list(cannot.map(function (k) { return name(R, k); })) + " by hand.",
      why: "A missing reading is not a normal reading. Nothing is guessed." });

    if (sl && sl.v !== null && sl.status === "watch") add({ id: "sleep", when: "Tonight", level: "changed", basis: [S.cdc, HABIT_SRC.sleep],
      text: "Protect tonight's sleep: plan for 7 hours or more.",
      why: "You slept " + show("sleep", sl.v, R) + ". Adults need 7 or more. On the station, lighting follows Earth's day and night, and crews get set relaxation time." });

    if (m && m.v !== null) {
      var usual = m.b !== null && m.b !== undefined ? ", against your usual " + m.b : "";
      var drop = m.b !== null && m.b !== undefined ? m.b - m.v : 0;
      if (m.status === "watch" || (m.v <= U.lowMood && drop >= 2)) add({ id: "mood", when: "Today", level: "watch", team: true, basis: [HABIT_SRC.mood],
        text: "Talk to the crew medical officer or a crew mate today about how you are feeling.",
        why: "Mood is " + m.v + " of 5" + usual + ". NASA also describes keeping a journal as one self-care option for coping with isolation." });
      else if (m.v <= U.lowMood || (m.status === "changed" && m.dir === "down")) add({ id: "mood", when: "Today", level: "changed", team: true, basis: [HABIT_SRC.mood],
        text: "Take your self-care time today.",
        why: "Mood is " + m.v + " of 5" + usual + ". NASA describes keeping a journal as one self-care option for coping with isolation. If low mood lasts, tell the crew medical officer." });
    }

    if (!holdNeeded && !flags.length && t && t.status === "expected") add({ id: "heat", when: "Today", level: "expected", team: true, basis: [S.stahn],
      text: "If you exercise today, stop if you feel overheated.",
      why: "Your core temperature shows the shift measured in space crews. In the study it rose higher and faster in exercise, so the shift is a strain, not a comfort." });

    var later = changed.filter(function (k) { return k !== "mood" && re.indexOf(k) === -1; });
    if (later.length) add({ id: "tomorrow", when: "Tomorrow", level: "changed", team: true,
      text: "Re-check " + list(later.map(function (k) { return name(R, k); })) + " tomorrow.",
      why: "Not flagged by the clinical charts, but away from your own baseline. Mention it at the next crew health check." });

    // Soonest first. Steps with the same timing keep the order above.
    var ORDER = { "Now": 0, "Within the hour": 1, "Today": 2, "Tonight": 3, "Tomorrow": 4 };
    out = out.map(function (a, i) { return [a, i]; }).sort(function (x, y) { return (ORDER[x[0].when] - ORDER[y[0].when]) || (x[1] - y[1]); }).map(function (x, i) { x[0].n = i + 1; return x[0]; });
    if (!out.length) add({ id: "none", when: "Today", level: "ok", team: true,
      text: "No action from today's readings.",
      why: "Keep your daily habits below. If you feel unwell, tell the crew medical officer. Readings cannot see symptoms." });
    return out;
  }

  // A plain-text draft of what would be sent to Earth in one go. Nothing is sent by this prototype.
  function report(keys, res, day, sum, steps, ctx) {
    var R = ctx.RANGES, L = [];
    L.push("DRAFT CREW HEALTH REPORT (concept prototype, " + (ctx.custom ? "typed-in readings" : "simulated data") + ")");
    L.push("Flight day " + day.day + ". " + sum.headline + ".");
    if (ctx.flags && ctx.flags.length) L.push("Symptoms reported: " + ctx.flags.join(", ") + ".");
    L.push("");
    keys.forEach(function (k) {
      var a = res[k], st = root.INSIGHTS ? root.INSIGHTS.state(a) : a.status, d = "";
      if (a.v !== null && a.d !== null && a.d !== undefined) d = ", " + (a.d > 0 ? "+" : "") + a.d + " " + (k === "bp" ? "mmHg on the top number" : R[k].unit) + " from pre-launch baseline";
      L.push("- " + R[k].label + ": " + show(k, a.v, R) + " [" + st + "]" + d + (a.why ? ". " + a.why : ""));
    });
    var changes = (ctx.notes || []).filter(function (n) { return n.kind !== "good"; });
    if (changes.length) { L.push(""); L.push("What changed:"); changes.forEach(function (n) { L.push("- " + n.text); }); }
    L.push(""); L.push("Steps suggested by this prototype (the team's example steps):");
    steps.forEach(function (s) { L.push(s.n + ". " + s.when + ": " + s.text); });
    L.push(""); L.push("Draft only: nothing has been sent. A reply can take up to 20 minutes one way, so a real report says everything in one go.");
    return L.join("\n");
  }
  root.ACTIONS = { plan: plan, report: report, hours: hours };
})(typeof window !== "undefined" ? window : globalThis);
