const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
["sample-days", "ranges", "rules", "assess", "tasks", "forecast", "hazards", "insights", "actions"].forEach(f => require(path.join(__dirname, "..", "js", f + ".js")));
const { SAMPLE, RANGES, RULES, ASSESS, TASKS, FORECAST, HAZARDS, REGION_RISKS, HABITS, SOURCES, INSIGHTS, ACTIONS } = globalThis;
const KEYS = ["bp", "hr", "temp", "sleep", "glucose", "mood"];
const day = id => SAMPLE.days.find(d => d.id === id);
const run = id => ASSESS.assessAll(KEYS, day(id).r, SAMPLE.baseline, day(id).day, RANGES, RULES);
const task = id => RULES.tasks.find(t => t.id === id);
const one = (key, r, d = 100, base = SAMPLE.baseline) => ASSESS.assess(key, r, base, d, RANGES, RULES);
const notes = id => INSIGHTS.notes(KEYS, day(id), run(id), SAMPLE.baseline, RANGES, RULES, SOURCES);
const plan = (id, flags = []) => ACTIONS.plan(KEYS, run(id), { RANGES, RULES, SOURCES, flags, notes: notes(id) });
const ids = p => p.map(a => a.id);

// ---- judging one reading
test("ordinary day: nothing flagged, and no blood pressure shift is applied before day 85", () => {
  const r = run("d30");
  assert.equal(r.bp.status, "ok");
  assert.equal(r.bp.expectedShift, null);
  KEYS.forEach(k => assert.equal(r[k].status, "ok", k));
});
test("day 90: temperature and blood pressure match the measured shifts", () => {
  const r = run("d90");
  assert.equal(r.temp.status, "expected");
  assert.equal(r.bp.status, "expected");
});
test("day 10: the same temperature is too early to be expected", () => {
  const r = run("d10");
  assert.equal(r.temp.status, "changed");
  assert.equal(r.temp.dir, "up");
});
test("'expected in space' needs a real shift, the same direction and a close match", () => {
  assert.equal(one("temp", { temp: 37.1 }, 0).status, "ok");        // +0.4 on day 0: no shift yet
  assert.equal(one("temp", { temp: 36.3 }, 0).status, "ok");        // a drop is never 'expected'
  assert.equal(one("temp", { temp: 36.2 }, 90).status, "changed");  // a drop on day 90 is a change
  assert.equal(one("temp", { temp: 37.2 }, 10).status, "changed");  // +0.5 on day 10: too early
  assert.equal(one("temp", { temp: 38.0 }, 90).status, "changed");  // +1.3 is beyond the shift
  assert.equal(one("temp", { temp: 37.9 }, 90).status, "expected");
  assert.equal(one("temp", { temp: 37.0 }, 30).status, "ok");       // +0.3 is just close to baseline
});
test("a clinical flag is never cleared by the space shift", () => {
  const r = run("d92");
  assert.equal(r.temp.status, "watch");
  assert.equal(r.temp.dir, "high");
  assert.match(r.temp.why, /NEWS2/);
  assert.equal(one("temp", { temp: 38.1 }, 180).status, "watch");
});
test("blood pressure 108/66 is flagged low with a reason that names the chart", () => {
  const r = run("d92");
  assert.equal(r.bp.status, "watch");
  assert.equal(r.bp.dir, "low");
  assert.match(r.bp.why, /101 to 110 scores 1/);
});
test("a missing reading is 'cannot', never ok; half a blood pressure is missing too", () => {
  const r = run("d93");
  assert.equal(r.bp.status, "cannot");
  assert.equal(r.hr.status, "cannot");
  assert.equal(one("bp", { sys: 120, dia: null }).status, "cannot");
});
test("levels follow the chart's own score: only a score of 3 is 'act now'", () => {
  assert.equal(one("temp", { temp: 34.9 }).status, "serious");
  assert.equal(one("temp", { temp: 35.5 }).status, "watch");
  assert.equal(one("temp", { temp: 39.5 }).status, "watch");
  assert.equal(one("temp", { temp: 39.5 }).score, 2);
  assert.equal(one("bp", { sys: 88, dia: 55 }).status, "serious");
  assert.equal(one("bp", { sys: 95, dia: 60 }).status, "watch");
  assert.equal(one("bp", { sys: 225, dia: 100 }).status, "serious");
  assert.equal(one("bp", { sys: 185, dia: 100 }).status, "serious");
});
test("boundary values land on the side the text says", () => {
  assert.equal(one("bp", { sys: 110, dia: 70 }, 30).status, "watch");
  assert.equal(one("bp", { sys: 111, dia: 70 }, 30).clinical, "ok");
  assert.equal(one("bp", { sys: 129, dia: 79 }, 30).clinical, "ok");
  assert.equal(one("bp", { sys: 130, dia: 70 }, 30).status, "watch");
  assert.equal(one("temp", { temp: 38.0 }).clinical, "ok");
  assert.equal(one("temp", { temp: 36.1 }).clinical, "ok");
  assert.equal(one("temp", { temp: 36.0 }).status, "watch");
  assert.equal(one("temp", { temp: 35.0 }).status, "serious");
  assert.equal(one("glucose", { glucose: 70 }).clinical, "ok");
  assert.equal(one("glucose", { glucose: 69 }).status, "watch");
  assert.equal(one("glucose", { glucose: 100 }).status, "watch");
  assert.equal(one("hr", { hr: 60 }).clinical, "ok");
  assert.equal(one("hr", { hr: 100 }).clinical, "ok");
  assert.equal(one("hr", { hr: 101 }).status, "watch");
  assert.equal(one("sleep", { sleep: 7 }).clinical, "ok");
});
test("the team's own act-now lines raise a level and say they are the team's", () => {
  const hi = one("hr", { hr: 150 });
  assert.equal(hi.status, "serious");
  assert.equal(hi.dir, "high");
  assert.match(hi.why, /team's example/);
  const low = one("glucose", { glucose: 40 });
  assert.equal(low.status, "serious");
  assert.match(low.why, /team's example/);
});
test("with no baseline entered, a reading is judged by the chart only", () => {
  assert.equal(one("temp", { temp: 37.0 }, 90, {}).status, "nobase");
  assert.equal(one("temp", { temp: 38.4 }, 90, {}).status, "watch");
  assert.equal(one("bp", { sys: 118, dia: 76 }, 90, { sys: null, dia: null }).status, "nobase");
});
test("every reading that has numbers names a source", () => {
  KEYS.forEach(k => {
    const c = RANGES[k];
    if (k !== "mood") assert.ok(c.clinicalSources.length > 0, k + " clinical source");
    if (c.space.shift !== null) assert.ok(c.space.source && c.space.source.url, k + " space source");
    assert.ok(c.short && c.sensor && c.inSpaceSource.url, k + " labels");
  });
  Object.values(SOURCES).forEach(s => assert.match(s.url, /^https:\/\//));
  Object.values(HAZARDS).concat(Object.values(REGION_RISKS)).forEach(h => assert.match(h.url, /^https:\/\/www\.nasa\.gov\//));
  HABITS.forEach(h => assert.match(h.source.url, /^https:\/\/www\.nasa\.gov\//));
});
test("sample days are in flight-day order and each has a 7-point trend", () => {
  const days = SAMPLE.days.map(d => d.day);
  assert.deepEqual(days, [...days].sort((a, b) => a - b));
  SAMPLE.days.forEach(d => KEYS.forEach(k => assert.equal(d.trend[k].length, 7, d.id + " " + k)));
  SAMPLE.days.forEach(d => { const t = d.trend.temp; assert.equal(t[t.length - 1], d.r.temp, d.id + " trend ends on today"); });
});

// ---- the check before a task
test("task check: ordinary day has nothing flagged", () => {
  RULES.tasks.forEach(t => assert.equal(TASKS.checkTask(t, run("d30"), RULES, RANGES, []).answer, "clear", t.id));
});
test("task check: a shift that is expected in space does not hold exercise, but is called out", () => {
  const out = TASKS.checkTask(task("exercise"), run("d90"), RULES, RANGES, []);
  assert.equal(out.answer, "clear");
  assert.match(out.reasons.join(" "), /overheated/);
});
test("task check: a rise the space shift does not explain holds exercise", () => {
  assert.equal(TASKS.checkTask(task("exercise"), run("d10"), RULES, RANGES, []).answer, "hold");
});
test("task check: never says 'nothing flagged' while a reading it covers is flagged", () => {
  const out = TASKS.checkTask(task("cabin"), run("d90"), RULES, RANGES, []); // sleep 6.4 h is flagged, above the hold line
  assert.equal(out.answer, "clear");
  assert.doesNotMatch(out.word, /Nothing flagged/);
  assert.match(out.reasons.join(" "), /Sleep is flagged/);
  assert.match(out.reasons.join(" "), /Mood has no clinical range/);
});
test("task check: under the team's sleep line holds a task", () => {
  assert.equal(TASKS.checkTask(task("cabin"), run("d92"), RULES, RANGES, []).answer, "hold"); // sleep 5.0
});
test("task check: dead sensor gives cannot assess or hold, never clear", () => {
  ["eva", "exercise"].forEach(id => assert.notEqual(TASKS.checkTask(task(id), run("d93"), RULES, RANGES, []).answer, "clear"));
  const r = ASSESS.assessAll(KEYS, { sys: null, dia: null, hr: null, temp: 36.8, sleep: 7.5, glucose: 90, mood: 4 }, SAMPLE.baseline, 30, RANGES, RULES);
  assert.equal(TASKS.checkTask(task("exercise"), r, RULES, RANGES, []).answer, "cannot");
});
test("task check: a red-flag symptom overrides clean readings, and it never says fit or cleared", () => {
  assert.equal(TASKS.checkTask(task("cabin"), run("d30"), RULES, RANGES, ["Chest pain"]).answer, "redflag");
  SAMPLE.days.forEach(d => RULES.tasks.forEach(t => {
    const out = TASKS.checkTask(t, run(d.id), RULES, RANGES, []);
    assert.doesNotMatch(out.word + " " + out.reasons.join(" "), /\bfit\b|cleared/i);
  }));
});

// ---- how am I doing: summary and notes
test("summary: headline counts what needs attention and never says healthy or fine", () => {
  const s92 = INSIGHTS.summary(KEYS, run("d92"), RANGES);
  assert.equal(s92.level, "watch");
  assert.match(s92.headline, /^3 readings need attention/);
  assert.match(s92.sub, /2 more have moved from your baseline/);
  assert.deepEqual(s92.chips.map(c => c.state), ["LOW", "UP", "HIGH", "LOW", "OK", "DOWN"]);
  const s30 = INSIGHTS.summary(KEYS, run("d30"), RANGES);
  assert.equal(s30.level, "ok");
  SAMPLE.days.forEach(d => { const s = INSIGHTS.summary(KEYS, run(d.id), RANGES); assert.doesNotMatch(s.headline + s.sub, /healthy|fine|all clear|fit/i); assert.match(s.caveat, /cannot see symptoms/); });
});
test("summary: a serious reading leads, and missing readings are counted", () => {
  const r = ASSESS.assessAll(KEYS, { sys: 88, dia: 50, hr: null, temp: 38.4, sleep: 7.5, glucose: 90, mood: 4 }, SAMPLE.baseline, 90, RANGES, RULES);
  const s = INSIGHTS.summary(KEYS, r, RANGES);
  assert.equal(s.level, "serious");
  assert.match(s.headline, /1 reading needs action now/);
  assert.match(s.sub, /1 more needs a re-check/);
  assert.match(s.sub, /1 has no valid reading/);
});
test("notes: a fast rise in temperature is called out with the reason it is not the space shift", () => {
  const n = notes("d92").find(x => x.key === "temp");
  assert.match(n.text, /rose 1\.0 °C in two days/);
  assert.match(n.more, /2\.5 months/);
});
test("notes: several readings moving together is called out; a steady week is noted as good news", () => {
  assert.match(notes("d92")[0].text, /^5 readings are flagged or changed today/);
  assert.ok(notes("d30").some(x => x.kind === "good"));
  assert.ok(!notes("d30").some(x => x.kind === "warn"));
});
test("notes: a missing reading says when the last valid one was", () => {
  assert.ok(notes("d93").some(x => /No valid blood pressure reading today\. The last valid one was 108 mmHg, 1 day ago/.test(x.text)));
});
test("notes: short sleep on most nights is called out with NASA's line", () => {
  const n = notes("d92").find(x => x.key === "sleep");
  assert.match(n.text, /under 7 hours on 7 of the last 7 nights/);
  assert.match(n.more, /24 to 36 hours awake/);
});

// ---- what to do: the plan
test("plan: the fever day gives re-check, tell the medic today, hold exercise, protect sleep", () => {
  const p = plan("d92");
  assert.deepEqual(ids(p).slice(0, 4), ["recheck", "tell", "hold", "sleep"]);
  assert.match(p[0].text, /blood pressure in 30 minutes and body temperature in 60 minutes/);
  assert.equal(p[1].text, "Tell the crew medical officer today.");
});
test("plan: an ordinary day says no action, and says readings cannot see symptoms", () => {
  const p = plan("d30");
  assert.deepEqual(ids(p), ["none"]);
  assert.match(p[0].why, /cannot see symptoms/);
});
test("plan: low blood sugar leads with the 15/15 rule and names its source", () => {
  const p = plan("d93");
  assert.equal(p[0].id, "lowsugar");
  assert.match(p[0].text, /15 g/);
  assert.match(p[0].basis[0].url, /diabetes\.org/);
  assert.ok(ids(p).includes("sensor"));
});
test("plan: an expected shift does not hold exercise; an unexplained rise does", () => {
  assert.ok(ids(plan("d90")).includes("heat"));
  assert.ok(!ids(plan("d90")).includes("hold"));
  assert.deepEqual(ids(plan("d10")).slice(0, 3), ["recheck", "tell", "hold"]);
});
test("plan: a ticked symptom or a serious reading puts the crew medical officer first, now", () => {
  const p = plan("d30", ["Chest pain"]);
  assert.equal(p[0].id, "redflag");
  assert.equal(p[0].when, "Now");
  const r = ASSESS.assessAll(KEYS, { sys: 88, dia: 50, hr: 64, temp: 37.0, sleep: 7.5, glucose: 90, mood: 4 }, SAMPLE.baseline, 30, RANGES, RULES);
  const q = ACTIONS.plan(KEYS, r, { RANGES, RULES, SOURCES, flags: [], notes: [] });
  assert.equal(q[0].id, "serious");
  assert.match(q[0].why, /20 minutes one way/);
});
test("plan: every step is either the team's own or names a source, and none diagnoses", () => {
  SAMPLE.days.forEach(d => plan(d.id).forEach(a => {
    assert.ok(a.team || (a.basis && a.basis.length), d.id + " " + a.id);
    assert.doesNotMatch(a.text + " " + a.why, /you have|diagnos|infection|\bfit\b|cleared/i, d.id + " " + a.id);
  }));
});
test("report for Earth lists every reading, the steps, and says it is a prototype", () => {
  const r = run("d92"), s = INSIGHTS.summary(KEYS, r, RANGES), n = notes("d92"), p = plan("d92");
  const txt = ACTIONS.report(KEYS, r, day("d92"), s, p, { RANGES, flags: [], notes: n });
  KEYS.forEach(k => assert.ok(txt.includes(RANGES[k].label), k));
  assert.match(txt, /concept prototype, simulated data/);
  assert.match(txt, /Flight day 92/);
  assert.match(txt, /1\. Within the hour: Re-check/);
});

// ---- looking ahead
test("forecast: bone range follows NASA's 1% to 1.5% a month", () => {
  assert.deepEqual(FORECAST.bone(0), { low: 100, high: 100 });
  assert.deepEqual(FORECAST.bone(6), { low: 91, high: 94 });
});
test("forecast: sleep debt adds up hours short of 7; temperature ramp reaches the shift at day 75", () => {
  assert.deepEqual(FORECAST.sleepDebt([6, 6, 6, 6, 6, 6, 6]), { debt: 7, under6: 7, nights: 7, need: 7 });
  assert.equal(FORECAST.tempRamp(0, 36.7, 1, 75), 36.7);
  assert.equal(FORECAST.tempRamp(75, 36.7, 1, 75), 37.7);
  assert.equal(FORECAST.tempRamp(180, 36.7, 1, 75), 37.7);
});

test("plan: typed-in readings with empty boxes ask for the readings, not for a sensor check", () => {
  const r = ASSESS.assessAll(KEYS, { sys: null, dia: null, hr: null, temp: 38.4, sleep: null, glucose: 85, mood: null }, {}, 120, RANGES, RULES);
  const p = ACTIONS.plan(KEYS, r, { RANGES, RULES, SOURCES, flags: [], notes: [], custom: true });
  const s = p.find(a => a.id === "sensor");
  assert.match(s.text, /^Add your blood pressure, heart rate, sleep and mood when you have them/);
  assert.equal(r.glucose.status, "nobase");
  assert.equal(INSIGHTS.summary(KEYS, r, RANGES).headline, "1 reading needs attention");
});
