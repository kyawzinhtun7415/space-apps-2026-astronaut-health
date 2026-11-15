// "How am I doing?" A summary of today, and notes on what changed over the last 7 days.
// Pattern notes are this team's own rules. They describe readings. They are not a diagnosis.
(function (root) {
  var FLAG = { watch: 1, serious: 1 };
  function num(key, v) { return v === null || v === undefined ? null : (key === "bp" ? v.sys : v); }
  function fmt(key, n, RANGES) { return (key === "temp" || key === "sleep" ? n.toFixed(1) : String(Math.round(n))) + " " + (key === "bp" ? "mmHg" : RANGES[key].unit); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function list(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  // One short state per reading, for the chips: HIGH, LOW, UP, DOWN, EXPECTED, OK, NO READING.
  function state(a) {
    if (a.status === "cannot") return "NO READING";
    if (a.status === "serious" || a.status === "watch") return a.dir === "low" ? "LOW" : "HIGH";
    if (a.status === "changed") return a.dir === "down" ? "DOWN" : "UP";
    if (a.status === "expected") return "EXPECTED";
    return "OK";
  }

  function summary(keys, res, RANGES) {
    var c = { serious: [], watch: [], cannot: [], changed: [], expected: [], ok: [] };
    keys.forEach(function (k) { var s = res[k].status; (c[s] || c.ok).push(k); });
    var flagged = c.serious.length + c.watch.length, level, headline;
    if (c.serious.length) { level = "serious"; headline = plural(c.serious.length, "reading needs", "readings need") + " action now"; }
    else if (c.watch.length) { level = "watch"; headline = plural(c.watch.length, "reading needs", "readings need") + " attention"; }
    else if (c.cannot.length) { level = "cannot"; headline = plural(c.cannot.length, "reading", "readings") + " could not be assessed"; }
    else if (c.changed.length) { level = "changed"; headline = "Nothing flagged. " + plural(c.changed.length, "reading has", "readings have") + " moved from your baseline"; }
    else if (c.expected.length) { level = "expected"; headline = "Nothing flagged. " + plural(c.expected.length, "reading shows", "readings show") + " the shift measured in space crews"; }
    else { level = "ok"; headline = "Nothing flagged. Your readings are close to your baseline"; }
    var sub = [];
    if (c.serious.length && c.watch.length) sub.push(plural(c.watch.length, "more needs", "more need") + " a re-check.");
    if (flagged && c.changed.length) sub.push(plural(c.changed.length, "more has", "more have") + " moved from your baseline.");
    if ((flagged || level === "changed") && c.cannot.length) sub.push(plural(c.cannot.length, "has", "have") + " no valid reading.");
    if (level !== "expected" && c.expected.length) sub.push(plural(c.expected.length, "shows", "show") + " the shift measured in space crews.");
    return { level: level, headline: headline, sub: sub.join(" "), counts: c, flagged: flagged,
      chips: keys.map(function (k) { return { key: k, label: RANGES[k].short, state: state(res[k]), status: res[k].status }; }),
      caveat: "This looks at readings only. It cannot see symptoms. If you feel unwell, tell the crew medical officer." };
  }

  // Notes from the 7-day trend. trend[key] is 7 values, oldest first, today last. Blood pressure values are {sys, dia}.
  function notes(keys, day, res, baseline, RANGES, RULES, SOURCES) {
    var out = [], tr = day.trend, good = [];
    var moved = keys.filter(function (k) { return FLAG[res[k].status] || res[k].status === "changed"; });
    if (moved.length >= RULES.togetherCount) {
      out.push({ kind: "warn", rank: 1, team: true,
        text: moved.length + " readings are flagged or changed today: " + list(moved.map(function (k) { return RANGES[k].label.replace(/ \(.*\)/, "").replace(" last night", "").toLowerCase(); })) + ".",
        more: "Readings that change together are worth telling the crew medical officer about, even when each change is small." });
    }
    if (!tr) return out;
    keys.forEach(function (k) {
      var vals = tr[k]; if (!vals || vals.length < 3) return;
      var cfg = RANGES[k], last = num(k, vals[vals.length - 1]), prev2 = num(k, vals[vals.length - 3]);
      var name = cfg.label.replace(/ \(.*\)/, "").replace(" last night", "");
      // Missing today: say when the last valid reading was.
      if (last === null) {
        for (var i = vals.length - 2; i >= 0; i--) if (num(k, vals[i]) !== null) {
          var ago = vals.length - 1 - i;
          out.push({ kind: "info", rank: 3, text: "No valid " + name.toLowerCase() + " reading today. The last valid one was " + fmt(k, num(k, vals[i]), RANGES) + ", " + plural(ago, "day", "days") + " ago." });
          break;
        }
        return;
      }
      // Fast change over two days.
      var fc = RULES.fastChange[k];
      if (prev2 !== null && fc && Math.abs(last - prev2) >= fc - 1e-9) {
        var up = last > prev2, n = { kind: "warn", rank: 2, team: true, key: k,
          text: name + (up ? " rose " : " fell ") + fmt(k, Math.abs(last - prev2), RANGES) + " in two days." };
        if (k === "temp" && up) { n.more = "The space shift builds gradually over 2.5 months, not over days."; n.source = cfg.space.source; }
        out.push(n);
      }
      // Flagged on most of the last 7 days.
      var flaggedDays = vals.filter(function (v) { return v !== null && cfg.clinical(v).level !== "ok"; }).length;
      if (flaggedDays >= RULES.persistDays) {
        var p = { kind: "warn", rank: 2, key: k, text: k === "sleep" ? "Sleep was under 7 hours on " + flaggedDays + " of the last 7 nights."
          : name + " was flagged on " + flaggedDays + " of the last 7 days." };
        if (k === "sleep") { p.more = "NASA says seven days of six hours of sleep performs like 24 to 36 hours awake."; p.source = SOURCES.tb041; }
        out.push(p);
      }
      // Steady and unflagged all week.
      var b = baseline ? num(k, k === "bp" ? (baseline.sys === null || baseline.sys === undefined ? null : { sys: baseline.sys }) : baseline[k]) : null;
      var steady = b !== null && vals.every(function (v) { return v !== null && cfg.clinical(v).level === "ok" && Math.abs(num(k, v) - b) < RULES.baselineChange[k]; });
      if (steady) good.push(name);
    });
    if (good.length) { var g = list(good.map(function (x, i) { return i ? x.toLowerCase() : x; })); out.push({ kind: "good", rank: 4, text: g + (good.length === 1 ? " has" : " have") + " stayed close to your baseline all week." }); }
    out.sort(function (a, b) { return a.rank - b.rank; });
    return out;
  }
  root.INSIGHTS = { summary: summary, notes: notes, state: state, num: num, list: list };
})(typeof window !== "undefined" ? window : globalThis);
