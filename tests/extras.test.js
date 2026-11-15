const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
["sample-days", "ranges", "rules", "assess", "tasks", "forecast", "hazards", "insights", "actions", "extras"].forEach(f => require(path.join(__dirname, "..", "js", f + ".js")));
const { SAMPLE, RANGES, RULES, ASSESS, HABITS, SOURCES, INSIGHTS, ACTIONS, EXTRAS } = globalThis;
const KEYS = ["bp", "hr", "temp", "sleep", "glucose", "mood"];
const day = id => SAMPLE.days.find(d => d.id === id);
const run = (id, r) => ASSESS.assessAll(KEYS, r || day(id).r, SAMPLE.baseline, day(id).day, RANGES, RULES);
const plan = (id, res, flags = []) => ACTIONS.plan(KEYS, res, { RANGES, RULES, SOURCES, flags, notes: INSIGHTS.notes(KEYS, day(id), res, SAMPLE.baseline, RANGES, RULES, SOURCES) });
const all = id => { const res = run(id); return { res, steps: plan(id, res) }; };

test("places: four places, each says the rules stay the same evidence came from the station, and only Mars has a number", () => {
  assert.deepEqual(EXTRAS.PLACES.map(p => p.id), ["transit", "station", "rover", "base"]);
  EXTRAS.PLACES.forEach(p => {
    assert.match(p.evidence, /measured on space station crews/, p.id);
    assert.ok(p.reply && p.source && /^https:\/\/www\.nasa\.gov\//.test(p.source.url), p.id);
    const numbers = (p.evidence + " " + p.reply + " " + (p.team || "")).match(/\d+/g) || [];
    assert.ok(numbers.every(n => n === "20"), p.id + " has a number with no source: " + numbers.join(","));
  });
  assert.equal(EXTRAS.place("nowhere").id, "transit");
});

test("prompts follow the plan: every re-check the plan names gets a prompt, and nothing else does", () => {
  SAMPLE.days.forEach(d => {
    const { res, steps } = all(d.id);
    const ps = EXTRAS.prompts(KEYS, res, steps, RANGES, RULES);
    assert.equal(ps.length, KEYS.length);
    const re = steps.find(s => s.id === "recheck"), low = steps.find(s => s.id === "lowsugar");
    ps.forEach(p => {
      if (res[p.key].v === null) assert.equal(p.state, "due", d.id + " " + p.key);
      if (p.state === "recheck") assert.ok(re || (p.key === "glucose" && low), d.id + " " + p.key + " has a re-check prompt with no plan step behind it");
      if (p.state === "recheck" && !(p.key === "glucose" && low)) assert.equal(p.minutes, RULES.recheckMinutes[p.key]);
    });
    if (re) assert.ok(ps.some(p => p.state === "recheck"), d.id + " plan has a re-check but no prompt shows it");
  });
});

test("prompts: low blood sugar points at the plan's own 15 minute check, not at a second one", () => {
  const r = Object.assign({}, day("d30").r, { glucose: 60 });
  const res = run("d30", r), steps = plan("d30", res);
  assert.ok(steps.some(s => s.id === "lowsugar"));
  const g = EXTRAS.prompts(KEYS, res, steps, RANGES, RULES).find(p => p.key === "glucose");
  assert.equal(g.state, "recheck");
  assert.equal(g.minutes, 15);
});

test("the streak rewards logging, never the values: a flagged day scores the same as an ordinary one", () => {
  const ordinary = all("d30"), flagged = all("d92");
  const a = EXTRAS.game(KEYS, ordinary.res, 0, 5, day("d30").trend), b = EXTRAS.game(KEYS, flagged.res, 0, 5, day("d92").trend);
  const count = res => KEYS.filter(k => res[k].v !== null).length;
  assert.equal(a.logged, count(ordinary.res));
  assert.equal(b.logged, count(flagged.res));
  assert.ok(KEYS.some(k => ["watch", "serious"].includes(flagged.res[k].status)), "d92 should have a flagged reading for this test to mean anything");
  if (count(flagged.res) === 6) assert.equal(b.badges.find(x => x.id === "all").earned, true);
});

test("the streak: a missing reading today breaks it, and typed-in readings with no history have none", () => {
  const missing = SAMPLE.days.find(d => KEYS.some(k => run(d.id)[k].v === null));
  assert.ok(missing, "a sample day with a missing reading is needed");
  assert.equal(EXTRAS.streak(KEYS, missing.trend), 0);
  assert.equal(EXTRAS.game(KEYS, run(missing.id), 0, 5, missing.trend).badges.find(x => x.id === "all").earned, false);
  assert.equal(EXTRAS.streak(KEYS, null), null);
  assert.equal(EXTRAS.streak(KEYS, day("d30").trend), 7);
});

test("the habits badge counts only habits that are not on hold", () => {
  const { res } = all("d30");
  assert.equal(EXTRAS.game(KEYS, res, 4, 4, null).badges.find(x => x.id === "habits").earned, true);
  assert.equal(EXTRAS.game(KEYS, res, 4, 5, null).badges.find(x => x.id === "habits").earned, false);
  assert.equal(EXTRAS.game(KEYS, res, 0, 0, null).badges.find(x => x.id === "habits").earned, false);
});

test("the treatment split adds no step, loses no step, and never names a medicine", () => {
  SAMPLE.days.forEach(d => {
    [[], ["Chest pain"]].forEach(flags => {
      const res = run(d.id), steps = plan(d.id, res, flags), t = EXTRAS.treatment(steps);
      const real = steps.filter(s => s.id !== "none");
      assert.equal(t.self.length + t.officer.length, real.length, d.id);
      t.self.concat(t.officer).forEach(s => assert.ok(real.includes(s), d.id));
      t.self.forEach(s => assert.ok(!/^Tell the crew medical officer|^Talk to the crew medical officer/.test(s.text), d.id + ": " + s.text));
      steps.forEach(s => assert.doesNotMatch(s.text, /\b(mg|tablet|pill|dose|paracetamol|ibuprofen|aspirin|insulin|antibiotic)\b/i));
    });
  });
});

test("how-to lines exist for every reading and reuse the text the rule files already hold", () => {
  KEYS.forEach(k => {
    const lines = EXTRAS.howTo(k, RANGES, RULES);
    assert.equal(lines.length, 4, k);
    assert.equal(lines[1].text, RANGES[k].inSpace, k);
    assert.equal(lines[2].text, RANGES[k].feed, k);
    lines.forEach(l => assert.ok(l.head && l.text, k));
    const m = RULES.recheckMinutes[k];
    if (m) assert.match(lines[3].text, new RegExp("after " + m + " minutes"), k);
  });
});

test("report lines name the place, and a photo is listed as attached and not analysed", () => {
  const p = EXTRAS.place("rover");
  assert.match(EXTRAS.reportLines(p, null).join("\n"), /Where: Rover on a surface/);
  assert.equal(EXTRAS.reportLines(p, null).length, 2);
  assert.match(EXTRAS.reportLines(p, { name: "rash.jpg" }).join("\n"), /rash\.jpg\. Not analysed by this prototype\./);
});

// ---- automatic place and automatic reminders
test("the place is read from the mission plan: every sample day is deep space, and nobody is asked", () => {
  SAMPLE.days.forEach(d => assert.deepEqual(EXTRAS.currentPlace(d.day, null), { id: "transit", auto: true }, d.id));
  assert.equal(EXTRAS.autoPlace(0), "transit");
  assert.equal(EXTRAS.autoPlace(SAMPLE.missionDays), "transit");
  assert.equal(EXTRAS.autoPlace(undefined), "transit");
});

test("a place picked by hand wins, and a bad or cleared one falls back to the automatic place", () => {
  assert.deepEqual(EXTRAS.currentPlace(92, "rover"), { id: "rover", auto: false });
  assert.deepEqual(EXTRAS.currentPlace(92, "moonbase-9"), { id: "transit", auto: true });
  assert.deepEqual(EXTRAS.currentPlace(92, ""), { id: "transit", auto: true });
});

test("reminders start by themselves: each re-check in the plan gets a due time, and only those", () => {
  const { res, steps } = all("d92");
  const ps = EXTRAS.prompts(KEYS, res, steps, RANGES, RULES);
  const sch = EXTRAS.schedule(ps, null, 1000, 60000);
  const re = ps.filter(p => p.state === "recheck").map(p => p.key);
  assert.ok(re.length > 0);
  assert.deepEqual(Object.keys(sch).sort(), re.slice().sort());
  re.forEach(k => assert.equal(sch[k], 1000 + RULES.recheckMinutes[k] * 60000, k));
  const calm = all("d30");
  assert.deepEqual(EXTRAS.schedule(EXTRAS.prompts(KEYS, calm.res, calm.steps, RANGES, RULES), null, 1000, 60000), {});
});

test("a reminder already running is not restarted when the page redraws", () => {
  const { res, steps } = all("d92");
  const ps = EXTRAS.prompts(KEYS, res, steps, RANGES, RULES);
  const first = EXTRAS.schedule(ps, null, 1000, 1000);
  assert.deepEqual(EXTRAS.schedule(ps, first, 9000, 1000), first);
});

test("when a reminder's time comes the re-check turns into due now, and not before", () => {
  const { res, steps } = all("d92");
  const ps = EXTRAS.prompts(KEYS, res, steps, RANGES, RULES);
  const sch = EXTRAS.schedule(ps, null, 0, 1000); // one second per minute
  const early = EXTRAS.withReminders(ps, sch, 5000), late = EXTRAS.withReminders(ps, sch, 31000);
  assert.equal(early.find(p => p.key === "bp").state, "recheck");
  assert.equal(early.find(p => p.key === "bp").left, 25);
  assert.equal(late.find(p => p.key === "bp").state, "due");
  assert.equal(late.find(p => p.key === "temp").state, "recheck"); // 60 minutes, still running
  assert.equal(late.filter(p => p.state === "done").length, ps.filter(p => p.state === "done").length);
});

// ---- the glance view
test("the glance repeats the page's own headline and the plan's own first step, word for word, on every sample day", () => {
  SAMPLE.days.forEach(d => {
    const { res, steps } = all(d.id);
    const sum = INSIGHTS.summary(KEYS, res, RANGES);
    const g = EXTRAS.glance(sum, steps, EXTRAS.prompts(KEYS, res, steps, RANGES, RULES), RANGES);
    assert.equal(g.headline, sum.headline + ".", d.id);
    assert.equal(g.first, steps[0].text, d.id);
    assert.equal(g.when, steps[0].when, d.id);
    assert.ok(["ok", "watch", "serious", "cannot", "expected", "changed"].includes(g.level), d.id + " " + g.level);
  });
});

test("the glance shows act now when the plan's first step is an act-now step, and all clear on an ordinary day", () => {
  const { res, steps } = all("d92");
  assert.equal(steps[0].id, "tellnow");
  const g = EXTRAS.glance(INSIGHTS.summary(KEYS, res, RANGES), steps, EXTRAS.prompts(KEYS, res, steps, RANGES, RULES), RANGES);
  assert.equal(g.level, "serious");
  const calm = all("d30");
  assert.equal(EXTRAS.glance(INSIGHTS.summary(KEYS, calm.res, RANGES), calm.steps, EXTRAS.prompts(KEYS, calm.res, calm.steps, RANGES, RULES), RANGES).level, "ok");
});

test("the glance's next check puts a missing reading before a re-check, and says so when all are done", () => {
  const dead = all("d93"), ok = all("d30");
  const gd = EXTRAS.glance(INSIGHTS.summary(KEYS, dead.res, RANGES), dead.steps, EXTRAS.prompts(KEYS, dead.res, dead.steps, RANGES, RULES), RANGES);
  assert.match(gd.next, /take it now/);
  assert.equal(dead.res[gd.nextKey].v, null);
  const go = EXTRAS.glance(INSIGHTS.summary(KEYS, ok.res, RANGES), ok.steps, EXTRAS.prompts(KEYS, ok.res, ok.steps, RANGES, RULES), RANGES);
  assert.equal(go.next, "All checks done today.");
});
