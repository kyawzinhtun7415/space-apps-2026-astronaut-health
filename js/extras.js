// Extras that complete the challenge statement: places, measurement prompts, a check streak, how-to lines and a treatment split.
// Nothing here judges a reading. Every list is derived from the results and the plan that the rule files already made,
// and every sentence about a device reuses text that ranges.js already holds with its source.
(function (root) {
  var DIST = { name: "NASA, Hazard: Distance From Earth", url: "https://www.nasa.gov/hrp/hazard-distance-from-earth/" };
  var AMO = { name: "NASA, Autonomous Medical Operations", url: "https://www.nasa.gov/directorates/stmd/game-changing-development-program/autonomous-medical-operations-amo/" };
  var STATION_NOTE = "The flight studies used here were measured on space station crews.";

  // The rules do not change with place. What changes is how far the space comparison can be trusted and how fast Earth can answer.
  // Only the Mars delay has a number, because it is the only one with a source.
  var PLACES = [
    { id: "transit", name: "Spacecraft in deep space",
      evidence: STATION_NOTE + " No study opened for this prototype measured these readings this far from Earth, so read them as the nearest evidence, not as your normal.",
      reply: "A reply from Earth can take up to 20 minutes one way at Mars distance, so the plan never waits for one.", source: DIST },
    { id: "station", name: "Space station",
      evidence: STATION_NOTE + " This is the place the numbers fit best.",
      reply: "NASA says spaceflight medicine today relies heavily on telemedicine and support from the ground. Send the report and ask.", source: AMO },
    { id: "rover", name: "Rover on a surface",
      evidence: STATION_NOTE + " A surface has partial gravity, and no study of these readings in partial gravity was opened for this prototype. They are context only here.",
      reply: "The reply delay depends on where you are: up to 20 minutes one way at Mars distance.", source: DIST,
      team: "On a rover you may be away from the base and from the crew medical officer, so \"tell the crew medical officer\" may start as a radio call. This is the team's assumption." },
    { id: "base", name: "Base on the Moon or Mars",
      evidence: STATION_NOTE + " A surface has partial gravity, and no study of these readings in partial gravity was opened for this prototype. They are context only here.",
      reply: "The reply delay depends on where the base is: up to 20 minutes one way at Mars distance.", source: DIST }
  ];
  function place(id) { return PLACES.filter(function (p) { return p.id === id; })[0] || PLACES[0]; }

  // Where the crew member is, read from the mission plan so nobody has to say. The plan here is the made-up sample
  // mission in sample-days.js: a 180-day trip towards Mars, so every flight day of it is in deep space.
  var MISSION_PLAN = [{ from: 0, to: 180, place: "transit" }];
  function autoPlace(flightDay) {
    var d = typeof flightDay === "number" && isFinite(flightDay) ? flightDay : 0;
    var leg = MISSION_PLAN.filter(function (m) { return d >= m.from && d <= m.to; })[0];
    return (leg || MISSION_PLAN[MISSION_PLAN.length - 1]).place;
  }
  // The crew member can correct the place by hand. A hand-picked place wins until it is cleared.
  function currentPlace(flightDay, override) {
    var valid = override && PLACES.some(function (p) { return p.id === override; });
    return { id: valid ? override : autoPlace(flightDay), auto: !valid };
  }

  // The same short name the plan uses for a reading, so a prompt can be matched to a plan step.
  function nm(R, k) { return R[k].label.replace(/ \(.*\)/, "").replace(" last night", "").toLowerCase(); }
  function step(steps, id) { return steps.filter(function (s) { return s.id === id; })[0] || null; }
  function has(v) { return v !== null && v !== undefined; }

  // One prompt per reading, read off the plan. It never adds a re-check the plan did not ask for.
  function prompts(keys, res, steps, R, U) {
    var re = step(steps, "recheck"), tm = step(steps, "tomorrow"), low = step(steps, "lowsugar");
    return keys.map(function (k) {
      var n = nm(R, k), mins = (U.recheckMinutes && U.recheckMinutes[k]) || null;
      if (!has(res[k].v)) return { key: k, state: "due", text: "No reading today. Take it now." };
      if (k === "glucose" && low) return { key: k, state: "recheck", minutes: 15, text: "Check again 15 minutes after the first step in the plan." };
      if (re && re.text.indexOf(n + " in ") !== -1) return { key: k, state: "recheck", minutes: mins, text: "Re-check in " + mins + " minutes, as the plan says." };
      if (tm && tm.text.indexOf(n) !== -1) return { key: k, state: "tomorrow", text: "Logged today. Re-check tomorrow, as the plan says." };
      return { key: k, state: "done", text: "Logged today. Next routine check: tomorrow." };
    });
  }

  // Reminders start by themselves. schedule maps a reading to the time its re-check falls due (milliseconds).
  // A re-check whose time has come becomes "due". Nothing is added that the plan did not ask for.
  function withReminders(ps, schedule, now) {
    return ps.map(function (p) {
      var at = schedule && schedule[p.key];
      if (p.state !== "recheck" || !at) return p;
      var left = Math.ceil((at - now) / 1000);
      if (left <= 0) return { key: p.key, state: "due", minutes: p.minutes, reminded: true, text: "Time to re-check now. The reminder started by itself." };
      return { key: p.key, state: "recheck", minutes: p.minutes, left: left, text: p.text };
    });
  }
  // Fills in a due time for each new re-check and leaves times that are already set alone.
  function schedule(ps, existing, now, msPerMinute) {
    var out = {};
    ps.forEach(function (p) {
      if (p.state === "recheck" && p.minutes) out[p.key] = (existing && existing[p.key]) || now + p.minutes * msPerMinute;
    });
    return out;
  }

  // How many days in a row, ending today, have every reading. Null when there is no history.
  function streak(keys, trend) {
    if (!trend || !trend[keys[0]]) return null;
    var n = 0;
    for (var i = trend[keys[0]].length - 1; i >= 0; i--) {
      var all = keys.every(function (k) { return trend[k] && has(trend[k][i]); });
      if (!all) break;
      n++;
    }
    return n;
  }

  // Rewards doing the checks, never the numbers. A flagged reading that was logged counts the same as a normal one.
  function game(keys, res, habitsDone, habitsTotal, trend) {
    var logged = keys.filter(function (k) { return has(res[k].v); }).length, st = streak(keys, trend);
    return { logged: logged, total: keys.length, pct: Math.round(logged / keys.length * 100), streak: st,
      badges: [
        { id: "all", name: "All " + keys.length + " checks logged today", earned: logged === keys.length },
        { id: "habits", name: "Every habit done that is not on hold", earned: habitsTotal > 0 && habitsDone === habitsTotal },
        { id: "week", name: "Seven days of checks in a row", earned: st !== null && st >= 7 }
      ] };
  }

  // Splits the plan's own steps into what you can do yourself and what goes to the crew medical officer. Adds no step.
  function treatment(steps) {
    var self = [], officer = [];
    steps.forEach(function (s) {
      if (s.id === "none") return;
      if (s.id === "tellnow" || s.id === "tell" || /^Talk to the crew medical officer/.test(s.text)) officer.push(s);
      else self.push(s);
    });
    return { self: self, officer: officer };
  }

  // Plain lines on taking one reading, built only from what ranges.js and rules.js already say.
  function howTo(k, R, U) {
    var c = R[k], m = U.recheckMinutes && U.recheckMinutes[k], out = [];
    out.push({ head: "What takes it in this concept", text: c.sensor.charAt(0).toUpperCase() + c.sensor.slice(1) + "." });
    out.push({ head: "Can it be taken in space?", text: c.inSpace, source: c.inSpaceSource || null });
    out.push({ head: "How this prototype gets it", text: c.feed });
    out.push({ head: "If it is flagged", text: m ? "The plan asks for a second reading after " + m + " minutes. One reading is not enough to act on."
      : "It cannot be taken again straight away, so the plan looks at tonight or tomorrow." });
    return out;
  }

  // The whole day in three lines, for a wrist or a phone. It repeats the page's own headline, the plan's own first step
  // and the plan's own next check, word for word. It shortens nothing and decides nothing.
  function glance(sum, steps, ps, R) {
    var first = steps[0], urgent = first.when === "Now";
    var next = ps.filter(function (p) { return p.state === "due"; })[0] || ps.filter(function (p) { return p.state === "recheck"; })[0] || null;
    var nextText = !next ? "All checks done today."
      : nm(R, next.key).charAt(0).toUpperCase() + nm(R, next.key).slice(1) + (next.state === "due" ? ": take it now." : ": re-check in " + next.minutes + " minutes.");
    return { level: urgent && first.level === "serious" ? "serious" : sum.level, headline: sum.headline + ".", when: first.when, first: first.text, next: nextText, nextKey: next ? next.key : null };
  }

  // Lines added under the draft report. Rebuilt on every render from the same base text.
  function reportLines(p, photo) {
    var L = ["", "Where: " + p.name + ". " + p.evidence];
    if (photo) L.push("Photo attached by the crew member: " + photo.name + ". Not analysed by this prototype.");
    return L;
  }

  root.EXTRAS = { glance: glance, PLACES: PLACES, place: place, autoPlace: autoPlace, currentPlace: currentPlace, withReminders: withReminders, schedule: schedule, prompts: prompts, streak: streak, game: game, treatment: treatment, howTo: howTo, reportLines: reportLines };
})(typeof window !== "undefined" ? window : globalThis);
