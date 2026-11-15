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
  assert.equal(s.headline, "2 readings need attention, 1 of them now: blood pressure and body temperature");
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
  assert.ok(notes("d93").some(x => /No valid blood pressure reading today\. The last valid one was 108\/66 mmHg, 1 day ago/.test(x.text)));
});
test("notes: short sleep on most nights is called out with NASA's line", () => {
  const n = notes("d92").find(x => x.key === "sleep");
  assert.match(n.text, /under 7 hours on 7 of the last 7 nights/);
  assert.match(n.more, /24 to 36 hours awake/);
});

// ---- what to do: the plan
test("plan: the fever day tells the medic now, stops exercise, then re-checks; nothing is left for tomorrow", () => {
  const p = plan("d92");
  assert.deepEqual(ids(p).slice(0, 3), ["tellnow", "hold", "recheck"]);
  assert.match(p[0].text, /^Tell the crew medical officer now, and send today's readings to the flight surgeon on Earth/);
  assert.match(p[0].why, /Core temperature is flagged high, and blood pressure and heart rate have moved with it/);
  assert.match(p[2].text, /blood pressure in 30 minutes, heart rate in 30 minutes and body temperature in 60 minutes/);
  assert.ok(!ids(p).includes("tomorrow"));
  assert.ok(ids(p).includes("sleep") && ids(p).includes("mood"));
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
  assert.deepEqual(ids(plan("d10")).slice(0, 3), ["hold", "recheck", "tell"]);
  assert.doesNotMatch(plan("d90").map(a => a.text).join(" "), /as planned/);
});
test("plan: a ticked symptom or a serious reading puts the crew medical officer first, now", () => {
  const p = plan("d30", ["Chest pain"]);
  assert.equal(p[0].id, "tellnow");
  assert.equal(p[0].when, "Now");
  assert.equal(p[1].id, "hold");
  const r = ASSESS.assessAll(KEYS, { sys: 88, dia: 50, hr: 64, temp: 37.0, sleep: 7.5, glucose: 90, mood: 4 }, SAMPLE.baseline, 30, RANGES, RULES);
  const q = ACTIONS.plan(KEYS, r, { RANGES, RULES, SOURCES, flags: [], notes: [] });
  assert.equal(q[0].id, "tellnow");
  assert.match(q[0].why, /20 minutes one way/);
  assert.equal(q[1].id, "hold"); // a serious reading always stops hard physical work
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
  assert.match(txt, /1\. Now: Tell the crew medical officer now/);
  assert.match(txt, /Draft only: nothing has been sent/);
  assert.match(txt, /-11 mmHg on the top number from pre-launch baseline/);
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
  assert.equal(INSIGHTS.summary(KEYS, r, RANGES).headline, "1 reading needs attention: body temperature");
});

const planFor = (r, base = SAMPLE.baseline, d = 90, extra = {}) => { const res = ASSESS.assessAll(KEYS, r, base, d, RANGES, RULES); return { res, p: ACTIONS.plan(KEYS, res, Object.assign({ RANGES, RULES, SOURCES, flags: [], notes: [] }, extra)) }; };
const NORMAL = { sys: 118, dia: 76, hr: 64, temp: 36.8, sleep: 7.5, glucose: 90, mood: 4 };
test("plan: a low temperature never says 'above your baseline' or talks about exercise heat", () => {
  [35.5, 34.9].forEach(v => {
    const { p } = planFor(Object.assign({}, NORMAL, { temp: v }), SAMPLE.baseline, 30);
    const hold = p.find(a => a.id === "hold");
    assert.ok(hold, "hold step at " + v);
    assert.doesNotMatch(hold.why, /-\d|above your baseline|rose higher/, hold.why);
    assert.match(hold.why, /below your baseline/);
    assert.equal(hold.basis.length, 0);
  });
});
test("plan: the hold step only points at a re-check that exists", () => {
  const low = planFor(Object.assign({}, NORMAL, { temp: 34.9 }), SAMPLE.baseline, 30).p; // score 3: act now
  assert.match(low.find(a => a.id === "hold").text, /until the crew medical officer has seen you/);
  [low, planFor(Object.assign({}, NORMAL, { temp: 38.6 }), SAMPLE.baseline, 90).p, plan("d10"), plan("d92")].forEach(p => {
    if (p.some(a => /re-check/.test(a.text + a.why) && a.id !== "recheck")) assert.ok(ids(p).includes("recheck"));
  });
});
test("plan: very low blood sugar is treated first, then the crew medical officer is told", () => {
  const { p } = planFor(Object.assign({}, NORMAL, { glucose: 40 }), SAMPLE.baseline, 30);
  assert.deepEqual(ids(p).slice(0, 3), ["lowsugar", "tellnow", "hold"]);
});
test("plan: a ticked symptom still comes before everything else", () => {
  const { p } = planFor(Object.assign({}, NORMAL, { glucose: 40 }), SAMPLE.baseline, 30, { flags: ["Chest pain"] });
  assert.equal(p[0].id, "tellnow");
  assert.equal(p.filter(a => a.id === "tellnow").length, 1);
});
test("summary: with no baseline and nothing flagged, it does not claim closeness to a baseline", () => {
  const res = ASSESS.assessAll(KEYS, NORMAL, {}, 90, RANGES, RULES);
  const s = INSIGHTS.summary(KEYS, res, RANGES);
  assert.doesNotMatch(s.headline, /close to your baseline/);
  assert.match(s.headline, /Enter your baseline/);
});
test("no sentence the plan, summary or report can produce contains undefined, null or NaN", () => {
  const cases = [EMPTY_R(), NORMAL, Object.assign({}, NORMAL, { temp: 34.9, glucose: 40, hr: 150 }), Object.assign(EMPTY_R(), { temp: 38.4 }), Object.assign({}, NORMAL, { sys: 230, dia: 130 })];
  const bases = [SAMPLE.baseline, {}, { temp: 36.7 }];
  cases.forEach(r => bases.forEach(b => [0, 10, 90, 180].forEach(d => {
    const res = ASSESS.assessAll(KEYS, r, b, d, RANGES, RULES), sum = INSIGHTS.summary(KEYS, res, RANGES);
    const fake = { id: "x", day: d, r, week: null, trend: null };
    const nts = INSIGHTS.notes(KEYS, fake, res, b, RANGES, RULES, SOURCES);
    [true, false].forEach(custom => {
      const p = ACTIONS.plan(KEYS, res, { RANGES, RULES, SOURCES, flags: [], notes: nts, custom });
      const all = [sum.headline, sum.sub].concat(nts.map(n => n.text + (n.more || "")), p.map(a => a.text + " " + a.why), [ACTIONS.report(KEYS, res, fake, sum, p, { RANGES, flags: [], notes: nts, custom })]).join(" | ");
      assert.doesNotMatch(all, /undefined|\bnull\b|NaN/, all.slice(0, 300));
    });
  })));
});
function EMPTY_R() { return { sys: null, dia: null, hr: null, temp: null, sleep: null, glucose: null, mood: null }; }

// ---- cases a fresh medical review raised
test("plan: a ticked symptom never sits beside advice to exercise", () => {
  const p = plan("d90", ["Chest pain"]);
  assert.deepEqual(ids(p).slice(0, 2), ["tellnow", "hold"]);
  assert.ok(!ids(p).includes("heat"));
  assert.doesNotMatch(p.map(a => a.text).join(" "), /If you exercise|as planned/);
});
test("plan: a serious reading with a ticked symptom gives one tell-now step, not two", () => {
  const { p } = planFor(Object.assign({}, NORMAL, { hr: 135 }), SAMPLE.baseline, 30, { flags: ["Chest pain", "New confusion"] });
  assert.equal(p.filter(a => /^Tell the crew medical officer now/.test(a.text)).length, 1);
  assert.match(p[0].why, /chest pain and new confusion/);
  assert.match(p[0].why, /heart rate 135 bpm/);
});
test("plan: no two steps on any day say the same thing, and steps run soonest first", () => {
  const ORDER = ["Now", "Within the hour", "Today", "Tonight", "Tomorrow"];
  const all = SAMPLE.days.map(d => plan(d.id)).concat(SAMPLE.days.map(d => plan(d.id, ["Chest pain"])));
  [{ hr: 135 }, { glucose: 40 }, { glucose: 69 }, { temp: 39.5 }, { temp: 34.9 }, { sys: 85, dia: 50 }, { mood: 1 }, { sleep: 5 }, { sys: 150, dia: 95, hr: 120, temp: 38.5 }].forEach(x => all.push(planFor(Object.assign({}, NORMAL, x), SAMPLE.baseline, 90).p));
  all.forEach(p => {
    assert.equal(new Set(p.map(a => a.text)).size, p.length, p.map(a => a.text).join(" | "));
    const ranks = p.map(a => ORDER.indexOf(a.when));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    p.forEach((a, i) => assert.equal(a.n, i + 1));
  });
});
test("plan: slightly low blood sugar still says when to tell the crew medical officer", () => {
  const { p } = planFor(Object.assign({}, NORMAL, { glucose: 69 }), SAMPLE.baseline, 30);
  assert.equal(p[0].id, "lowsugar");
  assert.match(p[0].why, /still under 70 after the second check, tell the crew medical officer/);
});
test("plan: a temperature clearly outside the normal range tells the medic now, even alone", () => {
  const { p } = planFor(Object.assign({}, NORMAL, { temp: 39.5 }), SAMPLE.baseline, 90);
  assert.deepEqual(ids(p).slice(0, 3), ["tellnow", "hold", "recheck"]);
  assert.match(p[0].why, /clearly outside the normal range/);
});
test("plan: a serious blood pressure or pulse always stops hard physical work", () => {
  [{ sys: 85, dia: 50 }, { hr: 140 }].forEach(x => {
    const { p } = planFor(Object.assign({}, NORMAL, x), SAMPLE.baseline, 30);
    assert.deepEqual(ids(p).slice(0, 2), ["tellnow", "hold"]);
  });
});
test("mood at the bottom of the scale needs attention and asks for a person, not only a journal", () => {
  const { res, p } = planFor(Object.assign({}, NORMAL, { mood: 1 }), SAMPLE.baseline, 30);
  assert.equal(res.mood.status, "watch");
  assert.ok(res.mood.teamRule);
  assert.equal(INSIGHTS.summary(KEYS, res, RANGES).headline, "1 reading needs attention: mood");
  assert.match(p.find(a => a.id === "mood").text, /^Talk to the crew medical officer or a crew mate today/);
});
test("summary: a rise the space shift does not explain is counted as needing attention", () => {
  const s = INSIGHTS.summary(KEYS, run("d10"), RANGES);
  assert.equal(s.headline, "1 reading needs attention: body temperature");
  assert.equal(s.level, "watch");
});
test("summary: with no baseline, chips say IN RANGE and never OK", () => {
  const res = ASSESS.assessAll(KEYS, NORMAL, {}, 90, RANGES, RULES);
  assert.deepEqual(INSIGHTS.summary(KEYS, res, RANGES).chips.map(c => c.state), Array(6).fill("IN RANGE"));
});
test("sleep just under 7 hours is never shown as 7.0", () => {
  const { p } = planFor(Object.assign({}, NORMAL, { sleep: 6.99 }), SAMPLE.baseline, 30);
  assert.match(p.find(a => a.id === "sleep").why, /You slept 6\.9 h/);
});
test("task check: a spacewalk holds under 7 hours of sleep, cabin work under 6", () => {
  const r = run("d90"); // sleep 6.4
  assert.equal(TASKS.checkTask(task("eva"), r, RULES, RANGES, []).answer, "hold");
  const out = TASKS.checkTask(task("cabin"), r, RULES, RANGES, []);
  assert.equal(out.word, "Not held by these readings");
  assert.match(out.reasons.join(" "), /not clearance/);
});

test("sources: the three NASA pages the challenge lists are in the page's source list", () => {
  const urls = Object.values(SOURCES).map(s => s.url);
  ["https://www.nasa.gov/hrp/hazards/", "https://www.nasa.gov/hrp/risks/", "https://www.nasa.gov/hrp/ongoing-hrp-research/"]
    .forEach(u => assert.ok(urls.includes(u), "missing " + u));
});
