const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
["sample-days", "ranges", "rules", "assess", "tasks", "forecast", "hazards"].forEach(f => require(path.join(__dirname, "..", "js", f + ".js")));
const { SAMPLE, RANGES, RULES, ASSESS, TASKS, FORECAST, HAZARDS, REGION_RISKS, SOURCES } = globalThis;
const KEYS = ["bp", "hr", "temp", "sleep", "glucose", "mood"];
const day = id => SAMPLE.days.find(d => d.id === id);
const run = id => ASSESS.assessAll(KEYS, day(id).r, SAMPLE.baseline, day(id).day, RANGES, RULES);
const task = id => RULES.tasks.find(t => t.id === id);

test("ordinary day: nothing flagged, and no blood pressure shift is applied before day 85", () => {
  const r = run("d30");
  assert.equal(r.bp.status, "ok");
  assert.equal(r.bp.expectedShift, null);
  KEYS.forEach(k => assert.ok(!["watch", "serious", "cannot"].includes(r[k].status), k));
});
test("day 90: temperature and blood pressure match the measured shifts", () => {
  const r = run("d90");
  assert.equal(r.temp.status, "expected");
  assert.equal(r.bp.status, "expected");
});
test("sample days are in flight-day order", () => {
  const days = SAMPLE.days.map(d => d.day);
  assert.deepEqual(days, [...days].sort((a, b) => a - b));
});
test("day 10: the same temperature is too early to be expected", () => {
  const r = run("d10");
  assert.equal(r.temp.status, "changed");
  assert.ok(r.temp.expectedShift < 0.2);
});
test("a clinical flag is never cleared by the space shift", () => {
  const r = run("d92");
  assert.equal(r.temp.status, "watch");
  assert.match(r.temp.why, /NEWS2/);
  // A fever-level value on a day when the shift is fully built still flags
  const a = ASSESS.assess("temp", { temp: 38.1 }, SAMPLE.baseline, 180, RANGES, RULES);
  assert.equal(a.status, "watch");
});
test("blood pressure 108/66 is flagged with a reason that names the chart", () => {
  const r = run("d92");
  assert.equal(r.bp.status, "watch");
  assert.match(r.bp.why, /101 to 110 scores 1/);
});
test("a missing reading is 'cannot', never ok", () => {
  const r = run("d93");
  assert.equal(r.bp.status, "cannot");
  assert.equal(r.hr.status, "cannot");
  assert.equal(r.glucose.status, "watch");
});
test("every reading that has numbers names a source", () => {
  KEYS.forEach(k => {
    const c = RANGES[k];
    if (k !== "mood") assert.ok(c.clinicalSources.length > 0, k + " clinical source");
    if (c.space.shift !== null) assert.ok(c.space.source && c.space.source.url, k + " space source");
  });
  Object.values(SOURCES).forEach(s => assert.match(s.url, /^https:\/\//));
  Object.values(HAZARDS).concat(Object.values(REGION_RISKS)).forEach(h => assert.match(h.url, /^https:\/\/www\.nasa\.gov\//));
});
test("task check: ordinary day has no concerns", () => {
  RULES.tasks.forEach(t => assert.equal(TASKS.checkTask(t, run("d30"), RULES, RANGES, []).answer, "clear", t.id));
});
test("task check: raised temperature holds exertion even when 'expected'", () => {
  const r = run("d90");
  assert.equal(r.temp.status, "expected");
  assert.equal(TASKS.checkTask(task("exercise"), r, RULES, RANGES, []).answer, "hold");
});
test("task check: dead sensor gives cannot assess or hold, never clear", () => {
  const r = run("d93");
  ["eva", "exercise"].forEach(id => assert.notEqual(TASKS.checkTask(task(id), r, RULES, RANGES, []).answer, "clear"));
});
test("task check: missing readings with nothing flagged is 'cannot assess'", () => {
  const r = ASSESS.assessAll(KEYS, { sys: null, dia: null, hr: null, temp: 36.8, sleep: 7.5, glucose: 90, mood: 4 }, SAMPLE.baseline, 30, RANGES, RULES);
  assert.equal(TASKS.checkTask(task("exercise"), r, RULES, RANGES, []).answer, "cannot");
});
test("task check: a red-flag symptom overrides clean readings", () => {
  assert.equal(TASKS.checkTask(task("cabin"), run("d30"), RULES, RANGES, ["Chest pain"]).answer, "redflag");
});
test("task check never uses the words fit or cleared", () => {
  SAMPLE.days.forEach(d => RULES.tasks.forEach(t => {
    const out = TASKS.checkTask(t, run(d.id), RULES, RANGES, []);
    assert.doesNotMatch(out.word + " " + out.reasons.join(" "), /\bfit\b|cleared/i);
  }));
});
test("forecast: bone range follows NASA's 1% to 1.5% a month", () => {
  assert.deepEqual(FORECAST.bone(0), { low: 100, high: 100 });
  assert.deepEqual(FORECAST.bone(6), { low: 91, high: 94 });
});
test("forecast: sleep debt adds up hours short of 7", () => {
  assert.deepEqual(FORECAST.sleepDebt([6, 6, 6, 6, 6, 6, 6]), { debt: 7, under6: 7, nights: 7, need: 7 });
  assert.equal(FORECAST.sleepDebt([7.5, 8, 7]).debt, 0);
});
test("forecast: temperature ramp reaches the shift at day 75 and stays", () => {
  assert.equal(FORECAST.tempRamp(0, 36.7, 1, 75), 36.7);
  assert.equal(FORECAST.tempRamp(75, 36.7, 1, 75), 37.7);
  assert.equal(FORECAST.tempRamp(180, 36.7, 1, 75), 37.7);
});

const one = (key, r, day = 100) => ASSESS.assess(key, r, SAMPLE.baseline, day, RANGES, RULES);
test("levels follow the chart's own score: only a score of 3 is 'act now'", () => {
  assert.equal(one("temp", { temp: 34.9 }).status, "serious");   // 35.0 or less scores 3
  assert.equal(one("temp", { temp: 35.5 }).status, "watch");     // scores 1
  assert.equal(one("temp", { temp: 39.5 }).status, "watch");     // scores 2
  assert.equal(one("temp", { temp: 39.5 }).score, 2);
  assert.equal(one("bp", { sys: 88, dia: 55 }).status, "serious"); // scores 3
  assert.equal(one("bp", { sys: 95, dia: 60 }).status, "watch");   // scores 2
  assert.equal(one("bp", { sys: 225, dia: 100 }).status, "serious");
  assert.equal(one("bp", { sys: 185, dia: 100 }).status, "serious"); // crisis band
});
test("the team's own act-now lines raise a level and say they are the team's", () => {
  const hi = one("hr", { hr: 150 });
  assert.equal(hi.status, "serious");
  assert.match(hi.why, /team's example/);
  const low = one("glucose", { glucose: 40 });
  assert.equal(low.status, "serious");
  assert.match(low.why, /team's example/);
  assert.equal(one("hr", { hr: 105 }).status, "watch");
});
test("a second-level flag tells the crew medical officer the same day", () => {
  assert.match(RULES.whoToTell("watch", "temp", 39.5, 2).who, /today/);
  assert.match(RULES.whoToTell("watch", "sleep", 6.1, null).text, /cannot be re-checked/);
});
test("task check: a 6 to 7 hour night does not hold a task, under 6 hours does", () => {
  const r = run("d90"); // sleep 6.4
  assert.equal(TASKS.checkTask(task("cabin"), r, RULES, RANGES, []).answer, "clear");
  assert.equal(TASKS.checkTask(task("cabin"), run("d92"), RULES, RANGES, []).answer, "hold"); // sleep 5.0
});
test("every sample day has a 7-point trend for every reading", () => {
  SAMPLE.days.forEach(d => KEYS.forEach(k => assert.equal(d.trend[k].length, 7, d.id + " " + k)));
});
test("typed-in readings with nothing entered are all 'cannot assess'", () => {
  const r = ASSESS.assessAll(KEYS, { sys: null, dia: null, hr: null, temp: null, sleep: null, glucose: null, mood: null }, SAMPLE.baseline, 90, RANGES, RULES);
  KEYS.forEach(k => assert.equal(r[k].status, "cannot", k));
  RULES.tasks.forEach(t => assert.equal(TASKS.checkTask(t, r, RULES, RANGES, []).answer, "cannot", t.id));
});
