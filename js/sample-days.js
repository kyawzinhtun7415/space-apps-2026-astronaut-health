// Simulated sample data for ONE made-up crew member. Nothing here is a real person's reading.
(function (root) {
  var WOBBLE = [0, 0.3, -0.2, 0.1, -0.3, 0.2, 0];
  // Seven simulated days ending on today's value.
  function series(from, to, scale, dp) {
    var p = Math.pow(10, dp || 0);
    return WOBBLE.map(function (w, i) { return Math.round((from + (to - from) * i / 6 + w * scale) * p) / p; });
  }
  var base = { sys: 119, dia: 76, hr: 63, temp: 36.7, sleep: 7.5, glucose: 90, mood: 4 };
  function day(id, n, label, note, r, start, week, fixed) {
    var miss = r.sys === null;
    var d = { id: id, day: n, label: label, note: note, r: r, week: week,
      trend: {
        bp: (miss ? series(start.sys, start.sys - 2, 3).slice(0, 6).concat([null]) : series(start.sys, r.sys, 3))
          .map(function (v) { return v === null ? null : { sys: v, dia: v - 42 }; }),
        hr: miss ? series(start.hr, start.hr + 3, 3).slice(0, 6).concat([null]) : series(start.hr, r.hr, 3),
        temp: series(start.temp, r.temp, 0.15, 1), sleep: week,
        glucose: series(start.glucose, r.glucose, 4), mood: series(start.mood, r.mood, 0).map(Math.round)
      } };
    // Hand-written series where the story of the day needs a sudden change.
    Object.keys(fixed || {}).forEach(function (k) {
      d.trend[k] = k === "bp" ? fixed[k].map(function (v) { return v === null ? null : { sys: v, dia: v - 42 }; }) : fixed[k];
    });
    return d;
  }
  root.SAMPLE = {
    person: "Sample crew member (made up)",
    mission: "Sample mission: a 180-day trip towards Mars (made up). The space measurements come from space station crews.",
    missionDays: 180,
    // Pre-launch baseline: this person's own numbers on Earth before the mission.
    baseline: base,
    days: [
      day("d10", 10, "Flight day 10: warm too early",
        "Temperature is 0.9 °C above the pre-launch value on day 10. A flight study saw this rise build over 2.5 months, so day 10 is too early for it.",
        { sys: 117, dia: 74, hr: 66, temp: 37.6, sleep: 7.0, glucose: 91, mood: 4 },
        { sys: 118, hr: 64, temp: 36.9, glucose: 90, mood: 4 }, [7.0, 6.8, 7.2, 7.1, 6.9, 7.3, 7.0]),
      day("d30", 30, "Flight day 30: ordinary day",
        "Every reading is close to this person's own pre-launch numbers.",
        { sys: 115, dia: 73, hr: 64, temp: 37.0, sleep: 7.2, glucose: 88, mood: 4 },
        { sys: 116, hr: 64, temp: 36.9, glucose: 90, mood: 4 }, [7.4, 7.0, 7.3, 6.9, 7.5, 7.1, 7.2]),
      day("d90", 90, "Flight day 90: small changes from baseline",
        "Temperature is about 1 °C above the pre-launch value and blood pressure is 8 lower. Neither is flagged by the clinical chart.",
        { sys: 111, dia: 69, hr: 63, temp: 37.6, sleep: 6.4, glucose: 92, mood: 3 },
        { sys: 114, hr: 63, temp: 37.5, glucose: 90, mood: 4 }, [7.1, 6.6, 7.2, 6.8, 7.0, 6.6, 6.4]),
      day("d92", 92, "Flight day 92: fever",
        "Temperature is above the band that scores 0 on the clinical chart. Nothing clears it.",
        { sys: 108, dia: 66, hr: 96, temp: 38.6, sleep: 5.0, glucose: 95, mood: 2 },
        { sys: 116, hr: 64, temp: 37.6, glucose: 91, mood: 4 }, [6.5, 5.8, 6.2, 6.6, 6.1, 5.6, 5.0],
        { temp: [37.5, 37.6, 37.5, 37.6, 37.6, 38.1, 38.6], hr: [63, 64, 62, 64, 63, 82, 96], bp: [113, 112, 114, 112, 111, 110, 108], mood: [4, 4, 3, 4, 3, 3, 2] }),
      day("d93", 93, "Flight day 93: dead sensor",
        "The shirt sensor has stopped. Two readings are missing and are not guessed.",
        { sys: null, dia: null, hr: null, temp: 38.2, sleep: 6.5, glucose: 68, mood: 3 },
        { sys: 114, hr: 80, temp: 37.8, glucose: 88, mood: 3 }, [5.8, 6.2, 6.6, 6.1, 5.6, 5.0, 6.5],
        { temp: [37.6, 37.5, 37.6, 37.6, 38.1, 38.6, 38.2], hr: [64, 62, 64, 63, 82, 96, null], bp: [112, 114, 112, 111, 110, 108, null], glucose: [90, 91, 92, 91, 92, 95, 68], mood: [4, 3, 4, 3, 3, 2, 3] })
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
