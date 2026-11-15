// The judgement, as pure functions so they can be tested. A clinical flag is never cleared by the space shift.
(function (root) {
  function val(key, r) {
    if (key !== "bp") return r[key] === undefined ? null : r[key];
    return (r.sys === null || r.sys === undefined || r.dia === null || r.dia === undefined) ? null : { sys: r.sys, dia: r.dia };
  }
  function delta(key, v, b) { return key === "bp" ? v.sys - b.sys : Math.round((v - b) * 10) / 10; }
  // The shift a study measured, scaled by flight day when the study describes a build-up.
  function expectedShift(cfg, day) {
    if (!cfg.space || cfg.space.shift === null || cfg.space.shift === undefined) return null;
    if (cfg.space.fromDay && day < cfg.space.fromDay) return null; // no measurement this early in a flight
    var ramp = cfg.space.rampDays;
    if (!ramp) return cfg.space.shift;
    return Math.round(cfg.space.shift * Math.min(1, Math.max(0, day) / ramp) * 100) / 100;
  }
  function assess(key, r, baseline, day, RANGES, RULES) {
    var v = val(key, r), b = val(key, baseline), cfg = RANGES[key];
    if (v === null || v === undefined) return { status: "cannot", v: null, b: b, d: null, why: "", dir: null, expectedShift: expectedShift(cfg, day) };
    var hasBase = !(b === null || b === undefined);
    var clin = cfg.clinical(v), d = hasBase ? delta(key, v, b) : null, es = expectedShift(cfg, day);
    var out = { v: v, b: hasBase ? b : null, d: d, clinical: clin.level, why: clin.why, score: clin.score, note: clin.note || "", dir: clin.dir || null, expectedShift: es };
    // This team's own act-now lines (examples, not from a chart). They can only raise a level, never lower one.
    var t = RULES.teamActNow || {};
    if (key === "hr" && ((t.hrAbove && v > t.hrAbove) || (t.hrBelow && v < t.hrBelow))) {
      out.status = "serious"; out.clinical = "serious"; out.teamRule = true; out.dir = v > t.hrAbove ? "high" : "low";
      out.why = "Past this team's own act-now line for pulse (" + t.hrBelow + " to " + t.hrAbove + "). That line is the team's example, not from a chart.";
      return out;
    }
    if (key === "glucose" && t.glucoseBelow && v < t.glucoseBelow) {
      out.status = "serious"; out.clinical = "serious"; out.teamRule = true; out.dir = "low";
      out.why = "Below this team's own act-now line of " + t.glucoseBelow + " mg/dL. That line is the team's example. Below 70 is low on the American Diabetes Association page.";
      return out;
    }
    if (key === "mood" && RULES.moodAttentionAtOrBelow !== null && RULES.moodAttentionAtOrBelow !== undefined && v <= RULES.moodAttentionAtOrBelow) {
      out.status = "watch"; out.clinical = "watch"; out.teamRule = true; out.dir = "low";
      out.why = "At the bottom of this team's own 1 to 5 mood scale. That line is the team's example. Mood has no clinical chart here.";
      return out;
    }
    if (clin.level !== "ok") { out.status = clin.level; return out; }
    if (!hasBase) { out.status = "nobase"; return out; }
    // "Expected in space" needs a real shift for this flight day, a change in the same direction, and a close match.
    var tol = RULES.shiftTolerance[key];
    var minMove = tol === undefined ? 0 : Math.max(tol, Math.abs(cfg.space.shift || 0) / 2); // a change smaller than this is just "close to baseline"
    if (es !== null && tol !== undefined && Math.abs(es) >= tol && d * es > 0 && Math.abs(d) >= minMove && Math.abs(d - es) <= tol + 1e-9) { out.status = "expected"; return out; }
    out.status = Math.abs(d) >= RULES.baselineChange[key] ? "changed" : "ok";
    if (out.status === "changed") out.dir = d > 0 ? "up" : "down";
    return out;
  }
  function assessAll(keys, r, baseline, day, RANGES, RULES) {
    var res = {}; keys.forEach(function (k) { res[k] = assess(k, r, baseline, day, RANGES, RULES); res[k].key = k; }); return res;
  }
  root.ASSESS = { val: val, delta: delta, expectedShift: expectedShift, assess: assess, assessAll: assessAll };
})(typeof window !== "undefined" ? window : globalThis);
